/**
 * Imperative DOM style application for scene nodes.
 *
 * Called by the RAF loop for dirty nodes. Updates element styles directly
 * without going through React. This is the hot path during drag/resize.
 *
 * Each node type has specific style logic matching the React renderers.
 * HTML-based shapes use applyNodeStyles. SVG-based shapes (VECTOR, ELLIPSE,
 * LINE, etc.) use applySvgNodeStyles for position/size updates.
 */

import type { SceneNode, FrameNode, RectangleNode, SectionNode, GridSectionNode, SlideNode, TextNode, VectorNode, EllipseNode, PolygonNode, StarNode, LineNode, StickyNoteNode, ShapeWithTextNode } from '../../scene-graph/types'
import { colorToCSS, getFirstVisibleFill, getFirstVisibleStroke, rotationTransform, strokeBoxShadow, svgStrokeWidth } from './style-helpers'

// ── Public API ───────────────────────────────────────────────────────

/**
 * Apply all visual styles from a scene node to its DOM element.
 * Handles transform, size, fill, stroke, opacity, corner radius, etc.
 */
export function applyNodeStyles(el: HTMLElement, node: SceneNode): void {
  switch (node.type) {
    case 'RECTANGLE':
      applyRectangleStyles(el, node)
      break
    case 'FRAME':
      applyFrameStyles(el, node)
      break
    case 'SECTION':
      applySectionStyles(el, node)
      break
    case 'GRID_SECTION':
      applyGridSectionStyles(el, node)
      break
    case 'SLIDE':
      applySlideStyles(el, node)
      break
    case 'TEXT':
      applyTextStyles(el, node)
      break
    case 'ELLIPSE':
      applyEllipseStyles(el, node)
      break
    case 'POLYGON':
      applyPolygonStyles(el, node)
      break
    case 'STAR':
      applyStarStyles(el, node)
      break
    case 'STICKY_NOTE':
      applyStickyNoteStyles(el, node)
      break
    case 'SHAPE_WITH_TEXT':
      applyShapeWithTextStyles(el, node)
      break
    default:
      // SVG-based shapes, connectors, groups handled elsewhere
      applyBaseTransform(el, node)
      break
  }
}

// ── Per-type style application ───────────────────────────────────────

function applyRectangleStyles(el: HTMLElement, node: RectangleNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.borderRadius = node.cornerRadius ? `${node.cornerRadius}px` : ''
  s.backgroundColor = fill ? colorToCSS(fill.color, fill.opacity) : ''
  s.boxShadow = strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign) ?? ''
}

function applyFrameStyles(el: HTMLElement, node: FrameNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.borderRadius = node.cornerRadius ? `${node.cornerRadius}px` : ''
  s.overflow = node.clipsContent ? 'hidden' : ''
  s.backgroundColor = fill ? colorToCSS(fill.color, fill.opacity) : ''
  s.boxShadow = strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign) ?? ''
}

function applySectionStyles(el: HTMLElement, node: SectionNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.backgroundColor = fill ? colorToCSS(fill.color, fill.opacity) : ''
  // Border styling (borderRadius, boxShadow) is owned by the React renderer
  // since it varies by template (e.g. slides/buzz use top-border-only).
}

function applyGridSectionStyles(el: HTMLElement, node: GridSectionNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.backgroundColor = fill ? colorToCSS(fill.color, fill.opacity) : ''
}

function applySlideStyles(el: HTMLElement, node: SlideNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.borderRadius = node.cornerRadius ? `${node.cornerRadius}px` : ''
  s.overflow = node.clipsContent ? 'hidden' : ''
  s.backgroundColor = fill ? colorToCSS(fill.color, fill.opacity) : ''
  s.boxShadow = strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign) ?? ''
}

function applyTextStyles(el: HTMLElement, node: TextNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.color = fill ? colorToCSS(fill.color, fill.opacity) : ''
  s.fontFamily = node.fontFamily
  s.fontSize = `${node.fontSize}px`
  s.fontWeight = String(node.fontWeight)
  s.lineHeight = `${node.lineHeight}px`
  s.letterSpacing = `${node.letterSpacing}px`
  s.textAlign = node.textAlignHorizontal.toLowerCase()

  if (node.textAutoResize === 'WIDTH_AND_HEIGHT') {
    s.width = 'max-content'
    s.minHeight = 'auto'
    s.whiteSpace = 'nowrap'
  } else if (node.textAutoResize === 'HEIGHT') {
    s.width = `${node.width}px`
    s.minHeight = 'auto'
    s.whiteSpace = 'pre-wrap'
  } else {
    s.width = `${node.width}px`
    s.minHeight = `${node.height}px`
    s.whiteSpace = 'pre-wrap'
  }
}

