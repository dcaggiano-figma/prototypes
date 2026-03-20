/**
 * GridDragBehavior — intercepts drag of managed grid nodes (e.g. slides)
 * and converts the drag into a grid reorder operation.
 *
 * Sits BEFORE move-tool in the behavior chain so it gets first crack at
 * managed nodes. Non-managed nodes fall through to move-tool for normal
 * free-form movement with alt-drag, shift-lock, etc.
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'

export interface GridDragBehaviorOptions {
  /** Return true if the node should be handled by grid drag (e.g. a managed slide). */
  isManagedNode: (nodeId: NodeId) => boolean

  /** Find the drop target at the given world position. Return null if none. */
  findDropTarget: (worldX: number, worldY: number, draggedNodeId: NodeId) => unknown | null

  /** Apply the drop (reparent/reorder). Called on pointerup if a drop target exists. */
  onDrop: (nodeId: NodeId, target: unknown) => void

  /** Called when the drop target changes during drag (for rendering indicators). */
  onDropTargetChange?: (target: unknown | null) => void
}

export function createGridDragBehavior(
  ctx: BehaviorContext,
  options: GridDragBehaviorOptions,
): Behavior {
  let dragNodeId: NodeId | null = null
  let hasDragged = false
  let currentTarget: unknown | null = null

  return {
    name: 'grid-drag',

    onPointerDown(event: CanvasPointerEvent): boolean {
      if (!event.hitNodeId) return false
      if (!options.isManagedNode(event.hitNodeId)) return false

      dragNodeId = event.hitNodeId
      hasDragged = false
      currentTarget = null

      // Select the node immediately
      const sel = ctx.selection()
      if (!sel.isSelected(event.hitNodeId)) {
        sel.select(event.hitNodeId)
      }

      return true
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!dragNodeId) return

      if (!hasDragged) {
        hasDragged = true
        ctx.selection().setDragging(true)
      }

      const target = options.findDropTarget(event.world.x, event.world.y, dragNodeId)
      currentTarget = target
      options.onDropTargetChange?.(target)
    },

    onPointerUp(): void {
      if (!dragNodeId) return

      ctx.selection().setDragging(false)

      if (hasDragged && currentTarget) {
        options.onDrop(dragNodeId, currentTarget)
        ctx.undoManager().commit()
      }

      options.onDropTargetChange?.(null)
      dragNodeId = null
      currentTarget = null
    },

    onDeactivate(): void {
      ctx.selection().setDragging(false)
      options.onDropTargetChange?.(null)
      dragNodeId = null
      currentTarget = null
    },
  }
}
