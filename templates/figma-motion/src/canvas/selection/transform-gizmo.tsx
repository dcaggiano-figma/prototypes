import { useCallback, useEffect, useRef, useState } from 'react';
import { useSceneGraph, useViewportState, useSelection, getWorldPosition, isGeometryNode } from '@prototype/shared/canvas';
import { useKeyframeStoreOptional } from '../../contexts/KeyframeStoreContext';
import { usePlaybackOptional } from '../../contexts/PlaybackContext';
import { useDesignTabOptional } from '../../contexts/DesignTabContext';
import { interpolateKeyframes } from '../animation-utils';
import { CURSORS } from '../cursors';

const AXIS_LENGTH = 60;
const ARROW_SIZE = 10;
const HANDLE_SIZE = 10;
const CENTER_SIZE = 8;
const RING_PADDING = 16;
const RING_HIT_WIDTH = 12;

const X_COLOR = '#F24822';
const Y_COLOR = '#14AE5C';
const RING_COLOR = '#FFCD29';

type GizmoMode = 'move-x' | 'move-y' | 'move-xy' | 'scale-x' | 'scale-y' | 'rotate';

const SCALE_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><g filter="url(%23f)"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.94 9.94a1.5 1.5 0 012.12 0l1.5 1.5a1.5 1.5 0 010 2.12l-.44.44h9.76l-.44-.44a1.5 1.5 0 010-2.12l1.5-1.5a1.5 1.5 0 012.12 0l4.5 4.5a1.5 1.5 0 010 2.12l-4.5 4.5a1.5 1.5 0 01-2.12 0l-1.5-1.5a1.5 1.5 0 010-2.12l.44-.44h-9.76l.44.44a1.5 1.5 0 010 2.12l-1.5 1.5a1.5 1.5 0 01-2.12 0l-4.5-4.5a1.5 1.5 0 010-2.12l4.5-4.5z" fill="white"/></g><path fill-rule="evenodd" clip-rule="evenodd" d="M9.35 10.65a.5.5 0 010 .7L5.21 15.5l4.14 4.15a.5.5 0 01-.7.7l-4.5-4.5a.5.5 0 010-.7l4.5-4.5a.5.5 0 01.7 0zm13.3 0a.5.5 0 01.7 0l4.5 4.5a.5.5 0 010 .7l-4.5 4.5a.5.5 0 01-.7-.7l4.14-4.15-4.14-4.15a.5.5 0 010-.7zm-11.8 1.5a.5.5 0 010 .7L8.71 15h14.58l-2.14-2.15a.5.5 0 01.7-.7l3 3a.5.5 0 010 .7l-3 3a.5.5 0 01-.7-.7L23.29 16H8.71l2.14 2.15a.5.5 0 01-.7.7l-3-3a.5.5 0 010-.7l3-3a.5.5 0 01.7 0z" fill="black"/><defs><filter id="f" x="0" y="7.5" width="32" height="18" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="a"/><feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="b"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0"/><feBlend in2="a" result="c"/><feBlend in="SourceGraphic" in2="c" result="shape"/></filter></defs></svg>`;

const SCALE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(SCALE_CURSOR_SVG)}") 16 16, ew-resize`;

const SCALE_V_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><g transform="rotate(90 16 16)"><g filter="url(%23f)"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.94 9.94a1.5 1.5 0 012.12 0l1.5 1.5a1.5 1.5 0 010 2.12l-.44.44h9.76l-.44-.44a1.5 1.5 0 010-2.12l1.5-1.5a1.5 1.5 0 012.12 0l4.5 4.5a1.5 1.5 0 010 2.12l-4.5 4.5a1.5 1.5 0 01-2.12 0l-1.5-1.5a1.5 1.5 0 010-2.12l.44-.44h-9.76l.44.44a1.5 1.5 0 010 2.12l-1.5 1.5a1.5 1.5 0 01-2.12 0l-4.5-4.5a1.5 1.5 0 010-2.12l4.5-4.5z" fill="white"/></g><path fill-rule="evenodd" clip-rule="evenodd" d="M9.35 10.65a.5.5 0 010 .7L5.21 15.5l4.14 4.15a.5.5 0 01-.7.7l-4.5-4.5a.5.5 0 010-.7l4.5-4.5a.5.5 0 01.7 0zm13.3 0a.5.5 0 01.7 0l4.5 4.5a.5.5 0 010 .7l-4.5 4.5a.5.5 0 01-.7-.7l4.14-4.15-4.14-4.15a.5.5 0 010-.7zm-11.8 1.5a.5.5 0 010 .7L8.71 15h14.58l-2.14-2.15a.5.5 0 01.7-.7l3 3a.5.5 0 010 .7l-3 3a.5.5 0 01-.7-.7L23.29 16H8.71l2.14 2.15a.5.5 0 01-.7.7l-3-3a.5.5 0 010-.7l3-3a.5.5 0 01.7 0z" fill="black"/></g><defs><filter id="f" x="0" y="7.5" width="32" height="18" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="a"/><feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="b"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0"/><feBlend in2="a" result="c"/><feBlend in="SourceGraphic" in2="c" result="shape"/></filter></defs></svg>`;

const SCALE_V_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(SCALE_V_CURSOR_SVG)}") 16 16, ns-resize`;

