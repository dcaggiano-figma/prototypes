/**
 * BoxSelectBehavior — drag on empty canvas to marquee-select nodes.
 *
 * Accepts on pointerdown when the pointer hits empty canvas (no node).
 * On drag, draws a selection box and selects all nodes fully enclosed.
 * On pointerup, finalizes the selection.
 */

import type { NodeId } from '../../scene-graph/node-id'
import { isGeometryNode } from '../../scene-graph/types'
import { getWorldPosition } from '../scene-graph/world-position'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'
import type { Viewport } from '../viewport/viewport'

interface DragBox {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export function createBoxSelectBehavior(ctx: BehaviorContext): Behavior {
  let dragBox: DragBox | null = null

  /**
   * Find all direct children of the current parent that are fully
   * enclosed by the given drag box, and update the selection.
   */
  function updateSelectionFromBox(box: DragBox): void {
    const vp = ctx.viewport()
    const sg = ctx.sg()
    const canvasId = ctx.canvasId()
    const sel = ctx.selection()

    const wMin = vp.screenToWorld(
      Math.min(box.startX, box.currentX),
      Math.min(box.startY, box.currentY),
    )
    const wMax = vp.screenToWorld(
      Math.max(box.startX, box.currentX),
      Math.max(box.startY, box.currentY),
    )

    const parentId = sel.enteredFrameId ?? canvasId
    const parent = sg.getNode(parentId)
    if (!parent || !('children' in parent)) return

    const enclosed: NodeId[] = []

    for (const childId of parent.children) {
      const child = sg.getNode(childId)
      if (!child || !isGeometryNode(child)) continue

      const world = getWorldPosition(sg, child)
      const maxX = world.x + child.width
      const maxY = world.y + child.height

      // Select if the node intersects (overlaps) the drag box at all
      if (world.x <= wMax.x && maxX >= wMin.x && world.y <= wMax.y && maxY >= wMin.y) {
        enclosed.push(child.id)
      }
    }

    if (enclosed.length > 0) {
      sel.selectMany(enclosed)
    } else {
      sel.clear()
    }
  }

  return {
    name: 'box-select',

    onPointerDown(event: CanvasPointerEvent): boolean {
      // Only accept when clicking empty canvas
      if (event.hitNodeId) return false

      dragBox = {
        startX: event.screen.x,
        startY: event.screen.y,
        currentX: event.screen.x,
        currentY: event.screen.y,
      }
      return true
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!dragBox) return

      dragBox = {
        ...dragBox,
        currentX: event.screen.x,
        currentY: event.screen.y,
      }

      updateSelectionFromBox(dragBox)
      ctx.requestFrame()
    },

    onPointerUp(): void {
      if (!dragBox) return

      updateSelectionFromBox(dragBox)

      dragBox = null
      ctx.requestFrame()
    },

    onDeactivate(): void {
      dragBox = null
      ctx.requestFrame()
    },

    drawOverlay(drawCtx: CanvasRenderingContext2D, _viewport: Viewport): void {
      if (!dragBox) return

      const bx = Math.min(dragBox.startX, dragBox.currentX)
      const by = Math.min(dragBox.startY, dragBox.currentY)
      const bw = Math.abs(dragBox.currentX - dragBox.startX)
      const bh = Math.abs(dragBox.currentY - dragBox.startY)

      if (bw <= 1 && bh <= 1) return

      // Resolve selection color from CSS variable
      const styles = getComputedStyle(document.documentElement)
      const selectionColor = styles.getPropertyValue('--color-border-selected').trim() || '#0d99ff'

      drawCtx.fillStyle = selectionColor.startsWith('#') ? `${selectionColor}1a` : selectionColor
      drawCtx.fillRect(bx, by, bw, bh)
      drawCtx.strokeStyle = selectionColor
      drawCtx.lineWidth = 1
      drawCtx.strokeRect(bx, by, bw, bh)
    },
  }
}
