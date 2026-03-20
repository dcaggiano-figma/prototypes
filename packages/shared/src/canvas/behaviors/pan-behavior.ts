/**
 * PanBehavior — pans the viewport on middle-click or space+click.
 *
 * Accepts on pointerdown when:
 * - Middle mouse button (button === 1), OR
 * - Space bar is held (isSpaceHeld callback returns true)
 *
 * On drag, calls the `onPan` callback with the screen-space delta.
 */

import type { Behavior, CanvasPointerEvent } from './types'

export interface PanBehaviorOptions {
  /** Callback to check if space bar is held. */
  isSpaceHeld: () => boolean
  /** Called with (dx, dy) in screen pixels to apply the pan. */
  onPan: (dx: number, dy: number) => void
  /** Optional callback when panning starts. */
  onPanStart?: () => void
  /** Optional callback when panning ends. */
  onPanEnd?: () => void
}

export function createPanBehavior(options: PanBehaviorOptions): Behavior {
  let lastScreen = { x: 0, y: 0 }

  return {
    name: 'pan',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const isMiddleClick = event.raw.button === 1
      const isSpaceDrag = event.raw.button === 0 && options.isSpaceHeld()

      if (!isMiddleClick && !isSpaceDrag) return false

      lastScreen = { ...event.screen }
      return true
    },

    onActivate() {
      options.onPanStart?.()
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      const dx = event.screen.x - lastScreen.x
      const dy = event.screen.y - lastScreen.y
      lastScreen = { ...event.screen }

      options.onPan(dx, dy)
    },

    onDeactivate() {
      options.onPanEnd?.()
    },
  }
}
