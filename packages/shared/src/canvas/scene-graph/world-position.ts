import type { SceneGraph } from '../../scene-graph/scene-graph'
import type { GeometryNode } from '../../scene-graph/types'
import { isGeometryNode } from '../../scene-graph/types'

/**
 * Compute the world-space position of a node by walking up the parent chain
 * and summing ancestor offsets. Node x/y are in parent coordinate space,
 * so we need to accumulate all ancestor positions to get world coordinates.
 */
export function getWorldPosition(
  sg: SceneGraph,
  node: GeometryNode,
): { x: number; y: number } {
  let wx = node.x
  let wy = node.y

  for (const ancestor of sg.getAncestors(node.id)) {
    if (isGeometryNode(ancestor)) {
      wx += ancestor.x
      wy += ancestor.y
    }
  }

  return { x: wx, y: wy }
}

/**
 * Reparent a node while preserving its world position.
 * Adjusts local coordinates so the node doesn't visually move.
 */
export function reparentNodeAdjusted(
  sg: SceneGraph,
  nodeId: number,
  newParentId: number,
): void {
  const node = sg.getNode(nodeId)
  if (!node || !isGeometryNode(node)) return
  if (node.parentId === newParentId) return

  // Snapshot world position before reparenting
  const worldPos = getWorldPosition(sg, node)

  // Compute new parent's world position
  let newParentWorldX = 0
  let newParentWorldY = 0
  const newParent = sg.getNode(newParentId)
  if (newParent && isGeometryNode(newParent)) {
    const parentWorld = getWorldPosition(sg, newParent)
    newParentWorldX = parentWorld.x
    newParentWorldY = parentWorld.y
  }

  // Reparent to end of new parent's children
  const newParentNode = sg.getNodeOrThrow(newParentId)
  sg.reparentNode(nodeId, newParentId, newParentNode.children.length)

  // Adjust local coords to preserve world position
  sg.updateNode(nodeId, {
    x: worldPos.x - newParentWorldX,
    y: worldPos.y - newParentWorldY,
  })
}
