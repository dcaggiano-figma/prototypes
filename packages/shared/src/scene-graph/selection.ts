/**
 * Immutable Selection class.
 *
 * Stored as a field on CANVAS nodes. All mutation methods return a new instance.
 * The scene graph is required for ancestor traversal (invariant enforcement and
 * indirect selection checks).
 *
 * Invariants:
 * 1. No ancestor-descendant co-selection — the set only contains topmost selected
 *    ancestors. Selecting a parent removes descendants; selecting a child removes ancestors.
 * 2. Direct vs indirect — nodes in the set are "directly selected." Children of
 *    directly selected nodes are "indirectly selected" by implication.
 */

import type { NodeId } from './node-id'
import type { SceneGraph } from './scene-graph'

export class Selection {
  private readonly selected: ReadonlySet<NodeId>

  constructor(nodeIds?: Iterable<NodeId>) {
    this.selected = nodeIds ? new Set(nodeIds) : new Set()
  }

  /** Number of directly selected nodes. */
  get size(): number {
    return this.selected.size
  }

  /** True if nothing is selected. */
  get isEmpty(): boolean {
    return this.selected.size === 0
  }

  /** Create a new Selection with exactly these nodes (enforcing invariants). */
  withSelected(nodeIds: NodeId[], sg: SceneGraph): Selection {
    return new Selection(enforceInvariants(nodeIds, sg))
  }

  /** Create a new Selection with this node toggled (for Shift-click). */
  withToggled(nodeId: NodeId, sg: SceneGraph): Selection {
    if (this.selected.has(nodeId)) {
      const next = new Set(this.selected)
      next.delete(nodeId)
      return new Selection(next)
    }
    return this.withAdded([nodeId], sg)
  }

  /** Create a new Selection with these nodes added (enforcing invariants). */
  withAdded(nodeIds: NodeId[], sg: SceneGraph): Selection {
    const combined = [...this.selected, ...nodeIds]
    return new Selection(enforceInvariants(combined, sg))
  }

  /** Create an empty Selection. */
  cleared(): Selection {
    if (this.selected.size === 0) return this
    return Selection.EMPTY
  }

  /** Check if a node is directly selected (in the selection set). */
  isDirectlySelected(nodeId: NodeId): boolean {
    return this.selected.has(nodeId)
  }

  /**
   * Check if a node is selected — directly or indirectly via ancestor.
   * Requires scene graph for ancestor traversal.
   */
  isSelected(nodeId: NodeId, sg: SceneGraph): boolean {
    if (this.selected.has(nodeId)) return true
    // Walk up ancestors to check if any are directly selected
    let current = sg.getNode(nodeId)
    while (current?.parentId != null) {
      if (this.selected.has(current.parentId)) return true
      current = sg.getNode(current.parentId)
    }
    return false
  }

  /**
   * Get the effective selection (directly selected + all indirect descendants).
   * Used by operations like delete, copy, move.
   */
  getEffectiveSelection(sg: SceneGraph): Set<NodeId> {
    const result = new Set<NodeId>()
    for (const id of this.selected) {
      result.add(id)
      collectDescendants(id, sg, result)
    }
    return result
  }

  /**
   * Get only the directly selected node IDs.
   * Used for computing bounding boxes, showing property panels, etc.
   */
  getDirectSelection(): ReadonlySet<NodeId> {
    return this.selected
  }

  /** Iterate over directly selected node IDs. */
  [Symbol.iterator](): IterableIterator<NodeId> {
    return this.selected[Symbol.iterator]()
  }

  /** Singleton empty selection. */
  static readonly EMPTY = new Selection()
}

/**
 * Enforce the no-ancestor-descendant-co-selection invariant.
 * Returns a deduplicated set containing only the topmost selected ancestors.
 */
function enforceInvariants(nodeIds: NodeId[], sg: SceneGraph): Set<NodeId> {
  const candidates = new Set(nodeIds)
  const result = new Set<NodeId>()

  for (const id of candidates) {
    // Skip if any ancestor is also in the candidate set
    if (hasSelectedAncestor(id, candidates, sg)) continue
    result.add(id)
  }

  // Second pass: remove any nodes whose descendants are now in result
  // (this handles the case where a child was added before its ancestor)
  // Actually, the first pass already handles this — if both parent and child
  // are in candidates, the child is skipped because parent is an ancestor.
  // But if the child appeared first and the parent appeared later, we need
  // to clean up. Let's just do a clean pass.
  const cleaned = new Set<NodeId>()
  for (const id of result) {
    if (!hasSelectedAncestor(id, result, sg)) {
      cleaned.add(id)
    }
  }

  return cleaned
}

/** Check if any ancestor of nodeId is in the given set. */
function hasSelectedAncestor(
  nodeId: NodeId,
  selectedSet: Set<NodeId>,
  sg: SceneGraph,
): boolean {
  let current = sg.getNode(nodeId)
  while (current?.parentId != null) {
    if (selectedSet.has(current.parentId)) return true
    current = sg.getNode(current.parentId)
  }
  return false
}

/** Recursively collect all descendant IDs into the given set. */
function collectDescendants(
  nodeId: NodeId,
  sg: SceneGraph,
  out: Set<NodeId>,
): void {
  const node = sg.getNode(nodeId)
  if (!node) return
  for (const childId of node.children) {
    out.add(childId)
    collectDescendants(childId, sg, out)
  }
}
