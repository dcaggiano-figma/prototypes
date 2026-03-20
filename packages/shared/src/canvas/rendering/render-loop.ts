/**
 * RAF-based render loop that coordinates all canvas layers.
 *
 * Each frame:
 * 1. Flush dirty nodes from the scene graph
 * 2. Flush dirty flag from the viewport
 * 3. If anything changed, notify registered layer callbacks
 *
 * Layers register paint callbacks. The loop calls them in order so that
 * node updates, canvas overlays, and React overlays all update in the
 * same frame — eliminating the "jello" effect.
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import type { Viewport } from '../viewport/viewport'

// ── Types ────────────────────────────────────────────────────────────

export interface FrameState {
  /** Node IDs that changed since the last frame. */
  dirtyNodes: Set<NodeId>
  /** Whether the viewport (pan/zoom) changed since the last frame. */
  viewportChanged: boolean
  /** Whether this frame was forced via `requestFrame()`. */
  forced: boolean
  /** The viewport instance (for reading current transform). */
  viewport: Viewport
  /** The scene graph instance (for reading node data). */
  sg: SceneGraph
}

/**
 * A paint callback registered by a layer. Called once per frame when
 * something has changed (dirty nodes or viewport).
 */
export type PaintCallback = (frame: FrameState) => void

// ── RenderLoop ───────────────────────────────────────────────────────

export class RenderLoop {
  private sg: SceneGraph
  private viewport: Viewport
  private callbacks: PaintCallback[] = []
  private rafId: number | null = null
  private _forceFrame = false
  private _beforePaint: (() => void) | null = null

  constructor(sg: SceneGraph, viewport: Viewport) {
    this.sg = sg
    this.viewport = viewport
  }

  /**
   * Force callbacks to run on the next frame, even if no scene graph
   * nodes or viewport state changed. Use this for overlay-only updates
   * (e.g. hover state, drag box) that don't go through dirty tracking.
   */
  requestFrame(): void {
    this._forceFrame = true
  }

  /**
   * Set a callback that runs before paint callbacks, inside the
   * dirty/forced guard. Used to flush pending React state updates
   * so React overlays and canvas overlays render in the same frame.
   */
  setBeforePaint(cb: (() => void) | null): void {
    this._beforePaint = cb
  }

  /**
   * Register a paint callback. Called in registration order each frame.
   * Pass `prepend: true` to insert at the front (e.g. canvas prep must
   * clear before any other callback draws).
   */
  addCallback(cb: PaintCallback, options?: { prepend?: boolean }): () => void {
    if (options?.prepend) {
      this.callbacks.unshift(cb)
    } else {
      this.callbacks.push(cb)
    }
    return () => {
      const idx = this.callbacks.indexOf(cb)
      if (idx !== -1) this.callbacks.splice(idx, 1)
    }
  }

  /** Start the loop. Idempotent — calling multiple times is safe. */
  start(): void {
    if (this.rafId !== null) return
    this.tick()
  }

  /** Stop the loop and cancel the pending frame. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /** Whether the loop is currently running. */
  get running(): boolean {
    return this.rafId !== null
  }

  // ── Internals ────────────────────────────────────────────────────

  private tick = (): void => {
    const dirtyNodes = this.sg.flushDirty()
    const viewportChanged = this.viewport.flushDirty()

    const forced = this._forceFrame
    this._forceFrame = false

    if (dirtyNodes.size > 0 || viewportChanged || forced) {
      this._beforePaint?.()

      const frame: FrameState = {
        dirtyNodes,
        viewportChanged,
        forced,
        viewport: this.viewport,
        sg: this.sg,
      }

      for (const cb of this.callbacks) {
        cb(frame)
      }
    }

    this.rafId = requestAnimationFrame(this.tick)
  }
}
