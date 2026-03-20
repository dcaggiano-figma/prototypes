import type { NodeId } from '../../scene-graph/node-id'
import type { GeometryNode } from '../../scene-graph/types'
import { isGeometryNode } from '../../scene-graph/types'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import { getWorldPosition, reparentNodeAdjusted } from './world-position'

// ── Types ────────────────────────────────────────────────────────────

interface WorldRect {
  x: number
  y: number
  w: number
  h: number
}

/** Returns true if the node is a container type (FRAME, SECTION, GRID_SECTION, or SLIDE) */
export function isContainer(node: { type: string }): boolean {
  return node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'GRID_SECTION' || node.type === 'SLIDE'
}

// ── Utility functions ────────────────────────────────────────────────

function getWorldRect(sg: SceneGraph, node: GeometryNode): WorldRect {
  const pos = getWorldPosition(sg, node)
  const rotation = node.rotation ?? 0

  // LINE nodes rotate around (0, 50%) — compute AABB from start/end points
  if (node.type === 'LINE') {
    if (!rotation) {
      return { x: pos.x, y: pos.y, w: node.width, h: 0 }
    }
    const rad = rotation * (Math.PI / 180)
    const endX = pos.x + node.width * Math.cos(rad)
    const endY = pos.y + node.width * Math.sin(rad)
    const minX = Math.min(pos.x, endX)
    const minY = Math.min(pos.y, endY)
    return { x: minX, y: minY, w: Math.abs(endX - pos.x), h: Math.abs(endY - pos.y) }
  }

  if (!rotation) {
    return { x: pos.x, y: pos.y, w: node.width, h: node.height }
  }
  // Compute the axis-aligned bounding box of the rotated rectangle
  const rad = rotation * (Math.PI / 180)
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const cx = pos.x + node.width / 2
  const cy = pos.y + node.height / 2
  const rw = node.width * cos + node.height * sin
  const rh = node.width * sin + node.height * cos
  return { x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh }
}

function pointInRect(px: number, py: number, rect: WorldRect): boolean {
  return px >= rect.x && px <= rect.x + rect.w
      && py >= rect.y && py <= rect.y + rect.h
}

function rectsOverlap(a: WorldRect, b: WorldRect): boolean {
  return (
    a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y
  )
}

/**
 * Get the visual center of a node in world space.
 * LINE nodes rotate around their start point, so their center is offset
 * along the rotated direction. Other nodes rotate around their own center.
 */
function getNodeCenter(sg: SceneGraph, node: GeometryNode): { x: number; y: number } {
  const pos = getWorldPosition(sg, node)
  if (node.type === 'LINE') {
    const rad = (node.rotation ?? 0) * (Math.PI / 180)
    return {
      x: pos.x + (node.width / 2) * Math.cos(rad),
      y: pos.y + (node.width / 2) * Math.sin(rad),
    }
  }
  return {
    x: pos.x + node.width / 2,
    y: pos.y + node.height / 2,
  }
}

function isAncestorOf(sg: SceneGraph, node: { parentId: NodeId | null }, ancestorId: NodeId): boolean {
  let currentId = node.parentId
  while (currentId != null) {
    if (currentId === ancestorId) return true
    const parent = sg.getNode(currentId)
    if (!parent) break
    currentId = parent.parentId
  }
  return false
}

/**
 * Find the smallest-area container whose world rect contains the node's center point.
 * Uses center-point containment (like Figma) instead of full-rect containment.
 * This handles lines, rotated shapes, and edge-overhang uniformly.
 * Returns null if node is a section or slide (they don't auto-nest) or no container contains it.
 */
