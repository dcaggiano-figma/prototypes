import type { GeometryNode } from '../../scene-graph/types'

/** Compute the line's start and end points in parent coordinate space. */
export function getLineEndpoints(node: Pick<GeometryNode, 'x' | 'y' | 'width' | 'rotation'>) {
  const rad = node.rotation * Math.PI / 180;
  const dx = node.width * Math.cos(rad);
  const dy = node.width * Math.sin(rad);
  return {
    start: { x: node.x, y: node.y },
    end: { x: node.x + dx, y: node.y + dy },
  };
}

/** Derive line node params (x, y, width, rotation) from two endpoints. */
export function lineParamsFromEndpoints(
  startX: number, startY: number,
  endX: number, endY: number,
) {
  const dx = endX - startX;
  const dy = endY - startY;
  return {
    x: startX,
    y: startY,
    width: Math.sqrt(dx * dx + dy * dy),
    height: 0,
    rotation: Math.atan2(dy, dx) * 180 / Math.PI,
  };
}
