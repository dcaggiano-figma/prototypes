/** Point in 2D space */
export interface Point {
  x: number
  y: number
}

/** Axis-aligned bounding box */
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

// ── Ramer-Douglas-Peucker simplification ─────────────────────────────

/**
 * Reduce point count while preserving shape.
 * Epsilon is in world-space pixels — 2.0 is a good default.
 */
export function simplifyRDP(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  const first = points[0];
  const last = points[points.length - 1];

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyRDP(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

// ── Catmull-Rom to cubic bezier conversion ───────────────────────────

/**
 * Convert points to a smooth SVG path using Catmull-Rom → cubic bezier.
 * Points must be in local coordinate space (relative to bounding box origin).
 * Returns an SVG `d` attribute string: M...C...C...
 */
export function pointsToBezierPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  }

  // Clamp endpoints: duplicate first and last points for Catmull-Rom
  const pts = [points[0], ...points, points[points.length - 1]];
  const tension = 6; // Standard Catmull-Rom: 1/6 of tangent length

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / tension;
    const cp1y = p1.y + (p2.y - p0.y) / tension;
    const cp2x = p2.x - (p3.x - p1.x) / tension;
    const cp2y = p2.y - (p3.y - p1.y) / tension;

    d += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

// ── Bounding box ─────────────────────────────────────────────────────

/** Compute axis-aligned bounding box from a point array */
export function computeBounds(points: Point[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ── Live preview polyline ────────────────────────────────────────────

/** Convert points to an SVG polyline path (M...L...L...) for live preview */
export function pointsToPolyline(points: Point[]): string {
  if (points.length === 0) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += `L${points[i].x},${points[i].y}`;
  }
  return d;
}
