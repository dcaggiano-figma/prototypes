import type { NodeId } from '../scene-graph/node-id'
import { SceneGraph } from '../scene-graph/scene-graph'
import { Selection } from '../scene-graph/selection'
import type { SceneNode } from '../scene-graph/types'
import { advancePaintIdPast } from '../scene-graph/types'

export interface SerializedSceneGraph {
  version: 1
  sessionId: number
  maxLocalId: number
  documentId: NodeId
  /** Nodes as [id, fields] pairs. CANVAS nodes have selection stripped. */
  nodes: Array<[NodeId, Record<string, unknown>]>
}

/**
 * Hydrate a SceneGraph from a serialized snapshot (e.g. a JSON file).
 *
 * This extracts the hydration logic from `loadSceneGraph()` into a reusable
 * function that takes serialized data directly instead of reading from localStorage.
 */
export function hydrateFromSnapshot(data: SerializedSceneGraph): SceneGraph {
  if (data.version !== 1) {
    throw new Error(`Unsupported scene graph version: ${data.version}`)
  }

  const nodes = new Map<NodeId, SceneNode>()
  let maxPaintId = 0

  for (const [id, record] of data.nodes) {
    // Restore selection on CANVAS nodes
    if (record.type === 'CANVAS') {
      record.selection = Selection.EMPTY
    }

    // Track highest paint ID for counter advancement
    for (const paintField of ['fills', 'strokes'] as const) {
      const paints = record[paintField]
      if (Array.isArray(paints)) {
        for (const paint of paints) {
          if (paint && typeof paint === 'object' && typeof paint.id === 'string') {
            const num = parseInt(paint.id.slice(1), 10)
            if (!isNaN(num) && num > maxPaintId) maxPaintId = num
          }
        }
      }
    }

    nodes.set(id, record as unknown as SceneNode)
  }

  // Advance the global paint ID counter past existing IDs
  if (maxPaintId > 0) {
    advancePaintIdPast(maxPaintId)
  }

  return SceneGraph.hydrate(nodes, data.documentId, data.sessionId, data.maxLocalId)
}
