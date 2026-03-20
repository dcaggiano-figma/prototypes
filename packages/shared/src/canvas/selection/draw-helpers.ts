export interface RotatedEdgeAnchor {
  /** Midpoint of the visual bottom edge, offset from rectangle center. */
  bottomCenter: { x: number; y: number };
  /** Unit outward normal of the visual bottom edge (points away from center). */
  bottomNormal: { x: number; y: number };
  /** Text-safe rotation angle (deg) parallel to the bottom edge, in [-90°, 90°]. */
  bottomAngleDeg: number;
  /** Left endpoint of the visual top edge, offset from rectangle center. */
  topLeftEnd: { x: number; y: number };
  /** Unit outward normal of the visual top edge (points away from center). */
  topNormal: { x: number; y: number };
  /** Text-safe rotation angle (deg) parallel to the top edge, in [-90°, 90°]. */
  topAngleDeg: number;
}

/**
 * Compute screen-space offsets (relative to the rectangle's center) for the
 * visual bottom-center and top-left-end of a rotated rectangle, plus the edge
 * angles and outward normals needed to orient labels parallel to those edges.
 */
export function getRotatedEdgeAnchor(
  w: number,
  h: number,
  rotationDeg: number,
): RotatedEdgeAnchor {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = w / 2;
  const hh = h / 2;

  // The four corners relative to center, after rotation
  const corners = [
    { x: -hw * cos + hh * sin, y: -hw * sin - hh * cos }, // TL
    { x: hw * cos + hh * sin, y: hw * sin - hh * cos },   // TR
    { x: hw * cos - hh * sin, y: hw * sin + hh * cos },   // BR
    { x: -hw * cos - hh * sin, y: -hw * sin + hh * cos }, // BL
  ];

  // Edges: TL→TR, TR→BR, BR→BL, BL→TL
  const edges = [
    { a: corners[0], b: corners[1] },
    { a: corners[1], b: corners[2] },
    { a: corners[2], b: corners[3] },
    { a: corners[3], b: corners[0] },
  ];

  // Find edge with max midpoint Y (visual bottom) and min midpoint Y (visual top)
  let bottomIdx = 0;
  let topIdx = 0;
  let maxMidY = -Infinity;
  let minMidY = Infinity;
  for (let i = 0; i < 4; i++) {
    const midY = (edges[i].a.y + edges[i].b.y) / 2;
    if (midY > maxMidY) { maxMidY = midY; bottomIdx = i; }
    if (midY < minMidY) { minMidY = midY; topIdx = i; }
  }

  return {
    ...computeEdgeInfo(edges[bottomIdx], 'bottom'),
    ...computeEdgeInfo(edges[topIdx], 'top'),
  } as RotatedEdgeAnchor;
}

function computeEdgeInfo(
  edge: { a: { x: number; y: number }; b: { x: number; y: number } },
  which: 'bottom' | 'top',
) {
  const mid = {
    x: (edge.a.x + edge.b.x) / 2,
    y: (edge.a.y + edge.b.y) / 2,
  };

  // Edge direction vector
  const edgeDx = edge.b.x - edge.a.x;
  const edgeDy = edge.b.y - edge.a.y;

  // Two candidate perpendiculars
  const n1 = { x: -edgeDy, y: edgeDx };
  const n2 = { x: edgeDy, y: -edgeDx };
  // Pick the one pointing away from center (positive dot with midpoint)
  const outward = n1.x * mid.x + n1.y * mid.y > 0 ? n1 : n2;
  const len = Math.sqrt(outward.x ** 2 + outward.y ** 2);
  const normal = len > 0 ? { x: outward.x / len, y: outward.y / len } : { x: 0, y: 1 };

  // Text angle: parallel to edge, normalized to [-90°, 90°] so text reads L→R
  let dx = edgeDx;
  let dy = edgeDy;
  if (dx < 0) { dx = -dx; dy = -dy; }
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  // "Left end" = endpoint with smaller screen X (or smaller Y if tied)
  const leftEnd =
    edge.a.x < edge.b.x || (edge.a.x === edge.b.x && edge.a.y < edge.b.y)
      ? edge.a
      : edge.b;

  if (which === 'bottom') {
    return {
      bottomCenter: mid,
      bottomNormal: normal,
      bottomAngleDeg: angleDeg,
    };
  }
  return {
    topLeftEnd: leftEnd,
    topNormal: normal,
    topAngleDeg: angleDeg,
  };
}

/** Draw a "W × H" dimension label below a node on a canvas 2D context. */
export function drawDimensionLabel(
  ctx: CanvasRenderingContext2D,
  nodeW: number,
  nodeH: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  rotation: number,
  bgColor: string,
  textColor: string,
) {
  const label = `${Math.round(nodeW)} × ${Math.round(nodeH)}`;
  const fontSize = 11;
  ctx.font = `${fontSize}px "Inter", system-ui, sans-serif`;
  const textMetrics = ctx.measureText(label);
  const textW = textMetrics.width + 8;
  const textH = fontSize + 6;
  const gap = 8;

  if (rotation !== 0) {
    const anchor = getRotatedEdgeAnchor(sw, sh, rotation);

    // Position: rectangle center + bottom edge midpoint + outward gap
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    const labelX = cx + anchor.bottomCenter.x + anchor.bottomNormal.x * gap;
    const labelY = cy + anchor.bottomCenter.y + anchor.bottomNormal.y * gap;

    ctx.save();
    ctx.translate(labelX, labelY);
    ctx.rotate(anchor.bottomAngleDeg * Math.PI / 180);

    // Draw label centered at origin, offset along the outward normal
    const halfNormalOffset = textH / 2;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(-textW / 2, halfNormalOffset - textH / 2, textW, textH, 3);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, halfNormalOffset);

    ctx.restore();
  } else {
    const labelCenterX = sx + sw / 2;
    const labelTopY = sy + sh + gap;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(labelCenterX - textW / 2, labelTopY, textW, textH, 3);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelCenterX, labelTopY + textH / 2);
  }
}
