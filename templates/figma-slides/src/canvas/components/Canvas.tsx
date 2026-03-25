import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addListener } from '@figma/fpl-components';

import {
  type NodeId, type SceneNode,
  useSceneGraph, useCanvasId, usePageBackground, isDefaultPageBackground,
  useSelection, useTextEditing,
  useViewport, useViewportState,
  getWorldPosition, isGeometryNode,
  findNodeAtWorldPoint,
  useBehaviorManager,
  useUndoManager,
  useUndoActions,
  useNudgeActions,
  useReorderActions,
  CanvasLayers,
  copyNodes,
  cutNodes,
  pasteNodes,
  pasteExternalNodes,
  duplicateNodes,
  hasFigmaClipboardData,
  decodeFigmaClipboard,
  hasRecentInternalCopy,
  clearInternalCopyFlag,
} from '@prototype/shared/canvas';

import { useAction } from '../../actions/provider';
import { useActiveTool } from '../tools/provider';
import { useBehaviorChain } from '../behaviors';
import { CURSORS } from '../cursors';
import { CanvasRenderer } from './canvas-renderer';
import { SelectionOverlay } from '../selection/overlay';
import { CommentPinLayer, useComments } from '@prototype/shared';
import { useViewMode } from '../../components/ViewModeContext';
import { getDropIndicatorX, recomputeGridLayout, type DropTarget } from '../scene-graph/grid';

/**
 * Get the visible canvas bounds, accounting for the left sidebar.
 * Falls back to the full container rect if no <main> sibling is found.
 */
function getVisibleBounds(containerEl: HTMLElement, bottomInset = 0) {
  const full = containerEl.getBoundingClientRect();
  const main = containerEl.parentElement?.querySelector('main');
  if (main) {
    const mainRect = main.getBoundingClientRect();
    return { left: mainRect.left, top: full.top, width: mainRect.width, height: full.height - bottomInset };
  }
  return { left: full.left, top: full.top, width: full.width, height: full.height - bottomInset };
}

/** Padding (px) around the frame when auto-fitting in asset view */
const ASSET_FIT_PADDING = 16;

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

/** Safe zone in pixels around the focused frame for pan bounds (asset mode) */
const ASSET_SAFE_ZONE = 200;

interface CanvasProps {
  onOpenContextMenu?: (type: 'node' | 'canvas', x: number, y: number) => void;
}

