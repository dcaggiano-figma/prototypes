import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import type { NodeId, SceneNode } from '@prototype/shared/canvas';
import {
  usePageBackground,
  isDefaultPageBackground,
  useSceneGraph,
  useCanvasId,
  getWorldPosition,
  isGeometryNode,
  useSelection,
  useViewport,
  useViewportState,
  useTextEditing,
  useUndoActions,
  useNudgeActions,
  useUndoManager,
  useBehaviorManager,
  findNodeAtWorldPoint,
  CanvasLayers,
} from '@prototype/shared/canvas';
import { SelectionOverlay } from '../selection/overlay';
import { useActiveTool } from '../tools/provider';
import { useBehaviorChain } from '../behaviors';
import { CURSORS } from '../cursors';
import { CanvasRenderer } from './canvas-renderer';
import { CommentPinLayer, useComments } from '@prototype/shared';
import { copyNodes, cutNodes, pasteNodes, duplicateNodes } from '../clipboard/clipboard';
import { useViewMode } from '../../components/ViewModeContext';
import { type DropTarget, getDropIndicatorX, recomputeGridLayout } from '../scene-graph/grid';

interface CanvasProps {
  onOpenContextMenu?: (type: 'node' | 'canvas', x: number, y: number) => void;
}

/**
 * Get the visible canvas bounds, accounting for the left sidebar.
 * Falls back to the full container rect if no <main> sibling is found.
 */
function getVisibleBounds(containerEl: HTMLElement) {
  const full = containerEl.getBoundingClientRect();
  const main = containerEl.parentElement?.querySelector('main');
  if (main) {
    const mainRect = main.getBoundingClientRect();
    return { left: mainRect.left, top: full.top, width: mainRect.width, height: full.height };
  }
  return { left: full.left, top: full.top, width: full.width, height: full.height };
}

/** Safe zone (px) around the focused frame in asset view.
 *  Used for both fit-zoom padding and pan clamping. */
const ASSET_SAFE_ZONE = 150;

/**
 * Compute the scale to fit a frame within the visible canvas area.
 * Enforces a 20% minimum coverage so the frame never becomes too small,
 * and caps at 1x so small frames don't over-zoom.
 */
function computeAssetFitScale(
  frameW: number,
  frameH: number,
  visW: number,
  visH: number,
  padding: number,
): number {
  if (frameW <= 0 || frameH <= 0) return 1;
  const availW = visW - padding * 2;
  const availH = visH - padding * 2;
  const fitScale = Math.min(availW / frameW, availH / frameH);
  // Ensure at least 20% of the visible area is covered by the frame
  const minCoverage = Math.max(0.2 * visW / frameW, 0.2 * visH / frameH);
  return Math.min(Math.max(fitScale, minCoverage), 1);
}

