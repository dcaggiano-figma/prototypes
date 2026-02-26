import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import type { NodeType } from '../types';
import { usePageBackground, useSceneGraph } from '../scene-graph/provider';
import { getWorldPosition, isGeometryNode } from '../scene-graph/world-position';
import { SelectionOverlay } from '../selection/overlay';
import { useSelection } from '../selection/provider';
import { useActiveTool } from '../tools/provider';
import { useViewport } from '../viewport/provider';

import { CURSORS } from '../cursors';
import { useTextEditing } from '../text-editing/provider';
import { CanvasRenderer } from './canvas-renderer';

/** Shape tools that support click-drag-to-create */
const CREATION_TOOLS = new Set(['FRAME', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR']);

/** Default fills for newly created shapes */
const SHAPE_FILL = { type: 'SOLID' as const, color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true };
const FRAME_FILL = { type: 'SOLID' as const, color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true };
const TEXT_FILL = { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true };
const DEFAULT_STROKE = {
  paint: { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true },
  weight: 1,
  position: 'CENTER' as const,
};

export function Canvas() {
  const viewport = useViewport();
  const { containerRef, transform, screenToWorld } = viewport;
  const selection = useSelection();
  const store = useSceneGraph();
  const pageBg = usePageBackground();
  const { effectiveTool, setActiveTool } = useActiveTool();
  const textEditing = useTextEditing();

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

  /** Tracks active shape creation drag */
  const creationRef = useRef<{
    nodeId: string
    nodeType: NodeType
    startWorldX: number
    startWorldY: number
  } | null>(null);

  /** Skip the click-away text editing exit on the pointerup that follows text creation */
  const skipTextExitRef = useRef(false);

  // Cancel any in-progress creation drag when the tool switches away
  useEffect(() => {
    if (!CREATION_TOOLS.has(effectiveTool)) {
      creationRef.current = null;
    }
  }, [effectiveTool]);

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

      // Text tool: click-to-place a text node and enter editing
      if (effectiveTool === 'TEXT') {
        const node = store.createNode('TEXT', {
          x: world.x,
          y: world.y,
          width: 120,
          height: 22,
          fills: [TEXT_FILL],
        });
        selection.select(node.id);
        textEditing.startEditing(node.id);
        setActiveTool('MOVE');
        skipTextExitRef.current = true;
        return;
      }

      // Shape creation tools: create a node at click position and start drag-to-resize
      if (CREATION_TOOLS.has(effectiveTool)) {
        const nodeType = effectiveTool as NodeType;
        const isLine = nodeType === 'LINE';
        const fills = isLine ? [] : nodeType === 'FRAME' ? [FRAME_FILL] : [SHAPE_FILL];
        const extra: Record<string, unknown> = {};
        if (nodeType === 'FRAME') extra.clipsContent = true;
        if (isLine) extra.strokes = [DEFAULT_STROKE];
        const node = store.createNode(nodeType, {
          x: world.x,
          y: world.y,
          width: 0,
          height: 0,
          fills,
          ...extra,
        });
        creationRef.current = {
          nodeId: node.id,
          nodeType,
          startWorldX: world.x,
          startWorldY: world.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

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
    [containerRef, screenToWorld, store, selection, effectiveTool, textEditing, setActiveTool],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Shape creation drag — resize the new node
      const creation = creationRef.current;
      if (creation) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        const world = screenToWorld(localX, localY);

        // LINE: compute width as distance, rotation as angle, height stays 0
        if (creation.nodeType === 'LINE') {
          const dx = world.x - creation.startWorldX;
          const dy = world.y - creation.startWorldY;
          let length = Math.sqrt(dx * dx + dy * dy);
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);

          // Shift-drag: snap to 45-degree increments
          if (e.shiftKey) {
            angle = Math.round(angle / 45) * 45;
            const rad = angle * (Math.PI / 180);
            length = Math.abs(dx * Math.cos(rad) + dy * Math.sin(rad));
          }

          store.updateNode(creation.nodeId, {
            x: creation.startWorldX,
            y: creation.startWorldY,
            width: length,
            height: 0,
            rotation: angle,
          });
          return;
        }

        let x = Math.min(creation.startWorldX, world.x);
        let y = Math.min(creation.startWorldY, world.y);
        let w = Math.abs(world.x - creation.startWorldX);
        let h = Math.abs(world.y - creation.startWorldY);

        // Shift-drag: constrain to square/circle
        if (e.shiftKey) {
          const size = Math.max(w, h);
          w = size;
          h = size;
          // Anchor from the original start point
          if (world.x < creation.startWorldX) x = creation.startWorldX - size;
          if (world.y < creation.startWorldY) y = creation.startWorldY - size;
        }

        store.updateNode(creation.nodeId, { x, y, width: w, height: h });
        return;
      }

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
      // Click-away exits text editing (skip on the pointerup from text creation)
      if (skipTextExitRef.current) {
        skipTextExitRef.current = false;
      } else if (textEditing.editingNodeId) {
        const hitId = resolveHitNode(e.target as HTMLElement, selection.enteredFrameId);
        if (hitId !== textEditing.editingNodeId) {
          textEditing.stopEditing();
        }
      }

      // Finalize shape creation
      const creation = creationRef.current;
      if (creation) {
        creationRef.current = null;
        const node = store.getNode(creation.nodeId);
        if (node && isGeometryNode(node)) {
          // If the shape is too small (click without meaningful drag), set a default size
          if (node.width < 2 && node.height < 2) {
            if (creation.nodeType === 'LINE') {
              store.updateNode(creation.nodeId, {
                x: creation.startWorldX,
                y: creation.startWorldY,
                width: 100,
                height: 0,
                rotation: 0,
              });
            } else {
              const defaultW = creation.nodeType === 'FRAME' ? 200 : 100;
              const defaultH = creation.nodeType === 'FRAME' ? 150 : 100;
              store.updateNode(creation.nodeId, {
                x: creation.startWorldX,
                y: creation.startWorldY,
                width: defaultW,
                height: defaultH,
              });
            }
          }
        }
        selection.select(creation.nodeId);
        setActiveTool('MOVE');
        return;
      }

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
        // Double-click detected — enter frame or edit text
        lastClickRef.current = null;
        if (effectiveTool === 'MOVE' && hitId) {
          if (selection.isSelected(hitId)) {
            const node = store.getNode(hitId);
            if (node?.type === 'TEXT') {
              textEditing.startEditing(hitId);
            } else if (node?.type === 'FRAME') {
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
    [selection, effectiveTool, store, setActiveTool, textEditing],
  );

  // Cursor style based on active tool
  const cursorStyle = (() => {
    switch (effectiveTool) {
      case 'HAND': return isPanning ? CURSORS.grabbing : CURSORS.grab;
      case 'FRAME': return CURSORS.frame;
      case 'PEN': return CURSORS.pen;
      case 'TEXT':
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'LINE':
      case 'POLYGON':
      case 'STAR': return CURSORS.crosshair;
      default: return CURSORS.default;
    }
  })();

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
      style={{ backgroundColor: `rgb(${pageBg.color.r}, ${pageBg.color.g}, ${pageBg.color.b})`, cursor: cursorStyle }}
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
