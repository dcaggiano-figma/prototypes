import { useState, useEffect, useCallback } from 'react'
import type { NodeId } from '../scene-graph/node-id'
import type { SceneNode } from '../scene-graph/types'
import type { SceneGraph } from '../scene-graph/scene-graph'

export interface LayerRowData {
  node: SceneNode
  /** ARIA tree level (1-indexed depth). */
  level: number
  /** 1-indexed position within visible siblings (in display order). */
  posInSet: number
  /** Total visible siblings at this level. */
  setSize: number
  /** Whether this node has visible (non-compound) children. */
  hasChildren: boolean
}

export interface LayersTreeData {
  /** Flat list of node IDs in display order (reverse z-order). */
  items: string[]
  /** Metadata for each node keyed by ID. */
  nodeMap: Map<string, LayerRowData>
}

/**
 * Derive a flat, display-ordered list of layers from the scene graph.
 * Skips compound-owned nodes (slot children) and children of collapsed nodes.
 */
export function useLayersTree(
  sg: SceneGraph,
  rootId: NodeId,
  collapsedIds: ReadonlySet<NodeId>,
): LayersTreeData {
  const compute = useCallback(
    () => collectLayersTree(sg, rootId, collapsedIds),
    [sg, rootId, collapsedIds],
  )

  const [data, setData] = useState(compute)

  // Recompute when inputs change
  useEffect(() => {
    setData(compute())
  }, [compute])

  // Recompute on any scene graph mutation
  useEffect(() => sg.addListener(() => setData(compute())), [sg, compute])

  return data
}

// ── Internal ────────────────────────────────────────────────────────

/** Returns true if a node should be visible in the layers panel. */
function isLayerVisible(sg: SceneGraph, id: NodeId): boolean {
  const node = sg.getNode(id)
  return node != null && node.compoundOwner == null
}

function collectLayersTree(
  sg: SceneGraph,
  rootId: NodeId,
  collapsedIds: ReadonlySet<NodeId>,
): LayersTreeData {
  const items: string[] = []
  const nodeMap = new Map<string, LayerRowData>()

  function visit(nodeId: NodeId, level: number, posInSet: number, setSize: number) {
    const node = sg.getNode(nodeId)
    if (!node || node.compoundOwner != null) return

    const visibleChildren = node.children.filter(id => isLayerVisible(sg, id))
    const hasChildren = visibleChildren.length > 0

    const idStr = String(node.id)
    items.push(idStr)
    nodeMap.set(idStr, { node, level, posInSet, setSize, hasChildren })

    // Skip children of collapsed nodes
    if (collapsedIds.has(node.id)) return

    // Visit children in reverse z-order (topmost first in the layers panel)
    const childSetSize = visibleChildren.length
    for (let i = visibleChildren.length - 1; i >= 0; i--) {
      visit(visibleChildren[i], level + 1, visibleChildren.length - i, childSetSize)
    }
  }

  const root = sg.getNode(rootId)
  if (!root) return { items, nodeMap }

  const rootChildren = root.children.filter(id => isLayerVisible(sg, id))
  const rootSetSize = rootChildren.length

  for (let i = rootChildren.length - 1; i >= 0; i--) {
    visit(rootChildren[i], 0, rootChildren.length - i, rootSetSize)
  }

  return { items, nodeMap }
}