export function Canvas({ onOpenContextMenu }: CanvasProps) {
  const viewport = useViewport();
  const { containerRef, screenToWorld, instance: vp } = viewport;
  const { state: viewportState } = useViewportState();
  const selection = useSelection();
  const store = useSceneGraph();
  const canvasId = useCanvasId();
  const pageBg = usePageBackground(canvasId);
  const { effectiveTool, setActiveTool, drawColor, drawStrokeWeight, drawOpacity } = useActiveTool();
  const textEditing = useTextEditing();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore } = useComments();
  const { viewMode, focusedFrameId, setFocusedFrameId, setIsAnimatingViewMode, setIsAnimatingModeChange } = useViewMode();

  /** Grid drop target for visual indicator when dragging managed frames */
  const [gridDropTarget, setGridDropTarget] = useState<DropTarget | null>(null);

  // Stable callbacks for CommentPinLayer's useSyncExternalStore.
  // The subscribe function must be referentially stable, and the snapshot
  // must return the same value (by Object.is) when nothing changed.
  // A monotonic counter avoids creating a new array each call.
  const nodeStoreVersionRef = useRef(0);
  const nodeStoreSubscribe = useCallback(
    (listener: () => void) => store.addListener(() => { nodeStoreVersionRef.current++; listener(); }),
    [store],
  );
  const nodeStoreGetSnapshot = useCallback(
    () => nodeStoreVersionRef.current,
    [],
  );

  /** Resolve the world position of a node by ID (for comment node-attachment) */
  const getNodePosition = useCallback(
    (nodeId: string): { x: number; y: number } | undefined => {
      const node = store.getNode(Number(nodeId) as NodeId);
      if (!node || !isGeometryNode(node)) return undefined;
      return getWorldPosition(store, node);
    },
    [store],
  );

  /** Whether the hand tool is actively dragging (for cursor styling) */
  const [isPanning, setIsPanning] = useState(false);

  /** Skip the click-away text editing exit on the pointerup that follows text creation */
  const skipTextExitRef = useRef(false);

  /** SVG overlay for pencil live preview (in world-space) */
  const pencilOverlayRef = useRef<SVGSVGElement>(null);

  // ── Behavior system (handles all tools) ─────────────────────────
  const isSpaceHeldRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceHeldRef.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceHeldRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const behaviors = useBehaviorChain({
    effectiveTool,
    isSpaceHeld: () => isSpaceHeldRef.current,
    onPanStart: () => setIsPanning(true),
    onPanEnd: () => setIsPanning(false),
    drawColor,
    drawStrokeWeight,
    drawOpacity,
    pencilOverlayRef,
    onToolCreated: () => {
      setActiveTool('MOVE');
      skipTextExitRef.current = effectiveTool === 'TEXT';
    },
    onCommentPlace: (placement) => {
      setInteraction({
        type: 'placing',
        worldX: placement.worldX,
        worldY: placement.worldY,
        ...(placement.nodeId != null ? {
          nodeId: String(placement.nodeId),
          nodeOffsetX: placement.nodeOffsetX,
          nodeOffsetY: placement.nodeOffsetY,
        } : {}),
      });
    },
    onGridDropTargetChange: setGridDropTarget,
    isSlideView: () => viewMode === 'asset',
  });

  const bm = useBehaviorManager({
    behaviors,
    enteredFrameId: selection.enteredFrameId,
  });

  // Register undo/redo actions
  const um = useUndoManager();
  const { undo, redo } = useUndoActions();
  useAction('undo', undo);
  useAction('redo', redo);

  // Register nudge actions — SLIDE nodes can't be nudged in slide/focus view
  const skipSlideNudge = useCallback(
    (node: { type: string }) => node.type === 'SLIDE' && viewMode !== 'grid',
    [viewMode],
  );
  const nudge = useNudgeActions({ shouldSkip: skipSlideNudge });
  useAction('nudge.up', nudge.nudgeUp);
  useAction('nudge.down', nudge.nudgeDown);
  useAction('nudge.left', nudge.nudgeLeft);
  useAction('nudge.right', nudge.nudgeRight);
  useAction('nudge.up.big', nudge.nudgeUpBig);
  useAction('nudge.down.big', nudge.nudgeDownBig);
  useAction('nudge.left.big', nudge.nudgeLeftBig);
  useAction('nudge.right.big', nudge.nudgeRightBig);

  // Register selection actions
  useAction(
    'select-all',
    useCallback(() => {
      const canvas = store.getNode(canvasId);
      if (!canvas) return;
      for (const childId of canvas.children) {
        selection.add(childId);
      }
    }, [store, canvasId, selection]),
  );

  useAction(
    'deselect',
    useCallback(() => {
      // If inside a frame, first Escape exits frame; second Escape deselects
      if (selection.enteredFrameId !== null) {
        selection.exitFrame();
      } else {
        selection.clear();
      }
    }, [selection]),
  );

  useAction(
    'delete',
    useCallback(() => {
      for (const id of selection.selectedIds) {
        store.deleteNode(id);
      }
      selection.clear();
      um.commit();
    }, [store, selection, um]),
  );

  useAction(
    'copy',
    useCallback(() => {
      if (selection.selectedIds.size === 0) return;
      copyNodes(store, selection.selectedIds);
    }, [store, selection]),
  );

  useAction(
    'cut',
    useCallback(() => {
      if (selection.selectedIds.size === 0) return;
      cutNodes(store, selection.selectedIds);
      selection.clear();
      um.commit();
    }, [store, selection, um]),
  );

  useAction(
    'paste',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const center = screenToWorld(rect.width / 2, rect.height / 2);
      const newIds = pasteNodes(store, canvasId, selection.selectedIds, center);
      if (newIds.length > 0) {
        selection.selectMany(newIds);
      }
      um.commit();
    }, [store, selection, containerRef, screenToWorld, um, canvasId]),
  );

  useAction(
    'duplicate',
    useCallback(() => {
      if (selection.selectedIds.size === 0) return;
      const newIds = duplicateNodes(store, canvasId, selection.selectedIds);
      if (newIds.length > 0) {
        selection.selectMany(newIds);
      }
      um.commit();
    }, [store, selection, um, canvasId]),
  );

  useAction(
    'zoom-to-fit',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      // Compute world-space bounding box of all nodes
      const roots = getRootNodes(store, canvasId);
      if (roots.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const root of roots) {
        if (!isGeometryNode(root)) continue;
        const pos = getWorldPosition(store, root);
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + root.width);
        maxY = Math.max(maxY, pos.y + root.height);
      }

      if (!isFinite(minX)) return;

      const padding = 48;
      const vis = getVisibleBounds(container);
      const availW = vis.width - padding * 2;
      const availH = vis.height - padding * 2;
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      if (contentW <= 0 || contentH <= 0) return;

      const scale = Math.min(availW / contentW, availH / contentH, 4);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      viewport.setState({
        scale,
        origin: {
          x: vis.left + vis.width / 2 - cx * scale,
          y: vis.top + vis.height / 2 - cy * scale,
        },
      });
    }, [store, containerRef, viewport, canvasId]),
  );

  // Dynamic min scale for zoom actions: in asset mode, use 20% coverage floor
  const minScale = (() => {
    if (viewMode === 'asset' && focusedFrameId) {
      const fNode = store.getNode(focusedFrameId);
      const container = containerRef.current;
      if (fNode && isGeometryNode(fNode) && container) {
        const vis = getVisibleBounds(container);
        return Math.max(0.2 * vis.width / fNode.width, 0.2 * vis.height / fNode.height, 0.1);
      }
      return 0.5;
    }
    return 0.02;
  })();
  const maxScale = 256;

  useAction(
    'zoom-in',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const vis = getVisibleBounds(container);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;
      viewport.setState((prev) => {
        const newScale = Math.min(prev.scale * 2, maxScale);
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: newScale, origin: { x: cx - worldX * newScale, y: cy - worldY * newScale } };
      });
    }, [containerRef, viewport, maxScale]),
  );

  useAction(
    'zoom-out',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const vis = getVisibleBounds(container);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;
      viewport.setState((prev) => {
        const newScale = Math.max(prev.scale / 2, minScale);
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: newScale, origin: { x: cx - worldX * newScale, y: cy - worldY * newScale } };
      });
    }, [containerRef, viewport, minScale]),
  );

  useAction(
    'zoom-to-100',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const vis = getVisibleBounds(container);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;
      viewport.setState((prev) => {
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: 1, origin: { x: cx - worldX, y: cy - worldY } };
      });
    }, [containerRef, viewport]),
  );

  // Center content before first paint (useLayoutEffect fires before browser paints)
  const didCenter = useRef(false);
  useLayoutEffect(() => {
    if (didCenter.current) return;
    const container = containerRef.current;
    if (!container) return;

    const roots = getRootNodes(store, canvasId);
    if (roots.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const root of roots) {
      if (!isGeometryNode(root)) continue;
      const pos = getWorldPosition(store, root);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + root.width);
      maxY = Math.max(maxY, pos.y + root.height);
    }

    if (!isFinite(minX)) return;

    const vis = getVisibleBounds(container);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    didCenter.current = true;
    viewport.setState({
      scale: 1,
      origin: {
        x: vis.left + vis.width / 2 - cx,
        y: vis.top + vis.height / 2 - cy,
      },
    });
  }, [store, canvasId, containerRef, viewport]);

  // --- Asset-mode: wheel interception + pan bounds clamping ---

  // Keep minScale in a ref so the capture-phase wheel handler always reads
  // the current value without re-attaching the listener.
  const minScaleRef = useRef(minScale);
  minScaleRef.current = minScale;

  // Shared clamp helper: keeps ASSET_SAFE_ZONE (world-space) visible around
  // the focused frame. If the safe zone fits in the viewport, pan is locked
  // (centered). If it overflows, panning stops at the safe zone edge.
  const clampPanBounds = () => {
    if (viewMode !== 'asset' || !focusedFrameId || isAnimatingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const fNode = store.getNode(focusedFrameId);
    if (!fNode || !isGeometryNode(fNode)) return;
    const pos = getWorldPosition(store, fNode);
    const vis = getVisibleBounds(container);
    const s = vp.scale;
    const ox = vp.originX;
    const oy = vp.originY;

    // Frame screen-space bounds
    const fL = pos.x * s + ox;
    const fT = pos.y * s + oy;
    const fW = fNode.width * s;
    const fH = fNode.height * s;

    // Safe zone: ASSET_SAFE_ZONE in world space, scaled to screen
    const safePx = ASSET_SAFE_ZONE * s;

    // Safe zone rect in screen space
    const szL = fL - safePx;
    const szT = fT - safePx;
    const szW = fW + safePx * 2;
    const szH = fH + safePx * 2;

    let nx = ox;
    let ny = oy;

    // Horizontal axis
    if (szW <= vis.width) {
      // Safe zone fits — lock horizontal pan (center the frame)
      const frameCenterWorld = pos.x + fNode.width / 2;
      nx = vis.left + vis.width / 2 - frameCenterWorld * s;
    } else {
      // Safe zone overflows — clamp to safe zone edges
      if (szL > vis.left) nx -= szL - vis.left;
      const szR = szL + szW;
      const visR = vis.left + vis.width;
      if (szR < visR) nx += visR - szR;
    }

    // Vertical axis
    if (szH <= vis.height) {
      // Safe zone fits — lock vertical pan (center the frame)
      const frameCenterWorld = pos.y + fNode.height / 2;
      ny = vis.top + vis.height / 2 - frameCenterWorld * s;
    } else {
      // Safe zone overflows — clamp to safe zone edges
      if (szT > vis.top) ny -= szT - vis.top;
      const szB = szT + szH;
      const visB = vis.top + vis.height;
      if (szB < visB) ny += visB - szB;
    }

    if (nx !== ox || ny !== oy) vp.set(nx, ny, s);
  };
  const clampPanBoundsRef = useRef(clampPanBounds);
  clampPanBoundsRef.current = clampPanBounds;

  // Part 1: Capture-phase wheel listener — fires before the shared provider's
  // bubble-phase handler, enforcing asset-mode zoom limits and pan bounds.
  useEffect(() => {
    if (viewMode !== 'asset') return;
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Zoom: clamp to [minScale, maxScale]
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const newScale = Math.max(
          minScaleRef.current,
          Math.min(maxScale, vp.scale * (1 - e.deltaY / 100)),
        );
        vp.zoomTo(newScale, mx, my);
      } else {
        // Pan
        vp.pan(-e.deltaX, -e.deltaY);
      }
      clampPanBoundsRef.current();
    };

    container.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => container.removeEventListener('wheel', onWheel, { capture: true });
  }, [viewMode, vp, containerRef]);

  // Part 2: Subscribe to viewport changes and clamp pan bounds as a safety
  // net for mutation sources other than the wheel handler (e.g. hand tool pan).
  useEffect(() => {
    if (viewMode !== 'asset' || !focusedFrameId) return;
    let clamping = false;
    return vp.subscribe(() => {
      if (clamping || isAnimatingRef.current) return;
      clamping = true;
      clampPanBoundsRef.current();
      clamping = false;
    });
  }, [viewMode, focusedFrameId, vp]);

  // When entering asset mode, focus the selected slide (or default to first slide).
  // Uses useLayoutEffect so focusedFrameId is set before the animation effect runs.
  // We also write to a ref so the animation effect (same render cycle) can read
  // the intended target synchronously, since setState is async.
  const prevViewModeForFocusRef = useRef(viewMode);
  const pendingFocusIdRef = useRef<NodeId | null>(null);
  useLayoutEffect(() => {
    const wasAsset = prevViewModeForFocusRef.current === 'asset';
    const wasGrid = prevViewModeForFocusRef.current === 'grid';
    prevViewModeForFocusRef.current = viewMode;
    pendingFocusIdRef.current = null;

    // Switching asset -> grid: select the focused frame so it's highlighted
    if (viewMode === 'grid' && wasAsset && focusedFrameId) {
      selection.select(focusedFrameId);
      return;
    }

    if (viewMode !== 'asset') return;

    // If switching from grid, try to focus the selected slide
    if (wasGrid) {
      for (const id of selection.selectedIds) {
        const node = store.getNode(id);
        if (node && (node.type === 'SLIDE' || node.type === 'FRAME')) {
          pendingFocusIdRef.current = id;
          setFocusedFrameId(id);
          return;
        }
        // If a section is selected, focus its first child slide
        if (node && (node.type === 'SECTION' || node.type === 'GRID_SECTION') && node.children.length > 0) {
          pendingFocusIdRef.current = node.children[0];
          setFocusedFrameId(node.children[0]);
          return;
        }
        // If a child of a slide is selected, focus the parent slide
        if (node && node.parentId) {
          const parent = store.getNode(node.parentId);
          if (parent && (parent.type === 'SLIDE' || parent.type === 'FRAME')) {
            pendingFocusIdRef.current = parent.id;
            setFocusedFrameId(parent.id);
            return;
          }
        }
      }
    }

    // Default: focus first slide if nothing is focused
    if (!focusedFrameId) {
      const roots = getRootNodes(store, canvasId);
      const firstSection = roots.find((n) => n.type === 'SECTION' || n.type === 'GRID_SECTION');
      if (firstSection && firstSection.children.length > 0) {
        pendingFocusIdRef.current = firstSection.children[0];
        setFocusedFrameId(firstSection.children[0]);
      }
    }
  }, [viewMode, focusedFrameId, store, canvasId, setFocusedFrameId, selection.selectedIds, selection]);

  // Track visible-area center and shift viewport when the left panel opens/closes/resizes.
  const prevVisCenterRef = useRef<{ cx: number; cy: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const main = container.parentElement?.querySelector('main');
    if (!main) return;

    const observer = new ResizeObserver(() => {
      const vis = getVisibleBounds(container);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;
      const prev = prevVisCenterRef.current;
      if (prev) {
        const dx = cx - prev.cx;
        const dy = cy - prev.cy;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          viewport.setState((s) => ({
            ...s,
            origin: { x: s.origin.x + dx, y: s.origin.y + dy },
          }));
        }
      }
      prevVisCenterRef.current = { cx, cy };
      // TODO: Keep zoom anchor in sync with the visible center once Viewport supports setZoomAnchor
    });

    // Seed the initial center
    const vis = getVisibleBounds(container);
    prevVisCenterRef.current = { cx: vis.left + vis.width / 2, cy: vis.top + vis.height / 2 };
    observer.observe(main);

    return () => observer.disconnect();
  }, [containerRef, viewport, viewMode]);

  // Animate viewport when focus changes (asset mode) or when switching to grid.
  // Use a ref for viewport.setState so that viewport state changes (zoom/pan)
  // don't re-trigger this centering logic.
  const setViewportRef = useRef(viewport.setState);
  setViewportRef.current = viewport.setState;
  const viewportStateRef = useRef(viewportState);
  viewportStateRef.current = viewportState;
  const animFrameRef = useRef(0);
  const prevViewModeRef = useRef(viewMode);
  const isFirstRenderRef = useRef(true);
  // Tracks whether a mode change happened that still needs animation.
  // Persists across re-renders caused by focusedFrameId updates.
  const pendingAnimateRef = useRef(false);
  // Guard: skip re-entry while animation is in progress
  const isAnimatingRef = useRef(false);
  // Tracks whether the pending animation is a focus-only change (no grid render needed)
  const pendingFocusOnlyRef = useRef(false);
  const prevFocusedIdRef = useRef(focusedFrameId);

  useLayoutEffect(() => {
    // If we're mid-animation, don't restart or cancel
    if (isAnimatingRef.current) return;

    // Detect mode change — set the pending flag so it survives the
    // re-render triggered by the focus-setting effect.
    const modeJustChanged = prevViewModeRef.current !== viewMode;
    if (modeJustChanged) {
      if (!isFirstRenderRef.current) {
        pendingAnimateRef.current = true;
      }
      prevViewModeRef.current = viewMode;
    }
    isFirstRenderRef.current = false;

    // Detect focus change within same mode (e.g. clicking different slide in SectionList)
    const focusJustChanged = prevFocusedIdRef.current !== focusedFrameId;
    prevFocusedIdRef.current = focusedFrameId;

    // Focus change within asset mode — snap immediately (no animation).
    // Mark as pending so the viewport gets updated, but don't set
    // pendingAnimateRef so it takes the non-animated path.
    if (!modeJustChanged && focusJustChanged && viewMode === 'asset' && focusedFrameId) {
      pendingFocusOnlyRef.current = true;
    }

    const container = containerRef.current;
    if (!container) return;
    const vis = getVisibleBounds(container);

    // Compute the target scale and world-space center
    let target: { scale: number; worldCenter: { x: number; y: number } } | null = null;

    // Use the pending focus target if the focus-setting effect just ran in this
    // same render cycle (setState is async, so focusedFrameId is still stale).
    const effectiveFocusId = pendingFocusIdRef.current ?? focusedFrameId;

    // Resolve the focused frame's world center (used as pivot during animation)
    let focusedWorldCenter: { x: number; y: number } | null = null;
    if (effectiveFocusId) {
      const fNode = store.getNode(effectiveFocusId);
      if (fNode && isGeometryNode(fNode)) {
        const fPos = getWorldPosition(store, fNode);
        focusedWorldCenter = { x: fPos.x + fNode.width / 2, y: fPos.y + fNode.height / 2 };
      }
    }

    if (viewMode === 'asset' && effectiveFocusId) {
      if (!focusedWorldCenter) return;
      const fNode = store.getNode(effectiveFocusId);
      if (!fNode || !isGeometryNode(fNode)) return;
      const padding = ASSET_SAFE_ZONE;
      const fitScale = computeAssetFitScale(fNode.width, fNode.height, vis.width, vis.height, padding);
      const effectiveScale = fitScale;
      target = { scale: effectiveScale, worldCenter: focusedWorldCenter };
    } else if (viewMode === 'asset' && !effectiveFocusId) {
      // Waiting for focusedFrameId to be set — don't consume pendingAnimateRef
      return;
    } else if (viewMode === 'grid') {
      const roots = getRootNodes(store, canvasId);
      if (roots.length === 0) return;
      let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
      for (const root of roots) {
        if (!isGeometryNode(root)) continue;
        const pos = getWorldPosition(store, root);
        gMinX = Math.min(gMinX, pos.x);
        gMinY = Math.min(gMinY, pos.y);
        gMaxX = Math.max(gMaxX, pos.x + root.width);
        gMaxY = Math.max(gMaxY, pos.y + root.height);
      }
      if (!isFinite(gMinX)) return;
      const padding = 48;
      const availW = vis.width - padding * 2;
      const availH = vis.height - padding * 2;
      const contentW = gMaxX - gMinX;
      const contentH = gMaxY - gMinY;
      if (contentW <= 0 || contentH <= 0) return;
      const scale = Math.min(availW / contentW, availH / contentH, 4);
      // Keep the focused frame centered in grid view (rather than centering on all content)
      target = { scale, worldCenter: focusedWorldCenter ?? { x: (gMinX + gMaxX) / 2, y: (gMinY + gMaxY) / 2 } };
    }

    if (!target) return;

    const screenCenter = { x: vis.left + vis.width / 2, y: vis.top + vis.height / 2 };

    // Consume the pending animate flag
    const shouldAnimate = pendingAnimateRef.current;
    const isFocusOnly = pendingFocusOnlyRef.current;
    pendingAnimateRef.current = false;
    pendingFocusOnlyRef.current = false;

    // Cancel any in-progress animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (!shouldAnimate) {
      setViewportRef.current({
        scale: target.scale,
        origin: {
          x: screenCenter.x - target.worldCenter.x * target.scale,
          y: screenCenter.y - target.worldCenter.y * target.scale,
        },
      });
      return;
    }

    // Animated transition between view modes or focus changes.
    const fromState = viewportStateRef.current;
    const fromWorldCenter = {
      x: (screenCenter.x - fromState.origin.x) / fromState.scale,
      y: (screenCenter.y - fromState.origin.y) / fromState.scale,
    };
    const toWorldCenter = target.worldCenter;
    const fromScale = fromState.scale;
    const toScale = target.scale;
    const duration = isFocusOnly ? 300 : 600;
    const start = performance.now();

    // Ease-in-out cubic
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    isAnimatingRef.current = true;
    // Always signal that a viewport animation is in progress so the
    // floating toolbar hides. For mode-change animations, CanvasRenderer
    // also needs to show the full grid — tracked via isAnimatingModeChange.
    // Use queueMicrotask to avoid triggering a synchronous re-render
    // (which would run cleanup and cancel the animation we just started)
    queueMicrotask(() => {
      setIsAnimatingViewMode(true);
      if (!isFocusOnly) setIsAnimatingModeChange(true);
    });

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const e = ease(t);

      const s = fromScale + (toScale - fromScale) * e;

      // Interpolate the world center so the viewport pans smoothly
      // between frames (focus-only) or zooms around the target (mode change).
      const wcx = fromWorldCenter.x + (toWorldCenter.x - fromWorldCenter.x) * e;
      const wcy = fromWorldCenter.y + (toWorldCenter.y - fromWorldCenter.y) * e;

      setViewportRef.current({
        scale: s,
        origin: {
          x: screenCenter.x - wcx * s,
          y: screenCenter.y - wcy * s,
        },
      });

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = 0;
        isAnimatingRef.current = false;
        setIsAnimatingViewMode(false);
        setIsAnimatingModeChange(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, focusedFrameId, store, containerRef]);

  // Auto-zoom when the focused frame is resized (drag handles, properties panel, etc.)
  useEffect(() => {
    if (viewMode !== 'asset' || !focusedFrameId) return;

    let prevW = 0;
    let prevH = 0;

    // Initialise dimensions
    const fNode = store.getNode(focusedFrameId);
    if (fNode && isGeometryNode(fNode)) {
      prevW = fNode.width;
      prevH = fNode.height;
    }

    const unsub = store.addListener((_e) => {
      const node = store.getNode(focusedFrameId);
      if (!node || !isGeometryNode(node)) return;
      if (node.width === prevW && node.height === prevH) return;
      prevW = node.width;
      prevH = node.height;

      // Defer viewport update to a microtask so that recomputeGridLayout
      // (which also runs as a store listener) has already repositioned nodes.
      // Reading world position before layout runs causes misalignment.
      queueMicrotask(() => {
        const container = containerRef.current;
        if (!container) return;
        const updatedNode = store.getNode(focusedFrameId);
        if (!updatedNode || !isGeometryNode(updatedNode)) return;
        const vis = getVisibleBounds(container);
        const fitScale = computeAssetFitScale(updatedNode.width, updatedNode.height, vis.width, vis.height, ASSET_SAFE_ZONE);
        const pos = getWorldPosition(store, updatedNode);
        const cx = pos.x + updatedNode.width / 2;
        const cy = pos.y + updatedNode.height / 2;

        setViewportRef.current({
          scale: fitScale,
          origin: {
            x: vis.left + vis.width / 2 - cx * fitScale,
            y: vis.top + vis.height / 2 - cy * fitScale,
          },
        });
      });
    });

    return unsub;
  }, [viewMode, focusedFrameId, store, containerRef]);

  // Recompute grid layout whenever a managed frame's size changes
  useEffect(() => {
    // Snapshot sizes of all managed frames
    const prevSizes = new Map<NodeId, { w: number; h: number }>();
    const roots = getRootNodes(store, canvasId);
    for (const root of roots) {
      if (root.type !== 'SECTION' && root.type !== 'GRID_SECTION') continue;
      for (const childId of root.children) {
        const child = store.getNode(childId);
        if (child && isGeometryNode(child)) {
          prevSizes.set(childId, { w: child.width, h: child.height });
        }
      }
    }

    return store.addListener((_e) => {
      let changed = false;
      const currentRoots = getRootNodes(store, canvasId);
      for (const root of currentRoots) {
        if (root.type !== 'SECTION' && root.type !== 'GRID_SECTION') continue;
        for (const childId of root.children) {
          const child = store.getNode(childId);
          if (!child || !isGeometryNode(child)) continue;
          const prev = prevSizes.get(childId);
          if (!prev || prev.w !== child.width || prev.h !== child.height) {
            prevSizes.set(childId, { w: child.width, h: child.height });
            changed = true;
          }
        }
      }
      if (changed) {
        const sectionIds = currentRoots.filter((n) => n.type === 'SECTION' || n.type === 'GRID_SECTION').map((n) => n.id);
        recomputeGridLayout(store, sectionIds);
      }
    });
  }, [store, canvasId]);

  // ── Pointer handlers (delegated to behavior manager) ──────────────

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // Hit-test to determine if a node was right-clicked
      const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);

      if (hitId) {
        if (!selection.isSelected(hitId)) {
          selection.select(hitId);
        }
        onOpenContextMenu?.('node', e.clientX, e.clientY);
      } else {
        selection.clear();
        onOpenContextMenu?.('canvas', e.clientX, e.clientY);
      }
    },
    [selection, onOpenContextMenu],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      selection.setHovered(null);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      bm.onPointerDown(e);
    },
    [selection, bm],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      bm.onPointerMove(e);
    },
    [bm],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      bm.onPointerUp(e);
      if (skipTextExitRef.current) {
        skipTextExitRef.current = false;
      } else if (textEditing.editingNodeId) {
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId !== textEditing.editingNodeId) {
          textEditing.stopEditing();
        }
      }
    },
    [bm, textEditing, selection],
  );

  // ── Comment pin drag handlers ──────────────────────────────────────────

  const handleCommentDragStart = useCallback(
    (threadId: string) => {
      setSelectedThreadId(null);
      setInteraction({ type: 'dragging', threadId, worldX: 0, worldY: 0 });
    },
    [setSelectedThreadId, setInteraction],
  );

  const handleCommentDragMove = useCallback(
    (threadId: string, worldX: number, worldY: number) => {
      setInteraction({ type: 'dragging', threadId, worldX, worldY });
    },
    [setInteraction],
  );

  const handleCommentDragEnd = useCallback(
    (threadId: string, worldX: number, worldY: number) => {
      const hitNodeId = findNodeAtWorldPoint(store, canvasId, worldX, worldY);
      if (hitNodeId) {
        const node = store.getNode(hitNodeId);
        if (node && isGeometryNode(node)) {
          const nodeWorldPos = getWorldPosition(store, node);
          commentsStore.updateAnchor(threadId, {
            worldX,
            worldY,
            nodeId: String(hitNodeId),
            nodeOffsetX: worldX - nodeWorldPos.x,
            nodeOffsetY: worldY - nodeWorldPos.y,
          });
        }
      } else {
        commentsStore.updateAnchor(threadId, {
          worldX,
          worldY,
          nodeId: undefined,
          nodeOffsetX: undefined,
          nodeOffsetY: undefined,
        });
      }
      setInteraction({ type: 'none' });
    },
    [store, canvasId, commentsStore, setInteraction],
  );

  // Cursor style based on active tool
  const cursorStyle = (() => {
    switch (effectiveTool) {
      case 'HAND': return isPanning ? CURSORS.grabbing : CURSORS.grab;
      case 'FRAME': return CURSORS.frame;
      case 'PEN': return CURSORS.pen;
      case 'PENCIL': return CURSORS.pencil;
      case 'TEXT':
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'LINE':
      case 'POLYGON':
      case 'STAR': return CURSORS.crosshair;
      case 'COMMENT': return CURSORS.commentNext;
      default: return CURSORS.default;
    }
  })();

  // Pixel grid at 400%+ zoom
  const { scale, origin } = viewportState;
  const showPixelGrid = scale >= 4;
  const pixelGridStyle: React.CSSProperties | undefined = showPixelGrid
    ? {
      position: 'absolute',
      inset: 0,
      backgroundImage: [
        'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: `${scale}px ${scale}px`,
      backgroundPosition: `${origin.x % scale}px ${origin.y % scale}px`,
      pointerEvents: 'none',
    }
    : undefined;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: isDefaultPageBackground(pageBg) ? 'var(--color-fsCanvasDefaultFill)' : `rgb(${pageBg.color.r}, ${pageBg.color.g}, ${pageBg.color.b})`, cursor: cursorStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => selection.setHovered(null)}
      onContextMenu={onContextMenu}
    >
      <CanvasLayers
        nodeLayer={
          <>
            <CanvasRenderer />
            {gridDropTarget && <GridDropIndicator store={store} target={gridDropTarget} />}
            <svg
              ref={pencilOverlayRef}
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
            />
            <CommentPinLayer
              commentsStore={commentsStore}
              interaction={interaction}
              selectedThreadId={selectedThreadId}
              zoom={scale}
              getNodePosition={getNodePosition}
              onPinClick={(threadId) => {
                setSelectedThreadId(threadId);
                setInteraction({ type: 'viewing', threadId });
              }}
              onPinHoverStart={(threadId) => {
                if (interaction.type !== 'viewing' && interaction.type !== 'dragging') {
                  setInteraction({ type: 'hovering', threadId });
                }
              }}
              onPinHoverEnd={() => {
                if (interaction.type === 'hovering') {
                  setInteraction({ type: 'none' });
                }
              }}
              onDragStart={handleCommentDragStart}
              onDragMove={handleCommentDragMove}
              onDragEnd={handleCommentDragEnd}
              screenToWorld={screenToWorld}
              containerRef={containerRef}
              nodeStoreSubscribe={nodeStoreSubscribe}
              nodeStoreGetSnapshot={nodeStoreGetSnapshot}
            />
          </>
        }
        reactOverlay={<SelectionOverlay />}
      />
      {showPixelGrid && <div style={pixelGridStyle} />}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Figma-style hit resolution.
 *
 * Walk up from the click target collecting all `data-node-id` values into a
 * chain (innermost first -> reversed to outermost first).
 *
 * - `enteredFrameId === null` -> return the outermost (root-level) node
 * - `enteredFrameId` is set  -> return the direct child of the entered frame,
 *   or the entered frame itself if the click lands directly on it.
 */
