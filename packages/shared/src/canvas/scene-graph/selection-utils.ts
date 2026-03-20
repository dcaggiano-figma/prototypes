import type { NodeId } from '../../scene-graph/node-id'
import { isGeometryNode } from '../../scene-graph/types'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import { getWorldPosition } from './world-position'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function getSelectionBBox(
  sg: SceneGraph,
  selectedIds: Iterable<NodeId>,
): Rect | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const id of selectedIds) {
    const node = sg.getNode(id)
    if (!node || !isGeometryNode(node)) continue
    const pos = getWorldPosition(sg, node)
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + node.width)
    maxY = Math.max(maxY, pos.y + node.height)
  }

  if (!isFinite(minX)) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h
}

/**
 * Find the topmost geometry node containing a world-space point.
 * Searches children of the given parent in reverse order (topmost first).
 */
export function findNodeAtWorldPoint(
  sg: SceneGraph,
  parentId: NodeId,
  wx: number,
  wy: number,
): NodeId | undefined {
  const parent = sg.getNode(parentId)
  if (!parent) return undefined

  for (let i = parent.children.length - 1; i >= 0; i--) {
    const node = sg.getNode(parent.children[i])
    if (!node || !isGeometryNode(node)) continue
    if (node.type === 'SECTION' || node.type === 'GRID_SECTION') continue
    const pos = getWorldPosition(sg, node)
    if (pointInRect(wx, wy, { x: pos.x, y: pos.y, w: node.width, h: node.height })) {
      return node.id
    }
  }
  return undefined
}

/**
 * Find the topmost geometry node within a padded zone of a world-space point.
 */
export function findNodeNearWorldPoint(
  sg: SceneGraph,
  parentId: NodeId,
  wx: number,
  wy: number,
  padding: number,
): NodeId | undefined {
  const parent = sg.getNode(parentId)
  if (!parent) return undefined

  for (let i = parent.children.length - 1; i >= 0; i--) {
    const node = sg.getNode(parent.children[i])
    if (!node || !isGeometryNode(node)) continue
    if (node.type === 'SECTION' || node.type === 'GRID_SECTION') continue
    if (node.type === 'CONNECTOR' || node.type === 'LINE' || node.type === 'VECTOR') continue
    const pos = getWorldPosition(sg, node)
    if (pointInRect(wx, wy, {
      x: pos.x - padding,
      y: pos.y - padding,
      w: node.width + padding * 2,
      h: node.height + padding * 2,
    })) {
      return node.id
    }
  }
  return undefined
}

/**
 * Collect IDs of selected geometry nodes for dragging.
 * Excludes nodes whose ancestor is also in the selection set.
 */
export function collectDraggableIds(
  sg: SceneGraph,
  selectedIds: ReadonlySet<NodeId>,
): NodeId[] {
  const ids: NodeId[] = []
  for (const id of selectedIds) {
    const node = sg.getNode(id)
    if (!node || !isGeometryNode(node)) continue
    const hasSelectedAncestor = sg.getAncestors(id).some((a) => selectedIds.has(a.id))
    if (!hasSelectedAncestor) ids.push(id)
  }
  return ids
}

export interface ScreenRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Compute the combined screen-space bounding box of selected geometry nodes.
 * Handles LINE nodes and rotated shapes.
 */
export function computeGroupScreenBBox(
  sg: SceneGraph,
  selectedIds: Iterable<NodeId>,
  viewport: { scale: number; origin: { x: number; y: number } },
): ScreenRect | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const id of selectedIds) {
    const node = sg.getNode(id)
    if (!node || !isGeometryNode(node)) continue

    const world = getWorldPosition(sg, node)

    if (node.type === 'LINE') {
      const rad = (node.rotation ?? 0) * Math.PI / 180
      const dx = node.width * Math.cos(rad)
      const dy = node.width * Math.sin(rad)
      const endWX = world.x + dx
      const endWY = world.y + dy

      const sx1 = world.x * viewport.scale + viewport.origin.x
      const sy1 = world.y * viewport.scale + viewport.origin.y
      const sx2 = endWX * viewport.scale + viewport.origin.x
      const sy2 = endWY * viewport.scale + viewport.origin.y

      minX = Math.min(minX, sx1, sx2)
      minY = Math.min(minY, sy1, sy2)
      maxX = Math.max(maxX, sx1, sx2)
      maxY = Math.max(maxY, sy1, sy2)
    } else {
      const rotation = node.rotation ?? 0
      const sx = world.x * viewport.scale + viewport.origin.x
      const sy = world.y * viewport.scale + viewport.origin.y
      const sw = node.width * viewport.scale
      const sh = node.height * viewport.scale

      if (rotation !== 0) {
        const rad = rotation * Math.PI / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const cx = sx + sw / 2
        const cy = sy + sh / 2
        const hw = sw / 2
        const hh = sh / 2

        const corners = [
          { dx: -hw, dy: -hh },
          { dx: hw, dy: -hh },
          { dx: hw, dy: hh },
          { dx: -hw, dy: hh },
        ]

        for (const c of corners) {
          const rx = cx + c.dx * cos - c.dy * sin
          const ry = cy + c.dx * sin + c.dy * cos
          minX = Math.min(minX, rx)
          minY = Math.min(minY, ry)
          maxX = Math.max(maxX, rx)
          maxY = Math.max(maxY, ry)
        }
      } else {
        minX = Math.min(minX, sx)
        minY = Math.min(minY, sy)
        maxX = Math.max(maxX, sx + sw)
        maxY = Math.max(maxY, sy + sh)
      }
    }
  }

  if (!isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}