export function Canvas({ onOpenContextMenu }: CanvasProps) {
  const viewport = useViewport();
  const { containerRef, screenToWorld } = viewport;
  const vp = viewport.instance;
  const { state: viewportState } = useViewportState();
  const selection = useSelection();
  const store = useSceneGraph();
  const canvasId = useCanvasId();
  const pageBg = usePageBackground(canvasId);
  const { effectiveTool, setActiveTool, drawColor, drawStrokeWeight, drawOpacity } = useActiveTool();
  const textEditing = useTextEditing();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore } = useComments();
  const { viewMode, focusedFrameId, setFocusedFrameId, setIsAnimatingViewMode, bottomInsetRef, onBottomInsetChange } = useViewMode();

  /** Tracks whether the user has manually zoomed (disables auto-fit) */
  const userZoomedRef = useRef(false);
  const [, setUserZoomVersion] = useState(0);

  /** Grid drop target for visual indicator when dragging managed frames */
  const [gridDropTarget, setGridDropTarget] = useState<DropTarget | null>(null);

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

  // Register layer order actions
  const reorder = useReorderActions();
  useAction('bring-to-front', reorder.bringToFront);
  useAction('send-to-back', reorder.sendToBack);

  // Register selection actions
  useAction(
    'select-all',
    useCallback(() => {
      const canvasNode = store.getNodeOrThrow(canvasId);
      const roots = canvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
      for (const node of roots) {
        selection.add(node.id);
      }
    }, [store, selection, canvasId]),
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
      // Recompute grid layout after deletion
      const canvasNode = store.getNodeOrThrow(canvasId);
      const roots = canvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
      const sectionIds = roots.filter((n) => n.type === 'SECTION' || n.type === 'GRID_SECTION').map((n) => n.id);
      recomputeGridLayout(store, sectionIds);
      um.commit();
    }, [store, selection, canvasId, um]),
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

  // Handle all paste via the native event — Figma clipboard or internal
  useEffect(
    () => addListener(document, 'paste', (e: ClipboardEvent) => {
      // Don't intercept paste for text inputs — let the browser handle natively
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const center = screenToWorld(rect.width / 2, rect.height / 2);

      // If the user did an internal copy/cut more recently than the last
      // external paste, prefer the internal clipboard over stale Figma HTML
      // that may still be on the system clipboard.
      const html = e.clipboardData?.getData('text/html');
      if (html && hasFigmaClipboardData(html) && !hasRecentInternalCopy()) {
        e.preventDefault();
        clearInternalCopyFlag();
        decodeFigmaClipboard(html).then((result) => {
          if (!result) return;
          const newIds = pasteExternalNodes(
            store,
            canvasId,
            result.nodes,
            selection.selectedIds,
            center,
          );
          if (newIds.length > 0) {
            selection.selectMany(newIds);
          }
          um.commit();
        });
        return;
      }

      // Internal clipboard paste
      const newIds = pasteNodes(store, canvasId, selection.selectedIds, center);
      if (newIds.length > 0) {
        selection.selectMany(newIds);
      }
      um.commit();
    }),
    [store, canvasId, selection, containerRef, screenToWorld, um],
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

      // Reset user zoom override — re-engage auto-fit
      userZoomedRef.current = false;
      setUserZoomVersion((v) => v + 1);

      const isAsset = viewMode === 'asset';
      const inset = isAsset ? bottomInsetRef.current : 0;

      // In asset mode with a focused frame, fit to that frame
      if (isAsset && focusedFrameId) {
        const fNode = store.getNode(focusedFrameId);
        if (!fNode || !isGeometryNode(fNode)) return;
        const vis = getVisibleBounds(container, inset);
        const fitScale = computeAssetFitScale(fNode.width, fNode.height, vis.width, vis.height, ASSET_FIT_PADDING);
        const pos = getWorldPosition(store, fNode);
        const cx = pos.x + fNode.width / 2;
        const cy = pos.y + fNode.height / 2;
        viewport.setState({
          scale: fitScale,
          origin: {
            x: vis.left + vis.width / 2 - cx * fitScale,
            y: vis.top + vis.height / 2 - cy * fitScale,
          },
        });
        return;
      }

      // Compute world-space bounding box of all nodes
      const canvasNode = store.getNodeOrThrow(canvasId);
      const roots = canvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
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
      const vis = getVisibleBounds(container, inset);
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
    }, [store, containerRef, viewport, viewMode, focusedFrameId, bottomInsetRef, canvasId]),
  );

  // Dynamic min scale for zoom actions:
  // - asset (slide/focus) mode: clamp to 50% so the slide stays readable
  // - grid mode: allow zooming out much further (2%)
  const minScale = (() => {
    if (viewMode === 'asset') {
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
      if (viewMode === 'asset') {
        userZoomedRef.current = true;
        setUserZoomVersion((v) => v + 1);
      }
      const inset = viewMode === 'asset' ? bottomInsetRef.current : 0;
      const vis = getVisibleBounds(container, inset);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;
      viewport.setState((prev) => {
        const newScale = Math.min(prev.scale * 2, maxScale);
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: newScale, origin: { x: cx - worldX * newScale, y: cy - worldY * newScale } };
      });
    }, [containerRef, viewport, maxScale, viewMode, bottomInsetRef]),
  );

  useAction(
    'zoom-out',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      if (viewMode === 'asset') {
        userZoomedRef.current = true;
        setUserZoomVersion((v) => v + 1);
      }
      const inset = viewMode === 'asset' ? bottomInsetRef.current : 0;
      const vis = getVisibleBounds(container, inset);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;
      viewport.setState((prev) => {
        const newScale = Math.max(prev.scale / 2, minScale);
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: newScale, origin: { x: cx - worldX * newScale, y: cy - worldY * newScale } };
      });
    }, [containerRef, viewport, minScale, viewMode, bottomInsetRef]),
  );

  useAction(
    'zoom-to-100',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      if (viewMode === 'asset') {
        userZoomedRef.current = true;
        setUserZoomVersion((v) => v + 1);
      }
      const inset = viewMode === 'asset' ? bottomInsetRef.current : 0;
      const vis = getVisibleBounds(container, inset);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;
      viewport.setState((prev) => {
        const worldX = (cx - prev.origin.x) / prev.scale;
        const worldY = (cy - prev.origin.y) / prev.scale;
        return { scale: 1, origin: { x: cx - worldX, y: cy - worldY } };
      });
    }, [containerRef, viewport, viewMode, bottomInsetRef]),
  );

  // Center content before first paint (useLayoutEffect fires before browser paints)
  const didCenter = useRef(false);
  useLayoutEffect(() => {
    if (didCenter.current) return;
    const container = containerRef.current;
    if (!container) return;

    const canvasNode = store.getNodeOrThrow(canvasId);
    const roots = canvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
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
  }, [store, containerRef, viewport, canvasId]);

  // Guard: skip re-entry while animation is in progress
  const isAnimatingRef = useRef(false);

  // ── Asset-mode viewport constraints (buzz-style clampPanBounds) ──────
  const minScaleRef = useRef(minScale);
  minScaleRef.current = minScale;

  const clampPanBounds = () => {
    if (viewMode !== 'asset' || !focusedFrameId || isAnimatingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const fNode = store.getNode(focusedFrameId);
    if (!fNode || !isGeometryNode(fNode)) return;
    const pos = getWorldPosition(store, fNode);
    const vis = getVisibleBounds(container, bottomInsetRef.current);
    const s = vp.scale;
    const ox = vp.originX;
    const oy = vp.originY;

    const fL = pos.x * s + ox;
    const fT = pos.y * s + oy;
    const fW = fNode.width * s;
    const fH = fNode.height * s;
    const safePx = ASSET_SAFE_ZONE * s;
    const szL = fL - safePx;
    const szT = fT - safePx;
    const szW = fW + safePx * 2;
    const szH = fH + safePx * 2;

    let nx = ox;
    let ny = oy;

    if (szW <= vis.width) {
      const frameCenterWorld = pos.x + fNode.width / 2;
      nx = vis.left + vis.width / 2 - frameCenterWorld * s;
    } else {
      if (szL > vis.left) nx -= szL - vis.left;
      const szR = szL + szW;
      const visR = vis.left + vis.width;
      if (szR < visR) nx += visR - szR;
    }

    if (szH <= vis.height) {
      const frameCenterWorld = pos.y + fNode.height / 2;
      ny = vis.top + vis.height / 2 - frameCenterWorld * s;
    } else {
      if (szT > vis.top) ny -= szT - vis.top;
      const szB = szT + szH;
      const visB = vis.top + vis.height;
      if (szB < visB) ny += visB - szB;
    }

    if (nx !== ox || ny !== oy) vp.set(nx, ny, s);
  };
  const clampPanBoundsRef = useRef(clampPanBounds);
  clampPanBoundsRef.current = clampPanBounds;

  // Capture-phase wheel listener for asset mode (overrides shared viewport's wheel handler)
  useEffect(() => {
    if (viewMode !== 'asset') return;
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const newScale = Math.max(
          minScaleRef.current,
          Math.min(maxScale, vp.scale * (1 - e.deltaY / 100)),
        );
        vp.zoomTo(newScale, mx, my);
        userZoomedRef.current = true;
        setUserZoomVersion((v) => v + 1);
      } else {
        vp.pan(-e.deltaX, -e.deltaY);
      }
      clampPanBoundsRef.current();
    };

    container.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => container.removeEventListener('wheel', onWheel, { capture: true });
  }, [viewMode, vp, containerRef, maxScale]);

  // Safety-net viewport subscribe: clamp pan bounds on any viewport change in asset mode
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
    const wasGrid = prevViewModeForFocusRef.current === 'grid';
    prevViewModeForFocusRef.current = viewMode;
    pendingFocusIdRef.current = null;

    if (viewMode !== 'asset') return;

    // If switching from grid, try to focus the selected slide
    if (wasGrid) {
      for (const id of selection.selectedIds) {
        const node = store.getNode(id);
        if (node && node.type === 'SLIDE') {
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
          if (parent && parent.type === 'SLIDE') {
            pendingFocusIdRef.current = parent.id;
            setFocusedFrameId(parent.id);
            return;
          }
        }
      }
    }

    // Default: focus first slide if nothing is focused
    if (!focusedFrameId) {
      const canvasNode = store.getNodeOrThrow(canvasId);
      const roots = canvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
      const firstSection = roots.find((n) => n.type === 'SECTION' || n.type === 'GRID_SECTION');
      if (firstSection && firstSection.children.length > 0) {
        pendingFocusIdRef.current = firstSection.children[0];
        setFocusedFrameId(firstSection.children[0]);
      }
    }
  }, [viewMode, focusedFrameId, store, setFocusedFrameId, selection.selectedIds, canvasId]);

  // Track visible-area center and shift viewport when the left panel opens/closes/resizes.
  const prevVisCenterRef = useRef<{ cx: number; cy: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const main = container.parentElement?.querySelector('main');
    if (!main) return;

    const inset = viewMode === 'asset' ? bottomInsetRef.current : 0;

    const observer = new ResizeObserver(() => {
      const currentInset = viewMode === 'asset' ? bottomInsetRef.current : 0;
      const vis = getVisibleBounds(container, currentInset);
      const cx = vis.left + vis.width / 2;
      const cy = vis.top + vis.height / 2;

      // In asset mode without user zoom, re-fit the focused frame on resize
      if (viewMode === 'asset' && focusedFrameId && !userZoomedRef.current) {
        const fNode = store.getNode(focusedFrameId);
        if (fNode && isGeometryNode(fNode)) {
          const fitScale = computeAssetFitScale(fNode.width, fNode.height, vis.width, vis.height, ASSET_FIT_PADDING);
          const pos = getWorldPosition(store, fNode);
          const wcx = pos.x + fNode.width / 2;
          const wcy = pos.y + fNode.height / 2;
          viewport.setState({
            scale: fitScale,
            origin: { x: cx - wcx * fitScale, y: cy - wcy * fitScale },
          });
          prevVisCenterRef.current = { cx, cy };
          return;
        }
      }

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
    });

    // Seed the initial center
    const vis = getVisibleBounds(container, inset);
    prevVisCenterRef.current = { cx: vis.left + vis.width / 2, cy: vis.top + vis.height / 2 };
    observer.observe(main);

    return () => observer.disconnect();
  }, [containerRef, viewport, viewMode, bottomInsetRef, focusedFrameId, store]);

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

    const container = containerRef.current;
    if (!container) return;
    const isAssetMode = viewMode === 'asset';
    const inset = isAssetMode ? bottomInsetRef.current : 0;
    const vis = getVisibleBounds(container, inset);

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
      const fitScale = computeAssetFitScale(fNode.width, fNode.height, vis.width, vis.height, ASSET_FIT_PADDING);
      target = { scale: fitScale, worldCenter: focusedWorldCenter };
    } else if (viewMode === 'asset' && !effectiveFocusId) {
      // Waiting for focusedFrameId to be set — don't consume pendingAnimateRef
      return;
    } else if (viewMode === 'grid') {
      const canvasNode = store.getNodeOrThrow(canvasId);
      const roots = canvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
      if (roots.length === 0) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
      const availW = vis.width - padding * 2;
      const availH = vis.height - padding * 2;
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      if (contentW <= 0 || contentH <= 0) return;
      const scale = Math.min(availW / contentW, availH / contentH, 4);
      // Keep the focused frame centered in grid view (rather than centering on all content)
      target = { scale, worldCenter: focusedWorldCenter ?? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } };
    }

    if (!target) return;

    const screenCenter = { x: vis.left + vis.width / 2, y: vis.top + vis.height / 2 };

    // Consume the pending animate flag
    const shouldAnimate = pendingAnimateRef.current;
    pendingAnimateRef.current = false;

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

    // Animated transition between view modes.
    // Interpolate scale and world-space center independently, then derive
    // origin each frame. This keeps the focused frame visually centered
    // throughout the zoom instead of drifting.
    const fromState = viewportStateRef.current;
    const fromWorldCenter = {
      x: (screenCenter.x - fromState.origin.x) / fromState.scale,
      y: (screenCenter.y - fromState.origin.y) / fromState.scale,
    };
    // Use the focused frame as the pivot so it stays centered throughout
    const pivotCenter = focusedWorldCenter ?? fromWorldCenter;
    const fromScale = fromState.scale;
    const toScale = target.scale;
    const duration = 600;
    const start = performance.now();

    // Ease-in-out cubic
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    isAnimatingRef.current = true;
    // Use queueMicrotask to avoid triggering a synchronous re-render
    // (which would run cleanup and cancel the animation we just started)
    queueMicrotask(() => setIsAnimatingViewMode(true));

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const e = ease(t);

      const s = fromScale + (toScale - fromScale) * e;

      setViewportRef.current({
        scale: s,
        origin: {
          x: screenCenter.x - pivotCenter.x * s,
          y: screenCenter.y - pivotCenter.y * s,
        },
      });

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = 0;
        isAnimatingRef.current = false;
        setIsAnimatingViewMode(false);
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

    const unsub = store.addListener(() => {
      if (userZoomedRef.current) return;
      const node = store.getNode(focusedFrameId);
      if (!node || !isGeometryNode(node)) return;
      if (node.width === prevW && node.height === prevH) return;
      prevW = node.width;
      prevH = node.height;

      const container = containerRef.current;
      if (!container) return;
      const vis = getVisibleBounds(container, bottomInsetRef.current);
      const fitScale = computeAssetFitScale(node.width, node.height, vis.width, vis.height, ASSET_FIT_PADDING);
      const pos = getWorldPosition(store, node);
      const cx = pos.x + node.width / 2;
      const cy = pos.y + node.height / 2;

      setViewportRef.current({
        scale: fitScale,
        origin: {
          x: vis.left + vis.width / 2 - cx * fitScale,
          y: vis.top + vis.height / 2 - cy * fitScale,
        },
      });
    });

    return unsub;
  }, [viewMode, focusedFrameId, store, containerRef, bottomInsetRef]);

  // Reset userZoomed when focusedFrameId or viewMode changes
  useEffect(() => {
    userZoomedRef.current = false;
    setUserZoomVersion((v) => v + 1);
  }, [viewMode, focusedFrameId]);

  // Re-fit when the bottom inset changes (speaker notes resize)
  useEffect(() => {
    if (viewMode !== 'asset' || !focusedFrameId) return;

    return onBottomInsetChange(() => {
      if (userZoomedRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const fNode = store.getNode(focusedFrameId);
      if (!fNode || !isGeometryNode(fNode)) return;

      const vis = getVisibleBounds(container, bottomInsetRef.current);
      const fitScale = computeAssetFitScale(fNode.width, fNode.height, vis.width, vis.height, ASSET_FIT_PADDING);
      const pos = getWorldPosition(store, fNode);
      const cx = pos.x + fNode.width / 2;
      const cy = pos.y + fNode.height / 2;

      setViewportRef.current({
        scale: fitScale,
        origin: {
          x: vis.left + vis.width / 2 - cx * fitScale,
          y: vis.top + vis.height / 2 - cy * fitScale,
        },
      });
    });
  }, [viewMode, focusedFrameId, store, containerRef, onBottomInsetChange, bottomInsetRef]);

  // Recompute grid layout whenever a managed frame's size changes
  useEffect(() => {
    // Snapshot sizes of all managed frames
    const prevSizes = new Map<NodeId, { w: number; h: number }>();
    const canvasNode = store.getNodeOrThrow(canvasId);
    const roots = canvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
    for (const root of roots) {
      if (root.type !== 'SECTION' && root.type !== 'GRID_SECTION') continue;
      for (const childId of root.children) {
        const child = store.getNode(childId);
        if (child && isGeometryNode(child)) {
          prevSizes.set(childId, { w: child.width, h: child.height });
        }
      }
    }

    return store.addListener(() => {
      let changed = false;
      const currentCanvasNode = store.getNodeOrThrow(canvasId);
      const currentRoots = currentCanvasNode.children.map(id => store.getNode(id)).filter(Boolean) as SceneNode[];
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

  // ── Pointer handlers (delegate to behavior manager) ─────────────────

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
    [store, commentsStore, setInteraction, canvasId],
  );

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
      data-tool={effectiveTool}
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
              nodeStoreSubscribe={(cb: () => void) => store.addListener(cb)}
              nodeStoreGetSnapshot={() => store.getNodeOrThrow(canvasId).children}
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
    const idStr = cur.dataset?.nodeId;
    if (idStr) {
      const id = Number(idStr) as NodeId;
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
