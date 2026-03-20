/**
 * Mixed math handler for per-node value operations.
 *
 * Used by mixed math expressions ("Mixed + 2") and mixed scrubbing (click+drag
 * on a ScrubbableInput when the value is mixed). These operate on each node's
 * individual value rather than a single collected value.
 *
 * The handler goes through `sg.setNodeField` so changes participate in the
 * event system and undo/redo tracking automatically.
 */

import type { NodeId } from './node-id'
import type { SceneGraph } from './scene-graph'
import type { Selection } from './selection'
import type { UndoManager } from './undo-manager'
import type { MergeType } from './undo-manager'

// ── MixedMathHandler interface ───────────────────────────────────────

export interface MixedMathHandler<T> {
  /** Snapshot per-node values. Call at scrub start or before evaluating. */
  getValues(): Map<NodeId, T>

  /**
   * Apply a transform to each node's individual value.
   * @param snapshot - Values from a previous getValues() call
   * @param transform - Function to apply to each node's value
   * @param commit - Whether to commit to the undo stack after applying
   * @param mergeType - Optional merge type for batch merging (e.g., NUDGE)
   */
  onChange(
    snapshot: Map<NodeId, T>,
    transform: (value: T) => T,
    commit: boolean,
    mergeType?: MergeType | null,
  ): void
}

// ── Default implementation ───────────────────────────────────────────

/**
 * Create a MixedMathHandler for a specific field on the current selection.
 *
 * Usage:
 * ```ts
 * const handler = createMixedMathHandler(sg, selection, um, 'x')
 * const snapshot = handler.getValues()
 * // On each scrub tick:
 * handler.onChange(snapshot, (v) => v + delta, false)
 * // On scrub end:
 * handler.onChange(snapshot, (v) => v + finalDelta, true)
 * ```
 */
export function createMixedMathHandler<T>(
  sg: SceneGraph,
  selection: Selection,
  um: UndoManager,
  field: string,
): MixedMathHandler<T> {
  return {
    getValues(): Map<NodeId, T> {
      const values = new Map<NodeId, T>()
      for (const nodeId of selection) {
        collectNodeValues(sg, nodeId, field, values)
      }
      return values
    },

    onChange(
      snapshot: Map<NodeId, T>,
      transform: (value: T) => T,
      commit: boolean,
      mergeType: MergeType | null = null,
    ): void {
      for (const [nodeId, value] of snapshot) {
        const node = sg.getNode(nodeId)
        if (!node) continue
        sg.setNodeField(nodeId, field, transform(value))
      }
      if (commit) um.commit(mergeType)
    },
  }
}

// ── Internals ────────────────────────────────────────────────────────

/**
 * Collect the value of a field from a node, drilling into children
 * when the node doesn't have the field (same traversal as collectValues).
 */
function collectNodeValues<T>(
  sg: SceneGraph,
  nodeId: NodeId,
  field: string,
  out: Map<NodeId, T>,
): void {
  const node = sg.getNode(nodeId)
  if (!node) return

  if (field in node) {
    out.set(nodeId, (node as unknown as Record<string, unknown>)[field] as T)
    return
  }

  // Drill into children
  for (const childId of node.children) {
    const child = sg.getNode(childId)
    if (!child || !child.visible) continue
    collectNodeValues(sg, childId, field, out)
  }
}