function resolveHitNode(el: HTMLElement, enteredFrameId: NodeId | null): NodeId | null {
  // Collect all node IDs from innermost to outermost
  const chain: NodeId[] = [];
  let cur: HTMLElement | null = el;
  while (cur) {
    const raw = cur.dataset?.nodeId;
    if (raw) {
      const id = Number(raw) as NodeId;
      if (!chain.includes(id)) {
        chain.push(id);
      }
    }
    cur = cur.parentElement;
  }

  if (chain.length === 0) return null;

  // Reverse so chain[0] is outermost (root-level)
  chain.reverse();

  if (enteredFrameId === null) {
    // Select the innermost (deepest) node so children are directly clickable
    return chain[chain.length - 1];
  }

  // Find the entered frame in the chain
  const enteredIdx = chain.indexOf(enteredFrameId);
  if (enteredIdx === -1) {
    // Click is outside the entered frame entirely
    return null;
  }

  // Return the direct child of the entered frame (one level deeper)
  if (enteredIdx + 1 < chain.length) {
    return chain[enteredIdx + 1];
  }

  // Click landed directly on the entered frame (no deeper child)
  return enteredFrameId;
}

/** Get the children of a canvas as SceneNode[] */
function getRootNodes(sg: ReturnType<typeof useSceneGraph>, canvasId: NodeId) {
  const canvas = sg.getNode(canvasId);
  if (!canvas) return [];
  return canvas.children.map((id) => sg.getNode(id)).filter((n): n is SceneNode => n != null);
}

/** Vertical drop indicator line rendered in world-space */
function GridDropIndicator({
  store,
  target,
}: {
  store: ReturnType<typeof useSceneGraph>
  target: DropTarget
}) {
  const x = getDropIndicatorX(store, target);
  const section = store.getNode(target.sectionId);
  if (!section || !isGeometryNode(section)) return null;
  const sWorld = getWorldPosition(store, section);

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 1,
        top: sWorld.y + 40,
        width: 2,
        height: section.height - 40,
        backgroundColor: '#0d99ff',
        borderRadius: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
