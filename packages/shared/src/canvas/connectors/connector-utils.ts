import type {
  AttachmentRecord,
  AttachmentInvalidateEvent,
  SceneGraph,
} from '../../scene-graph/scene-graph'
import type { NodeId } from '../../scene-graph/node-id'
import type { ConnectorEndpoint, ConnectorNode } from '../../scene-graph/types'
import { isConnectorNode } from '../../scene-graph/types'
import { resolveEndpointPosition } from './connector-resolve'

const CONNECTOR_ATTACHMENT_KIND = 'connector-endpoint'
const START_ATTACHMENT_KEY = 'connector:start'
const END_ATTACHMENT_KEY = 'connector:end'

interface ConnectorAttachmentPayload {
  endpoint: 'start' | 'end'
}

/**
 * Recompute a connector's bounding box (x, y, width, height)
 * from its resolved endpoint positions.
 */
export function updateConnectorBounds(sg: SceneGraph, connectorId: NodeId): void {
  const node = sg.getNode(connectorId)
  if (!node || !isConnectorNode(node)) return
  const connector = node as ConnectorNode

  const startPt = resolveEndpointPosition(sg, connector.startEndpoint)
  const endPt = resolveEndpointPosition(sg, connector.endEndpoint)
  if (!startPt || !endPt) return

  const minX = Math.min(startPt.x, endPt.x)
  const minY = Math.min(startPt.y, endPt.y)
  const maxX = Math.max(startPt.x, endPt.x)
  const maxY = Math.max(startPt.y, endPt.y)

  sg.updateNode(connectorId, {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  })
}

/**
 * Find all connector nodes that reference a given set of node IDs
 * and update their bounds.
 */
export function updateConnectorsForNodes(sg: SceneGraph, canvasId: NodeId, movedNodeIds: NodeId[]): void {
  const movedSet = new Set(movedNodeIds)
  for (const node of sg.getDescendants(canvasId)) {
    if (!isConnectorNode(node)) continue
    const connector = node as ConnectorNode
    const startRef = connector.startEndpoint.type !== 'free' ? connector.startEndpoint.nodeId : null
    const endRef = connector.endEndpoint.type !== 'free' ? connector.endEndpoint.nodeId : null

    if ((startRef && movedSet.has(startRef)) || (endRef && movedSet.has(endRef))) {
      updateConnectorBounds(sg, connector.id)
    }
  }
}

export function syncConnectorAttachments(sg: SceneGraph, connectorId: NodeId): void {
  const node = sg.getNode(connectorId)
  if (!node || !isConnectorNode(node)) return

  syncEndpointAttachment(sg, connectorId, 'start', node.startEndpoint)
  syncEndpointAttachment(sg, connectorId, 'end', node.endEndpoint)
}

export function installConnectorAttachmentLifecycle(sg: SceneGraph): () => void {
  const deletingAnchorIds = new Set<NodeId>()

  return sg.addListener((event) => {
    switch (event.type) {
      case 'create':
        if (isConnectorNode(event.node)) {
          syncConnectorAttachments(sg, event.nodeId)
          updateConnectorBounds(sg, event.nodeId)
        }
        break
      case 'field-change': {
        if (event.field !== 'startEndpoint' && event.field !== 'endEndpoint') break
        const node = sg.getNode(event.nodeId)
        if (!node || !isConnectorNode(node)) break
        syncConnectorAttachments(sg, event.nodeId)
        updateConnectorBounds(sg, event.nodeId)
        break
      }
      case 'attachment-invalidate':
        if (event.reason === 'delete') {
          deletingAnchorIds.add(event.anchorNodeId)
        }
        updateAttachedConnectorBounds(sg, event)
        break
      case 'attachment-change':
        if (event.attachment.kind !== CONNECTOR_ATTACHMENT_KIND) break
        if (event.action === 'detach' && deletingAnchorIds.has(event.attachment.anchorNodeId)) {
          detachConnectorEndpointToWorldPosition(sg, event.attacheeId, event.attachment)
        }
        break
      case 'delete':
        deletingAnchorIds.delete(event.nodeId)
        break
      case 'reparent':
        break
    }
  })
}

function syncEndpointAttachment(
  sg: SceneGraph,
  connectorId: NodeId,
  endpoint: 'start' | 'end',
  value: ConnectorEndpoint,
): void {
  const key = endpoint === 'start' ? START_ATTACHMENT_KEY : END_ATTACHMENT_KEY
  if (value.type === 'free') {
    sg.detachNode(connectorId, key)
    return
  }

  sg.attachNode(connectorId, {
    key,
    kind: CONNECTOR_ATTACHMENT_KIND,
    anchorNodeId: value.nodeId,
    payload: { endpoint } satisfies ConnectorAttachmentPayload,
  })
}

function updateAttachedConnectorBounds(
  sg: SceneGraph,
  event: AttachmentInvalidateEvent,
): void {
  for (const attacheeId of event.attacheeIds) {
    const node = sg.getNode(attacheeId)
    if (!node || !isConnectorNode(node)) continue
    updateConnectorBounds(sg, attacheeId)
  }
}

function detachConnectorEndpointToWorldPosition(
  sg: SceneGraph,
  connectorId: NodeId,
  attachment: AttachmentRecord,
): void {
  const node = sg.getNode(connectorId)
  if (!node || !isConnectorNode(node)) return

  const endpointKey = getAttachmentEndpointKey(attachment)
  if (!endpointKey) return

  const endpoint = endpointKey === 'start' ? node.startEndpoint : node.endEndpoint
  if (endpoint.type === 'free') return

  const resolved = resolveEndpointPosition(sg, endpoint)
  if (!resolved) return

  const nextEndpoint: ConnectorEndpoint = { type: 'free', x: resolved.x, y: resolved.y }
  if (endpointKey === 'start') {
    sg.updateNode(connectorId, { startEndpoint: nextEndpoint })
  } else {
    sg.updateNode(connectorId, { endEndpoint: nextEndpoint })
  }
  updateConnectorBounds(sg, connectorId)
}

function getAttachmentEndpointKey(
  attachment: Pick<AttachmentRecord, 'key' | 'payload'>,
): 'start' | 'end' | null {
  if (attachment.key === START_ATTACHMENT_KEY) return 'start'
  if (attachment.key === END_ATTACHMENT_KEY) return 'end'

  const endpoint = (attachment.payload as ConnectorAttachmentPayload | undefined)?.endpoint
  return endpoint === 'start' || endpoint === 'end' ? endpoint : null
}
