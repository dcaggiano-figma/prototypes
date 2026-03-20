/**
 * Connector cleanup utilities.
 *
 * When nodes are deleted, connectors attached to them need cleanup. This module
 * provides functions that templates can use in their delete handlers. The
 * SceneGraph class itself is connector-agnostic — this logic lives here in the
 * canvas layer.
 */

import type { NodeId } from '../../scene-graph/node-id'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import type { ConnectorEndpoint, ConnectorNode } from '../../scene-graph/types'

/**
 * Check if an endpoint references any of the given node IDs.
 */
function endpointReferencesAny(endpoint: ConnectorEndpoint, nodeIds: ReadonlySet<NodeId>): boolean {
  if (endpoint.type === 'free') return false
  return nodeIds.has(endpoint.nodeId)
}

/**
 * Find all connectors in the canvas that reference any of the given node IDs.
 */
export function findConnectorsReferencingNodes(
  sg: SceneGraph,
  canvasId: NodeId,
  nodeIds: ReadonlySet<NodeId>,
): ConnectorNode[] {
  const canvas = sg.getNode(canvasId)
  if (!canvas) return []

  const connectors: ConnectorNode[] = []
  for (const childId of canvas.children) {
    const node = sg.getNode(childId)
    if (!node || node.type !== 'CONNECTOR') continue
    const connector = node as ConnectorNode
    if (
      endpointReferencesAny(connector.startEndpoint, nodeIds)
      || endpointReferencesAny(connector.endEndpoint, nodeIds)
    ) {
      connectors.push(connector)
    }
  }
  return connectors
}

/**
 * Clean up connectors when nodes are deleted.
 *
 * For each connector attached to a deleted node:
 * - If BOTH endpoints reference deleted nodes → delete the connector
 * - If only ONE endpoint references a deleted node → convert it to a free
 *   endpoint at the deleted node's center position
 *
 * Call this BEFORE deleting the nodes (so we can still read their positions).
 * Returns the IDs of connectors that were deleted (so the caller can exclude
 * them from the main delete loop).
 */
export function cleanupConnectorsForDeletion(
  sg: SceneGraph,
  canvasId: NodeId,
  deletingIds: ReadonlySet<NodeId>,
): Set<NodeId> {
  const connectors = findConnectorsReferencingNodes(sg, canvasId, deletingIds)
  const deletedConnectorIds = new Set<NodeId>()

  for (const connector of connectors) {
    // Skip if this connector is itself being deleted
    if (deletingIds.has(connector.id)) continue

    const startAttached = endpointReferencesAny(connector.startEndpoint, deletingIds)
    const endAttached = endpointReferencesAny(connector.endEndpoint, deletingIds)

    if (startAttached && endAttached) {
      // Both endpoints reference deleted nodes — delete the connector
      sg.deleteNode(connector.id)
      deletedConnectorIds.add(connector.id)
    } else if (startAttached) {
      // Convert start endpoint to free at the referenced node's position
      sg.setNodeField(connector.id, 'startEndpoint', endpointToFree(sg, connector.startEndpoint))
    } else if (endAttached) {
      // Convert end endpoint to free at the referenced node's position
      sg.setNodeField(connector.id, 'endEndpoint', endpointToFree(sg, connector.endEndpoint))
    }
  }

  return deletedConnectorIds
}

/**
 * Convert an attached endpoint to a free endpoint at the referenced node's
 * center position. Falls back to (0, 0) if the node can't be found.
 */
function endpointToFree(sg: SceneGraph, endpoint: ConnectorEndpoint): ConnectorEndpoint {
  if (endpoint.type === 'free') return endpoint

  const node = sg.getNode(endpoint.nodeId)
  if (!node || !('x' in node) || !('width' in node)) {
    return { type: 'free', x: 0, y: 0 }
  }

  const geo = node as { x: number; y: number; width: number; height: number }
  return {
    type: 'free',
    x: geo.x + geo.width / 2,
    y: geo.y + geo.height / 2,
  }
}
