/**
 * BehaviorManager — dispatches pointer events to an ordered array of behaviors.
 *
 * Uses a chain-of-responsibility pattern: on pointerdown, behaviors are tried
 * in array order until one accepts. That behavior becomes "active" and receives
 * all subsequent pointer events until pointerup.
 *
 * Drag threshold detection is centralized here. Behaviors receive `onPointerDrag`
 * only after the pointer moves 3+ screen pixels from the pointerdown point.
 * `onPointerMove` is only called when no behavior is active (idle/hover state).
 */

import type { Behavior, CanvasPointerEvent, Point } from './types'
import type { Viewport } from '../viewport/viewport'

// ── Constants ────────────────────────────────────────────────────────

/** Drag threshold in screen pixels (same as Figma's 3px). */
const DRAG_THRESHOLD = 3

// ── BehaviorManager ─────────────────────────────────────────────────

export class BehaviorManager {
  private behaviors: Behavior[] = []
  private activeBehavior: Behavior | null = null

  /** Pointerdown origin in screen coords, for drag threshold detection. */
  private downScreen: Point | null = null

  /** Pointerdown origin in world coords, set on the CanvasPointerEvent. */
  private downWorld: Point | null = null

  /** Whether the drag threshold has been exceeded for the current interaction. */
  private dragStarted = false

  // ── Configuration ───────────────────────────────────────────────

  /** Set the behavior chain. Array order = priority (first wins). */
  setBehaviors(behaviors: Behavior[]): void {
    // Deactivate current behavior if the chain is swapped mid-interaction
    if (this.activeBehavior) {
      this.activeBehavior.onDeactivate?.()
      this.activeBehavior = null
    }
    this.behaviors = behaviors
    this.downScreen = null
    this.downWorld = null
    this.dragStarted = false
  }

  /** The currently active behavior, or null if idle. */
  get active(): Behavior | null {
    return this.activeBehavior
  }

  // ── Pointer event routing ───────────────────────────────────────

  /**
   * Route a pointerdown to behaviors. The first behavior whose
   * `onPointerDown` returns true becomes active.
   */
  handlePointerDown(event: CanvasPointerEvent): void {
    // Store the down position for drag threshold detection
    this.downScreen = { ...event.screen }
    this.downWorld = { ...event.world }
    this.dragStarted = false

    for (const behavior of this.behaviors) {
      if (behavior.onPointerDown?.(event)) {
        this.activeBehavior = behavior
        behavior.onActivate?.()
        return
      }
    }
  }

  /**
   * Route a pointermove event.
   *
   * - If a behavior is active and drag threshold exceeded → `onPointerDrag`
   * - If a behavior is active but threshold NOT exceeded → nothing (wait)
   * - If no behavior is active → `onPointerMove` on ALL behaviors (hover)
   */
  handlePointerMove(event: CanvasPointerEvent): void {
    if (this.activeBehavior) {
      // Check drag threshold
      if (!this.dragStarted && this.downScreen) {
        const dx = event.screen.x - this.downScreen.x
        const dy = event.screen.y - this.downScreen.y
        if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
          this.dragStarted = true
        }
      }

      if (this.dragStarted) {
        // Enrich the event with drag origin info
        const dragEvent = this.enrichDragEvent(event)
        this.activeBehavior.onPointerDrag?.(dragEvent)
      }
      return
    }

    // No active behavior — broadcast to all behaviors for hover/idle updates
    for (const behavior of this.behaviors) {
      behavior.onPointerMove?.(event)
    }
  }

  /**
   * Route a pointerup to the active behavior, then deactivate it.
   */
  handlePointerUp(event: CanvasPointerEvent): void {
    if (this.activeBehavior) {
      const upEvent = this.enrichDragEvent(event)
      this.activeBehavior.onPointerUp?.(upEvent)
      this.activeBehavior.onDeactivate?.()
      this.activeBehavior = null
    }

    this.downScreen = null
    this.downWorld = null
    this.dragStarted = false
  }

  // ── Overlay drawing ─────────────────────────────────────────────

  /**
   * Draw overlays from all behaviors. Called each frame by the render
   * loop's paint callback.
   */
  drawOverlays(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
    for (const behavior of this.behaviors) {
      behavior.drawOverlay?.(ctx, viewport)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  /** Whether a drag is currently in progress (threshold exceeded). */
  get isDragging(): boolean {
    return this.activeBehavior !== null && this.dragStarted
  }

  /** Force-cancel the current interaction (e.g., on Escape key). */
  cancel(): void {
    if (this.activeBehavior) {
      this.activeBehavior.onDeactivate?.()
      this.activeBehavior = null
    }
    this.downScreen = null
    this.downWorld = null
    this.dragStarted = false
  }

  /**
   * Enrich an event with drag distance and origin from the stored
   * pointerdown position.
   */
  private enrichDragEvent(event: CanvasPointerEvent): CanvasPointerEvent {
    if (!this.downScreen || !this.downWorld) return event

    const dx = event.screen.x - this.downScreen.x
    const dy = event.screen.y - this.downScreen.y

    return {
      ...event,
      dragDistance: Math.sqrt(dx * dx + dy * dy),
      dragOrigin: this.downWorld,
      dragScreenOrigin: this.downScreen,
    }
  }
}
