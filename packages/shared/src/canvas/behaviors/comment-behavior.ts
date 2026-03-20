/**
 * CommentBehavior — click to place a comment pin.
 *
 * Accepts any pointerdown, resolves the hit node (if any),
 * and calls onPlace with the world coordinates and optional node attachment.
 */

import type { NodeId } from '../../scene-graph/node-id'
import { isGeometryNode } from '../../scene-graph/types'
import { getWorldPosition } from '../scene-graph/world-position'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'

export interface CommentPlacement {
  worldX: number
  worldY: number
  /** Node the comment is attached to, if any. */
  nodeId?: NodeId
  /** Offset from node origin, if attached. */
  nodeOffsetX?: number
  /** Offset from node origin, if attached. */
  nodeOffsetY?: number
}

export interface CommentBehaviorOptions {
  /** Called when the user clicks to place a comment. */
  onPlace: (placement: CommentPlacement) => void
}

export function createCommentBehavior(
  ctx: BehaviorContext,
  options: CommentBehaviorOptions,
): Behavior {
  return {
    name: 'comment',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const sg = ctx.sg()

      if (event.hitNodeId) {
        const node = sg.getNode(event.hitNodeId)
        if (node && isGeometryNode(node)) {
          const nodeWorldPos = getWorldPosition(sg, node)
          options.onPlace({
            worldX: event.world.x,
            worldY: event.world.y,
            nodeId: event.hitNodeId,
            nodeOffsetX: event.world.x - nodeWorldPos.x,
            nodeOffsetY: event.world.y - nodeWorldPos.y,
          })
          return true
        }
      }

      options.onPlace({
        worldX: event.world.x,
        worldY: event.world.y,
      })
      return true
    },
  }
}
