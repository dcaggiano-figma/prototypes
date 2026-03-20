import { useCallback, useEffect, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import type { ConnectorEndpoint, ConnectorNode, GeometryNode, NodeId, CapType } from '@prototype/shared/canvas';
import {
  isConnectorNode,
  useSceneGraph,
  useCanvasId,
  getWorldPosition,
  isGeometryNode,
  useViewportState,
  useSelection,
  useTextEditing,
  useUndoManager,
  applyNodeReparenting,
  applyContainerReparenting,
  isContainer,
  getLineEndpoints,
  lineParamsFromEndpoints,
  findNodeNearWorldPoint,
  resolveEndpointPosition,
  snapToConnectionPoint,
  updateConnectorBounds,
  capInsetDistance,
  computeElbowWaypoints,
  computePathTangents,
  useEndpointDrag,
} from '@prototype/shared/canvas';
import { useActiveTool } from '../tools/provider';
import { CURSORS } from '../cursors';

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 12;
const EDGE_THICKNESS = 4;
const SELECTION_COLOR = '#0d99ff';
const ROTATION_ZONE_SIZE = 16;
const ROTATION_ZONE_OFFSET = 10;

/** Snap widths for sticky note resize */
const STICKY_SNAP_WIDTHS = [240, 416];
const STICKY_SNAP_THRESHOLD = (STICKY_SNAP_WIDTHS[1] - STICKY_SNAP_WIDTHS[0]) / 2 + STICKY_SNAP_WIDTHS[0];

function snapStickyWidth(w: number): number {
  return w >= STICKY_SNAP_THRESHOLD ? STICKY_SNAP_WIDTHS[1] : STICKY_SNAP_WIDTHS[0];
}

/** Normalize degrees to [0, 360) and format with 1 decimal */
function formatAngle(degrees: number): string {
  let normalized = degrees % 360;
  if (normalized < 0) normalized += 360;
  return `${normalized.toFixed(1)}\u00B0`;
}

interface OriginalGeometry {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

const CORNER_CURSORS: Record<string, string> = {
  nw: CURSORS.resizeNWSE,
  se: CURSORS.resizeNWSE,
  ne: CURSORS.resizeNESW,
  sw: CURSORS.resizeNESW,
};

const EDGE_CURSORS: Record<string, string> = {
  n: CURSORS.resizeV,
  s: CURSORS.resizeV,
  e: CURSORS.resizeH,
  w: CURSORS.resizeH,
};


/**
 * DOM-based resize handles rendered over the selected node.
 * These replace the old canvas-drawn handles and support drag-to-resize.
 */
export function ResizeHandles() {
  const { selectedIds } = useSelection();
  const sg = useSceneGraph();
  const canvasId = useCanvasId();
  const { state: viewport } = useViewportState();
  const { effectiveTool } = useActiveTool();
  const { startEditing } = useTextEditing();

  // Subscribe to scene graph changes so handles reposition when nodes move
  const [, bumpStoreVersion] = useState(0);
  useEffect(() => sg.addListener(() => bumpStoreVersion((n) => n + 1)), [sg]);

  // Point editing mode for lines (Enter to activate, Escape to exit)
  const [pointEditingId, setPointEditingId] = useState<NodeId | null>(null);

  // Track original geometry during drag
  const dragState = useRef<{
    handle: HandlePosition | 'point-start' | 'point-end' | 'rotate'
    nodeId: NodeId
    original: OriginalGeometry
    /** For line AABB resize: which diagonal the line follows */
    startIsLeft: boolean
    startIsTop: boolean
    /** Original AABB bounds for line resize */
    aabbLeft: number
    aabbTop: number
    aabbRight: number
    aabbBottom: number
    startClientX: number
    startClientY: number
    shiftKey: boolean
    aspectRatio: number
    /** Rotation-specific: screen-space center of bounding box */
    centerSX: number
    centerSY: number
    /** Rotation-specific: atan2 angle at drag start (radians) */
    initialAngle: number
  } | null>(null);

  // Force re-render during drag to keep handles in sync
  const [, forceUpdate] = useState(0);

  // Rotation tooltip state
  const [rotationDisplay, setRotationDisplay] = useState<{
    angle: number; clientX: number; clientY: number
  } | null>(null);

  // Enter key: enter point editing mode for selected lines, or text editing for text nodes
  useAction(
    'enter-point-edit',
    useCallback(() => {
      if (selectedIds.size !== 1) return;
      const id = selectedIds.values().next().value;
      if (!id) return;
      const n = sg.getNode(id);
      if (!n) return;
      if (n.type === 'LINE') {
        setPointEditingId(id);
      } else if (n.type === 'TEXT') {
        startEditing(id);
      }
    }, [selectedIds, sg, startEditing]),
  );

  // Clear point editing when selection changes
  useEffect(() => {
    if (pointEditingId && !selectedIds.has(pointEditingId)) {
      setPointEditingId(null);
    }
  }, [selectedIds, pointEditingId]);

  // Escape exits point editing mode (handled before deselect in the action)
  useEffect(() => {
    if (!pointEditingId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        setPointEditingId(null);
      }
    }
    // Capture phase so we intercept before the global shortcut handler
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [pointEditingId]);

  // Only render for MOVE tool with at least one selected node
  if (effectiveTool !== 'MOVE' || selectedIds.size === 0) return null;

  // --- Multi-select group handles (visual-only corner indicators) ---
  if (selectedIds.size >= 2) {
    let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;

    for (const id of selectedIds) {
      const n = sg.getNode(id);
      if (!n || !isGeometryNode(n)) continue;
      const w = getWorldPosition(sg, n);

      if (n.type === 'LINE') {
        const rad = (n.rotation ?? 0) * Math.PI / 180;
        const endWX = w.x + n.width * Math.cos(rad);
        const endWY = w.y + n.width * Math.sin(rad);
        gMinX = Math.min(gMinX, Math.min(w.x, endWX) * viewport.scale + viewport.origin.x);
        gMinY = Math.min(gMinY, Math.min(w.y, endWY) * viewport.scale + viewport.origin.y);
        gMaxX = Math.max(gMaxX, Math.max(w.x, endWX) * viewport.scale + viewport.origin.x);
        gMaxY = Math.max(gMaxY, Math.max(w.y, endWY) * viewport.scale + viewport.origin.y);
      } else {
        const rot = n.rotation ?? 0;
        const sxN = w.x * viewport.scale + viewport.origin.x;
        const syN = w.y * viewport.scale + viewport.origin.y;
        const swN = n.width * viewport.scale;
        const shN = n.height * viewport.scale;

        if (rot !== 0) {
          const cx = sxN + swN / 2, cy = syN + shN / 2;
          const rad = rot * Math.PI / 180;
          const cosA = Math.abs(Math.cos(rad)), sinA = Math.abs(Math.sin(rad));
          const aabbW = swN * cosA + shN * sinA;
          const aabbH = swN * sinA + shN * cosA;
          gMinX = Math.min(gMinX, cx - aabbW / 2); gMinY = Math.min(gMinY, cy - aabbH / 2);
          gMaxX = Math.max(gMaxX, cx + aabbW / 2); gMaxY = Math.max(gMaxY, cy + aabbH / 2);
        } else {
          gMinX = Math.min(gMinX, sxN); gMinY = Math.min(gMinY, syN);
          gMaxX = Math.max(gMaxX, sxN + swN); gMaxY = Math.max(gMaxY, syN + shN);
        }
      }
    }

    if (!isFinite(gMinX)) return null;

    const half = HANDLE_SIZE / 2;
    const groupCorners = [
      { key: 'g-nw', cx: gMinX, cy: gMinY },
      { key: 'g-ne', cx: gMaxX, cy: gMinY },
      { key: 'g-sw', cx: gMinX, cy: gMaxY },
      { key: 'g-se', cx: gMaxX, cy: gMaxY },
    ];

    return (
      <>
        {groupCorners.map(({ key, cx, cy }) => (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: cx - half,
              top: cy - half,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor: '#ffffff',
              border: `2px solid ${SELECTION_COLOR}`,
              borderRadius: 2,
              pointerEvents: 'none',
              zIndex: 11,
            }}
          />
        ))}
      </>
    );
  }

  const nodeId = selectedIds.values().next().value;
  if (!nodeId) return null;

  const node = sg.getNode(nodeId);
  if (!node || !isGeometryNode(node) || node.locked) return null;

  // --- Connector endpoint handles ---
  if (isConnectorNode(node)) {
    return (
      <ConnectorEndpointHandles
        node={node}
        sg={sg}
        viewport={viewport}
      />
    );
  }

  const world = getWorldPosition(sg, node);
  const isLine = node.type === 'LINE';
  const half = HANDLE_SIZE / 2;

  // --- Line AABB computation ---
  let aabbSX: number, aabbSY: number, aabbSW: number, aabbSH: number;
  let startIsLeft = true;
  let startIsTop = true;

  if (isLine) {
    const rad = (node.rotation ?? 0) * Math.PI / 180;
    const dx = node.width * Math.cos(rad);
    const dy = node.width * Math.sin(rad);
    const endWX = world.x + dx;
    const endWY = world.y + dy;

    const minWX = Math.min(world.x, endWX);
    const minWY = Math.min(world.y, endWY);
    const maxWX = Math.max(world.x, endWX);
    const maxWY = Math.max(world.y, endWY);

    aabbSX = minWX * viewport.scale + viewport.origin.x;
    aabbSY = minWY * viewport.scale + viewport.origin.y;
    aabbSW = (maxWX - minWX) * viewport.scale;
    aabbSH = (maxWY - minWY) * viewport.scale;

    startIsLeft = world.x <= endWX;
    startIsTop = world.y <= endWY;
  } else {
    aabbSX = world.x * viewport.scale + viewport.origin.x;
    aabbSY = world.y * viewport.scale + viewport.origin.y;
    aabbSW = node.width * viewport.scale;
    aabbSH = node.height * viewport.scale;
  }

  // Screen-space values for handle positioning
  const sx = aabbSX;
  const sy = aabbSY;
  const sw = aabbSW;
  const sh = aabbSH;

  function onHandlePointerDown(handle: HandlePosition | 'point-start' | 'point-end' | 'rotate', e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();

    const geoNode = node as GeometryNode;

    // For lines, compute AABB bounds in parent space
    let aabbL = 0, aabbT = 0, aabbR = 0, aabbB = 0;
    if (isLine) {
      const { start, end } = getLineEndpoints(geoNode);
      aabbL = Math.min(start.x, end.x);
      aabbT = Math.min(start.y, end.y);
      aabbR = Math.max(start.x, end.x);
      aabbB = Math.max(start.y, end.y);
    }

    // Compute screen-space center of bounding box for rotation
    const csx = sx + sw / 2;
    const csy = sy + sh / 2;
    const initialAngle = handle === 'rotate'
      ? Math.atan2(e.clientY - csy, e.clientX - csx)
      : 0;

    dragState.current = {
      handle,
      nodeId: nodeId!,
      original: {
        x: geoNode.x,
        y: geoNode.y,
        width: geoNode.width,
        height: geoNode.height,
        rotation: geoNode.rotation,
      },
      startIsLeft,
      startIsTop,
      aabbLeft: aabbL,
      aabbTop: aabbT,
      aabbRight: aabbR,
      aabbBottom: aabbB,
      startClientX: e.clientX,
      startClientY: e.clientY,
      shiftKey: e.shiftKey,
      aspectRatio: isLine ? 1 : geoNode.width / (geoNode.height || 1),
      centerSX: csx,
      centerSY: csy,
      initialAngle,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;

    drag.shiftKey = e.shiftKey;

    // --- Rotation drag ---
    if (drag.handle === 'rotate') {
      const currentAngle = Math.atan2(e.clientY - drag.centerSY, e.clientX - drag.centerSX);
      const deltaAngle = (currentAngle - drag.initialAngle) * 180 / Math.PI;
      let newRotation = drag.original.rotation + deltaAngle;

      // Shift-drag: snap to 15-degree increments
      if (e.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }

      sg.updateNode(drag.nodeId, { rotation: newRotation });
      setRotationDisplay({ angle: newRotation, clientX: e.clientX, clientY: e.clientY });
      forceUpdate((n) => n + 1);
      return;
    }

    const dxScreen = e.clientX - drag.startClientX;
    const dyScreen = e.clientY - drag.startClientY;
    const dxWorld = dxScreen / viewport.scale;
    const dyWorld = dyScreen / viewport.scale;

    // --- Point editing: free endpoint movement ---
    if (drag.handle === 'point-start' || drag.handle === 'point-end') {
      const { original } = drag;
      const { start, end } = getLineEndpoints(original as GeometryNode);

      let newStart = { ...start };
      let newEnd = { ...end };

      if (drag.handle === 'point-start') {
        newStart = { x: start.x + dxWorld, y: start.y + dyWorld };
      } else {
        newEnd = { x: end.x + dxWorld, y: end.y + dyWorld };
      }

      const params = lineParamsFromEndpoints(newStart.x, newStart.y, newEnd.x, newEnd.y);
      sg.updateNode(drag.nodeId, params);
      forceUpdate((n) => n + 1);
      return;
    }

    // --- Line AABB resize ---
    if (isLine) {
      const { handle } = drag;

      // Start with original AABB
      let newLeft = drag.aabbLeft;
      let newTop = drag.aabbTop;
      let newRight = drag.aabbRight;
      let newBottom = drag.aabbBottom;

      const movesLeft = handle === 'nw' || handle === 'w' || handle === 'sw';
      const movesRight = handle === 'ne' || handle === 'e' || handle === 'se';
      const movesTop = handle === 'nw' || handle === 'n' || handle === 'ne';
      const movesBottom = handle === 'sw' || handle === 's' || handle === 'se';

      if (movesLeft) newLeft += dxWorld;
      if (movesRight) newRight += dxWorld;
      if (movesTop) newTop += dyWorld;
      if (movesBottom) newBottom += dyWorld;

      // Map start/end to their corners of the new AABB
      const newStartX = drag.startIsLeft ? newLeft : newRight;
      const newStartY = drag.startIsTop ? newTop : newBottom;
      const newEndX = drag.startIsLeft ? newRight : newLeft;
      const newEndY = drag.startIsTop ? newBottom : newTop;

      const params = lineParamsFromEndpoints(newStartX, newStartY, newEndX, newEndY);
      sg.updateNode(drag.nodeId, params);
      forceUpdate((n) => n + 1);
      return;
    }

    // --- Standard rectangle resize ---
    const { original, handle } = drag;
    let newX = original.x;
    let newY = original.y;
    let newW = original.width;
    let newH = original.height;

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
    if (drag.shiftKey && ['nw', 'ne', 'sw', 'se'].includes(handle)) {
      const ar = drag.aspectRatio;
      if (Math.abs(dxWorld) * (1 / ar) > Math.abs(dyWorld)) {
        newH = newW / ar;
        if (movesTop) {
          newY = original.y + original.height - newH;
        }
      } else {
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

    // Sticky note: snap width to defined sizes during drag and enforce minimum square
    if (node?.type === 'STICKY_NOTE') {
      const snapped = snapStickyWidth(newW);
      if (movesLeft) {
        newX = newX + (newW - snapped);
      }
      newW = snapped;
      newH = Math.max(newW, newH); // Minimum square
    }

    const updates: Partial<GeometryNode> & Record<string, unknown> = {
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    };

    // When a TEXT node is manually resized, switch from WIDTH_AND_HEIGHT to HEIGHT
    // so the width stays fixed and only height auto-grows to fit content.
    if (node?.type === 'TEXT') {
      updates.textAutoResize = 'HEIGHT';
    }

    // Section resize: compensate children so they stay at the same world position.
    // When the section's origin shifts (left/top drag), offset children by the inverse.
    if (node?.type === 'SECTION') {
      const currentNode = sg.getNode(drag.nodeId);
      if (currentNode && isGeometryNode(currentNode)) {
        const dxLocal = newX - currentNode.x;
        const dyLocal = newY - currentNode.y;
        if (dxLocal !== 0 || dyLocal !== 0) {
          const sectionNode = sg.getNodeOrThrow(drag.nodeId);
          for (const childId of sectionNode.children) {
            const child = sg.getNode(childId);
            if (child && isGeometryNode(child)) {
              sg.updateNode(childId, {
                x: child.x - dxLocal,
                y: child.y - dyLocal,
              });
            }
          }
        }
      }
    }

    sg.updateNode(drag.nodeId, updates);

    forceUpdate((n) => n + 1);
  }

  function onHandlePointerUp(e: React.PointerEvent) {
    if (!dragState.current) return;
    // Final snap for sticky notes on release
    if (node?.type === 'STICKY_NOTE') {
      const current = sg.getNode(dragState.current.nodeId);
      if (current && isGeometryNode(current)) {
        const snapped = snapStickyWidth(current.width);
        if (snapped !== current.width) {
          const dx = current.width - snapped;
          const handle = dragState.current.handle;
          const movesLeft = handle === 'nw' || handle === 'w' || handle === 'sw';
          sg.updateNode(current.id, {
            width: snapped,
            height: Math.max(snapped, current.height),
            ...(movesLeft ? { x: current.x + dx } : {}),
          });
        }
      }
    }
    // Reparent after resize: sections adopt/release children, others check containment
    if (dragState.current.handle !== 'rotate') {
      const resizedNode = sg.getNode(dragState.current.nodeId);
      if (resizedNode && isContainer(resizedNode)) {
        applyContainerReparenting(sg, dragState.current.nodeId, canvasId);
      } else {
        applyNodeReparenting(sg, [dragState.current.nodeId], canvasId);
      }
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
    setRotationDisplay(null);
  }

  const sharedProps = {
    onPointerMove: onHandlePointerMove,
    onPointerUp: onHandlePointerUp,
  };

  // --- Point editing mode: show two round endpoint handles ---
  if (isLine && pointEditingId === nodeId) {
    const rad = (node.rotation ?? 0) * Math.PI / 180;
    const dx = node.width * Math.cos(rad);
    const dy = node.width * Math.sin(rad);

    const startSX = world.x * viewport.scale + viewport.origin.x;
    const startSY = world.y * viewport.scale + viewport.origin.y;
    const endSX = startSX + dx * viewport.scale;
    const endSY = startSY + dy * viewport.scale;

    const points: { handle: 'point-start' | 'point-end'; cx: number; cy: number }[] = [
      { handle: 'point-start', cx: startSX, cy: startSY },
      { handle: 'point-end', cx: endSX, cy: endSY },
    ];

    return (
      <div className="pointer-events-auto">
        {points.map(({ handle, cx, cy }) => (
          <div
            key={handle}
            style={{
              position: 'absolute',
              left: cx - half,
              top: cy - half,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor: '#ffffff',
              border: `1.5px solid ${SELECTION_COLOR}`,
              borderRadius: '50%',
              cursor: 'grab',
              zIndex: 11,
            }}
            onPointerDown={(e) => onHandlePointerDown(handle, e)}
            {...sharedProps}
          />
        ))}
      </div>
    );
  }

  // --- Standard corner + edge handles (used for both regular shapes and line AABB) ---
  const rotation = node.rotation ?? 0;

  // Handle positions are relative to (0,0) of the wrapper container
  const hx = 0;
  const hy = 0;

  const corners: { pos: HandlePosition; cx: number; cy: number }[] = [
    { pos: 'nw', cx: hx, cy: hy },
    { pos: 'ne', cx: hx + sw, cy: hy },
    { pos: 'sw', cx: hx, cy: hy + sh },
    { pos: 'se', cx: hx + sw, cy: hy + sh },
  ];

  const edges: { pos: HandlePosition; style: React.CSSProperties }[] = [
    {
      pos: 'n',
      style: {
        left: hx + half,
        top: hy - EDGE_THICKNESS / 2,
        width: sw - HANDLE_SIZE,
        height: EDGE_THICKNESS,
      },
    },
    {
      pos: 's',
      style: {
        left: hx + half,
        top: hy + sh - EDGE_THICKNESS / 2,
        width: sw - HANDLE_SIZE,
        height: EDGE_THICKNESS,
      },
    },
    {
      pos: 'w',
      style: {
        left: hx - EDGE_THICKNESS / 2,
        top: hy + half,
        width: EDGE_THICKNESS,
        height: sh - HANDLE_SIZE,
      },
    },
    {
      pos: 'e',
      style: {
        left: hx + sw - EDGE_THICKNESS / 2,
        top: hy + half,
        width: EDGE_THICKNESS,
        height: sh - HANDLE_SIZE,
      },
    },
  ];

  // Sticky notes: disable n/s (vertical-only) handles since height is auto-managed
  const isStickyNote = node.type === 'STICKY_NOTE';
  const filteredEdges = isStickyNote
    ? edges.filter(({ pos }) => pos !== 'n' && pos !== 's')
    : edges;

  // Rotation zone positions: just outside each corner diagonally
  const canRotate = !isLine && node.type !== 'SECTION' && node.type !== 'STICKY_NOTE';
  const rotationZones = canRotate ? [
    { key: 'rot-nw', cx: hx - ROTATION_ZONE_OFFSET, cy: hy - ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateNW },
    { key: 'rot-ne', cx: hx + sw + ROTATION_ZONE_OFFSET, cy: hy - ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateNE },
    { key: 'rot-sw', cx: hx - ROTATION_ZONE_OFFSET, cy: hy + sh + ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateSW },
    { key: 'rot-se', cx: hx + sw + ROTATION_ZONE_OFFSET, cy: hy + sh + ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateSE },
  ] : [];


  const handleElements = (
    <>
      {/* Edge handles */}
      {filteredEdges.map(({ pos, style }) => (
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
            border: `2px solid ${SELECTION_COLOR}`,
            borderRadius: 2,
            cursor: CORNER_CURSORS[pos],
            zIndex: 11,
          }}
          onPointerDown={(e) => onHandlePointerDown(pos, e)}
          {...sharedProps}
        />
      ))}
      {/* Rotation zone handles */}
      {rotationZones.map(({ key, cx, cy, cursor }) => (
        <div
          key={key}
          style={{
            position: 'absolute',
            left: cx - ROTATION_ZONE_SIZE / 2,
            top: cy - ROTATION_ZONE_SIZE / 2,
            width: ROTATION_ZONE_SIZE,
            height: ROTATION_ZONE_SIZE,
            cursor,
            zIndex: 12,
          }}
          onPointerDown={(e) => onHandlePointerDown('rotate', e)}
          {...sharedProps}
        />
      ))}
    </>
  );

  return (
    <>
      {/* Line AABB selection outline (rendered as DOM to avoid canvas coord issues) */}
      {isLine && (
        <>
          <div
            style={{
              position: 'absolute',
              left: sx,
              top: sy,
              width: sw,
              height: sh,
              border: `2px solid ${SELECTION_COLOR}`,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
          {/* Dimension labels hidden for FigJam */}
        </>
      )}
      {/* Always use a positioned wrapper — stable DOM tree preserves pointer capture during rotation drag */}
      <div
        style={{
          position: 'absolute',
          left: sx,
          top: sy,
          width: sw,
          height: sh,
          transform: !isLine && rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: '50% 50%',
          pointerEvents: 'none',
          zIndex: 11,
        }}
      >
        <div className="pointer-events-auto">
          {handleElements}
        </div>
      </div>
      {/* Rotation angle tooltip */}
      {rotationDisplay && (
        <div
          style={{
            position: 'fixed',
            left: rotationDisplay.clientX + 16,
            top: rotationDisplay.clientY - 12,
            backgroundColor: SELECTION_COLOR,
            color: '#ffffff',
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '2px 6px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {formatAngle(rotationDisplay.angle)}
        </div>
      )}
    </>
  );
}

// ── Connector endpoint handles ────────────────────────────────────────

function ConnectorEndpointHandles({
  node,
  sg,
  viewport,
}: {
  node: ConnectorNode
  sg: ReturnType<typeof useSceneGraph>
  viewport: { scale: number; origin: { x: number; y: number } }
}) {
  const canvasId = useCanvasId();
  const um = useUndoManager();
  const endpointDrag = useEndpointDrag();
  const [, forceUpdate] = useState(0);

  const dragState = useRef<{
    endpoint: 'start' | 'end'
    startClientX: number
    startClientY: number
  } | null>(null);

  const startPt = resolveEndpointPosition(sg, node.startEndpoint);
  const endPt = resolveEndpointPosition(sg, node.endEndpoint);
  if (!startPt || !endPt) return null;

  // Convert to screen space
  const startSX = startPt.x * viewport.scale + viewport.origin.x;
  const startSY = startPt.y * viewport.scale + viewport.origin.y;
  const endSX = endPt.x * viewport.scale + viewport.origin.x;
  const endSY = endPt.y * viewport.scale + viewport.origin.y;

  const half = HANDLE_SIZE / 2;

  function onEndpointPointerDown(endpoint: 'start' | 'end', e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = {
      endpoint,
      startClientX: e.clientX,
      startClientY: e.clientY,
    };
    endpointDrag?.setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onEndpointPointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;

    // Convert screen position to world coordinates
    const worldX = (e.clientX - viewport.origin.x) / viewport.scale;
    const worldY = (e.clientY - viewport.origin.y) / viewport.scale;

    // Hit-test nearby nodes for snap preview
    const safeZoneWorld = 16 / viewport.scale;
    const hoveredId = findNodeNearWorldPoint(sg, canvasId, worldX, worldY, safeZoneWorld);
    endpointDrag?.setHoverNodeId(hoveredId ?? null);
    endpointDrag?.setMouseWorld({ x: worldX, y: worldY });

    // Try to snap to a connection point during drag for visual feedback
    let newEndpoint: ConnectorEndpoint = { type: 'free', x: worldX, y: worldY };
    if (hoveredId) {
      const hoveredNode = sg.getNode(hoveredId);
      if (hoveredNode && isGeometryNode(hoveredNode) && !isConnectorNode(hoveredNode)) {
        const snapped = snapToConnectionPoint(sg, hoveredNode, worldX, worldY, 30);
        if (snapped) {
          if (snapped.pointIndex !== null) {
            newEndpoint = { type: 'connected', nodeId: hoveredNode.id, pointIndex: snapped.pointIndex };
          } else {
            const nodeWorld = getWorldPosition(sg, hoveredNode);
            const xFrac = hoveredNode.width > 0 ? (snapped.x - nodeWorld.x) / hoveredNode.width : 0.5;
            const yFrac = hoveredNode.height > 0 ? (snapped.y - nodeWorld.y) / hoveredNode.height : 0.5;
            newEndpoint = { type: 'edge', nodeId: hoveredNode.id, xFraction: xFrac, yFraction: yFrac };
          }
        }
      }
    }

    if (drag.endpoint === 'start') {
      sg.updateNode(node.id, { startEndpoint: newEndpoint });
    } else {
      sg.updateNode(node.id, { endEndpoint: newEndpoint });
    }
    forceUpdate((n) => n + 1);
  }

  function onEndpointPointerUp(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;

    const worldX = (e.clientX - viewport.origin.x) / viewport.scale;
    const worldY = (e.clientY - viewport.origin.y) / viewport.scale;

    // Try to snap to a node's connection point
    let finalEndpoint: ConnectorEndpoint = { type: 'free', x: worldX, y: worldY };

    const allNodes = sg.getDescendants(canvasId);
    let bestDist = Infinity;
    for (const n of allNodes) {
      if (!isGeometryNode(n) || isConnectorNode(n) || n.type === 'LINE' || n.type === 'VECTOR') continue;
      const snapped = snapToConnectionPoint(sg, n, worldX, worldY, 30);
      if (snapped) {
        const dx = snapped.x - worldX;
        const dy = snapped.y - worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          if (snapped.pointIndex !== null) {
            finalEndpoint = { type: 'connected', nodeId: n.id, pointIndex: snapped.pointIndex };
          } else {
            const nodeWorld = getWorldPosition(sg, n);
            const xFrac = n.width > 0 ? (snapped.x - nodeWorld.x) / n.width : 0.5;
            const yFrac = n.height > 0 ? (snapped.y - nodeWorld.y) / n.height : 0.5;
            finalEndpoint = { type: 'edge', nodeId: n.id, xFraction: xFrac, yFraction: yFrac };
          }
        }
      }
    }

    if (drag.endpoint === 'start') {
      sg.updateNode(node.id, { startEndpoint: finalEndpoint });
    } else {
      sg.updateNode(node.id, { endEndpoint: finalEndpoint });
    }
    updateConnectorBounds(sg, node.id);
    um.commit();

    // Clear drag context
    endpointDrag?.setDragging(false);
    endpointDrag?.setHoverNodeId(null);
    endpointDrag?.setMouseWorld(null);

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
  }

  const sharedProps = {
    onPointerMove: onEndpointPointerMove,
    onPointerUp: onEndpointPointerUp,
  };

  const endpoints = [
    { key: 'start' as const, cx: startSX, cy: startSY },
    { key: 'end' as const, cx: endSX, cy: endSY },
  ];

  return (
    <>
      {endpoints.map(({ key, cx, cy }) => (
        <div
          key={key}
          style={{
            position: 'absolute',
            left: cx - half,
            top: cy - half,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: '#ffffff',
            border: `2px solid ${SELECTION_COLOR}`,
            borderRadius: '50%',
            cursor: 'grab',
            pointerEvents: 'auto',
            zIndex: 11,
          }}
          onPointerDown={(e) => onEndpointPointerDown(key, e)}
          {...sharedProps}
        />
      ))}
      {node.lineShape === 'ELBOW' && startPt && endPt && (
        <ElbowMidpointHandles
          node={node}
          sg={sg}
          viewport={viewport}
          startPt={startPt}
          endPt={endPt}
        />
      )}
    </>
  );
}

// ── Elbow midpoint drag handles ──────────────────────────────────────

function ElbowMidpointHandles({
  node,
  sg,
  viewport,
  startPt,
  endPt,
}: {
  node: ConnectorNode
  sg: ReturnType<typeof useSceneGraph>
  viewport: { scale: number; origin: { x: number; y: number } }
  startPt: { x: number; y: number; exitDirection: { dx: number; dy: number } }
  endPt: { x: number; y: number; exitDirection: { dx: number; dy: number } }
}) {
  const dragRef = useRef<{
    axis: 'x' | 'y'
    rangeMin: number
    rangeMax: number
  } | null>(null);

  const [, forceUpdate] = useState(0);

  // Compute inset endpoints to match the visible connector path.
  // The ConnectorRenderer shortens the line for cap shapes; we must use the
  // same inset endpoints so the handle sits exactly on the visible path.
  const startPathPt = { x: startPt.x, y: startPt.y, exitDirection: startPt.exitDirection };
  const endPathPt = { x: endPt.x, y: endPt.y, exitDirection: endPt.exitDirection };
  const tangents = computePathTangents('ELBOW', startPathPt, endPathPt, node.elbowMidpointOffset);
  const startInset = capInsetDistance(node.startCap as CapType);
  const endInset = capInsetDistance(node.endCap as CapType);

  const insetStart = {
    x: startPt.x + tangents.startTangent.dx * startInset,
    y: startPt.y + tangents.startTangent.dy * startInset,
    exitDirection: startPt.exitDirection,
  };
  const insetEnd = {
    x: endPt.x - tangents.endTangent.dx * endInset,
    y: endPt.y - tangents.endTangent.dy * endInset,
    exitDirection: endPt.exitDirection,
  };

  const waypoints = computeElbowWaypoints(insetStart, insetEnd, node.elbowMidpointOffset);

  // Only show the bridge segment handle (p2→p3).
  // Stub-adjacent segments can't be independently moved with a single offset.
  const bridgeSeg = waypoints.adjustableSegments.find(
    (s) => s.startIdx === 2 && s.endIdx === 3,
  );
  if (!bridgeSeg) return null;

  const { axis: dragAxis, rangeMin, rangeMax } = bridgeSeg;
  const pStart = waypoints.points[bridgeSeg.startIdx];
  const pEnd = waypoints.points[bridgeSeg.endIdx];

  // Skip zero-length bridge (endpoints are nearly coincident)
  const segDx = Math.abs(pEnd.x - pStart.x);
  const segDy = Math.abs(pEnd.y - pStart.y);
  if (segDx < 0.5 && segDy < 0.5) return null;

  // Midpoint of bridge segment in world space
  const midWX = (pStart.x + pEnd.x) / 2;
  const midWY = (pStart.y + pEnd.y) / 2;

  // Convert to screen space
  const midSX = midWX * viewport.scale + viewport.origin.x;
  const midSY = midWY * viewport.scale + viewport.origin.y;

  // Segment orientation determines handle shape; drag axis is perpendicular
  const isVerticalSegment = segDy > segDx;
  const handleWidth = isVerticalSegment ? 6 : 20;
  const handleHeight = isVerticalSegment ? 20 : 6;
  const cursor = dragAxis === 'x' ? 'ew-resize' : 'ns-resize';

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      axis: dragAxis,
      rangeMin,
      rangeMax,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;

    const worldPos = drag.axis === 'x'
      ? (e.clientX - viewport.origin.x) / viewport.scale
      : (e.clientY - viewport.origin.y) / viewport.scale;

    const range = drag.rangeMax - drag.rangeMin;
    if (Math.abs(range) < 0.01) return;

    const newOffset = (worldPos - drag.rangeMin) / range;

    sg.updateNode(node.id, { elbowMidpointOffset: newOffset });
    forceUpdate((n) => n + 1);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    updateConnectorBounds(sg, node.id);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: midSX - handleWidth / 2,
        top: midSY - handleHeight / 2,
        width: handleWidth,
        height: handleHeight,
        backgroundColor: SELECTION_COLOR,
        borderRadius: 3,
        cursor,
        pointerEvents: 'auto',
        zIndex: 12,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