function applyEllipseStyles(el: HTMLElement, node: EllipseNode): void {
  applyBaseTransform(el, node)

  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)
  const strokeWeight = stroke ? node.strokeWeight : 0

  // Update inner SVG dimensions and ellipse attributes
  const svg = el.querySelector('svg')
  if (!svg) return
  svg.style.width = `${node.width}px`
  svg.style.height = `${node.height}px`

  const ellipse = svg.querySelector('ellipse')
  if (!ellipse) return
  const rx = node.width / 2
  const ry = node.height / 2
  const inset = node.strokeAlign === 'INSIDE' ? strokeWeight : 0
  ellipse.setAttribute('cx', String(rx))
  ellipse.setAttribute('cy', String(ry))
  ellipse.setAttribute('rx', String(rx - inset / 2))
  ellipse.setAttribute('ry', String(ry - inset / 2))
  ellipse.setAttribute('fill', fill ? colorToCSS(fill.color, fill.opacity) : 'none')
  ellipse.setAttribute('stroke', stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none')
  ellipse.setAttribute('stroke-width', String(strokeWeight))
}

function applyPolygonStyles(el: HTMLElement, node: PolygonNode): void {
  applyBaseTransform(el, node)

  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  const svg = el.querySelector('svg')
  if (!svg) return
  svg.style.width = `${node.width}px`
  svg.style.height = `${node.height}px`

  const polygon = svg.querySelector('polygon')
  if (!polygon) return
  const cx = node.width / 2
  const cy = node.height / 2
  const rx = node.width / 2
  const ry = node.height / 2
  const pts: string[] = []
  for (let i = 0; i < node.sides; i++) {
    const angle = (2 * Math.PI * i) / node.sides - Math.PI / 2
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`)
  }
  polygon.setAttribute('points', pts.join(' '))
  polygon.setAttribute('fill', fill ? colorToCSS(fill.color, fill.opacity) : 'none')
  polygon.setAttribute('stroke', stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none')
  polygon.setAttribute('stroke-width', String(stroke ? svgStrokeWidth(node.strokeWeight, node.strokeAlign) : 0))
  polygon.setAttribute('paint-order', node.strokeAlign === 'OUTSIDE' ? 'stroke' : 'normal')
}

function applyStarStyles(el: HTMLElement, node: StarNode): void {
  applyBaseTransform(el, node)

  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  const svg = el.querySelector('svg')
  if (!svg) return
  svg.style.width = `${node.width}px`
  svg.style.height = `${node.height}px`

  const polygon = svg.querySelector('polygon')
  if (!polygon) return
  const cx = node.width / 2
  const cy = node.height / 2
  const outerRx = node.width / 2
  const outerRy = node.height / 2
  const innerRx = outerRx * node.innerRadius
  const innerRy = outerRy * node.innerRadius
  const pts: string[] = []
  for (let i = 0; i < node.points * 2; i++) {
    const angle = (Math.PI * i) / node.points - Math.PI / 2
    const isOuter = i % 2 === 0
    const rxi = isOuter ? outerRx : innerRx
    const ryi = isOuter ? outerRy : innerRy
    pts.push(`${cx + rxi * Math.cos(angle)},${cy + ryi * Math.sin(angle)}`)
  }
  polygon.setAttribute('points', pts.join(' '))
  polygon.setAttribute('fill', fill ? colorToCSS(fill.color, fill.opacity) : 'none')
  polygon.setAttribute('stroke', stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none')
  polygon.setAttribute('stroke-width', String(stroke ? svgStrokeWidth(node.strokeWeight, node.strokeAlign) : 0))
  polygon.setAttribute('paint-order', node.strokeAlign === 'OUTSIDE' ? 'stroke' : 'normal')
}

// ── SVG node styles ──────────────────────────────────────────────────

/**
 * Apply position/size styles to SVG-based scene nodes (VECTOR, ELLIPSE, etc.).
 * For VECTOR nodes, updates CSS width/height while keeping the viewBox at
 * path-space dimensions so SVG auto-scales the content.
 */
export function applySvgNodeStyles(el: SVGElement, node: SceneNode): void {
  if (node.type === 'VECTOR') {
    applyVectorStyles(el as SVGSVGElement, node)
    return
  }
  if (node.type === 'ELLIPSE') {
    applySvgEllipseStyles(el as SVGSVGElement, node)
    return
  }
  if (node.type === 'POLYGON') {
    applySvgPolygonStyles(el as SVGSVGElement, node)
    return
  }
  if (node.type === 'STAR') {
    applySvgStarStyles(el as SVGSVGElement, node)
    return
  }
  if (node.type === 'LINE') {
    applySvgLineStyles(el as SVGSVGElement, node)
    return
  }
  // Generic SVG fallback: update position and size
  applySvgBaseTransform(el, node)
}

function applyVectorStyles(el: SVGSVGElement, node: VectorNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)
  const strokeWeight = stroke ? node.strokeWeight : 0

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''

  // Update viewBox to account for stroke padding
  const pw = node.pathWidth ?? node.width
  const ph = node.pathHeight ?? node.height
  const padding = stroke ? strokeWeight / 2 : 0
  el.setAttribute('viewBox', `${-padding} ${-padding} ${pw + padding * 2} ${ph + padding * 2}`)

  // Update stroke/fill on all path children
  const pathEls = el.querySelectorAll('path')
  const fillCSS = fill ? colorToCSS(fill.color, fill.opacity) : 'none'
  const strokeCSS = stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none'
  for (let i = 0; i < pathEls.length; i++) {
    const p = pathEls[i]
    const pathData = node.paths[i]
    p.setAttribute('fill', pathData?.fill ?? fillCSS)
    p.setAttribute('stroke', strokeCSS)
    p.setAttribute('stroke-width', stroke ? String(strokeWeight) : '0')
  }
}

function applySvgEllipseStyles(el: SVGSVGElement, node: EllipseNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)
  const strokeWeight = stroke ? node.strokeWeight : 0

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''

  const ellipse = el.querySelector('ellipse')
  if (!ellipse) return
  const rx = node.width / 2
  const ry = node.height / 2
  const inset = node.strokeAlign === 'INSIDE' ? strokeWeight : 0
  ellipse.setAttribute('cx', String(rx))
  ellipse.setAttribute('cy', String(ry))
  ellipse.setAttribute('rx', String(rx - inset / 2))
  ellipse.setAttribute('ry', String(ry - inset / 2))
  ellipse.setAttribute('fill', fill ? colorToCSS(fill.color, fill.opacity) : 'none')
  ellipse.setAttribute('stroke', stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none')
  ellipse.setAttribute('stroke-width', String(strokeWeight))
}

function applySvgPolygonStyles(el: SVGSVGElement, node: PolygonNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''

  const polygon = el.querySelector('polygon')
  if (!polygon) return
  const cx = node.width / 2
  const cy = node.height / 2
  const rx = node.width / 2
  const ry = node.height / 2
  const pts: string[] = []
  for (let i = 0; i < node.sides; i++) {
    const angle = (2 * Math.PI * i) / node.sides - Math.PI / 2
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`)
  }
  polygon.setAttribute('points', pts.join(' '))
  polygon.setAttribute('fill', fill ? colorToCSS(fill.color, fill.opacity) : 'none')
  polygon.setAttribute('stroke', stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none')
  polygon.setAttribute('stroke-width', String(stroke ? svgStrokeWidth(node.strokeWeight, node.strokeAlign) : 0))
  polygon.setAttribute('paint-order', node.strokeAlign === 'OUTSIDE' ? 'stroke' : 'normal')
}

