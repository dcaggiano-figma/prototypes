import { useCallback, useMemo } from 'react'

import type { NodeId } from '../../scene-graph/node-id'
import { useSceneGraph } from '../scene-graph/provider'
import { useUndoManager } from '../scene-graph/undo-provider'
import { useSelection } from '../selection/provider'

export interface ReorderActions {
  bringToFront(): void
  sendToBack(): void
}

/**
 * Returns handlers to move selected nodes to the front or back of their
 * parent's layer order. Multi-select is supported — nodes in different
 * parents are handled independently, and relative order is preserved.
 *
 * Wire up to your template's action system:
 * ```ts
 * const reorder = useReorderActions()
 * useAction('bring-to-front', reorder.bringToFront)
 * useAction('send-to-back', reorder.sendToBack)
 * ```
 */
export function useReorderActions(): ReorderActions {
  const sg = useSceneGraph()
  const um = useUndoManager()
  const selection = useSelection()

  const bringToFront = useCallback(() => {
    if (selection.selectedIds.size === 0) return

    const grouped = groupByParent(sg, selection.selectedIds)
    let moved = false

    for (const [parentId, nodeIds] of grouped) {
      const parent = sg.getNode(parentId)
      if (!parent) continue

      // Sort ascending by current index so relative order is preserved at the top
      const sorted = nodeIds.sort(
        (a, b) => parent.children.indexOf(a) - parent.children.indexOf(b),
      )

      for (const id of sorted) {
        const freshParent = sg.getNode(parentId)
        if (!freshParent) continue
        sg.reorderNode(id, freshParent.children.length - 1)
        moved = true
      }
    }

    if (moved) um.commit()
  }, [sg, um, selection])

  const sendToBack = useCallback(() => {
    if (selection.selectedIds.size === 0) return

    const grouped = groupByParent(sg, selection.selectedIds)
    let moved = false

    for (const [parentId, nodeIds] of grouped) {
      const parent = sg.getNode(parentId)
      if (!parent) continue

      // Sort descending by current index so relative order is preserved at the bottom
      const sorted = nodeIds.sort(
        (a, b) => parent.children.indexOf(b) - parent.children.indexOf(a),
      )

      for (const id of sorted) {
        sg.reorderNode(id, 0)
        moved = true
      }
    }

    if (moved) um.commit()
  }, [sg, um, selection])

  return useMemo(() => ({ bringToFront, sendToBack }), [bringToFront, sendToBack])
}

function groupByParent(
  sg: ReturnType<typeof useSceneGraph>,
  selectedIds: ReadonlySet<NodeId>,
): Map<NodeId, NodeId[]> {
  const grouped = new Map<NodeId, NodeId[]>()
  for (const id of selectedIds) {
    const node = sg.getNode(id)
    if (!node || node.parentId == null) continue
    let group = grouped.get(node.parentId)
    if (!group) {
      group = []
      grouped.set(node.parentId, group)
    }
    group.push(id)
  }
  return grouped
}