function findContainingParent(
  sg: SceneGraph,
  node: GeometryNode,
  canvasId: NodeId,
): GeometryNode | null {
  if (node.type === 'SECTION' || node.type === 'GRID_SECTION' || node.type === 'SLIDE') return null

  const center = getNodeCenter(sg, node)

  let bestContainer: GeometryNode | null = null
  let bestArea = Infinity

  const ancestorIds = new Set<NodeId>()
  if (node.parentId != null) {
    for (const anc of sg.getAncestors(node.parentId)) {
      ancestorIds.add(anc.id)
    }
  }

  // Walk all nodes under the canvas to find potential containers
  sg.walk(canvasId, (candidate) => {
    if (!isContainer(candidate)) return
    if (candidate.id === node.id) return
    if (!isGeometryNode(candidate)) return
    if (isAncestorOf(sg, candidate, node.id)) return
    if (ancestorIds.has(candidate.id)) return

    const containerRect = getWorldRect(sg, candidate)
    if (pointInRect(center.x, center.y, containerRect)) {
      const area = containerRect.w * containerRect.h
      if (area < bestArea) {
        bestArea = area
        bestContainer = candidate
      }
    }
  })

  return bestContainer
}

type ReparentAction =
  | { action: 'none' }
  | { action: 'adopt'; containerId: NodeId }
  | { action: 'release' }

function resolveReparenting(sg: SceneGraph, nodeId: NodeId, canvasId: NodeId): ReparentAction {
  const node = sg.getNode(nodeId)
  if (!node || !isGeometryNode(node)) return { action: 'none' }
  if (node.type === 'SECTION' || node.type === 'GRID_SECTION' || node.type === 'CONNECTOR') return { action: 'none' }

  const containingParent = findContainingParent(sg, node, canvasId)

  if (containingParent && containingParent.id !== node.parentId) {
    return { action: 'adopt', containerId: containingParent.id }
  }

  if (!containingParent && node.parentId != null) {
    const parent = sg.getNode(node.parentId)
    if (parent && isContainer(parent) && isGeometryNode(parent)) {
      const parentRect = getWorldRect(sg, parent)
      const nodeRect = getWorldRect(sg, node)
      if (!rectsOverlap(parentRect, nodeRect)) {
        return { action: 'release' }
      }
    }
  }

  return { action: 'none' }
}

// ── Orchestrators ────────────────────────────────────────────────────

export function applyNodeReparenting(sg: SceneGraph, nodeIds: NodeId[], canvasId: NodeId): void {
  for (const id of nodeIds) {
    const result = resolveReparenting(sg, id, canvasId)
    if (result.action === 'adopt') {
      reparentNodeAdjusted(sg, id, result.containerId)
    } else if (result.action === 'release') {
      reparentNodeAdjusted(sg, id, canvasId)
    }
  }
}

export function applyContainerReparenting(sg: SceneGraph, containerId: NodeId, canvasId: NodeId): void {
  const container = sg.getNode(containerId)
  if (!container || !isContainer(container) || !isGeometryNode(container)) return

  const containerRect = getWorldRect(sg, container)

  // Build set of container's ancestors to prevent circular reparenting
  const containerAncestors = new Set<NodeId>()
  let cur = container.parentId
  while (cur != null) {
    containerAncestors.add(cur)
    const p = sg.getNode(cur)
    if (!p) break
    cur = p.parentId
  }

  // Check siblings (parent's children) for adoption into this container.
  // The container may be nested inside a SLIDE/FRAME, so we check the
  // parent's children rather than only canvas-level children.
  const parentId = container.parentId ?? canvasId
  const parentNode = sg.getNodeOrThrow(parentId)
  for (const childId of parentNode.children) {
    const sibling = sg.getNode(childId)
    if (!sibling) continue
    if (sibling.type === 'SECTION' || sibling.type === 'GRID_SECTION') continue
    if (sibling.type === 'CONNECTOR') continue
    if (sibling.id === containerId) continue
    if (!isGeometryNode(sibling)) continue
    // Don't adopt an ancestor of the container — would create a cycle
    if (containerAncestors.has(sibling.id)) continue

    const center = getNodeCenter(sg, sibling)
    if (pointInRect(center.x, center.y, containerRect)) {
      reparentNodeAdjusted(sg, sibling.id, containerId)
    }
  }

  // Check current children for release
  const freshContainer = sg.getNodeOrThrow(containerId)
  const childIds = [...freshContainer.children]
  for (const childId of childIds) {
    const child = sg.getNode(childId)
    if (!child || !isGeometryNode(child)) continue

    const childRect = getWorldRect(sg, child)
    if (!rectsOverlap(containerRect, childRect)) {
      reparentNodeAdjusted(sg, childId, parentId)
    }
  }
}
