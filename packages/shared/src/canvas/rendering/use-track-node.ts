/**
 * useTrackNode — React overlay hook for node-following UI.
 *
 * Returns screen-space coordinates for a node, updated each frame via the
 * RAF loop. Used for text editing overlays, comment pins, resize handles,
 * and other UI that needs to float over a specific node.
 *
 * The hook registers a callback with the render loop that runs in the same
 * frame as node layer updates, so the overlay never lags behind.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { NodeId } from '../../scene-graph/node-id'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import type { GeometryNode } from '../../scene-graph/types'
import { isGeometryNode } from '../../scene-graph/types'
import type { Viewport } from '../viewport/viewport'
import type { RenderLoop, FrameState } from './render-loop'

export interface TrackedPosition {
  /** Screen-space X of the node's top-left corner. */
  x: number
  /** Screen-space Y of the node's top-left corner. */
  y: number
  /** Screen-space width (node width × scale). */
  width: number
  /** Screen-space height (node height × scale). */
  height: number
  /** Current viewport scale. */
  scale: number
}

/**
 * Track a node's screen-space position, updated each frame.
 * Returns null if the node doesn't exist or has no geometry.
 */
export function useTrackNode(
  nodeId: NodeId | null,
  sg: SceneGraph,
  viewport: Viewport,
  renderLoop: RenderLoop,
): TrackedPosition | null {
  const [position, setPosition] = useState<TrackedPosition | null>(() =>
    nodeId ? computePosition(sg, viewport, nodeId) : null,
  )

  // Use a ref so the callback always sees the current nodeId
  const nodeIdRef = useRef(nodeId)
  nodeIdRef.current = nodeId

  const update = useCallback(
    (frame: FrameState) => {
      const id = nodeIdRef.current
      if (!id) return

      // Only update if this node is dirty or the viewport changed
      if (!frame.dirtyNodes.has(id) && !frame.viewportChanged) return

      const pos = computePosition(frame.sg, frame.viewport, id)
      setPosition(pos)
    },
    [],
  )

  useEffect(() => {
    if (!nodeId) {
      setPosition(null)
      return
    }

    // Compute initial position
    setPosition(computePosition(sg, viewport, nodeId))

    return renderLoop.addCallback(update)
  }, [nodeId, sg, viewport, renderLoop, update])

  return position
}

// ── Internals ────────────────────────────────────────────────────────

function computePosition(
  sg: SceneGraph,
  viewport: Viewport,
  nodeId: NodeId,
): TrackedPosition | null {
  const node = sg.getNode(nodeId)
  if (!node || !isGeometryNode(node)) return null

  const geo = node as GeometryNode
  const screen = viewport.worldToScreen(geo.x, geo.y)

  return {
    x: screen.x,
    y: screen.y,
    width: geo.width * viewport.scale,
    height: geo.height * viewport.scale,
    scale: viewport.scale,
  }
}
