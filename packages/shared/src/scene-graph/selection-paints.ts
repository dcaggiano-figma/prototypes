/**
 * Paint-centric selection abstraction.
 *
 * Instead of treating fills/strokes as per-node arrays, this module collects
 * unique paints across the entire selection with location metadata. The UI
 * renders a flat list of paints and calls `updateSelectionPaint` on change —
 * no array index management in the UI layer.
 *
 * ## How it works
 *
 * 1. `collectSelectionPaints` walks selected nodes (with group drill-down)
 *    and collects every paint from the target field (fills). Each paint is
 *    deduplicated by deep equality, and its location (nodeId + index) is
 *    recorded.
 *
 * 2. Mutations (`updateSelectionPaint`, `addSelectionPaint`, `removeSelectionPaint`)
 *    operate on locations — they read the node's current array, clone it,
 *    modify at the specific index, and write back via `sg.setNodeField`.
 *
 * This matches Figma's internal "SelectionPaints" pattern where the property
 * panel never deals with array indices directly.
 */

import type { NodeId } from './node-id'
import type { SceneGraph } from './scene-graph'
import type { Paint, SceneNode } from './types'
import type { Selection } from './selection'

// ── Types ────────────────────────────────────────────────────────────

/** Where a paint lives: which node, which field, and which array index. */
export interface PaintLocation {
  nodeId: NodeId
  field: 'fills' | 'strokes'
  index: number
}

/** A unique paint value and all the places it appears across the selection. */
export interface SelectionPaint {
  /** The collected paint value. */
  paint: Paint
  /** All locations where this exact paint appears. */
  locations: PaintLocation[]
}

// ── collectSelectionPaints ───────────────────────────────────────────

/**
 * Collect unique paints from the given field across all selected nodes.
 *
 * Returns a flat array of `SelectionPaint` objects, each with the paint
 * value and all locations where it appears. Paints are deduplicated by
 * deep equality (JSON comparison of color/opacity/type/visible).
 *
 * Traversal follows the same rules as `collectValues`:
 * - If a node has the field, collect its paints and stop.
 * - If a node doesn't have the field (e.g., GROUP), recurse into visible children.
 */
export function collectSelectionPaints(
  sg: SceneGraph,
  selection: Selection,
  field: 'fills' | 'strokes',
): SelectionPaint[] {
  /** Map from JSON key to SelectionPaint for deduplication. */
  const paintMap = new Map<string, SelectionPaint>()
  /** Stable ordering — tracks insertion order. */
  const ordered: SelectionPaint[] = []

  for (const nodeId of selection) {
    collectFromNode(sg, nodeId, field, paintMap, ordered)
  }

  return ordered
}

// ── Mutations ────────────────────────────────────────────────────────

/**
 * Replace a paint at all of its locations.
 *
 * Reads each node's current paint array, clones it, replaces at the
 * specific index, and writes back. Safe even if the array has been
 * modified since collection (the index is still valid as long as the
 * array hasn't been reordered — which only happens via add/remove).
 */
export function updateSelectionPaint(
  sg: SceneGraph,
  locations: PaintLocation[],
  updated: Paint,
): void {
  for (const loc of locations) {
    const node = sg.getNode(loc.nodeId)
    if (!node) continue
    const paints = (node as unknown as Record<string, unknown>)[loc.field] as Paint[] | undefined
    if (!paints || loc.index >= paints.length) continue
    const newPaints = [...paints]
    newPaints[loc.index] = updated
    sg.setNodeField(loc.nodeId, loc.field, newPaints)
  }
}

/**
 * Add a paint to all applicable nodes in the selection.
 *
 * "Applicable" means nodes that have the target field. Uses the same
 * traversal as collection (group drill-down).
 */
export function addSelectionPaint(
  sg: SceneGraph,
  selection: Selection,
  field: 'fills' | 'strokes',
  paint: Paint,
): void {
  for (const nodeId of selection) {
    addToNode(sg, nodeId, field, paint)
  }
}

/**
 * Remove a paint from all of its locations.
 *
 * Processes locations in reverse order per node to keep indices valid
 * as elements are removed.
 */
export function removeSelectionPaint(
  sg: SceneGraph,
  locations: PaintLocation[],
): void {
  // Group by node so we can process removals in reverse index order
  const byNode = new Map<NodeId, number[]>()
  for (const loc of locations) {
    const indices = byNode.get(loc.nodeId)
    if (indices) {
      indices.push(loc.index)
    } else {
      byNode.set(loc.nodeId, [loc.index])
    }
  }

  for (const [nodeId, indices] of byNode) {
    const node = sg.getNode(nodeId)
    if (!node) continue
    const field = locations[0].field
    const paints = (node as unknown as Record<string, unknown>)[field] as Paint[] | undefined
    if (!paints) continue

    // Sort descending so removals don't shift later indices
    indices.sort((a, b) => b - a)
    const newPaints = [...paints]
    for (const idx of indices) {
      if (idx < newPaints.length) {
        newPaints.splice(idx, 1)
      }
    }
    sg.setNodeField(nodeId, field, newPaints)
  }
}

// ── Internals ────────────────────────────────────────────────────────

function collectFromNode(
  sg: SceneGraph,
  nodeId: NodeId,
  field: 'fills' | 'strokes',
  paintMap: Map<string, SelectionPaint>,
  ordered: SelectionPaint[],
): void {
  const node = sg.getNode(nodeId)
  if (!node) return

  if (nodeHasField(node, field)) {
    const paints = (node as unknown as Record<string, unknown>)[field] as Paint[]
    for (let i = 0; i < paints.length; i++) {
      const paint = paints[i]
      // Dedup by visual properties only — exclude `id` which is a stable key, not a value.
      const { id: _, ...paintValue } = paint
      const key = JSON.stringify(paintValue)
      const location: PaintLocation = { nodeId, field, index: i }

      const existing = paintMap.get(key)
      if (existing) {
        existing.locations.push(location)
      } else {
        const entry: SelectionPaint = { paint, locations: [location] }
        paintMap.set(key, entry)
        ordered.push(entry)
      }
    }
    return
  }

  // Field doesn't apply — recurse into visible children
  for (const childId of node.children) {
    const child = sg.getNode(childId)
    if (!child || !child.visible) continue
    collectFromNode(sg, childId, field, paintMap, ordered)
  }
}

function addToNode(
  sg: SceneGraph,
  nodeId: NodeId,
  field: 'fills' | 'strokes',
  paint: Paint,
): void {
  const node = sg.getNode(nodeId)
  if (!node) return

  if (nodeHasField(node, field)) {
    const paints = (node as unknown as Record<string, unknown>)[field] as Paint[]
    sg.setNodeField(nodeId, field, [...paints, paint])
    return
  }

  // Recurse into visible children
  for (const childId of node.children) {
    const child = sg.getNode(childId)
    if (!child || !child.visible) continue
    addToNode(sg, childId, field, paint)
  }
}

function nodeHasField(node: SceneNode, field: string): boolean {
  return field in node
}