function applySvgStarStyles(el: SVGSVGElement, node: StarNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''

  const polygon = el.querySelector('polygon')
  if (!polygon) return
  const cx = node.width / 2
  const cy = node.height / 2
  const outerRx = node.width / 2
  const outerRy = node.height / 2
  const innerRx = outerRx * node.innerRadius
  const innerRy = outerRy * node.innerRadius
  const pts: string[] = []
  for (let i = 0; i < node.points * 2; i++) {
    const angle = (Math.PI * i) / node.points - Math.PI / 2
    const isOuter = i % 2 === 0
    const rxi = isOuter ? outerRx : innerRx
    const ryi = isOuter ? outerRy : innerRy
    pts.push(`${cx + rxi * Math.cos(angle)},${cy + ryi * Math.sin(angle)}`)
  }
  polygon.setAttribute('points', pts.join(' '))
  polygon.setAttribute('fill', fill ? colorToCSS(fill.color, fill.opacity) : 'none')
  polygon.setAttribute('stroke', stroke ? colorToCSS(stroke.color, stroke.opacity) : 'none')
  polygon.setAttribute('stroke-width', String(stroke ? svgStrokeWidth(node.strokeWeight, node.strokeAlign) : 0))
  polygon.setAttribute('paint-order', node.strokeAlign === 'OUTSIDE' ? 'stroke' : 'normal')
}

