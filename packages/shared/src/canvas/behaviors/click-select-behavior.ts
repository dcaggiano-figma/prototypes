/**
 * ClickSelectBehavior — selects nodes on click.
 *
 * Accepts any pointerdown that hits a node (or empty canvas for deselect).
 * On pointerup without drag, performs selection:
 * - Click node: select it (or shift-toggle)
 * - Click empty: clear selection
 *
 * This behavior is typically combined with DragMoveBehavior via the
 * BehaviorManager's drag threshold — if the pointer moves past the
 * threshold, the manager transitions to drag mode.
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'

export interface ClickSelectBehaviorOptions {
  /** Double-click handler (e.g., enter frame or edit text). */
  onDoubleClick?: (nodeId: NodeId, event: CanvasPointerEvent) => void
}

export function createClickSelectBehavior(
  ctx: BehaviorContext,
  options: ClickSelectBehaviorOptions = {},
): Behavior {
  /** Whether the hit node was already selected on pointerdown (for shift-click logic). */
  let wasAlreadySelected = false
  /** The node that was hit on pointerdown. */
  let downHitNodeId: NodeId | null = null
  /** Track pointerdown position for double-click detection. */
  let lastClick: { time: number; x: number; y: number } | null = null

  return {
    name: 'click-select',

    onPointerDown(event: CanvasPointerEvent): boolean {
      // Always accept — we handle both "hit node" and "hit empty canvas"
      downHitNodeId = event.hitNodeId
      const sel = ctx.selection()

      if (event.hitNodeId) {
        wasAlreadySelected = sel.isSelected(event.hitNodeId)

        if (event.shift) {
          // Shift+click: add to selection immediately (toggle happens on up)
          if (!wasAlreadySelected) {
            sel.add(event.hitNodeId)
          }
        } else if (!wasAlreadySelected) {
          // Click unselected node: select immediately (enables drag of newly selected node)
          sel.select(event.hitNodeId)
        }
      }

      return true
    },

    onPointerUp(event: CanvasPointerEvent): void {
      const sel = ctx.selection()

      if (downHitNodeId) {
        // Skip shift+click toggle if we already added this node on down
        const alreadyHandled = event.shift && !wasAlreadySelected
        if (!alreadyHandled) {
          if (event.shift) {
            sel.toggle(downHitNodeId)
          } else {
            sel.select(downHitNodeId)
          }
        }
      } else if (sel.enteredFrameId !== null) {
        // Click empty canvas while inside a frame → exit frame
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
  }
}
