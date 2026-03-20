/**
 * PencilBehavior — freehand drawing tool.
 *
 * On pointerdown, creates a live SVG path preview in world-space.
 * On drag, appends points with distance filtering and coalesced events.
 * On pointerup, simplifies the path (RDP), smooths it (Catmull-Rom),
 * creates a VectorNode, and commits.
 */

import type { NodeId } from '../../scene-graph/node-id'
import { createPaint } from '../../scene-graph/types'
import { getTypeDefaults } from '../scene-graph/node-defaults'
import { applyNodeReparenting } from '../scene-graph/container-reparenting'
import { computeBounds, simplifyRDP, pointsToBezierPath, pointsToPolyline } from '../tools/path-smoothing'
import type { Point } from '../tools/path-smoothing'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'

/** Minimum distance (world-space px) between recorded pencil points */
const MIN_DISTANCE = 2

/** RDP simplification epsilon (world-space px) */
const RDP_EPSILON = 2.0

export interface PencilBehaviorOptions {
  /** Get the SVG overlay element for live preview (in world-space). */
  getSvgOverlay: () => SVGSVGElement | null

  /** Get the current draw color as {r, g, b} (0–255). */
  getColor: () => { r: number; g: number; b: number }

  /** Get the current stroke weight. */
  getStrokeWeight: () => number

  /** Get the current opacity (0–1). */
  getOpacity: () => number

  /** Called after creation with the new node ID. */
  onCreated?: (nodeId: NodeId) => void
}

export function createPencilBehavior(
  ctx: BehaviorContext,
  options: PencilBehaviorOptions,
): Behavior {
  let points: Point[] = []
  let pathEl: SVGPathElement | null = null

  return {
    name: 'pencil',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const overlay = options.getSvgOverlay()
      if (!overlay) return false

      const rgb = options.getColor()
      const strokeWeight = options.getStrokeWeight()
      const opacity = options.getOpacity()

      pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathEl.setAttribute('d', `M${event.world.x},${event.world.y}`)
      pathEl.setAttribute('fill', 'none')
      pathEl.setAttribute('stroke', `rgb(${rgb.r},${rgb.g},${rgb.b})`)
      pathEl.setAttribute('stroke-width', String(strokeWeight))
      pathEl.setAttribute('opacity', String(opacity))
      pathEl.setAttribute('stroke-linecap', 'round')
      pathEl.setAttribute('stroke-linejoin', 'round')
      overlay.appendChild(pathEl)

      points = [{ x: event.world.x, y: event.world.y }]
      return true
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!pathEl) return

      // Use coalesced events for high-fidelity input when available
      const raw = event.raw
      const coalescedEvents = raw.getCoalescedEvents?.() ?? [raw]
      const vp = ctx.viewport()
      let updated = false

      for (const evt of coalescedEvents) {
        const world = vp.screenToWorld(evt.clientX, evt.clientY)
        const last = points[points.length - 1]
        const dx = world.x - last.x
        const dy = world.y - last.y

        // Distance filter: skip if too close to last point
        if (dx * dx + dy * dy < MIN_DISTANCE * MIN_DISTANCE) continue

        points.push({ x: world.x, y: world.y })
        updated = true
      }

      if (updated) {
        pathEl.setAttribute('d', pointsToPolyline(points))
      }
    },

    onPointerUp(): void {
      if (pathEl) {
        pathEl.remove()
        pathEl = null
      }

      // Discard if too few points (click without drag)
      if (points.length < 2) {
        points = []
        return
      }

      const strokeWeight = options.getStrokeWeight()
      const rgb = options.getColor()
      const opacity = options.getOpacity()

      // Compute bounding box, normalize points to local coords
      const bounds = computeBounds(points)
      const minSize = strokeWeight
      const w = Math.max(bounds.width, minSize)
      const h = Math.max(bounds.height, minSize)

      const normalized = points.map((p) => ({
        x: p.x - bounds.x,
        y: p.y - bounds.y,
      }))

      // Simplify and smooth
      const simplified = simplifyRDP(normalized, RDP_EPSILON)
      const d = pointsToBezierPath(simplified)

      // Build stroke paint
      const strokePaint = createPaint({ type: 'SOLID', color: rgb, opacity, visible: true })

      // Create the VectorNode
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      const node = sg.createNode('VECTOR', canvasId, {
        ...getTypeDefaults('VECTOR'),
        x: bounds.x,
        y: bounds.y,
        width: w,
        height: h,
        pathWidth: w,
        pathHeight: h,
        fills: [],
        strokes: [strokePaint],
        strokeWeight,
        strokeAlign: 'CENTER',
        paths: [{ d }],
      })

      ctx.selection().select(node.id)
      applyNodeReparenting(sg, [node.id], canvasId)
      ctx.undoManager().commit()

      points = []
      options.onCreated?.(node.id)
    },

    onDeactivate(): void {
      if (pathEl) {
        pathEl.remove()
        pathEl = null
      }
      points = []
    },
  }
}
