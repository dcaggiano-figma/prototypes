import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import { usePageBackground, useSceneGraph } from '../scene-graph/provider';
import { getWorldPosition, isGeometryNode } from '../scene-graph/world-position';
import { SelectionOverlay } from '../selection/overlay';
import { useSelection } from '../selection/provider';
import { useActiveTool } from '../tools/provider';
import { useViewport } from '../viewport/provider';

import { CanvasRenderer } from './canvas-renderer';

export function Canvas() {
  const viewport = useViewport();
  const { containerRef, transform, screenToWorld } = viewport;
  const selection = useSelection();
  const store = useSceneGraph();
  const pageBg = usePageBackground();
  const { effectiveTool } = useActiveTool();

  /** Whether the hand tool is actively dragging (for cursor styling) */
  const [isPanning, setIsPanning] = useState(false);

  /** Screen-space drag box for box selection (null when not dragging on empty canvas) */
  const [dragBox, setDragBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null);

  /** Tracks the pointer-down position and drag state */
  const dragRef = useRef<{
    startX: number
    startY: number
    dragging: boolean
    /** World-space position at last pointer event */
    lastWorld: { x: number; y: number }
    /** IDs being dragged */
    nodeIds: string[]
  } | null>(null);

  /** Tracks hand-tool panning state (screen-space) */
  const panRef = useRef<{ lastX: number; lastY: number } | null>(null);

  /** Tracks last click for manual double-click detection */
  const lastClickRef = useRef<{ time: number; clientX: number; clientY: number } | null>(null);

  // Register selection actions
  useAction(
    'select-all',
    useCallback(() => {
      for (const node of store.getRootNodes()) {
        selection.add(node.id);
      }
    }, [store, selection]),
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
    }, [store, selection]),
  );

  useAction(
    'zoom-to-fit',
    useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      // Compute world-space bounding box of all nodes
      const roots = store.getRootNodes();
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
      const rect = container.getBoundingClientRect();
      const availW = rect.width - padding * 2;
      const availH = rect.height - padding * 2;
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      if (contentW <= 0 || contentH <= 0) return;

      const scale = Math.min(availW / contentW, availH / contentH, 4);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      viewport.setState({
        scale,
        origin: {
          x: rect.width / 2 - cx * scale,
          y: rect.height / 2 - cy * scale,
        },
      });
    }, [store, containerRef, viewport]),
  );

  // Center content before first paint (useLayoutEffect fires before browser paints)
  const didCenter = useRef(false);
  useLayoutEffect(() => {
    if (didCenter.current) return;
    const container = containerRef.current;
    if (!container) return;

    const roots = store.getRootNodes();
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

    const rect = container.getBoundingClientRect();
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    didCenter.current = true;
    viewport.setState({
      scale: 1,
      origin: {
        x: rect.width / 2 - cx,
        y: rect.height / 2 - cy,
      },
    });
  }, [store, containerRef, viewport]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Hand tool: start panning
      if (effectiveTool === 'HAND') {
        panRef.current = { lastX: e.clientX, lastY: e.clientY };
        setIsPanning(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const world = screenToWorld(localX, localY);

      if (effectiveTool === 'MOVE') {
        // If we have a multi-selection, check if click is inside the combined
        // bounding box — if so, start dragging all selected nodes
        if (selection.selectedIds.size > 1) {
          const bbox = getSelectionBBox(store, selection.selectedIds);
          if (bbox && pointInRect(world.x, world.y, bbox)) {
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              dragging: false,
              lastWorld: world,
              nodeIds: collectDraggableIds(store, selection.selectedIds),
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
          }
        }

        // DOM hit-test with Figma-style frame resolution
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId) {
          // If the hit node isn't selected, select it now
          if (!selection.isSelected(hitId)) {
            if (e.shiftKey) {
              selection.toggle(hitId);
            } else {
              selection.select(hitId);
            }
          }

          // Use hitId directly — React state from select() hasn't committed yet
          const node = store.getNode(hitId);
          const dragIds = node && isGeometryNode(node) ? [hitId] : [];

          const nodeIds = selection.isSelected(hitId)
            ? collectDraggableIds(store, selection.selectedIds)
            : dragIds;

          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            dragging: false,
            lastWorld: world,
            nodeIds,
          };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }

      // No hit or not move tool — just record position for click detection
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
        lastWorld: world,
        nodeIds: [],
      };

      // Start box selection when clicking empty canvas with move tool
      if (effectiveTool === 'MOVE') {
        setDragBox({
          startX: localX, startY: localY, currentX: localX, currentY: localY,
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [containerRef, screenToWorld, store, selection, effectiveTool],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Hand tool panning
      const pan = panRef.current;
      if (pan) {
        const dx = e.clientX - pan.lastX;
        const dy = e.clientY - pan.lastY;
        pan.lastX = e.clientX;
        pan.lastY = e.clientY;
        viewport.setState((prev) => ({
          ...prev,
          origin: { x: prev.origin.x + dx, y: prev.origin.y + dy },
        }));
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;

      // Update box selection drag
      if (drag.nodeIds.length === 0 && dragBox) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setDragBox((prev) => (prev
            ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top }
            : null));
        }
        return;
      }

      if (drag.nodeIds.length === 0) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      // Start dragging once past threshold
      if (!drag.dragging && dx * dx + dy * dy > 9) {
        drag.dragging = true;
      }

      if (!drag.dragging) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const world = screenToWorld(localX, localY);
      const worldDx = world.x - drag.lastWorld.x;
      const worldDy = world.y - drag.lastWorld.y;
      drag.lastWorld = world;

      // Update all dragged nodes
      for (const id of drag.nodeIds) {
        const node = store.getNode(id);
        if (!node || !isGeometryNode(node)) continue;
        store.updateNode(id, {
          x: node.x + worldDx,
          y: node.y + worldDy,
        });
      }
    },
    [containerRef, screenToWorld, store, dragBox, viewport],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // End hand tool panning
      if (panRef.current) {
        panRef.current = null;
        setIsPanning(false);
        return;
      }

      const drag = dragRef.current;
      dragRef.current = null;
      setDragBox(null);

      if (!drag) return;

      // If we were dragging, don't do click-to-select
      if (drag.dragging) {
        lastClickRef.current = null;
        return;
      }

      // Treat as click — do selection
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (dx * dx + dy * dy > 25) return;

      const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);

      if (hitId) {
        if (e.shiftKey) {
          selection.toggle(hitId);
        } else {
          selection.select(hitId);
        }
      } else if (selection.enteredFrameId !== null) {
        // Click outside entered frame → exit frame
        selection.exitFrame();
        selection.clear();
      } else {
        selection.clear();
      }

      // Manual double-click detection: check if this click is close in time and
      // position to the previous one
      const now = Date.now();
      const last = lastClickRef.current;
      if (
        last
        && now - last.time < 300
        && Math.abs(e.clientX - last.clientX) < 5
        && Math.abs(e.clientY - last.clientY) < 5
      ) {
        // Double-click detected — enter frame if applicable
        lastClickRef.current = null;
        if (effectiveTool === 'MOVE' && hitId) {
          if (selection.isSelected(hitId)) {
            const node = store.getNode(hitId);
            if (node?.type === 'FRAME') {
              selection.enterFrame(hitId);
              const childId = resolveHitNode(e.target as HTMLElement, hitId);
              selection.select(childId && childId !== hitId ? childId : hitId);
            }
          }
        }
      } else {
        lastClickRef.current = { time: now, clientX: e.clientX, clientY: e.clientY };
      }
    },
    [selection, effectiveTool, store],
  );

  // Hand tool cursor
  const handCursor = effectiveTool === 'HAND' ? (isPanning ? 'grabbing' : 'grab') : undefined;

  // Pixel grid at 400%+ zoom
  const { scale, origin } = viewport.state;
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
      style={{ backgroundColor: `rgb(${pageBg.color.r}, ${pageBg.color.g}, ${pageBg.color.b})`, cursor: handCursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        style={{
          transformOrigin: '0 0',
          transform,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <CanvasRenderer />
      </div>
      {showPixelGrid && <div style={pixelGridStyle} />}
      <SelectionOverlay dragBox={dragBox} />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Figma-style hit resolution.
 *
 * Walk up from the click target collecting all `data-node-id` values into a
 * chain (innermost first → reversed to outermost first).
 *
 * - `enteredFrameId === null` → return the outermost (root-level) node
 * - `enteredFrameId` is set  → return the direct child of the entered frame,
 *   or the entered frame itself if the click lands directly on it.
 */
function resolveHitNode(el: HTMLElement, enteredFrameId: string | null): string | null {
  // Collect all node IDs from innermost to outermost
  const chain: string[] = [];
  let cur: HTMLElement | null = el;
  while (cur) {
    const id = cur.dataset?.nodeId;
    if (id && !chain.includes(id)) {
      chain.push(id);
    }
    cur = cur.parentElement;
  }

  if (chain.length === 0) return null;

  // Reverse so chain[0] is outermost (root-level)
  chain.reverse();

  if (enteredFrameId === null) {
    // Not inside any frame — select the root-level node
    return chain[0];
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

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Compute the combined world-space bounding box of all selected nodes */
function getSelectionBBox(
  store: ReturnType<typeof useSceneGraph>,
  selectedIds: Set<string>,
): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (!node || !isGeometryNode(node)) continue;
    const pos = getWorldPosition(store, node);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + node.width);
    maxY = Math.max(maxY, pos.y + node.height);
  }

  if (!isFinite(minX)) return null;
  return {
    x: minX, y: minY, w: maxX - minX, h: maxY - minY,
  };
}

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Collect IDs of all selected geometry nodes for dragging */
function collectDraggableIds(
  store: ReturnType<typeof useSceneGraph>,
  selectedIds: Set<string>,
): string[] {
  const ids: string[] = [];
  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (node && isGeometryNode(node)) ids.push(id);
  }
  return ids;
}
