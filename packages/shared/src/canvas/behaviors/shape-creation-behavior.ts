/**
 * ShapeCreationBehavior — click-drag to create shapes on the canvas.
 *
 * Handles FRAME, SECTION, RECTANGLE, ELLIPSE, LINE, POLYGON, STAR.
 * On pointerdown, creates a zero-size node at the click position.
 * On drag, resizes the node (LINE uses angle/length, others use width/height).
 * On pointerup, finalizes with default sizes if no meaningful drag, applies
 * reparenting, and commits.
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { NodeType, Paint } from '../../scene-graph/types'
import { isGeometryNode } from '../../scene-graph/types'
import { isContainer, applyContainerReparenting, applyNodeReparenting } from '../scene-graph/container-reparenting'
import { getTypeDefaults } from '../scene-graph/node-defaults'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'

export interface ShapeCreationOptions {
  /** Returns the current tool name. */
  getNodeType: () => NodeType

  /** Called after shape creation to switch back to MOVE tool. */
  onCreated?: (nodeId: NodeId) => void

  /** Fills to apply to the new node. Return empty array for lines. */
  getFills: (nodeType: NodeType) => Paint[]

  /** Extra properties to apply to the new node. */
  getExtraProps?: (nodeType: NodeType) => Record<string, unknown>
}

/** Default sizes for click-without-drag creation */
const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  FRAME: { w: 100, h: 100 },
  SECTION: { w: 300, h: 200 },
  LINE: { w: 100, h: 0 },
}
const FALLBACK_SIZE = { w: 100, h: 100 }

export function createShapeCreationBehavior(
  ctx: BehaviorContext,
  options: ShapeCreationOptions,
): Behavior {
  let creation: {
    nodeId: NodeId
    nodeType: NodeType
    startWorldX: number
    startWorldY: number
  } | null = null

  return {
    name: 'shape-creation',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const nodeType = options.getNodeType()
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()

      const fills = options.getFills(nodeType)
      const extra = options.getExtraProps?.(nodeType) ?? {}

      const startX = Math.round(event.world.x)
      const startY = Math.round(event.world.y)

      const node = sg.createNode(nodeType, canvasId, {
        ...getTypeDefaults(nodeType),
        x: startX,
        y: startY,
        width: 0,
        height: 0,
        fills,
        ...extra,
      })

      creation = {
        nodeId: node.id,
        nodeType,
        startWorldX: startX,
        startWorldY: startY,
      }

      // Select immediately so the selection overlay draws the outline
      // and dimension label during the drag.
      ctx.selection().select(node.id)

      return true
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!creation) return

      const sg = ctx.sg()

      // LINE: compute width as distance, rotation as angle, height stays 0
      if (creation.nodeType === 'LINE') {
        const dx = event.world.x - creation.startWorldX
        const dy = event.world.y - creation.startWorldY
        let length = Math.sqrt(dx * dx + dy * dy)
        let angle = Math.atan2(dy, dx) * (180 / Math.PI)

        // Shift-drag: snap to 45-degree increments
        if (event.shift) {
          angle = Math.round(angle / 45) * 45
          const rad = angle * (Math.PI / 180)
          length = Math.abs(dx * Math.cos(rad) + dy * Math.sin(rad))
        }

        sg.updateNode(creation.nodeId, {
          x: creation.startWorldX,
          y: creation.startWorldY,
          width: Math.round(length),
          height: 0,
          rotation: angle,
        })
        return
      }

      let x = Math.round(Math.min(creation.startWorldX, event.world.x))
      let y = Math.round(Math.min(creation.startWorldY, event.world.y))
      let w = Math.round(Math.abs(event.world.x - creation.startWorldX))
      let h = Math.round(Math.abs(event.world.y - creation.startWorldY))

      // Shift-drag: constrain to square/circle
      if (event.shift) {
        const size = Math.max(w, h)
        w = size
        h = size
        if (event.world.x < creation.startWorldX) x = Math.round(creation.startWorldX - size)
        if (event.world.y < creation.startWorldY) y = Math.round(creation.startWorldY - size)
      }

      sg.updateNode(creation.nodeId, { x, y, width: w, height: h })
    },

    onPointerUp(): void {
      if (!creation) return

      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      const sel = ctx.selection()
      const node = sg.getNode(creation.nodeId)

      if (node && isGeometryNode(node)) {
        // If the shape is too small (click without meaningful drag), set default size
        // and center the node under the click point.
        if (node.width < 2 && node.height < 2) {
          if (creation.nodeType === 'LINE') {
            sg.updateNode(creation.nodeId, {
              x: Math.round(creation.startWorldX - 50),
              y: creation.startWorldY,
              width: 100,
              height: 0,
              rotation: 0,
            })
          } else {
            const defaults = DEFAULT_SIZES[creation.nodeType] ?? FALLBACK_SIZE
            sg.updateNode(creation.nodeId, {
              x: Math.round(creation.startWorldX - defaults.w / 2),
              y: Math.round(creation.startWorldY - defaults.h / 2),
              width: defaults.w,
              height: defaults.h,
            })
          }
        }
      }

      // If this is the first element on the canvas, move it to (0,0)
      // and pan the viewport so it appears where the user clicked.
      const refreshedNode = sg.getNode(creation.nodeId)
      const canvas = sg.getNode(canvasId)
      if (refreshedNode && isGeometryNode(refreshedNode) && canvas && 'children' in canvas && canvas.children.length === 1) {
        const oldX = refreshedNode.x
        const oldY = refreshedNode.y
        sg.updateNode(creation.nodeId, { x: 0, y: 0 })

        // Pan viewport so the node appears where the user clicked
        const vp = ctx.viewport()
        const dx = oldX * vp.scale
        const dy = oldY * vp.scale
        vp.pan(dx, dy)
      }

      sel.select(creation.nodeId)
      const createdNode = sg.getNode(creation.nodeId)
      // First, reparent the node itself into any containing parent (e.g. a FRAME into a SLIDE)
      applyNodeReparenting(sg, [creation.nodeId], canvasId)
      // Then, if it's a container, check if it should adopt any siblings
      if (createdNode && isContainer(createdNode)) {
        applyContainerReparenting(sg, creation.nodeId, canvasId)
      }

      ctx.undoManager().commit()
      const nodeId = creation.nodeId
      creation = null
      options.onCreated?.(nodeId)
    },

    onDeactivate(): void {
      creation = null
    },
  }
}
