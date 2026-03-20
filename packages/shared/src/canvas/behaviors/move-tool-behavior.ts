/**
 * MoveToolBehavior — combined click-select + drag-move for the MOVE tool.
 *
 * This single behavior handles the full pointer lifecycle:
 * - Pointerdown on a node: select it (or add to selection with shift)
 * - Drag past threshold: move all selected nodes
 * - Pointerup without drag: finalize click selection
 * - Pointerdown on empty canvas: handled by BoxSelectBehavior (not here)
 *
 * Combines what would be separate ClickSelect + DragMove behaviors because
 * the two phases share state (the hit node, whether it was already selected).
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { NodeType } from '../../scene-graph/types'
import { isGeometryNode } from '../../scene-graph/types'
import { getTypeDefaults } from '../scene-graph/node-defaults'
import { getSelectionBBox, collectDraggableIds, pointInRect } from '../scene-graph/selection-utils'
import { isContainer, applyContainerReparenting, applyNodeReparenting } from '../scene-graph/container-reparenting'
import type { Behavior, BehaviorContext, CanvasPointerEvent, Point } from './types'

export interface MoveToolBehaviorOptions {
  /** Called on double-click of a node. */
  onDoubleClick?: (nodeId: NodeId, event: CanvasPointerEvent) => void
  /** Filter which nodes can be dragged. Return false to exclude. */
  filterDraggable?: (nodeId: NodeId) => boolean
}