const MOVE_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><g filter="url(%23f)"><path fill-rule="evenodd" clip-rule="evenodd" d="M17 20.09c.53-.19 1.14-.07 1.56.35a1.5 1.5 0 010 2.12l-2 2a1.5 1.5 0 01-2.12 0l-2-2a1.5 1.5 0 012.12-2.12c.06-.06.1-.1.14-.14L14 17h-3.09c.19.53.07 1.14-.35 1.56a1.5 1.5 0 01-2.12 0l-2-2a1.5 1.5 0 010-2.12l2-2a1.5 1.5 0 012.12 2.12c-.06.06-.1.1-.14.14L14 14l.01-3.09c-.53.19-1.14.07-1.56-.35a1.5 1.5 0 010-2.12l2-2a1.5 1.5 0 012.12 0l2 2a1.5 1.5 0 01-2.12 2.12L17 14h3.09c-.19-.53-.07-1.14.35-1.56a1.5 1.5 0 012.12 0l2 2a1.5 1.5 0 010 2.12l-2 2a1.5 1.5 0 01-2.12-2.12L17 17v3.09z" fill="white"/></g><path fill-rule="evenodd" clip-rule="evenodd" d="M13.85 21.15a.5.5 0 00-.7 0 .5.5 0 000 .7l2 2a.5.5 0 00.7 0l2-2a.5.5 0 00-.7-.7L16 22.29V16h6.29l-1.15 1.15a.5.5 0 00.71.7l2-2a.5.5 0 000-.7l-2-2a.5.5 0 00-.71.7L22.29 15H16V8.71l1.15 1.14a.5.5 0 00.7-.7l-2-2a.5.5 0 00-.7 0l-2 2a.5.5 0 00.7.7L15 8.71V15H8.71l1.14-1.15a.5.5 0 00-.7-.7l-2 2a.5.5 0 000 .7l2 2a.5.5 0 00.7-.7L8.71 16H15v6.29l-1.15-1.14z" fill="black"/><defs><filter id="f" x="3" y="4" width="25" height="25" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="a"/><feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="b"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0"/><feBlend in2="a" result="c"/><feBlend in="SourceGraphic" in2="c" result="shape"/></filter></defs></svg>`;

const MOVE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(MOVE_CURSOR_SVG)}") 16 16, move`;

const MIN_DIMENSION = 1;

