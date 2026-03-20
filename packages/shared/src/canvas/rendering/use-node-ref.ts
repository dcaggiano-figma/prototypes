/**
 * useNodeRef — registers a DOM element with the NodeRegistry for imperative updates.
 *
 * Returns a ref callback to attach to the rendered DOM element. On mount it
 * registers the element; on unmount it unregisters. The RAF loop can then
 * find this element by NodeId and apply style updates without React.
 */

import { useCallback, useRef } from 'react'
import type { NodeId } from '../../scene-graph/node-id'
import type { NodeRegistry } from './node-registry'

/**
 * Register a DOM element for a scene node with the NodeRegistry.
 * Attach the returned ref to the outermost element of your renderer.
 *
 * Registration and cleanup are handled entirely by the callback ref.
 * React calls it with the element on mount and with null on unmount,
 * which is Strict Mode safe (no effect cleanup race condition).
 */
export function useNodeRef<T extends HTMLElement | SVGElement>(
  nodeId: NodeId,
  registry: NodeRegistry,
): (el: T | null) => void {
  const elRef = useRef<T | null>(null)

  return useCallback(
    (el: T | null) => {
      // Unregister previous element if it changed
      if (elRef.current && elRef.current !== el) {
        registry.unregister(nodeId)
      }
      elRef.current = el
      if (el) {
        registry.register(nodeId, el)
      }
    },
    [nodeId, registry],
  )
}
