import type { SceneGraphStore } from '../scene-graph/store';
import type { ConnectorEndpoint, GeometryNode, SceneNode } from '../types';
import { getWorldPosition, isGeometryNode } from '../scene-graph/world-position';
import { getConnectorPointConfig } from './connector-points';
import type { ConnectorPointDef } from './connector-points';

export interface ResolvedPoint {
  x: number
  y: number
  exitDirection: { dx: number; dy: number }
  pointIndex: number | null
}

/** Resolve a connector point def to world-space coordinates */
export function resolveConnectorPoint(
  store: SceneGraphStore,
  node: GeometryNode,
  pointDef: ConnectorPointDef,
  pointIndex: number,
): ResolvedPoint {
  const world = getWorldPosition(store, node);
  const x = world.x + pointDef.xFraction * node.width;
  const y = world.y + pointDef.yFraction * node.height;

  return {
    x,
    y,
    exitDirection: pointDef.exitDirection,
    pointIndex,
  };
}

/** Resolve all connector points for a node to world-space positions */
export function resolveAllConnectorPoints(
  store: SceneGraphStore,
  node: SceneNode,
): ResolvedPoint[] {
  if (!isGeometryNode(node)) return [];
  const config = getConnectorPointConfig(node.type, node);
  return config.points.map((def, i) => resolveConnectorPoint(store, node, def, i));
}

/** Find the nearest fixed connector point on a node to a world-space position */
export function findNearestConnectorPoint(
  store: SceneGraphStore,
  node: SceneNode,
  worldX: number,
  worldY: number,
): { point: ResolvedPoint; distance: number } | null {
  const points = resolveAllConnectorPoints(store, node);
  if (points.length === 0) return null;

  let best: ResolvedPoint | null = null;
  let bestDist = Infinity;

  for (const pt of points) {
    const dx = pt.x - worldX;
    const dy = pt.y - worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = pt;
    }
  }

  return best ? { point: best, distance: bestDist } : null;
}

/** Find the nearest point on a node's bounding edge to a world-space position */
export function findNearestEdgePoint(
  store: SceneGraphStore,
  node: SceneNode,
  worldX: number,
  worldY: number,
): ResolvedPoint | null {
  if (!isGeometryNode(node)) return null;

  const world = getWorldPosition(store, node);
  const left = world.x;
  const top = world.y;
  const right = world.x + node.width;
  const bottom = world.y + node.height;

  // Clamp point to nearest edge position
  const cx = Math.max(left, Math.min(right, worldX));
  const cy = Math.max(top, Math.min(bottom, worldY));

  // Find the closest edge
  const distLeft = Math.abs(cx - left);
  const distRight = Math.abs(cx - right);
  const distTop = Math.abs(cy - top);
  const distBottom = Math.abs(cy - bottom);

  const minEdgeDist = Math.min(distLeft, distRight, distTop, distBottom);

  let edgeX: number;
  let edgeY: number;
  let exitDir: { dx: number; dy: number };

  if (minEdgeDist === distLeft) {
    edgeX = left;
    edgeY = cy;
    exitDir = { dx: -1, dy: 0 };
  } else if (minEdgeDist === distRight) {
    edgeX = right;
    edgeY = cy;
    exitDir = { dx: 1, dy: 0 };
  } else if (minEdgeDist === distTop) {
    edgeX = cx;
    edgeY = top;
    exitDir = { dx: 0, dy: -1 };
  } else {
    edgeX = cx;
    edgeY = bottom;
    exitDir = { dx: 0, dy: 1 };
  }

  return {
    x: edgeX,
    y: edgeY,
    exitDirection: exitDir,
    pointIndex: null,
  };
}

/**
 * Snap to nearest connection point if within threshold, otherwise return nearest edge point.
 * Returns a ResolvedPoint where pointIndex is null for non-snapped edge positions.
 */
export function snapToConnectionPoint(
  store: SceneGraphStore,
  node: SceneNode,
  worldX: number,
  worldY: number,
  snapThreshold: number = 20,
): ResolvedPoint | null {
  // Try fixed connector points first
  const nearest = findNearestConnectorPoint(store, node, worldX, worldY);
  if (nearest && nearest.distance <= snapThreshold) {
    return nearest.point;
  }

  // Fall back to nearest edge point
  return findNearestEdgePoint(store, node, worldX, worldY);
}

/**
 * Resolve a ConnectorEndpoint to a world-space position.
 * Returns { x, y, exitDirection } or null if the referenced node doesn't exist.
 */
export function resolveEndpointPosition(
  store: SceneGraphStore,
  endpoint: ConnectorEndpoint,
): ResolvedPoint | null {
  if (endpoint.type === 'free') {
    return { x: endpoint.x, y: endpoint.y, exitDirection: { dx: 0, dy: -1 }, pointIndex: null };
  }

  const targetNode = store.getNode(endpoint.nodeId);
  if (!targetNode || !isGeometryNode(targetNode)) return null;

  if (endpoint.type === 'connected') {
    const config = getConnectorPointConfig(targetNode.type, targetNode);
    const pointDef = config.points[endpoint.pointIndex];
    if (!pointDef) return null;
    return resolveConnectorPoint(store, targetNode, pointDef, endpoint.pointIndex);
  }

  // edge type: resolve fractional position on node bounds
  const world = getWorldPosition(store, targetNode);
  const x = world.x + endpoint.xFraction * targetNode.width;
  const y = world.y + endpoint.yFraction * targetNode.height;

  // Determine exit direction from edge position
  let exitDir: { dx: number; dy: number } = { dx: 0, dy: -1 };
  const eps = 0.001;
  if (endpoint.xFraction <= eps) exitDir = { dx: -1, dy: 0 };
  else if (endpoint.xFraction >= 1 - eps) exitDir = { dx: 1, dy: 0 };
  else if (endpoint.yFraction <= eps) exitDir = { dx: 0, dy: -1 };
  else if (endpoint.yFraction >= 1 - eps) exitDir = { dx: 0, dy: 1 };

  return { x, y, exitDirection: exitDir, pointIndex: null };
}
