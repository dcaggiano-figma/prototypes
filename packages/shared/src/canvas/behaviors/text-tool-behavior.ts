/**
 * TextToolBehavior — click to place a text node and enter editing.
 *
 * Accepts any pointerdown, creates a TEXT node at the click position,
 * selects it, enters text editing mode, and calls onCreated to switch
 * back to the MOVE tool.
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { Paint } from '../../scene-graph/types'
import { applyNodeReparenting } from '../scene-graph/container-reparenting'
import { getTypeDefaults } from '../scene-graph/node-defaults'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'

export interface TextToolBehaviorOptions {
  /** Get fills for the new text node. */
  getFills: () => Paint[]

  /** Start editing the text node. */
  startEditing: (nodeId: NodeId) => void

  /** Called after creation (e.g., switch to MOVE tool). */
  onCreated?: (nodeId: NodeId) => void
}

export function createTextToolBehavior(
  ctx: BehaviorContext,
  options: TextToolBehaviorOptions,
): Behavior {
  return {
    name: 'text-tool',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()

      const node = sg.createNode('TEXT', canvasId, {
        ...getTypeDefaults('TEXT'),
        x: event.world.x,
        y: event.world.y,
        width: 120,
        height: 22,
        fills: options.getFills(),
      })

      ctx.selection().select(node.id)
      applyNodeReparenting(sg, [node.id], canvasId)
      options.startEditing(node.id)
      ctx.undoManager().commit()
      options.onCreated?.(node.id)

      return true
    },
  }
}
