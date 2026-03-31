import { useCallback, useEffect, useRef, useState } from 'react';
import { useSceneGraph, useViewportState, useSelection, getWorldPosition, isGeometryNode } from '@prototype/shared/canvas';
import { useKeyframeStoreOptional, type KeyframeStoreValue, type Keyframe } from '../../contexts/KeyframeStoreContext';
import { usePlaybackOptional } from '../../contexts/PlaybackContext';
import { useDesignTabOptional } from '../../contexts/DesignTabContext';
import { interpolateKeyframes } from '../animation-utils';
import { CURSORS } from '../cursors';

const DOT_RADIUS = 5;
const DOT_RADIUS_SELECTED = 6;
const DOT_HIT_RADIUS = 10;
const PATH_COLOR = 'var(--color-border-selected, #0d99ff)';
const PATH_STROKE = 1.5;

interface PathPoint {
  timeMs: number;
  screenX: number;
  screenY: number;
  hasXKeyframe: boolean;
  hasYKeyframe: boolean;
}

interface Marquee {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function rectFromMarquee(m: Marquee) {
  return {
    minX: Math.min(m.startX, m.currentX),
    minY: Math.min(m.startY, m.currentY),
    maxX: Math.max(m.startX, m.currentX),
    maxY: Math.max(m.startY, m.currentY),
  };
}

function pointInRect(px: number, py: number, rect: ReturnType<typeof rectFromMarquee>) {
  return px >= rect.minX && px <= rect.maxX && py >= rect.minY && py <= rect.maxY;
}

export function MotionPath() {
  const { selectedIds } = useSelection();
  const store = useSceneGraph();
  const { state: vpState } = useViewportState();
  const kfStore = useKeyframeStoreOptional();
  const playback = usePlaybackOptional();

  const [, bumpVersion] = useState(0);
  useEffect(() => store.addListener(() => bumpVersion((n) => n + 1)), [store]);

  const [selectedDots, setSelectedDots] = useState<Set<number>>(() => new Set());
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [isDraggingDots, setIsDraggingDots] = useState(false);

  const scaleRef = useRef(vpState.scale);
  scaleRef.current = vpState.scale;

  // Ref to always have fresh points in closures
  const pointsRef = useRef<PathPoint[]>([]);

  const designTab = useDesignTabOptional();
  const isAnimateTab = designTab?.activeTab === 'animation';

  if (!isAnimateTab) return null;
  if (selectedIds.size !== 1 || !kfStore) return null;

  const nodeId = selectedIds.values().next().value;
  if (!nodeId) return null;
  const node = store.getNode(nodeId);
  if (!node || !isGeometryNode(node)) return null;

  const xKfs = kfStore.getKeyframes(String(nodeId), 'x');
  const yKfs = kfStore.getKeyframes(String(nodeId), 'y');

  if (xKfs.length < 2 && yKfs.length < 2) return null;

  const world = getWorldPosition(store, node);
  const parentOffsetX = world.x - node.x;
  const parentOffsetY = world.y - node.y;

  const timesSet = new Set<number>();
  for (const kf of xKfs) timesSet.add(kf.timeMs);
  for (const kf of yKfs) timesSet.add(kf.timeMs);
  const times = Array.from(timesSet).sort((a, b) => a - b);

  const xKfTimeSet = new Set(xKfs.map((k) => k.timeMs));
  const yKfTimeSet = new Set(yKfs.map((k) => k.timeMs));

  const points: PathPoint[] = times.map((t) => {
    const xVal = xKfs.length >= 2 ? interpolateKeyframes(xKfs, t) : undefined;
    const yVal = yKfs.length >= 2 ? interpolateKeyframes(yKfs, t) : undefined;

    const wx = parentOffsetX + (xVal ?? node.x);
    const wy = parentOffsetY + (yVal ?? node.y);

    const sx = (wx + node.width / 2) * vpState.scale + vpState.origin.x;
    const sy = (wy + node.height / 2) * vpState.scale + vpState.origin.y;

    return {
      timeMs: t,
      screenX: sx,
      screenY: sy,
      hasXKeyframe: xKfTimeSet.has(t),
      hasYKeyframe: yKfTimeSet.has(t),
    };
  });

  pointsRef.current = points;

  if (points.length < 2) return null;

  const polylinePoints = points.map((p) => `${p.screenX},${p.screenY}`).join(' ');

  // Dots that fall inside the active marquee (preview highlight)
  const marqueePreview = new Set<number>();
  if (marquee) {
    const r = rectFromMarquee(marquee);
    for (const pt of points) {
      if (pointInRect(pt.screenX, pt.screenY, r)) {
        marqueePreview.add(pt.timeMs);
      }
    }
  }

  const isSelected = (timeMs: number) => selectedDots.has(timeMs) || marqueePreview.has(timeMs);

  return (
    <MotionPathInner
      points={points}
      pointsRef={pointsRef}
      polylinePoints={polylinePoints}
      nodeId={String(nodeId)}
      store={store}
      kfStore={kfStore}
      playback={playback}
      selectedDots={selectedDots}
      setSelectedDots={setSelectedDots}
      marquee={marquee}
      setMarquee={setMarquee}
      isDraggingDots={isDraggingDots}
      setIsDraggingDots={setIsDraggingDots}
      isSelected={isSelected}
      marqueePreview={marqueePreview}
    />
  );
}

function MotionPathInner({
  points,
  pointsRef,
  polylinePoints,
  nodeId,
  store,
  kfStore,
  playback,
  selectedDots,
  setSelectedDots,
  marquee,
  setMarquee,
  isDraggingDots,
  setIsDraggingDots,
  isSelected,
}: {
  points: PathPoint[];
  pointsRef: React.MutableRefObject<PathPoint[]>;
  polylinePoints: string;
  nodeId: string;
  store: ReturnType<typeof useSceneGraph>;
  kfStore: KeyframeStoreValue;
  playback: ReturnType<typeof usePlaybackOptional>;
  selectedDots: Set<number>;
  setSelectedDots: React.Dispatch<React.SetStateAction<Set<number>>>;
  marquee: Marquee | null;
  setMarquee: React.Dispatch<React.SetStateAction<Marquee | null>>;
  isDraggingDots: boolean;
  setIsDraggingDots: React.Dispatch<React.SetStateAction<boolean>>;
  isSelected: (timeMs: number) => boolean;
  marqueePreview: Set<number>;
}) {
  const { state: vpState } = useViewportState();
  const scaleRef = useRef(vpState.scale);
  scaleRef.current = vpState.scale;
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Marquee selection ────────────────────────────────────────────────
  const handleBgPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only start marquee on the background, not on dots
      if ((e.target as HTMLElement).dataset?.motionDot) return;

      // Prevent canvas from also handling this event (which would start
      // a box-selection or deselect the current node, unmounting MotionPath)
      e.stopPropagation();
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // If not shift, deselect existing
      if (!e.shiftKey) {
        setSelectedDots(new Set());
      }

      setMarquee({ startX: x, startY: y, currentX: x, currentY: y });

      const onMove = (e2: PointerEvent) => {
        const mx = e2.clientX - rect.left;
        const my = e2.clientY - rect.top;
        setMarquee((prev) =>
          prev ? { ...prev, currentX: mx, currentY: my } : null,
        );
      };

      const onUp = (e2: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);

        // Finalize selection from marquee, then clear it
        const finalMarquee = marqueeRef.current;
        setMarquee(null);

        if (!finalMarquee) return;

        const r = rectFromMarquee(finalMarquee);
        const w = r.maxX - r.minX;
        const h = r.maxY - r.minY;

        if (w < 4 && h < 4) {
          // Too small — treated as a click on empty space, deselect
          if (!e2.shiftKey) setSelectedDots(new Set());
          return;
        }

        // Select dots inside the marquee
        const pts = pointsRef.current;
        const newSelected = new Set<number>(e2.shiftKey ? selectedDots : []);
        for (const pt of pts) {
          if (pointInRect(pt.screenX, pt.screenY, r)) {
            newSelected.add(pt.timeMs);
          }
        }
        setSelectedDots(newSelected);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [selectedDots, setSelectedDots, setMarquee, pointsRef],
  );

