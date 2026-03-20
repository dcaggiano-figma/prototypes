import type { NodeId } from '../../scene-graph/node-id'
import type { GeometryNode } from '../../scene-graph/types'
import { isGeometryNode } from '../../scene-graph/types'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import { getWorldPosition, reparentNodeAdjusted } from './world-position'

// ── Types ────────────────────────────────────────────────────────────

export type AlignDirection = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'

export type DistributeDirection = 'horizontal' | 'vertical'

// ── Internal helpers ─────────────────────────────────────────────────

function collectGeometryNodes(
  sg: SceneGraph,
  selectedIds: Iterable<NodeId>,
): GeometryNode[] {
  const nodes: GeometryNode[] = []
  for (const id of selectedIds) {
    const node = sg.getNode(id)
    if (node && isGeometryNode(node)) {
      nodes.push(node)
    }
  }
  return nodes
}

function getParentWorldPos(
  sg: SceneGraph,
  node: GeometryNode,
): { x: number; y: number } {
  if (!node.parentId) return { x: 0, y: 0 }
  const parent = sg.getNode(node.parentId)
  if (!parent || !isGeometryNode(parent)) return { x: 0, y: 0 }
  return getWorldPosition(sg, parent)
}

// ── alignNodes ───────────────────────────────────────────────────────

export function alignNodes(
  sg: SceneGraph,
  selectedIds: Iterable<NodeId>,
  direction: AlignDirection,
): void {
  const nodes = collectGeometryNodes(sg, selectedIds)
  if (nodes.length < 2) return

  const entries = nodes.map((node) => {
    const world = getWorldPosition(sg, node)
    return { node, worldX: world.x, worldY: world.y }
  })

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const { node, worldX, worldY } of entries) {
    minX = Math.min(minX, worldX)
    maxX = Math.max(maxX, worldX + node.width)
    minY = Math.min(minY, worldY)
    maxY = Math.max(maxY, worldY + node.height)
  }

  for (const { node, worldX, worldY } of entries) {
    let targetWorldX = worldX
    let targetWorldY = worldY

    switch (direction) {
      case 'left':
        targetWorldX = minX
        break
      case 'center-h':
        targetWorldX = (minX + maxX) / 2 - node.width / 2
        break
      case 'right':
        targetWorldX = maxX - node.width
        break
      case 'top':
        targetWorldY = minY
        break
      case 'center-v':
        targetWorldY = (minY + maxY) / 2 - node.height / 2
        break
      case 'bottom':
        targetWorldY = maxY - node.height
        break
    }

    const parentWorld = getParentWorldPos(sg, node)
    sg.updateNode(node.id, {
      x: targetWorldX - parentWorld.x,
      y: targetWorldY - parentWorld.y,
    })
  }
}

// ── distributeNodes ──────────────────────────────────────────────────

export function distributeNodes(
  sg: SceneGraph,
  selectedIds: Iterable<NodeId>,
  direction: DistributeDirection,
): void {
  const nodes = collectGeometryNodes(sg, selectedIds)
  if (nodes.length < 3) return

  const entries = nodes.map((node) => {
    const world = getWorldPosition(sg, node)
    return { node, worldX: world.x, worldY: world.y }
  })

  if (direction === 'horizontal') {
    entries.sort((a, b) => a.worldX - b.worldX)

    const first = entries[0]
    const last = entries[entries.length - 1]
    const totalSpan = last.worldX + last.node.width - first.worldX
    const sumOfWidths = entries.reduce((sum, e) => sum + e.node.width, 0)
    const gap = (totalSpan - sumOfWidths) / (entries.length - 1)

    let currentX = first.worldX + first.node.width + gap
    for (let i = 1; i < entries.length - 1; i++) {
      const { node } = entries[i]
      const parentWorld = getParentWorldPos(sg, node)
      sg.updateNode(node.id, {
        x: currentX - parentWorld.x,
      })
      currentX += node.width + gap
    }
  } else {
    entries.sort((a, b) => a.worldY - b.worldY)

    const first = entries[0]
    const last = entries[entries.length - 1]
    const totalSpan = last.worldY + last.node.height - first.worldY
    const sumOfHeights = entries.reduce((sum, e) => sum + e.node.height, 0)
    const gap = (totalSpan - sumOfHeights) / (entries.length - 1)

    let currentY = first.worldY + first.node.height + gap
    for (let i = 1; i < entries.length - 1; i++) {
      const { node } = entries[i]
      const parentWorld = getParentWorldPos(sg, node)
      sg.updateNode(node.id, {
        y: currentY - parentWorld.y,
      })
      currentY += node.height + gap
    }
  }
}

// ── alignChildren ───────────────────────────────────────────────────

/**
 * Align a container node's children within it.
 * Used when a single frame/section is selected — equivalent to Figma's
 * "align children" behavior.
 */
export function alignChildren(
  sg: SceneGraph,
  containerId: NodeId,
  direction: AlignDirection,
): void {
  const container = sg.getNode(containerId)
  if (!container || !('children' in container)) return

  const childIds = (container as { children: NodeId[] }).children
  if (childIds.length < 2) return

  alignNodes(sg, childIds, direction)
}

// ── distributeChildren ──────────────────────────────────────────────

/**
 * Distribute a container node's children within it.
 * Used when a single frame/section is selected.
 */
export function distributeChildren(
  sg: SceneGraph,
  containerId: NodeId,
  direction: DistributeDirection,
): void {
  const container = sg.getNode(containerId)
  if (!container || !('children' in container)) return

  const childIds = (container as { children: NodeId[] }).children
  if (childIds.length < 3) return

  distributeNodes(sg, childIds, direction)
}

// ── wrapInSection ────────────────────────────────────────────────────

export function wrapInSection(
  sg: SceneGraph,
  selectedIds: Iterable<NodeId>,
  canvasId: NodeId,
  onSelect: (id: NodeId) => void,
): void {
  const nodes = collectGeometryNodes(sg, selectedIds).filter(n => n.type !== 'CONNECTOR')
  if (nodes.length === 0) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const world = getWorldPosition(sg, node)
    minX = Math.min(minX, world.x)
    minY = Math.min(minY, world.y)
    maxX = Math.max(maxX, world.x + node.width)
    maxY = Math.max(maxY, world.y + node.height)
  }

  const spanW = maxX - minX
  const spanH = maxY - minY

  const section = sg.createNode('SECTION', canvasId, {
    x: minX - 40,
    y: minY - 40,
    width: spanW + 80,
    height: spanH + 80,
  })

  for (const node of nodes) {
    // Sections only accept SLIDE children
    if (node.type !== 'SLIDE') continue
    reparentNodeAdjusted(sg, node.id, section.id)
  }

  onSelect(section.id)
}
