/**
 * Pure functions for computing CSS values from scene graph data.
 *
 * These are used by both the React renderers (current) and the imperative
 * applyNodeStyles (Phase 3 node layer). Extracted from template-local
 * render-helpers.ts to avoid duplication.
 */

import type { Color, Paint, StrokeAlign } from '../../scene-graph/types'

/**
 * Build positioning styles using left/top + rotation-only transform.
 * Matches the imperative node-layer-painter so React re-renders don't
 * conflict with imperatively-applied styles.
 */
export function nodePosition(x: number, y: number, rotation: number): React.CSSProperties {
  return {
    position: 'absolute',
    contain: 'layout style',
    left: x,
    top: y,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  }
}

/** @deprecated Use nodePosition() instead. translate-based positioning
 * conflicts with the imperative RAF updater which uses left/top. */
export function nodeTransform(x: number, y: number, rotation: number): string {
  if (rotation) return `translate(${x}px, ${y}px) rotate(${rotation}deg)`
  return `translate(${x}px, ${y}px)`
}

/**
 * Build a transform string for rotation only.
 * Used when position is handled by left/top instead of translate.
 */
export function rotationTransform(rotation: number): string {
  if (rotation) return `rotate(${rotation}deg)`
  return ''
}

/** Convert a Color + opacity to a CSS color string. */
export function colorToCSS(color: Color, opacity: number): string {
  if (opacity >= 1) return `rgb(${color.r}, ${color.g}, ${color.b})`
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`
}

/** Get the last visible fill paint (fills render bottom to top). */
export function getFirstVisibleFill(fills: Paint[]): Paint | undefined {
  for (let i = fills.length - 1; i >= 0; i--) {
    if (fills[i].visible) return fills[i]
  }
  return undefined
}

/** Get the first visible stroke paint. */
export function getFirstVisibleStroke(strokes: Paint[]): Paint | undefined {
  for (const s of strokes) {
    if (s.visible) return s
  }
  return undefined
}

/** SVG stroke width adjusted for alignment (OUTSIDE/INSIDE double to compensate for clipping). */
export function svgStrokeWidth(weight: number, align: StrokeAlign): number {
  return align === 'CENTER' ? weight : weight * 2
}

/** Compute box-shadow CSS for strokes on div-based shapes. */
export function strokeBoxShadow(
  stroke: Paint | undefined,
  weight: number,
  align: StrokeAlign,
): string | undefined {
  if (!stroke) return undefined

  const color = colorToCSS(stroke.color, stroke.opacity)

  if (align === 'INSIDE') return `inset 0 0 0 ${weight}px ${color}`
  if (align === 'OUTSIDE') return `0 0 0 ${weight}px ${color}`

  // CENTER — half inside, half outside (matches Figma behavior)
  const half = weight / 2
  return `inset 0 0 0 ${half}px ${color}, 0 0 0 ${half}px ${color}`
}