  // Keep a ref to the current marquee so onUp can read the latest value
  const marqueeRef = useRef(marquee);
  marqueeRef.current = marquee;

  // ── Dot click / drag ─────────────────────────────────────────────────
  const handleDotPointerDown = useCallback(
    (e: React.PointerEvent, dotTimeMs: number) => {
      e.preventDefault();
      e.stopPropagation();

      // Selection logic
      let currentSelection: Set<number>;
      if (e.shiftKey) {
        currentSelection = new Set(selectedDots);
        if (currentSelection.has(dotTimeMs)) {
          currentSelection.delete(dotTimeMs);
        } else {
          currentSelection.add(dotTimeMs);
        }
        setSelectedDots(currentSelection);
      } else {
        if (selectedDots.has(dotTimeMs)) {
          // Already selected (possibly multi) — keep selection for drag
          currentSelection = selectedDots;
        } else {
          currentSelection = new Set([dotTimeMs]);
          setSelectedDots(currentSelection);
        }
      }

      // Snapshot live values for ALL selected dots
      const liveValues = new Map<number, { x: number; y: number; hasX: boolean; hasY: boolean }>();
      for (const t of currentSelection) {
        const pt = pointsRef.current.find((p) => p.timeMs === t);
        if (!pt) continue;
        const xKf = kfStore.getKeyframes(nodeId, 'x').find((k: Keyframe) => k.timeMs === t);
        const yKf = kfStore.getKeyframes(nodeId, 'y').find((k: Keyframe) => k.timeMs === t);
        liveValues.set(t, {
          x: xKf?.value ?? 0,
          y: yKf?.value ?? 0,
          hasX: pt.hasXKeyframe,
          hasY: pt.hasYKeyframe,
        });
      }

      let lastClientX = e.clientX;
      let lastClientY = e.clientY;

      const prevCursor = document.body.style.cursor;
      document.body.style.cursor = CURSORS.grabbing;
      setIsDraggingDots(true);

      const onMove = (e2: PointerEvent) => {
        const scale = scaleRef.current;
        const dxWorld = (e2.clientX - lastClientX) / scale;
        const dyWorld = (e2.clientY - lastClientY) / scale;
        lastClientX = e2.clientX;
        lastClientY = e2.clientY;

        for (const [t, vals] of liveValues) {
          if (vals.hasX) {
            vals.x += dxWorld;
            kfStore.addKeyframe(nodeId, 'x', t, vals.x);
          }
          if (vals.hasY) {
            vals.y += dyWorld;
            kfStore.addKeyframe(nodeId, 'y', t, vals.y);
          }
        }

        const currentMs = playback?.currentMs ?? 0;
        syncNodeToPlaybackTime(store, kfStore, nodeId, Number(nodeId), currentMs);
      };

      const onUp = () => {
        document.body.style.cursor = prevCursor;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setIsDraggingDots(false);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [nodeId, selectedDots, setSelectedDots, kfStore, store, playback, setIsDraggingDots, pointsRef],
  );

  // Marquee rectangle
  const marqueeRect = marquee ? rectFromMarquee(marquee) : null;
  const marqueeW = marqueeRect ? marqueeRect.maxX - marqueeRect.minX : 0;
  const marqueeH = marqueeRect ? marqueeRect.maxY - marqueeRect.minY : 0;

  // Bounding box of the path with padding — only this area captures events
  const BBOX_PAD = 30;
  let bboxMinX = Infinity, bboxMinY = Infinity, bboxMaxX = -Infinity, bboxMaxY = -Infinity;
  for (const pt of points) {
    if (pt.screenX < bboxMinX) bboxMinX = pt.screenX;
    if (pt.screenY < bboxMinY) bboxMinY = pt.screenY;
    if (pt.screenX > bboxMaxX) bboxMaxX = pt.screenX;
    if (pt.screenY > bboxMaxY) bboxMaxY = pt.screenY;
  }
  bboxMinX -= BBOX_PAD;
  bboxMinY -= BBOX_PAD;
  bboxMaxX += BBOX_PAD;
  bboxMaxY += BBOX_PAD;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[8]"
    >
      {/* Invisible hit area covering the path bounding box for marquee selection */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: bboxMinX,
          top: bboxMinY,
          width: bboxMaxX - bboxMinX,
          height: bboxMaxY - bboxMinY,
          cursor: 'crosshair',
        }}
        onPointerDown={handleBgPointerDown}
      />

      <svg
        className="absolute inset-0 pointer-events-none w-full h-full overflow-visible"
      >
        {/* Path line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={PATH_COLOR}
          strokeWidth={PATH_STROKE}
          strokeDasharray="6 3"
        />

        {/* Keyframe dots */}
        {points.map((pt) => {
          const sel = isSelected(pt.timeMs);
          return (
            <circle
              key={pt.timeMs}
              cx={pt.screenX}
              cy={pt.screenY}
              r={sel ? DOT_RADIUS_SELECTED : DOT_RADIUS}
              fill={sel ? PATH_COLOR : 'white'}
              stroke={sel ? 'white' : PATH_COLOR}
              strokeWidth={sel ? 2 : 1.5}
            />
          );
        })}

        {/* Marquee rectangle */}
        {marqueeRect && marqueeW > 2 && marqueeH > 2 && (
          <rect
            x={marqueeRect.minX}
            y={marqueeRect.minY}
            width={marqueeW}
            height={marqueeH}
            fill="rgba(13, 153, 255, 0.08)"
            stroke={PATH_COLOR}
            strokeWidth={1}
          />
        )}
      </svg>

      {/* Invisible dot hit areas */}
      {points.map((pt) => (
        <div
          key={pt.timeMs}
          data-motion-dot="true"
          className="absolute pointer-events-auto"
          style={{
            left: pt.screenX - DOT_HIT_RADIUS,
            top: pt.screenY - DOT_HIT_RADIUS,
            width: DOT_HIT_RADIUS * 2,
            height: DOT_HIT_RADIUS * 2,
            borderRadius: '50%',
            cursor: isDraggingDots ? CURSORS.grabbing : CURSORS.grab,
          }}
          onPointerDown={(e) => handleDotPointerDown(e, pt.timeMs)}
        />
      ))}
    </div>
  );
}

function syncNodeToPlaybackTime(
  store: ReturnType<typeof useSceneGraph>,
  kfStore: KeyframeStoreValue,
  nodeId: string,
  numericNodeId: number,
  currentMs: number,
) {
  const xKfs = kfStore.getKeyframes(nodeId, 'x');
  const yKfs = kfStore.getKeyframes(nodeId, 'y');
  const updates: Record<string, number> = {};

  if (xKfs.length >= 2) {
    const v = interpolateKeyframes(xKfs, currentMs);
    if (v !== undefined) updates.x = v;
  }
  if (yKfs.length >= 2) {
    const v = interpolateKeyframes(yKfs, currentMs);
    if (v !== undefined) updates.y = v;
  }

  if (Object.keys(updates).length > 0) {
    store.updateNode(numericNodeId, updates);
  }
}