export function TransformGizmo() {
  const { selectedIds } = useSelection();
  const store = useSceneGraph();
  const { state: vpState } = useViewportState();
  const kfStore = useKeyframeStoreOptional();
  const playback = usePlaybackOptional();
  const designTab = useDesignTabOptional();
  const isAnimateTab = designTab?.activeTab === 'animation';
  const autoActive = kfStore?.autoKeyframeActive ?? false;

  const scaleRef = useRef(vpState.scale);
  scaleRef.current = vpState.scale;

  const originRef = useRef(vpState.origin);
  originRef.current = vpState.origin;

  const [, bumpVersion] = useState(0);
  useEffect(() => store.addListener(() => bumpVersion((n) => n + 1)), [store]);

  const startDrag = useCallback(
    (mode: GizmoMode, numericNodeId: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const node = store.getNode(numericNodeId);
      if (!node || !isGeometryNode(node)) return;

      const nodeId = String(numericNodeId);
      const origX = node.x;
      const origY = node.y;
      const origW = node.width;
      const origH = node.height;
      const nodeRotation = node.rotation ?? 0;

      // Use visual (interpolated) values when keyframes exist,
      // so the drag starts from what the user sees on screen.
      let origRotation = nodeRotation;
      let effectiveOrigX = origX;
      let effectiveOrigY = origY;
      if (kfStore && playback) {
        const rotKfs = kfStore.getKeyframes(nodeId, 'rotation');
        if (rotKfs.length >= 2) {
          const interp = interpolateKeyframes(rotKfs, playback.currentMs);
          if (interp !== undefined) origRotation = interp;
        }
        const xKfs = kfStore.getKeyframes(nodeId, 'x');
        if (xKfs.length >= 2) {
          const interp = interpolateKeyframes(xKfs, playback.currentMs);
          if (interp !== undefined) effectiveOrigX = interp;
        }
        const yKfs = kfStore.getKeyframes(nodeId, 'y');
        if (yKfs.length >= 2) {
          const interp = interpolateKeyframes(yKfs, playback.currentMs);
          if (interp !== undefined) effectiveOrigY = interp;
        }
      }

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      let lastClientX = e.clientX;
      let lastClientY = e.clientY;

      let centerSX = 0;
      let centerSY = 0;
      let initialAngle = 0;

      if (mode === 'rotate') {
        const world = getWorldPosition(store, node);
        let ewx = world.x;
        let ewy = world.y;
        if (kfStore && playback) {
          const xKfs = kfStore.getKeyframes(nodeId, 'x');
          if (xKfs.length >= 2) {
            const v = interpolateKeyframes(xKfs, playback.currentMs);
            if (v !== undefined) ewx = world.x + (v - node.x);
          }
          const yKfs = kfStore.getKeyframes(nodeId, 'y');
          if (yKfs.length >= 2) {
            const v = interpolateKeyframes(yKfs, playback.currentMs);
            if (v !== undefined) ewy = world.y + (v - node.y);
          }
        }
        centerSX = (ewx + node.width / 2) * scaleRef.current + originRef.current.x;
        centerSY = (ewy + node.height / 2) * scaleRef.current + originRef.current.y;
        initialAngle = Math.atan2(e.clientY - centerSY, e.clientX - centerSX);
      }

      const cursorForMode = (): string => {
        switch (mode) {
          case 'rotate': return CURSORS.rotateNE;
          case 'scale-x': return SCALE_CURSOR;
          case 'scale-y': return SCALE_V_CURSOR;
          case 'move-x': return CURSORS.resizeH;
          case 'move-y': return CURSORS.resizeV;
          default: return MOVE_CURSOR;
        }
      };

      const prevCursor = document.body.style.cursor;
      document.body.style.cursor = cursorForMode();

      const onMove = (e2: PointerEvent) => {
        const scale = scaleRef.current;

        if (mode === 'rotate') {
          const currentAngle = Math.atan2(e2.clientY - centerSY, e2.clientX - centerSX);
          const deltaAngle = (currentAngle - initialAngle) * 180 / Math.PI;
          let newRotation = origRotation + deltaAngle;

          if (e2.shiftKey) {
            newRotation = Math.round(newRotation / 15) * 15;
          }

          store.updateNode(numericNodeId, { rotation: newRotation });

          if (kfStore && playback && (autoActive || kfStore.isPropertyEnabled(nodeId, 'rotation'))) {
            kfStore.addKeyframe(nodeId, 'rotation', playback.currentMs, newRotation, origRotation);
          }
          return;
        }

        // Incremental deltas for scale operations
        const dxWorldInc = (e2.clientX - lastClientX) / scale;
        const dyWorldInc = (e2.clientY - lastClientY) / scale;
        lastClientX = e2.clientX;
        lastClientY = e2.clientY;

        const n = store.getNode(numericNodeId);
        if (!n || !isGeometryNode(n)) return;

        if (mode === 'scale-x') {
          const newW = Math.max(MIN_DIMENSION, n.width + dxWorldInc);
          store.updateNode(numericNodeId, { width: newW });
          if (kfStore && playback && (autoActive || kfStore.isPropertyEnabled(nodeId, 'width'))) {
            kfStore.addKeyframe(nodeId, 'width', playback.currentMs, newW, origW);
          }
          return;
        }

        if (mode === 'scale-y') {
          const newH = Math.max(MIN_DIMENSION, n.height - dyWorldInc);
          store.updateNode(numericNodeId, { height: newH });
          if (kfStore && playback && (autoActive || kfStore.isPropertyEnabled(nodeId, 'height'))) {
            kfStore.addKeyframe(nodeId, 'height', playback.currentMs, newH, origH);
          }
          return;
        }

        // Cumulative deltas for move — based on the visual (interpolated) origin
        // so dragging starts from the position the user sees, not the scene graph value.
        const totalDxWorld = (e2.clientX - startClientX) / scale;
        const totalDyWorld = (e2.clientY - startClientY) / scale;

        const newX = mode !== 'move-y' ? effectiveOrigX + totalDxWorld : n.x;
        const newY = mode !== 'move-x' ? effectiveOrigY + totalDyWorld : n.y;

        store.updateNode(numericNodeId, {
          ...(mode !== 'move-y' ? { x: newX } : {}),
          ...(mode !== 'move-x' ? { y: newY } : {}),
        });

        if (kfStore && playback) {
          if (mode !== 'move-y' && (autoActive || kfStore.isPropertyEnabled(nodeId, 'x'))) {
            kfStore.addKeyframe(nodeId, 'x', playback.currentMs, newX, origX);
          }
          if (mode !== 'move-x' && (autoActive || kfStore.isPropertyEnabled(nodeId, 'y'))) {
            kfStore.addKeyframe(nodeId, 'y', playback.currentMs, newY, origY);
          }
        }
      };

      const onUp = () => {
        document.body.style.cursor = prevCursor;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [store, kfStore, playback, autoActive],
  );

  // Only show in animate mode
  if (!isAnimateTab) return null;
  if (selectedIds.size !== 1) return null;

  const nodeId = selectedIds.values().next().value;
  if (!nodeId) return null;

  const node = store.getNode(nodeId);
  if (!node || !isGeometryNode(node)) return null;

  // Never show gizmo on top-level frames
  if (!node.parentId) return null;

  const nodeIdStr = String(nodeId);

  // Show gizmo when auto-keyframe is on OR the node itself has keyframes
  const nodeHasKeyframes = kfStore?.hasAnyKeyframes(nodeIdStr) ?? false;
  if (!autoActive && !nodeHasKeyframes) return null;

  const world = getWorldPosition(store, node);

  let effectiveWorldX = world.x;
  let effectiveWorldY = world.y;
  if (kfStore && playback) {
    const xKfs = kfStore.getKeyframes(nodeIdStr, 'x');
    if (xKfs.length >= 2) {
      const interp = interpolateKeyframes(xKfs, playback.currentMs);
      if (interp !== undefined) {
        effectiveWorldX = world.x + (interp - node.x);
      }
    }
    const yKfs = kfStore.getKeyframes(nodeIdStr, 'y');
    if (yKfs.length >= 2) {
      const interp = interpolateKeyframes(yKfs, playback.currentMs);
      if (interp !== undefined) {
        effectiveWorldY = world.y + (interp - node.y);
      }
    }
  }

  const cx = (effectiveWorldX + node.width / 2) * vpState.scale + vpState.origin.x;
  const cy = (effectiveWorldY + node.height / 2) * vpState.scale + vpState.origin.y;

  const ringRadius = Math.max(node.width, node.height) * vpState.scale / 2 + RING_PADDING;

  const yHandleMidY = cy - AXIS_LENGTH * 0.5;
  const xHandleMidX = cx + AXIS_LENGTH * 0.5;

  return (
    <div className="absolute inset-0 pointer-events-none z-[13]">
      {/* SVG visuals */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
      >
        {/* Rotation ring */}
        <circle
          cx={cx} cy={cy} r={ringRadius}
          fill="none" stroke={RING_COLOR} strokeWidth={2.5} opacity={0.7}
        />

        {/* Y axis line */}
        <line
          x1={cx} y1={cy} x2={cx} y2={cy - AXIS_LENGTH}
          stroke={Y_COLOR} strokeWidth={2}
        />
        {/* Y arrowhead */}
        <polygon
          points={`${cx},${cy - AXIS_LENGTH - ARROW_SIZE} ${cx - ARROW_SIZE / 2},${cy - AXIS_LENGTH} ${cx + ARROW_SIZE / 2},${cy - AXIS_LENGTH}`}
          fill={Y_COLOR}
        />
        {/* Y scale handle (outlined green square at midpoint) */}
        <rect
          x={cx - HANDLE_SIZE / 2} y={yHandleMidY - HANDLE_SIZE / 2}
          width={HANDLE_SIZE} height={HANDLE_SIZE}
          fill="white" stroke={Y_COLOR} strokeWidth={1.5}
        />

        {/* X axis line */}
        <line
          x1={cx} y1={cy} x2={cx + AXIS_LENGTH} y2={cy}
          stroke={X_COLOR} strokeWidth={2}
        />
        {/* X arrowhead */}
        <polygon
          points={`${cx + AXIS_LENGTH + ARROW_SIZE},${cy} ${cx + AXIS_LENGTH},${cy - ARROW_SIZE / 2} ${cx + AXIS_LENGTH},${cy + ARROW_SIZE / 2}`}
          fill={X_COLOR}
        />
        {/* X scale handle (outlined red square at midpoint) */}
        <rect
          x={xHandleMidX - HANDLE_SIZE / 2} y={cy - HANDLE_SIZE / 2}
          width={HANDLE_SIZE} height={HANDLE_SIZE}
          fill="white" stroke={X_COLOR} strokeWidth={1.5}
        />

        {/* Center origin dot */}
        <rect
          x={cx - CENTER_SIZE / 2} y={cy - CENTER_SIZE / 2}
          width={CENTER_SIZE} height={CENTER_SIZE}
          fill="white" stroke={X_COLOR} strokeWidth={1.5}
          rx={1}
        />
      </svg>

      {/* Invisible interaction zones */}

      {/* Rotation ring hit area */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full overflow-visible"
      >
        <circle
          cx={cx} cy={cy} r={ringRadius}
          fill="none" stroke="transparent" strokeWidth={RING_HIT_WIDTH}
          className="pointer-events-auto"
          style={{ cursor: CURSORS.rotateNE }}
          onPointerDown={(e) => startDrag('rotate', nodeId, e)}
        />
      </svg>

      {/* Y axis position drag (arrow + line, excluding scale handle area) */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: cx - 8,
          top: cy - AXIS_LENGTH - ARROW_SIZE,
          width: 16,
          height: AXIS_LENGTH * 0.3,
          cursor: CURSORS.resizeV,
        }}
        onPointerDown={(e) => startDrag('move-y', nodeId, e)}
      />

      {/* Y scale handle hit area */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: cx - HANDLE_SIZE,
          top: yHandleMidY - HANDLE_SIZE,
          width: HANDLE_SIZE * 2,
          height: HANDLE_SIZE * 2,
          cursor: SCALE_V_CURSOR,
        }}
        onPointerDown={(e) => startDrag('scale-y', nodeId, e)}
      />

      {/* Y axis lower part (between scale handle and center) */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: cx - 8,
          top: cy - AXIS_LENGTH * 0.3,
          width: 16,
          height: AXIS_LENGTH * 0.3,
          cursor: CURSORS.resizeV,
        }}
        onPointerDown={(e) => startDrag('move-y', nodeId, e)}
      />

      {/* X axis position drag (arrow + line, excluding scale handle area) */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: cx + AXIS_LENGTH * 0.7,
          top: cy - 8,
          width: AXIS_LENGTH * 0.3 + ARROW_SIZE,
          height: 16,
          cursor: CURSORS.resizeH,
        }}
        onPointerDown={(e) => startDrag('move-x', nodeId, e)}
      />

      {/* X scale handle hit area */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: xHandleMidX - HANDLE_SIZE,
          top: cy - HANDLE_SIZE,
          width: HANDLE_SIZE * 2,
          height: HANDLE_SIZE * 2,
          cursor: SCALE_CURSOR,
        }}
        onPointerDown={(e) => startDrag('scale-x', nodeId, e)}
      />

      {/* X axis inner part (between center and scale handle) */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: cx,
          top: cy - 8,
          width: AXIS_LENGTH * 0.3,
          height: 16,
          cursor: CURSORS.resizeH,
        }}
        onPointerDown={(e) => startDrag('move-x', nodeId, e)}
      />

      {/* Center handle (free move) */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: cx - CENTER_SIZE,
          top: cy - CENTER_SIZE,
          width: CENTER_SIZE * 2,
          height: CENTER_SIZE * 2,
          cursor: MOVE_CURSOR,
        }}
        onPointerDown={(e) => startDrag('move-xy', nodeId, e)}
      />
    </div>
  );
}
