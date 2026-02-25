import { useEffect, useRef, useState } from 'react';

import { useSceneGraph } from '../scene-graph/provider';
import type { GeometryNode } from '../types';
import { getWorldPosition, isGeometryNode } from '../scene-graph/world-position';
import { useActiveTool } from '../tools/provider';
import { useViewport } from '../viewport/provider';

import { useSelection } from './provider';

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;
const EDGE_THICKNESS = 4;
const SELECTION_COLOR = '#0d99ff';

interface OriginalGeometry {
  x: number
  y: number
  width: number
  height: number
}

const CORNER_CURSORS: Record<string, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
};

const EDGE_CURSORS: Record<string, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

/**
 * DOM-based resize handles rendered over the selected node.
 * These replace the old canvas-drawn handles and support drag-to-resize.
 */
export function ResizeHandles() {
  const { selectedIds } = useSelection();
  const store = useSceneGraph();
  const { state: viewport } = useViewport();
  const { effectiveTool } = useActiveTool();

  // Subscribe to store changes so handles reposition when nodes move
  const [, bumpStoreVersion] = useState(0);
  useEffect(() => store.subscribe(() => bumpStoreVersion((n) => n + 1)), [store]);

  // Track original geometry during drag
  const dragState = useRef<{
    handle: HandlePosition
    nodeId: string
    original: OriginalGeometry
    startClientX: number
    startClientY: number
    shiftKey: boolean
    aspectRatio: number
  } | null>(null);

  // Force re-render during drag to keep handles in sync
  const [, forceUpdate] = useState(0);

  // Only render for single selection with MOVE tool
  if (selectedIds.size !== 1 || effectiveTool !== 'MOVE') return null;

  const nodeId = selectedIds.values().next().value;
  if (!nodeId) return null;

  const node = store.getNode(nodeId);
  if (!node || !isGeometryNode(node) || node.locked) return null;

  // Convert to screen-space
  const world = getWorldPosition(store, node);
  const sx = world.x * viewport.scale + viewport.origin.x;
  const sy = world.y * viewport.scale + viewport.origin.y;
  const sw = node.width * viewport.scale;
  const sh = node.height * viewport.scale;

  const half = HANDLE_SIZE / 2;

  function onHandlePointerDown(handle: HandlePosition, e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();

    const geoNode = node as GeometryNode;
    dragState.current = {
      handle,
      nodeId: nodeId!,
      original: {
        x: geoNode.x,
        y: geoNode.y,
        width: geoNode.width,
        height: geoNode.height,
      },
      startClientX: e.clientX,
      startClientY: e.clientY,
      shiftKey: e.shiftKey,
      aspectRatio: geoNode.width / geoNode.height,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;

    // Update shift key state live
    drag.shiftKey = e.shiftKey;

    const dxScreen = e.clientX - drag.startClientX;
    const dyScreen = e.clientY - drag.startClientY;
    const dxWorld = dxScreen / viewport.scale;
    const dyWorld = dyScreen / viewport.scale;

    const { original, handle } = drag;
    let newX = original.x;
    let newY = original.y;
    let newW = original.width;
    let newH = original.height;

    // Compute new geometry based on which handle is being dragged
    const movesLeft = handle === 'nw' || handle === 'w' || handle === 'sw';
    const movesRight = handle === 'ne' || handle === 'e' || handle === 'se';
    const movesTop = handle === 'nw' || handle === 'n' || handle === 'ne';
    const movesBottom = handle === 'sw' || handle === 's' || handle === 'se';

    if (movesLeft) {
      newX = original.x + dxWorld;
      newW = original.width - dxWorld;
    }
    if (movesRight) {
      newW = original.width + dxWorld;
    }
    if (movesTop) {
      newY = original.y + dyWorld;
      newH = original.height - dyWorld;
    }
    if (movesBottom) {
      newH = original.height + dyWorld;
    }

    // Shift-drag: proportional constraint (only for corner handles)
    if (drag.shiftKey && 'nw|ne|sw|se'.includes(handle)) {
      const ar = drag.aspectRatio;
      // Determine which dimension governs
      if (Math.abs(dxWorld) * (1 / ar) > Math.abs(dyWorld)) {
        // Width governs
        newH = newW / ar;
        if (movesTop) {
          newY = original.y + original.height - newH;
        }
      } else {
        // Height governs
        newW = newH * ar;
        if (movesLeft) {
          newX = original.x + original.width - newW;
        }
      }
    }

    // Enforce minimum size
    if (newW < 1) {
      if (movesLeft) newX = original.x + original.width - 1;
      newW = 1;
    }
    if (newH < 1) {
      if (movesTop) newY = original.y + original.height - 1;
      newH = 1;
    }

    store.updateNode(drag.nodeId, {
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    });

    forceUpdate((n) => n + 1);
  }

  function onHandlePointerUp(e: React.PointerEvent) {
    if (!dragState.current) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
  }

  // Shared event handlers for all handles
  const sharedProps = {
    onPointerMove: onHandlePointerMove,
    onPointerUp: onHandlePointerUp,
  };

  // Corner handles
  const corners: { pos: HandlePosition; cx: number; cy: number }[] = [
    { pos: 'nw', cx: sx, cy: sy },
    { pos: 'ne', cx: sx + sw, cy: sy },
    { pos: 'sw', cx: sx, cy: sy + sh },
    { pos: 'se', cx: sx + sw, cy: sy + sh },
  ];

  // Edge handles (thin strips between corners)
  const edges: { pos: HandlePosition; style: React.CSSProperties }[] = [
    {
      pos: 'n',
      style: {
        left: sx + half,
        top: sy - EDGE_THICKNESS / 2,
        width: sw - HANDLE_SIZE,
        height: EDGE_THICKNESS,
      },
    },
    {
      pos: 's',
      style: {
        left: sx + half,
        top: sy + sh - EDGE_THICKNESS / 2,
        width: sw - HANDLE_SIZE,
        height: EDGE_THICKNESS,
      },
    },
    {
      pos: 'w',
      style: {
        left: sx - EDGE_THICKNESS / 2,
        top: sy + half,
        width: EDGE_THICKNESS,
        height: sh - HANDLE_SIZE,
      },
    },
    {
      pos: 'e',
      style: {
        left: sx + sw - EDGE_THICKNESS / 2,
        top: sy + half,
        width: EDGE_THICKNESS,
        height: sh - HANDLE_SIZE,
      },
    },
  ];

  return (
    <>
      {/* Edge handles */}
      {edges.map(({ pos, style }) => (
        <div
          key={pos}
          style={{
            position: 'absolute',
            ...style,
            cursor: EDGE_CURSORS[pos],
            zIndex: 11,
          }}
          onPointerDown={(e) => onHandlePointerDown(pos, e)}
          {...sharedProps}
        />
      ))}
      {/* Corner handles */}
      {corners.map(({ pos, cx, cy }) => (
        <div
          key={pos}
          style={{
            position: 'absolute',
            left: cx - half,
            top: cy - half,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: '#ffffff',
            border: `1px solid ${SELECTION_COLOR}`,
            cursor: CORNER_CURSORS[pos],
            zIndex: 11,
          }}
          onPointerDown={(e) => onHandlePointerDown(pos, e)}
          {...sharedProps}
        />
      ))}
    </>
  );
}
