/**
 * Viewport — standalone affine transform for canvas pan/zoom.
 *
 * Stores a uniform scale + translate (no rotation/skew) using plain numbers.
 * Mutations mark dirty (for the RAF loop) and notify subscribers (for React).
 *
 * No React dependency — React bindings wrap this class.
 */

// ── Constants ────────────────────────────────────────────────────────

const MIN_SCALE = 0.02
const MAX_SCALE = 256

// ── Viewport class ───────────────────────────────────────────────────

export class Viewport {
  private _scale = 1
  private _originX = 0
  private _originY = 0
  private dirty = false
  private listeners = new Set<() => void>()

  // ── Read ─────────────────────────────────────────────────────────

  /** Current zoom scale. */
  get scale(): number {
    return this._scale
  }

  /** Current pan offset X (screen pixels). */
  get originX(): number {
    return this._originX
  }

  /** Current pan offset Y (screen pixels). */
  get originY(): number {
    return this._originY
  }

  /** CSS transform string for the node layer container. */
  get cssTransform(): string {
    return `matrix(${this._scale}, 0, 0, ${this._scale}, ${this._originX}, ${this._originY})`
  }

  /** Zoom as a percentage (e.g., 100 for 1x). */
  get zoomPercent(): number {
    return Math.round(this._scale * 100)
  }

  // ── Coordinate transforms ────────────────────────────────────────

  /** World coordinates → screen coordinates. */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this._scale + this._originX,
      y: wy * this._scale + this._originY,
    }
  }

  /** Screen coordinates → world coordinates. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this._originX) / this._scale,
      y: (sy - this._originY) / this._scale,
    }
  }

  // ── Mutations ────────────────────────────────────────────────────

  /** Pan by a delta in screen pixels. */
  pan(dx: number, dy: number): void {
    this._originX += dx
    this._originY += dy
    this.markDirty()
  }

  /**
   * Zoom to a new scale, keeping the point (cx, cy) in screen space fixed.
   * The scale is clamped to [MIN_SCALE, MAX_SCALE].
   */
  zoomTo(newScale: number, cx: number, cy: number): void {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale))
    const ratio = clamped / this._scale

    this._originX = cx - (cx - this._originX) * ratio
    this._originY = cy - (cy - this._originY) * ratio
    this._scale = clamped

    this.markDirty()
  }

  /**
   * Set the viewport state directly (for zoom-to-fit, restoring saved state, etc.).
   */
  set(originX: number, originY: number, scale: number): void {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    this._scale = clamped
    this._originX = originX
    this._originY = originY
    this.markDirty()
  }

  // ── Subscriptions ──────────────────────────────────────────────

  /** Subscribe to viewport changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  // ── Dirty tracking ───────────────────────────────────────────────

  /**
   * Returns true if the viewport has changed since the last flush, and
   * resets the dirty flag. Mirrors SceneGraph.flushDirty().
   */
  flushDirty(): boolean {
    const was = this.dirty
    this.dirty = false
    return was
  }

  private markDirty(): void {
    this.dirty = true
    for (const listener of this.listeners) listener()
  }
}
