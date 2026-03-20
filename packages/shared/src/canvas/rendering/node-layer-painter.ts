/**
 * Node layer paint callback for the render loop.
 *
 * When the RAF loop fires, this callback iterates over dirty node IDs,
 * looks up their DOM elements in the NodeRegistry, reads current node data
 * from the SceneGraph, and applies styles imperatively.
 *
 * This bypasses React for the hot path (drag, resize, property scrubbing)
 * while React still handles structural changes (mount/unmount).
 */

import type { NodeRegistry } from './node-registry'
import type { FrameState } from './render-loop'
import { applyNodeStyles, applySvgNodeStyles } from './apply-node-styles'

/**
 * Create a paint callback that updates DOM elements for dirty nodes.
 * Register the returned callback with `renderLoop.addCallback()`.
 */
export function createNodeLayerPainter(registry: NodeRegistry) {
  return (frame: FrameState) => {
    for (const nodeId of frame.dirtyNodes) {
      const el = registry.get(nodeId)
      if (!el) continue

      const node = frame.sg.getNode(nodeId)
      if (!node) continue

      if (el instanceof HTMLElement) {
        applyNodeStyles(el, node)
      } else if (el instanceof SVGElement) {
        applySvgNodeStyles(el, node)
      }
    }
  }
}
