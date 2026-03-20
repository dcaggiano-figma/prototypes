/**
 * DragMoveBehavior — moves selected nodes by dragging.
 *
 * Accepts on pointerdown when the pointer hits a selected node.
 * On drag, moves all selected nodes by the world-space delta.
 * On pointerup, applies reparenting and commits to undo.
 */

import type { NodeId } from '../../scene-graph/node-id'
import { isGeometryNode } from '../../scene-graph/types'
import { getWorldPosition } from '../scene-graph/world-position'
import { isContainer, applyContainerReparenting, applyNodeReparenting } from '../scene-graph/container-reparenting'
import type { Behavior, BehaviorContext, CanvasPointerEvent, Point } from './types'

export function createDragMoveBehavior(ctx: BehaviorContext): Behavior {
  /** World-space position of the last drag event, for computing deltas. */
  let lastWorld: Point = { x: 0, y: 0 }
  /** Whether we've actually moved (drag threshold was exceeded). */
  let hasDragged = false
  /** The node IDs being moved. */
  let movingIds: NodeId[] = []

  return {
    name: 'drag-move',

    onPointerDown(event: CanvasPointerEvent): boolean {
      if (!event.hitNodeId) return false

      const sel = ctx.selection()
      if (!sel.isSelected(event.hitNodeId)) return false

      lastWorld = { ...event.world }
      hasDragged = false
      movingIds = [...sel.selectedIds]

      return true
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!hasDragged) {
        hasDragged = true
        ctx.selection().setDragging(true)
      }

      const sg = ctx.sg()
      const dx = event.world.x - lastWorld.x
      const dy = event.world.y - lastWorld.y
      lastWorld = { ...event.world }

      for (const id of movingIds) {
        const node = sg.getNode(id)
        if (!node || !isGeometryNode(node)) continue

        const world = getWorldPosition(sg, node)
        sg.setNodeField(id, 'x', Math.round(world.x + dx))
        sg.setNodeField(id, 'y', Math.round(world.y + dy))
      }

      ctx.requestFrame()
    },

    onPointerUp(): void {
      const sel = ctx.selection()
      sel.setDragging(false)

      if (hasDragged) {
        const sg = ctx.sg()
        const canvasId = ctx.canvasId()

        // Apply reparenting for containers that were moved
        const containerIds = movingIds.filter((id) => {
          const n = sg.getNode(id)
          return n && isContainer(n)
        })
        for (const cid of containerIds) {
          applyContainerReparenting(sg, cid, canvasId)
        }
        applyNodeReparenting(sg, movingIds, canvasId)

        ctx.undoManager().commit()
      }
    },

    onDeactivate(): void {
      ctx.selection().setDragging(false)
      movingIds = []
    },
  }
}
