export type CapType = 'NONE' | 'LINE_ARROW' | 'FILLED_ARROW' | 'REVERSE_TRIANGLE' | 'CIRCLE' | 'DIAMOND';

/** How far to shorten the visible line for each cap type (0 = no inset) */
export function capInsetDistance(cap: CapType): number {
  switch (cap) {
    case 'NONE': return 8; // pull line back from node edge to match connector point offset
    case 'DIAMOND': return 14; // nudge(6) + halfLen(8) = diamond center
    case 'CIRCLE': return 12; // nudge(6) + radius(6) = circle center
    default: return 6;
  }
}

/** Endpoint info for path computation */
interface PathEndpoint {
  x: number
  y: number
  exitDirection: { dx: number; dy: number }
}

/** Tangent directions at the start and end of a path (unit vectors pointing along the path) */
export interface PathTangents {
  /** Direction the path leaves the start point (normalized) */
  startTangent: { dx: number; dy: number }
  /** Direction the path arrives at the end point (normalized) */
  endTangent: { dx: number; dy: number }
}

/** Info about an adjustable segment in an elbow route */
export interface AdjustableSegment {
  startIdx: number
  endIdx: number
  /** Axis the handle drags along */
  axis: 'x' | 'y'
  /** Stub end on one side (min bound for the bridge value) */
  rangeMin: number
  /** Stub end on other side (max bound for the bridge value) */
  rangeMax: number
  /** Current bridge position in world coordinates */
  currentValue: number
}

/** Result of computing elbow waypoints */
export interface ElbowWaypoints {
  points: { x: number; y: number }[]
  adjustableSegments: AdjustableSegment[]
}

const STUB_LENGTH = 40;
const CORNER_RADIUS = 16;

function normalize(dx: number, dy: number): { dx: number; dy: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return { dx: 0, dy: 1 };
  return { dx: dx / len, dy: dy / len };
}

