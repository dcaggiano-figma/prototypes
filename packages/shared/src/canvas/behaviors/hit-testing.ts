/**
 * Hit-testing utilities for the behavior system.
 *
 * These resolve which node the pointer is over by walking up the DOM
 * from the event target, reading `data-node-id` attributes.
 */

import type { NodeId } from '../../scene-graph/node-id'

/**
 * Figma-style hit resolution for selection.
 *
 * Walks up from the click target collecting all `data-node-id` values
 * into a chain (innermost first → reversed to outermost first).
 *
 * - `enteredFrameId === null` → return the innermost (deepest) node
 * - `enteredFrameId` is set → return the direct child of the entered
 *   frame, or the entered frame itself if the click lands directly on it.
 */
export function resolveHitNode(el: HTMLElement, enteredFrameId: NodeId | null): NodeId | null {
  // Collect all node IDs from innermost to outermost
  const chain: NodeId[] = []
  let cur: HTMLElement | null = el
  while (cur) {
    const raw = cur.dataset?.nodeId
    if (raw) {
      const id = Number(raw) as NodeId
      if (!chain.includes(id)) {
        chain.push(id)
      }
    }
    cur = cur.parentElement
  }

  if (chain.length === 0) return null

  // Reverse so chain[0] is outermost (root-level)
  chain.reverse()

  if (enteredFrameId === null) {
    // Select the innermost (deepest) node so children are directly clickable
    return chain[chain.length - 1]
  }

  // Find the entered frame in the chain
  const enteredIdx = chain.indexOf(enteredFrameId)
  if (enteredIdx === -1) {
    // Click is outside the entered frame entirely
    return null
  }

  // Return the direct child of the entered frame (one level deeper)
  if (enteredIdx + 1 < chain.length) {
    return chain[enteredIdx + 1]
  }

  // Click landed directly on the entered frame (no deeper child)
  return enteredFrameId
}

/**
 * Resolve the innermost (deepest) node under the pointer for hover outlines.
 *
 * Unlike `resolveHitNode` which respects frame entry context, this always
 * returns the closest node to the pointer so children inside frames/sections
 * get hover outlines too.
 */
export function resolveHoverNode(el: HTMLElement): NodeId | null {
  let cur: HTMLElement | null = el
  while (cur) {
    const raw = cur.dataset?.nodeId
    if (raw) return Number(raw) as NodeId
    cur = cur.parentElement
  }
  return null
}

/**
 * Create a CanvasPointerEvent from a raw PointerEvent.
 *
 * Performs coordinate conversion and hit-testing in one step.
 * Used by the `useBehaviorManager` hook to create events for dispatch.
 */
export function createCanvasPointerEvent(
  raw: PointerEvent,
  viewport: import('../viewport/viewport').Viewport,
  enteredFrameId: NodeId | null,
): import('./types').CanvasPointerEvent {
  const screen = { x: raw.clientX, y: raw.clientY }
  const world = viewport.screenToWorld(raw.clientX, raw.clientY)

  // Hit-test using the DOM element under the pointer
  const target = raw.target as HTMLElement
  const hitNodeId = resolveHitNode(target, enteredFrameId)

  return {
    raw,
    world,
    screen,
    hitNodeId,
    shift: raw.shiftKey,
    meta: raw.metaKey,
    alt: raw.altKey,
    dragDistance: 0,
    dragOrigin: null,
    dragScreenOrigin: null,
  }
}
