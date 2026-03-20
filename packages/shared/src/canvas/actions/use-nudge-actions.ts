import { useCallback, useMemo } from 'react'

import { MergeType } from '../../scene-graph/undo-manager'
import type { SceneNode } from '../../scene-graph/types'
import { isGeometryNode } from '../../scene-graph/types'
import { useSceneGraph } from '../scene-graph/provider'
import { useUndoManager } from '../scene-graph/undo-provider'
import { useSelection } from '../selection/provider'
import { collectDraggableIds } from '../scene-graph/selection-utils'

const SMALL_STEP = 1
const BIG_STEP = 8

export interface NudgeActions {
  nudgeUp(): void
  nudgeDown(): void
  nudgeLeft(): void
  nudgeRight(): void
  nudgeUpBig(): void
  nudgeDownBig(): void
  nudgeLeftBig(): void
  nudgeRightBig(): void
}

/**
 * Returns 8 nudge handlers (4 directions x 2 step sizes) for moving
 * selected nodes with arrow keys. Consecutive nudges merge into a
 * single undo step via MergeType.NUDGE.
 *
 * Wire up to your template's action system:
 * ```ts
 * const nudge = useNudgeActions()
 * useAction('nudge.up', nudge.nudgeUp)
 * useAction('nudge.down', nudge.nudgeDown)
 * // ...etc
 * ```
 */
export interface NudgeOptions {
  /** Optional predicate to skip certain nodes (e.g. SLIDE nodes in slide view). */
  shouldSkip?: (node: SceneNode) => boolean
}

export function useNudgeActions(options?: NudgeOptions): NudgeActions {
  const sg = useSceneGraph()
  const um = useUndoManager()
  const selection = useSelection()
  const shouldSkip = options?.shouldSkip

  const nudge = useCallback(
    (dx: number, dy: number) => {
      const ids = collectDraggableIds(sg, selection.selectedIds)
      if (ids.length === 0) return

      let moved = false
      for (const id of ids) {
        const node = sg.getNode(id)
        if (!node || !isGeometryNode(node)) continue
        if (shouldSkip?.(node)) continue
        sg.setNodeField(id, 'x', Math.round(node.x + dx))
        sg.setNodeField(id, 'y', Math.round(node.y + dy))
        moved = true
      }

      if (moved) um.commit(MergeType.NUDGE)
    },
    [sg, um, selection, shouldSkip],
  )

  return useMemo(
    () => ({
      nudgeUp: () => nudge(0, -SMALL_STEP),
      nudgeDown: () => nudge(0, SMALL_STEP),
      nudgeLeft: () => nudge(-SMALL_STEP, 0),
      nudgeRight: () => nudge(SMALL_STEP, 0),
      nudgeUpBig: () => nudge(0, -BIG_STEP),
      nudgeDownBig: () => nudge(0, BIG_STEP),
      nudgeLeftBig: () => nudge(-BIG_STEP, 0),
      nudgeRightBig: () => nudge(BIG_STEP, 0),
    }),
    [nudge],
  )
}
