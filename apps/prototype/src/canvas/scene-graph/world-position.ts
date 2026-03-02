import type { SceneGraphStore } from './store';
import type { GeometryNode, SceneNode } from '../types';

/**
 * Compute the world-space position of a node by walking up the parent chain
 * and summing ancestor offsets. Node x/y are in parent coordinate space,
 * so we need to accumulate all ancestor positions to get world coordinates.
 */
export function getWorldPosition(
  store: SceneGraphStore,
  node: GeometryNode,
): { x: number; y: number } {
  let wx = node.x;
  let wy = node.y;

  for (const ancestor of store.getAncestors(node.id)) {
    if (isGeometryNode(ancestor)) {
      wx += ancestor.x;
      wy += ancestor.y;
    }
  }

  return { x: wx, y: wy };
}

export function isGeometryNode(node: SceneNode): node is GeometryNode {
  return 'x' in node && 'y' in node && 'width' in node && 'height' in node;
}
