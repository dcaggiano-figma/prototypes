import { useCallback, useMemo } from 'react'
import type { NodeId } from '../../scene-graph/node-id'
import { isGeometryNode } from '../../scene-graph/types'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import type { AlignDirection, DistributeDirection } from './alignment'
import { alignNodes, alignToParent, alignChildren, distributeNodes } from './alignment'
import { isContainer } from './container-reparenting'

/**
 * Shared hook that determines which alignment strategy to use based on
 * the current selection, and returns ready-to-use handlers + enabled flags.
 *
 * Priority:
 * 1. Single geometry node inside a container → alignToParent
 * 2. 2+ geometry nodes selected → alignNodes (relative to each other)
 * 3. Single container with 2+ children → alignChildren
 * 4. Otherwise → disabled
 */
export function useAlignHandler(
  sg: SceneGraph,
  selectedIds: ReadonlySet<NodeId>,
): {
  handleAlign: (direction: AlignDirection) => void
  handleDistribute: (direction: DistributeDirection) => void
  alignEnabled: boolean
  distributeEnabled: boolean
} {
  const { mode, geoCount } = useMemo(() => {
    let geo = 0
    for (const id of selectedIds) {
      const node = sg.getNode(id)
      if (node && isGeometryNode(node)) geo++
    }

    // Single node: check if it's inside a container
    if (geo === 1 && selectedIds.size === 1) {
      const id = selectedIds.values().next().value as NodeId
      const node = sg.getNode(id)
      if (node && isGeometryNode(node) && node.parentId) {
        const parent = sg.getNode(node.parentId)
        if (parent && isContainer(parent)) {
          return { mode: 'parent' as const, geoCount: geo }
        }
      }
    }

    // Multi-select: align nodes relative to each other
    if (geo >= 2) {
      return { mode: 'nodes' as const, geoCount: geo }
    }

    // Single container with 2+ children
    if (selectedIds.size === 1) {
      const id = selectedIds.values().next().value as NodeId
      const node = sg.getNode(id)
      if (node && 'children' in node && Array.isArray(node.children) && node.children.length >= 2) {
        return { mode: 'children' as const, geoCount: geo }
      }
    }

    return { mode: 'disabled' as const, geoCount: geo }
  }, [sg, selectedIds])

  const handleAlign = useCallback(
    (direction: AlignDirection) => {
      switch (mode) {
        case 'parent':
          alignToParent(sg, selectedIds, direction)
          break
        case 'nodes':
          alignNodes(sg, selectedIds, direction)
          break
        case 'children': {
          const id = selectedIds.values().next().value as NodeId
          alignChildren(sg, id, direction)
          break
        }
      }
    },
    [sg, selectedIds, mode],
  )

  const handleDistribute = useCallback(
    (direction: DistributeDirection) => {
      distributeNodes(sg, selectedIds, direction)
    },
    [sg, selectedIds],
  )

  return {
    handleAlign,
    handleDistribute,
    alignEnabled: mode !== 'disabled',
    distributeEnabled: geoCount >= 3,
  }
}
