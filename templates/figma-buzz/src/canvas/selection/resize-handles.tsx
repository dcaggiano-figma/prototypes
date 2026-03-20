import { useCallback, useEffect, useRef, useState } from 'react';

import { useAction } from '../../actions/provider';
import {
  useSceneGraph,
  useCanvasId,
  computeGroupScreenBBox,
  getWorldPosition,
  isGeometryNode,
  useViewportState,
  useSelection,
  useTextEditing,
  applyNodeReparenting,
  applyContainerReparenting,
  isContainer,
  getLineEndpoints,
  lineParamsFromEndpoints,
} from '@prototype/shared/canvas';
import type { GeometryNode, NodeId } from '@prototype/shared/canvas';
import { useActiveTool } from '../tools/provider';
import { CURSORS } from '../cursors';
import { isManagedSlide, recomputeGridLayout } from '../scene-graph/grid';

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;
const EDGE_THICKNESS = 4;
const SELECTION_COLOR = '#0d99ff';
const ROTATION_ZONE_SIZE = 16;
const ROTATION_ZONE_OFFSET = 10;

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
  const store = useSceneGraph();
  const canvasId = useCanvasId();
  const { state: viewport } = useViewportState();
  const { effectiveTool } = useActiveTool();
  const { startEditing } = useTextEditing();
  // Subscribe to store changes so handles reposition when nodes move
  const [, bumpStoreVersion] = useState(0);
  useEffect(() => store.addListener(() => bumpStoreVersion((n) => n + 1)), [store]);

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
      const n = store.getNode(id);
      if (!n) return;
      if (n.type === 'LINE') {
        setPointEditingId(id);
      } else if (n.type === 'TEXT') {
        startEditing(id);
      }
    }, [selectedIds, store, startEditing]),
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

  // Nothing to render when no selection or not using MOVE tool
  if (selectedIds.size === 0 || effectiveTool !== 'MOVE') return null;

  // Multi-select: render visual-only corner indicators at group bbox
  if (selectedIds.size > 1) {
    const groupBBox = computeGroupScreenBBox(store, selectedIds, viewport);
    if (!groupBBox) return null;

    const { minX, minY, maxX, maxY } = groupBBox;
    const indicatorSize = 8;
    const half = indicatorSize / 2;
    const corners = [
      { key: 'nw', x: minX, y: minY },
      { key: 'ne', x: maxX, y: minY },
      { key: 'sw', x: minX, y: maxY },
      { key: 'se', x: maxX, y: maxY },
    ];

    return (
      <>
        {corners.map((c) => (
          <div
            key={c.key}
            style={{
              position: 'absolute',
              left: c.x - half,
              top: c.y - half,
              width: indicatorSize,
              height: indicatorSize,
              backgroundColor: '#ffffff',
              border: `1px solid ${SELECTION_COLOR}`,
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

  const node = store.getNode(nodeId);
  if (!node || !isGeometryNode(node) || node.locked) return null;
  // Sections are not resizable — they use top-border highlight instead
  // Slides are only resizable from the floating toolbar
  if (node.type === 'SECTION' || node.type === 'GRID_SECTION' || node.type === 'SLIDE') return null;

  const world = getWorldPosition(store, node);
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

      if (isLine) {
        // Rotate around line midpoint: adjust x,y to keep midpoint fixed
        const origRad = drag.original.rotation * Math.PI / 180;
        const newRad = newRotation * Math.PI / 180;
        const halfW = drag.original.width / 2;
        store.updateNode(drag.nodeId, {
          rotation: newRotation,
          x: drag.original.x + halfW * (Math.cos(origRad) - Math.cos(newRad)),
          y: drag.original.y + halfW * (Math.sin(origRad) - Math.sin(newRad)),
        });
      } else {
        store.updateNode(drag.nodeId, { rotation: newRotation });
      }
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
      store.updateNode(drag.nodeId, params);
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
      store.updateNode(drag.nodeId, params);
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

    const updates: Partial<GeometryNode> & Record<string, unknown> = {
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    };

    // When a TEXT node is manually resized, switch to fixed width + auto height
    if (node?.type === 'TEXT') {
      updates.textAutoResize = 'HEIGHT';
    }

    store.updateNode(drag.nodeId, updates);

    forceUpdate((n) => n + 1);
  }

  function onHandlePointerUp(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
    setRotationDisplay(null);

    // After resize, check for section reparenting (not for rotation)
    if (drag.handle !== 'rotate') {
      // If a managed grid slide was resized, recompute the grid layout
      if (isManagedSlide(store, drag.nodeId)) {
        const canvas = store.getNode(canvasId);
        const sectionIds = canvas
          ? canvas.children
              .map((id) => store.getNode(id))
              .filter((n) => n && (n.type === 'SECTION' || n.type === 'GRID_SECTION'))
              .map((n) => n!.id)
          : [];
        recomputeGridLayout(store, sectionIds);
      } else {
        const resizedNode = store.getNode(drag.nodeId);
        if (resizedNode && isContainer(resizedNode)) {
          applyContainerReparenting(store, drag.nodeId, canvasId);
        } else {
          applyNodeReparenting(store, [drag.nodeId], canvasId);
        }
      }
    }
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

  // Rotation zone positions: just outside each corner diagonally
  const rotationZones = [
    { key: 'rot-nw', cx: hx - ROTATION_ZONE_OFFSET, cy: hy - ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateNW },
    { key: 'rot-ne', cx: hx + sw + ROTATION_ZONE_OFFSET, cy: hy - ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateNE },
    { key: 'rot-sw', cx: hx - ROTATION_ZONE_OFFSET, cy: hy + sh + ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateSW },
    { key: 'rot-se', cx: hx + sw + ROTATION_ZONE_OFFSET, cy: hy + sh + ROTATION_ZONE_OFFSET, cursor: CURSORS.rotateSE },
  ];

  // For lines, show the line length (not AABB dimensions)
  const lineLength = isLine ? Math.round(node.width) : 0;

  const handleElements = (
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
              border: `1px solid ${SELECTION_COLOR}`,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
          {/* Dimension label */}
          <div
            style={{
              position: 'absolute',
              left: sx + sw / 2,
              top: sy + sh + 8,
              transform: 'translateX(-50%)',
              backgroundColor: SELECTION_COLOR,
              color: '#ffffff',
              fontSize: 11,
              fontFamily: '"Inter", system-ui, sans-serif',
              padding: '3px 4px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {lineLength}
          </div>
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
            fontFamily: '"Inter", system-ui, sans-serif',
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