/** Minimum clickable thickness for lines (px). */
export const LINE_HIT_AREA = 8

function applySvgLineStyles(el: SVGSVGElement, node: LineNode): void {
  const stroke = getFirstVisibleStroke(node.strokes)
  const strokeWeight = stroke ? node.strokeWeight : 1
  const svgHeight = Math.max(node.height, strokeWeight * 2, LINE_HIT_AREA)

  const s = el.style
  s.left = `${node.x}px`
  s.top = `${node.y - svgHeight / 2}px`
  s.transform = rotationTransform(node.rotation)
  s.transformOrigin = '0 50%'
  s.width = `${node.width}px`
  s.height = `${svgHeight}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''

  const cy = String(svgHeight / 2)
  const x2 = String(node.width)

  // Update visible stroke (prefer class selector, fall back to any <line>)
  const line = el.querySelector('line.line-stroke') ?? el.querySelector('line:not(.line-hit)')
  if (line) {
    line.setAttribute('x2', x2)
    line.setAttribute('y1', cy)
    line.setAttribute('y2', cy)
    line.setAttribute('stroke', stroke ? colorToCSS(stroke.color, stroke.opacity) : 'rgb(0,0,0)')
    line.setAttribute('stroke-width', String(strokeWeight))
  }

  // Update hit area
  const hitLine = el.querySelector('line.line-hit')
  if (hitLine) {
    hitLine.setAttribute('x2', x2)
    hitLine.setAttribute('y1', cy)
    hitLine.setAttribute('y2', cy)
  }
}

function applyStickyNoteStyles(el: HTMLElement, node: StickyNoteNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.backgroundColor = fill ? colorToCSS(fill.color, fill.opacity) : ''
}

function applyShapeWithTextStyles(el: HTMLElement, node: ShapeWithTextNode): void {
  const s = el.style
  const fill = getFirstVisibleFill(node.fills)
  const stroke = getFirstVisibleStroke(node.strokes)

  s.left = `${node.x}px`
  s.top = `${node.y}px`
  s.transform = rotationTransform(node.rotation)
  s.width = `${node.width}px`
  s.height = `${node.height}px`
  s.opacity = node.opacity < 1 ? String(node.opacity) : ''
  s.borderRadius = node.shapeType === 'ELLIPSE' ? '50%' : node.cornerRadius ? `${node.cornerRadius}px` : ''
  s.backgroundColor = fill ? colorToCSS(fill.color, fill.opacity) : ''
  s.boxShadow = strokeBoxShadow(stroke, node.strokeWeight, node.strokeAlign) ?? ''
}

// ── Fallback ─────────────────────────────────────────────────────────

function applyBaseTransform(el: HTMLElement, node: SceneNode): void {
  if ('x' in node && 'y' in node && 'rotation' in node) {
    const n = node as { x: number; y: number; rotation: number }
    el.style.left = `${n.x}px`
    el.style.top = `${n.y}px`
    el.style.transform = rotationTransform(n.rotation)
  }
  if ('width' in node && 'height' in node) {
    const n = node as { width: number; height: number }
    el.style.width = `${n.width}px`
    el.style.height = `${n.height}px`
  }
  if ('opacity' in node) {
    const n = node as { opacity: number }
    el.style.opacity = n.opacity < 1 ? String(n.opacity) : ''
  }
}

function applySvgBaseTransform(el: SVGElement, node: SceneNode): void {
  if ('x' in node && 'y' in node && 'rotation' in node) {
    const n = node as { x: number; y: number; rotation: number }
    el.style.left = `${n.x}px`
    el.style.top = `${n.y}px`
    el.style.transform = rotationTransform(n.rotation)
  }
  if ('width' in node && 'height' in node) {
    const n = node as { width: number; height: number }
    el.style.width = `${n.width}px`
    el.style.height = `${n.height}px`
  }
  if ('opacity' in node) {
    const n = node as { opacity: number }
    el.style.opacity = n.opacity < 1 ? String(n.opacity) : ''
  }
}
