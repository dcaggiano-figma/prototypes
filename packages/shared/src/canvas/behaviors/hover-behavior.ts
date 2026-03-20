/**
 * HoverBehavior — tracks which node is under the pointer for hover outlines.
 *
 * This is a passive behavior: it never accepts pointerdown, only
 * responds to onPointerMove (which fires when no behavior is active).
 * It calls `selection.setHovered()` to update the hover state.
 */

import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'
import { resolveHoverNode } from './hit-testing'

export function createHoverBehavior(ctx: BehaviorContext): Behavior {
  return {
    name: 'hover',

    onPointerMove(event: CanvasPointerEvent): void {
      const target = event.raw.target as HTMLElement
      const hoveredId = resolveHoverNode(target)
      ctx.selection().setHovered(hoveredId)
    },
  }
}