/** Compute elbow waypoints with 40px stubs from each endpoint */
export function computeElbowWaypoints(
  start: PathEndpoint,
  end: PathEndpoint,
  midpointOffset: number = 0.5,
): ElbowWaypoints {
  const startIsHorizontal = Math.abs(start.exitDirection.dx) > Math.abs(start.exitDirection.dy);
  const endIsHorizontal = Math.abs(end.exitDirection.dx) > Math.abs(end.exitDirection.dy);

  const points: { x: number; y: number }[] = [];
  const adjustableSegments: AdjustableSegment[] = [];

  if (startIsHorizontal && endIsHorizontal) {
    // Both exit horizontally → vertical bridge
    const startSign = start.exitDirection.dx >= 0 ? 1 : -1;
    const endSign = end.exitDirection.dx >= 0 ? 1 : -1;

    // Compute available space and stubs
    const gap = Math.abs((start.x + startSign * STUB_LENGTH) - (end.x + endSign * STUB_LENGTH));
    const totalStubNeeded = STUB_LENGTH * 2;
    const rawDist = Math.abs(
      (startSign > 0 ? end.x - start.x : start.x - end.x) +
      (endSign > 0 ? 0 : 0),
    );
    // If stubs would overlap, shrink proportionally
    let stubStart = STUB_LENGTH;
    let stubEnd = STUB_LENGTH;
    const directDist = Math.abs((end.x + endSign * STUB_LENGTH) - (start.x + startSign * STUB_LENGTH));
    // Only shrink if the stubs end up on the same side and overlapping
    const stubEndX1 = start.x + startSign * STUB_LENGTH;
    const stubEndX2 = end.x + endSign * STUB_LENGTH;
    // Check if bridge direction makes sense; if endpoints are very close, reduce stubs
    const bridgeSpan = stubEndX2 - stubEndX1;
    if (Math.abs(bridgeSpan) < 1) {
      // Nearly overlapping stubs — shrink to half the available space
      const availableSpace = Math.abs(end.x - start.x);
      stubStart = Math.max(0, availableSpace / 2);
      stubEnd = Math.max(0, availableSpace / 2);
    }

    const p0 = { x: start.x, y: start.y };
    const p1 = { x: start.x + startSign * stubStart, y: start.y };
    const p4 = { x: end.x + endSign * stubEnd, y: end.y };
    const p5 = { x: end.x, y: end.y };

    const bridgeX = p1.x + (p4.x - p1.x) * midpointOffset;
    const p2 = { x: bridgeX, y: start.y };
    const p3 = { x: bridgeX, y: end.y };

    points.push(p0, p1, p2, p3, p4, p5);

    // All non-stub segments control bridge X. Each handle sits at its segment's midpoint,
    // so rangeMin/rangeMax map the handle's visual position to the 0–1 offset.
    const mid14x = (p1.x + p4.x) / 2;
    adjustableSegments.push(
      { startIdx: 1, endIdx: 2, axis: 'x', rangeMin: p1.x, rangeMax: mid14x, currentValue: bridgeX },
      { startIdx: 2, endIdx: 3, axis: 'x', rangeMin: p1.x, rangeMax: p4.x, currentValue: bridgeX },
      { startIdx: 3, endIdx: 4, axis: 'x', rangeMin: mid14x, rangeMax: p4.x, currentValue: bridgeX },
    );
  } else if (!startIsHorizontal && !endIsHorizontal) {
    // Both exit vertically → horizontal bridge
    const startSign = start.exitDirection.dy >= 0 ? 1 : -1;
    const endSign = end.exitDirection.dy >= 0 ? 1 : -1;

    let stubStart = STUB_LENGTH;
    let stubEnd = STUB_LENGTH;
    const stubEndY1 = start.y + startSign * STUB_LENGTH;
    const stubEndY2 = end.y + endSign * STUB_LENGTH;
    const bridgeSpan = stubEndY2 - stubEndY1;
    if (Math.abs(bridgeSpan) < 1) {
      const availableSpace = Math.abs(end.y - start.y);
      stubStart = Math.max(0, availableSpace / 2);
      stubEnd = Math.max(0, availableSpace / 2);
    }

    const p0 = { x: start.x, y: start.y };
    const p1 = { x: start.x, y: start.y + startSign * stubStart };
    const p4 = { x: end.x, y: end.y + endSign * stubEnd };
    const p5 = { x: end.x, y: end.y };

    const bridgeY = p1.y + (p4.y - p1.y) * midpointOffset;
    const p2 = { x: start.x, y: bridgeY };
    const p3 = { x: end.x, y: bridgeY };

    points.push(p0, p1, p2, p3, p4, p5);

    const mid14y = (p1.y + p4.y) / 2;
    adjustableSegments.push(
      { startIdx: 1, endIdx: 2, axis: 'y', rangeMin: p1.y, rangeMax: mid14y, currentValue: bridgeY },
      { startIdx: 2, endIdx: 3, axis: 'y', rangeMin: p1.y, rangeMax: p4.y, currentValue: bridgeY },
      { startIdx: 3, endIdx: 4, axis: 'y', rangeMin: mid14y, rangeMax: p4.y, currentValue: bridgeY },
    );
  } else if (startIsHorizontal && !endIsHorizontal) {
    // Start horizontal, end vertical → bridge with adjustable vertical segment
    const startSign = start.exitDirection.dx >= 0 ? 1 : -1;
    const endSign = end.exitDirection.dy >= 0 ? 1 : -1;

    const p0 = { x: start.x, y: start.y };
    const p1 = { x: start.x + startSign * STUB_LENGTH, y: start.y };
    const p4 = { x: end.x, y: end.y + endSign * STUB_LENGTH };
    const p5 = { x: end.x, y: end.y };

    const bridgeX = p1.x + (p4.x - p1.x) * midpointOffset;
    const p2 = { x: bridgeX, y: start.y };
    const p3 = { x: bridgeX, y: p4.y };

    points.push(p0, p1, p2, p3, p4, p5);

    const mid14x = (p1.x + p4.x) / 2;
    adjustableSegments.push(
      { startIdx: 1, endIdx: 2, axis: 'x', rangeMin: p1.x, rangeMax: mid14x, currentValue: bridgeX },
      { startIdx: 2, endIdx: 3, axis: 'x', rangeMin: p1.x, rangeMax: p4.x, currentValue: bridgeX },
      { startIdx: 3, endIdx: 4, axis: 'x', rangeMin: mid14x, rangeMax: p4.x, currentValue: bridgeX },
    );
  } else {
    // Start vertical, end horizontal → bridge with adjustable horizontal segment
    const startSign = start.exitDirection.dy >= 0 ? 1 : -1;
    const endSign = end.exitDirection.dx >= 0 ? 1 : -1;

    const p0 = { x: start.x, y: start.y };
    const p1 = { x: start.x, y: start.y + startSign * STUB_LENGTH };
    const p4 = { x: end.x + endSign * STUB_LENGTH, y: end.y };
    const p5 = { x: end.x, y: end.y };

    const bridgeY = p1.y + (p4.y - p1.y) * midpointOffset;
    const p2 = { x: start.x, y: bridgeY };
    const p3 = { x: p4.x, y: bridgeY };

    points.push(p0, p1, p2, p3, p4, p5);

    const mid14y = (p1.y + p4.y) / 2;
    adjustableSegments.push(
      { startIdx: 1, endIdx: 2, axis: 'y', rangeMin: p1.y, rangeMax: mid14y, currentValue: bridgeY },
      { startIdx: 2, endIdx: 3, axis: 'y', rangeMin: p1.y, rangeMax: p4.y, currentValue: bridgeY },
      { startIdx: 3, endIdx: 4, axis: 'y', rangeMin: mid14y, rangeMax: p4.y, currentValue: bridgeY },
    );
  }

  return { points, adjustableSegments };
}

