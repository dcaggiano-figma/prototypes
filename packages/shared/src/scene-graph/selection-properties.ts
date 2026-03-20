/**
 * Selection property collection and mutation.
 *
 * `collectValues` reads a field across all applicable nodes in a selection,
 * returning the set of unique values. `clobberValue` writes a field to all
 * applicable nodes. Together they enable multi-select property panels.
 *
 * ## Traversal rules
 *
 * - Walk directly selected nodes.
 * - If a node has the field, collect its value and skip its subtree.
 * - If a node does NOT have the field (e.g., a group), recurse into its
 *   children so that selecting a group shows its children's properties.
 * - Skip invisible nested nodes.
 * - Use value equality for deduplication (deep compare for objects).
 */

import type { NodeId } from './node-id'
import type { SceneGraph } from './scene-graph'
import type { SceneNode } from './types'
import type { Selection } from './selection'
import { MIXED, type Mixed } from './mixed'

// ── CollectMode ──────────────────────────────────────────────────────

export enum CollectMode {
  /** Stop after 2 unique values (sufficient for "is it mixed?" checks). */
  AT_MOST_2 = 2,
  /** Collect all unique values. */
  ALL = Infinity,
}

// ── collectValues ────────────────────────────────────────────────────

/**
 * Collect unique values for a field across all applicable nodes in a selection.
 *
 * Returns a Set where:
 * - Size 0 → field doesn't apply to any node in selection
 * - Size 1 → all same → use the single value
 * - Size 2+ → mixed
 */
export function collectValues<T>(
  sg: SceneGraph,
  selection: Selection,
  field: string,
  mode: CollectMode = CollectMode.AT_MOST_2,
): Set<T> {
  const result = new Set<T>()
  // Track serialized values for deep equality on objects
  const seen = new Set<string>()

  for (const nodeId of selection) {
    if (result.size >= mode) break
    collectFromNode(sg, nodeId, field, mode, result, seen)
  }

  return result
}

/**
 * Convenience: get the single value, MIXED, or undefined (not applicable).
 */
export function getSelectionValue<T>(
  sg: SceneGraph,
  selection: Selection,
  field: string,
): T | Mixed | undefined {
  const values = collectValues<T>(sg, selection, field)
  if (values.size === 0) return undefined
  if (values.size === 1) return values.values().next().value
  return MIXED
}

// ── clobberValue ─────────────────────────────────────────────────────

/**
 * Set a field on all applicable nodes in the selection.
 * Uses the same traversal logic as collectValues for symmetry.
 */
export function clobberValue(
  sg: SceneGraph,
  selection: Selection,
  field: string,
  value: unknown,
): void {
  for (const nodeId of selection) {
    clobberOnNode(sg, nodeId, field, value)
  }
}

// ── Internals ────────────────────────────────────────────────────────

/** Fields that exist on specific node types (not universal BaseNode fields). */
function nodeHasField(node: SceneNode, field: string): boolean {
  return field in node
}

/**
 * Collect values from a single node, potentially recursing into children.
 * If the node has the field, add its value and stop (don't recurse).
 * If the node doesn't have the field, recurse into children.
 */
function collectFromNode<T>(
  sg: SceneGraph,
  nodeId: NodeId,
  field: string,
  mode: CollectMode,
  result: Set<T>,
  seen: Set<string>,
): void {
  if (result.size >= mode) return

  const node = sg.getNode(nodeId)
  if (!node) return

  if (nodeHasField(node, field)) {
    const value = (node as unknown as Record<string, unknown>)[field] as T
    addWithEquality(value, result, seen)
    // Don't recurse — we collected from this node
    return
  }

  // Field doesn't apply to this node — recurse into children
  for (const childId of node.children) {
    if (result.size >= mode) break
    const child = sg.getNode(childId)
    if (!child || !child.visible) continue
    collectFromNode(sg, childId, field, mode, result, seen)
  }
}

/**
 * Set a field on a single node, potentially recursing into children.
 * Same traversal as collectFromNode for symmetry.
 */
function clobberOnNode(
  sg: SceneGraph,
  nodeId: NodeId,
  field: string,
  value: unknown,
): void {
  const node = sg.getNode(nodeId)
  if (!node) return

  if (nodeHasField(node, field)) {
    sg.setNodeField(nodeId, field, value)
    return
  }

  // Recurse into children
  for (const childId of node.children) {
    const child = sg.getNode(childId)
    if (!child || !child.visible) continue
    clobberOnNode(sg, childId, field, value)
  }
}

/**
 * Add a value to the result set using deep equality for objects.
 * Primitives use Set's native identity comparison.
 * Objects are serialized to JSON for deduplication.
 */
function addWithEquality<T>(value: T, result: Set<T>, seen: Set<string>): void {
  if (value === null || typeof value !== 'object') {
    // Primitive — Set handles identity comparison
    result.add(value)
    return
  }

  // Object — use JSON serialization for deep equality
  const key = JSON.stringify(value)
  if (seen.has(key)) return
  seen.add(key)
  result.add(value)
}