export function createMoveToolBehavior(
  ctx: BehaviorContext,
  options: MoveToolBehaviorOptions = {},
): Behavior {
  /** The node that was hit on pointerdown. */
  let downHitNodeId: NodeId | null = null
  /** Whether the hit node was already selected before this pointerdown. */
  let wasAlreadySelected = false
  /** Whether we've started dragging (threshold exceeded). */
  let hasDragged = false
  /** World-space position at pointerdown (drag origin). */
  let startWorld: Point = { x: 0, y: 0 }
  /** Node IDs being dragged. */
  let movingIds: NodeId[] = []
  /** Original local positions of nodes at drag start. */
  let originalPositions = new Map<NodeId, Point>()
  /** Locked axis when shift is held: null until determined, then 'x' or 'y'. */
  let lockedAxis: 'x' | 'y' | null = null
  /** Track last click for double-click detection. */
  let lastClick: { time: number; x: number; y: number } | null = null

  return {
    name: 'move-tool',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const sel = ctx.selection()
      const sg = ctx.sg()
      downHitNodeId = event.hitNodeId
      hasDragged = false
      lockedAxis = null
      startWorld = { ...event.world }
      originalPositions = new Map()

      // Case 1: Multi-selection bounding box drag
      if (sel.selectedIds.size > 1) {
        const bbox = getSelectionBBox(sg, sel.selectedIds)
        if (bbox && pointInRect(event.world.x, event.world.y, bbox)) {
          wasAlreadySelected = true
          movingIds = collectDraggableIds(sg, sel.selectedIds)
          if (options.filterDraggable) movingIds = movingIds.filter(options.filterDraggable)
          return true
        }
      }

      // Case 2: Click on a node
      if (event.hitNodeId) {
        wasAlreadySelected = sel.isSelected(event.hitNodeId)

        // Select immediately on pointerdown so drag uses the right selection
        if (!wasAlreadySelected) {
          if (event.shift) {
            sel.toggle(event.hitNodeId)
          } else {
            sel.select(event.hitNodeId)
          }
        }

        // Build the list of draggable IDs
        const node = sg.getNode(event.hitNodeId)
        const hitDragIds = node && isGeometryNode(node) ? [event.hitNodeId] : []
        movingIds = sel.isSelected(event.hitNodeId)
          ? collectDraggableIds(sg, sel.selectedIds)
          : hitDragIds
        if (options.filterDraggable) movingIds = movingIds.filter(options.filterDraggable)

        return true
      }

      // Case 3: Click on empty canvas — don't accept (let BoxSelectBehavior handle it)
      return false
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!hasDragged) {
        hasDragged = true
        ctx.selection().setDragging(true)
      }

      if (movingIds.length === 0) return

      const sg = ctx.sg()

      // Capture original local positions on first drag event.
      // Use local x/y (not world position) because setNodeField writes
      // to the node's local coordinate space within its parent.
      if (originalPositions.size === 0) {
        // Alt+Shift drag → duplicate nodes in-place then drag the copies
        if (event.alt) {
          const oldToNew = new Map<NodeId, NodeId>()
          const newMovingIds: NodeId[] = []

          for (const id of movingIds) {
            const node = sg.getNode(id)
            if (!node || !isGeometryNode(node)) continue

            // Clone the node tree (node + all descendants)
            const allNodes = [node, ...sg.getDescendants(id)]
            for (const n of allNodes) {
              const isTop = n.id === id
              const parentId = isTop
                ? (n.parentId ?? ctx.canvasId())
                : (oldToNew.get(n.parentId!) ?? ctx.canvasId())

              const props: Record<string, unknown> = { ...n }
              delete props.id
              delete props.children
              delete props.parentId

              const newNode = sg.createNode(n.type as NodeType, parentId, {
                ...getTypeDefaults(n.type as NodeType),
                ...props,
              })
              oldToNew.set(n.id, newNode.id)
              if (isTop) newMovingIds.push(newNode.id)
            }
          }

          // Switch to dragging the duplicates; originals stay in place
          movingIds = newMovingIds
          ctx.selection().selectMany(newMovingIds)
        }

        for (const id of movingIds) {
          const node = sg.getNode(id)
          if (!node || !isGeometryNode(node)) continue
          originalPositions.set(id, { x: node.x, y: node.y })
        }
      }

      // Compute total delta from mousedown, not per-step delta.
      // This avoids tiny per-step deltas rounding to 0 at high zoom.
      let totalDx = event.world.x - startWorld.x
      let totalDy = event.world.y - startWorld.y

      // Shift constrains movement to a single axis
      if (event.shift) {
        if (lockedAxis === null) {
          // Lock to whichever axis has the larger delta
          lockedAxis = Math.abs(totalDx) >= Math.abs(totalDy) ? 'x' : 'y'
        }
        if (lockedAxis === 'x') totalDy = 0
        else totalDx = 0
      } else {
        lockedAxis = null
      }

      for (const id of movingIds) {
        const orig = originalPositions.get(id)
        if (!orig) continue

        sg.setNodeField(id, 'x', Math.round(orig.x + totalDx))
        sg.setNodeField(id, 'y', Math.round(orig.y + totalDy))
      }

      ctx.requestFrame()
    },

    onPointerUp(event: CanvasPointerEvent): void {
      const sel = ctx.selection()
      sel.setDragging(false)

      if (hasDragged) {
        // Finalize drag — apply reparenting and commit
        const sg = ctx.sg()
        const canvasId = ctx.canvasId()

        const containerIds = movingIds.filter((id) => {
          const n = sg.getNode(id)
          return n && isContainer(n)
        })
        for (const cid of containerIds) {
          applyContainerReparenting(sg, cid, canvasId)
        }
        applyNodeReparenting(sg, movingIds, canvasId)

        ctx.undoManager().commit()
        lastClick = null
        return
      }

      // No drag — treat as click-to-select
      if (downHitNodeId) {
        // Skip shift+click toggle if we already toggled on pointerdown
        const alreadyHandled = event.shift && !wasAlreadySelected
        if (!alreadyHandled) {
          if (event.shift) {
            sel.toggle(downHitNodeId)
          } else {
            sel.select(downHitNodeId)
          }
        }
      } else if (sel.enteredFrameId !== null) {
        sel.exitFrame()
        sel.clear()
      } else {
        sel.clear()
      }

      // Double-click detection
      const now = Date.now()
      if (
        lastClick
        && now - lastClick.time < 300
        && Math.abs(event.screen.x - lastClick.x) < 5
        && Math.abs(event.screen.y - lastClick.y) < 5
      ) {
        lastClick = null
        if (downHitNodeId) {
          options.onDoubleClick?.(downHitNodeId, event)
        }
      } else {
        lastClick = { time: now, x: event.screen.x, y: event.screen.y }
      }
    },

    onDeactivate(): void {
      ctx.selection().setDragging(false)
      movingIds = []
    },
  }
}