/** Convert waypoints to an SVG path string with rounded corners */
export function waypointsToSVGPath(
  waypoints: { x: number; y: number }[],
  cornerRadius: number = CORNER_RADIUS,
): string {
  if (waypoints.length < 2) return '';

  let d = `M${waypoints[0].x},${waypoints[0].y}`;

  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    const inDx = curr.x - prev.x;
    const inDy = curr.y - prev.y;
    const outDx = next.x - curr.x;
    const outDy = next.y - curr.y;

    const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
    const outLen = Math.sqrt(outDx * outDx + outDy * outDy);

    if (inLen < 0.01 || outLen < 0.01) {
      d += ` L${curr.x},${curr.y}`;
      continue;
    }

    // Skip corner rounding if segments are collinear (no actual turn)
    const cross = inDx * outDy - inDy * outDx;
    if (Math.abs(cross) < 0.01) {
      d += ` L${curr.x},${curr.y}`;
      continue;
    }

    const r = Math.min(cornerRadius, inLen / 2, outLen / 2);

    const arcStartX = curr.x - (inDx / inLen) * r;
    const arcStartY = curr.y - (inDy / inLen) * r;
    const arcEndX = curr.x + (outDx / outLen) * r;
    const arcEndY = curr.y + (outDy / outLen) * r;

    const sweep = cross > 0 ? 1 : 0;

    d += ` L${arcStartX},${arcStartY}`;
    d += ` A${r},${r} 0 0 ${sweep} ${arcEndX},${arcEndY}`;
  }

  d += ` L${waypoints[waypoints.length - 1].x},${waypoints[waypoints.length - 1].y}`;

  return d;
}

/** Compute a straight line path */
export function computeStraightPath(start: PathEndpoint, end: PathEndpoint): string {
  return `M${start.x},${start.y} L${end.x},${end.y}`;
}

/** Compute a line path (same as straight, used for the "line" variant) */
export function computeLinePath(start: PathEndpoint, end: PathEndpoint): string {
  return computeStraightPath(start, end);
}

/** Compute a cubic bezier curve path with control points along exit directions */
export function computeCurvePath(start: PathEndpoint, end: PathEndpoint): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const controlDist = Math.max(30, dist / 3);

  const cp1x = start.x + start.exitDirection.dx * controlDist;
  const cp1y = start.y + start.exitDirection.dy * controlDist;
  const cp2x = end.x + end.exitDirection.dx * controlDist;
  const cp2y = end.y + end.exitDirection.dy * controlDist;

  return `M${start.x},${start.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${end.x},${end.y}`;
}

/** Compute an elbow (right-angle) path with rounded corners */
export function computeElbowPath(
  start: PathEndpoint,
  end: PathEndpoint,
  midpointOffset: number = 0.5,
): string {
  const { points } = computeElbowWaypoints(start, end, midpointOffset);
  return waypointsToSVGPath(points);
}

/**
 * Compute tangent directions at the start and end of a path.
 * For elbow/straight paths, this uses the actual first/last segment direction.
 * For curves, it uses the control point direction.
 */
export function computePathTangents(
  lineShape: string,
  start: PathEndpoint,
  end: PathEndpoint,
  midpointOffset: number = 0.5,
): PathTangents {
  // Straight/line: tangent is just the start-to-end direction
  if (lineShape === 'STRAIGHT' || lineShape === 'LINE') {
    const t = normalize(end.x - start.x, end.y - start.y);
    return { startTangent: t, endTangent: t };
  }

  // Curve: tangent at start follows exit direction, tangent at end follows negative exit direction
  if (lineShape === 'CURVE') {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const controlDist = Math.max(30, dist / 3);

    const startTangent = normalize(
      start.exitDirection.dx * controlDist,
      start.exitDirection.dy * controlDist,
    );
    const endTangent = normalize(
      end.x - (end.x + end.exitDirection.dx * controlDist),
      end.y - (end.y + end.exitDirection.dy * controlDist),
    );
    return { startTangent, endTangent };
  }

  // Elbow: reuse computeElbowWaypoints for consistent waypoints
  const { points } = computeElbowWaypoints(start, end, midpointOffset);

  // Start tangent: direction of the first segment
  const first = points[1];
  const startTangent = normalize(first.x - start.x, first.y - start.y);

  // End tangent: direction of the last segment (toward end)
  const secondLast = points[points.length - 2];
  const last = points[points.length - 1];
  const endTangent = normalize(last.x - secondLast.x, last.y - secondLast.y);

  return { startTangent, endTangent };
}
