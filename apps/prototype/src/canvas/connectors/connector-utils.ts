import type { SceneGraphStore } from '../scene-graph/store';
import type { ConnectorNode } from '../types';
import { isConnectorNode } from '../types';
import { resolveEndpointPosition } from './connector-resolve';

/**
 * Recompute a connector's bounding box (x, y, width, height)
 * from its resolved endpoint positions.
 */
export function updateConnectorBounds(store: SceneGraphStore, connectorId: string): void {
  const node = store.getNode(connectorId);
  if (!node || !isConnectorNode(node)) return;
  const connector = node as ConnectorNode;

  const startPt = resolveEndpointPosition(store, connector.startEndpoint);
  const endPt = resolveEndpointPosition(store, connector.endEndpoint);
  if (!startPt || !endPt) return;

  const minX = Math.min(startPt.x, endPt.x);
  const minY = Math.min(startPt.y, endPt.y);
  const maxX = Math.max(startPt.x, endPt.x);
  const maxY = Math.max(startPt.y, endPt.y);

  store.updateNode(connectorId, {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  });
}

/**
 * Find all connector nodes that reference a given set of node IDs
 * and update their bounds.
 */
export function updateConnectorsForNodes(store: SceneGraphStore, movedNodeIds: string[]): void {
  const movedSet = new Set(movedNodeIds);
  for (const node of store.getAllNodes()) {
    if (!isConnectorNode(node)) continue;
    const connector = node as ConnectorNode;
    const startRef = connector.startEndpoint.type !== 'free' ? connector.startEndpoint.nodeId : null;
    const endRef = connector.endEndpoint.type !== 'free' ? connector.endEndpoint.nodeId : null;

    if ((startRef && movedSet.has(startRef)) || (endRef && movedSet.has(endRef))) {
      updateConnectorBounds(store, connector.id);
    }
  }
}
