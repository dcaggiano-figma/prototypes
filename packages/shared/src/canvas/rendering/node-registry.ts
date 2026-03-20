/**
 * Node registry — maps NodeId to DOM elements.
 *
 * React components register their DOM refs here on mount and unregister on
 * unmount. The RAF loop reads from this map to apply imperative style updates
 * to dirty nodes without going through React.
 *
 * This is the bridge between React's structural management (create/destroy
 * DOM elements) and the render loop's imperative updates (style changes).
 */

import type { NodeId } from '../../scene-graph/node-id'

export class NodeRegistry {
  private elements = new Map<NodeId, HTMLElement | SVGElement>()

  /** Register a DOM element for a node. Called by React components on mount. */
  register(nodeId: NodeId, element: HTMLElement | SVGElement): void {
    this.elements.set(nodeId, element)
  }

  /** Unregister a node's DOM element. Called by React components on unmount. */
  unregister(nodeId: NodeId): void {
    this.elements.delete(nodeId)
  }

  /** Get the DOM element for a node, or undefined if not mounted. */
  get(nodeId: NodeId): HTMLElement | SVGElement | undefined {
    return this.elements.get(nodeId)
  }

  /** Check if a node has a registered DOM element. */
  has(nodeId: NodeId): boolean {
    return this.elements.has(nodeId)
  }

  /** Number of registered elements. */
  get size(): number {
    return this.elements.size
  }
}
