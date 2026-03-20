/**
 * Core types for the behavior system.
 *
 * Behaviors are composable handlers for canvas pointer interactions.
 * A BehaviorManager holds an ordered array of behaviors and dispatches
 * pointer events using a first-accept-wins pattern on pointerdown.
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { Viewport } from '../viewport/viewport'

// ── CanvasPointerEvent ──────────────────────────────────────────────

/** Position in 2D space. */
export interface Point {
  x: number
  y: number
}

/**
 * Normalized pointer event with canvas context.
 *
 * Drag distance and origin are pre-computed by the BehaviorManager so
 * individual behaviors don't need to track them.
 */
export interface CanvasPointerEvent {
  /** The raw DOM pointer event. */
  raw: PointerEvent

  /** Position in world (scene graph) coordinates. */
  world: Point

  /** Position in screen (CSS pixel) coordinates. */
  screen: Point

  /** The node ID under the pointer, from hit-testing. null if over empty canvas. */
  hitNodeId: NodeId | null

  /** Modifier keys at the time of the event. */
  shift: boolean
  meta: boolean
  alt: boolean

  /**
   * Distance from pointerdown in screen pixels.
   * 0 for pointerdown events and pointerup without prior drag.
   */
  dragDistance: number

  /** Position of the original pointerdown in world coordinates. null if not dragging. */
  dragOrigin: Point | null

  /** Position of the original pointerdown in screen coordinates. null if not dragging. */
  dragScreenOrigin: Point | null
}

// ── Behavior ────────────────────────────────────────────────────────

/**
 * A composable handler for a specific canvas interaction.
 *
 * Behaviors are stored in an ordered array. The array order IS the
 * priority — first behavior to accept a pointerdown becomes the active
 * behavior for the duration of that pointer interaction.
 */
export interface Behavior {
  /** Display name for debugging. */
  name: string

  /**
   * Called on pointerdown. Return true to "accept" and become the active
   * behavior for the duration of this pointer interaction.
   */
  onPointerDown?(event: CanvasPointerEvent): boolean

  /**
   * Called on pointermove when NO behavior is active (hover/idle state).
   * All behaviors receive this, not just the first to accept.
   */
  onPointerMove?(event: CanvasPointerEvent): void

  /**
   * Called on pointermove while this behavior is active AND the pointer
   * has moved beyond the drag threshold (3px). The BehaviorManager
   * handles threshold detection centrally.
   */
  onPointerDrag?(event: CanvasPointerEvent): void

  /**
   * Called on pointerup when this behavior is active.
   */
  onPointerUp?(event: CanvasPointerEvent): void

  /**
   * Draw overlay UI for this behavior on the canvas overlay layer.
   * Called each frame by the render loop for ALL behaviors (not just active).
   * Use this for hover outlines, selection outlines, drag boxes, etc.
   */
  drawOverlay?(ctx: CanvasRenderingContext2D, viewport: Viewport): void

  /** Called when this behavior becomes the active behavior. */
  onActivate?(): void

  /** Called when this behavior is deactivated (pointer up or canceled). */
  onDeactivate?(): void
}

// ── BehaviorContext ─────────────────────────────────────────────────

/**
 * Shared context available to all behaviors.
 *
 * Provides access to the scene graph, viewport, selection, and other
 * canvas services. Passed to behavior factory functions so they can
 * read/write canvas state without needing React hooks.
 */
export interface BehaviorContext {
  /** Get the scene graph instance. */
  sg: () => import('../../scene-graph/scene-graph').SceneGraph

  /** Get the viewport instance. */
  viewport: () => Viewport

  /** Get the selection API. */
  selection: () => import('../selection/provider').SelectionAPI

  /** Get the canvas (page) node ID. */
  canvasId: () => NodeId

  /** Get the undo manager. */
  undoManager: () => import('../../scene-graph/undo-manager').UndoManager

  /** Request a render frame (for overlay repaints). */
  requestFrame: () => void
}
