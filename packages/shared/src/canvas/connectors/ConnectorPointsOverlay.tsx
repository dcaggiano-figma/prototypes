import { useEffect, useState } from 'react';

import type { SceneGraphEvent } from '../../scene-graph/scene-graph';
import type { NodeId } from '../../scene-graph/node-id';
import { isGeometryNode } from '../../scene-graph/types';
import { useSceneGraph, useCanvasId } from '../scene-graph/provider';
import { useViewportState } from '../viewport/provider';
import { resolveAllConnectorPoints } from './connector-resolve';
import type { ResolvedPoint } from './connector-resolve';

interface ConnectorPointsOverlayProps {
  /** Whether to show connector points (e.g. when CONNECTOR tool is active or dragging endpoint) */
  active: boolean
  /** Whether the CONNECTOR tool is currently selected (affects point positioning) */
  connectorToolActive?: boolean
  /** World-space mouse position for highlight nearest point */
  mouseWorldX?: number
  mouseWorldY?: number
  /** If set, only show points for this specific node */
  targetNodeId?: NodeId | null
  /** If set, only show points for these specific nodes (e.g. hovered + selected) */
  visibleNodeIds?: Set<NodeId> | null
}

const POINT_SIZE = 12;
const SNAP_HIGHLIGHT_THRESHOLD = 20;
/** Screen-pixel offset to push points away from the node when connector tool is not active */
const IDLE_OFFSET_PX = 12;
const CONNECTOR_POINT_RELEVANT_FIELDS = new Set(['x', 'y', 'width', 'height', 'rotation', 'visible']);

/**
 * Renders small circles at all connector points on visible geometry nodes.
 * When active, shows connection points that connectors can snap to.
 */
export function ConnectorPointsOverlay({
  active,
  connectorToolActive,
  mouseWorldX,
  mouseWorldY,
  targetNodeId,
  visibleNodeIds,
}: ConnectorPointsOverlayProps) {
  const sg = useSceneGraph();
  const canvasId = useCanvasId();
  const { state: viewport } = useViewportState();

  const [, bump] = useState(0);
  useEffect(
    () => sg.addListener((event: SceneGraphEvent) => {
      if (eventAffectsConnectorPoints(event, sg, canvasId, targetNodeId, visibleNodeIds)) {
        bump((n) => n + 1);
      }
    }),
    [sg, canvasId, targetNodeId, visibleNodeIds],
  );

  if (!active) return null;

  // Inverse scale so points stay constant screen size
  const pointScale = 1 / viewport.scale;

  // When connector tool is NOT active, offset points away from the node
  const offsetWorld = connectorToolActive ? 0 : IDLE_OFFSET_PX * pointScale;

  // Collect all connector points and compute their visual (possibly offset) positions
  const displayPoints: { point: ResolvedPoint; vx: number; vy: number }[] = [];
  const nodes = sg.getDescendants(canvasId);

  for (const node of nodes) {
    if (!isGeometryNode(node)) continue;
    if (node.type === 'CONNECTOR' || node.type === 'LINE' || node.type === 'VECTOR') continue;
    if (targetNodeId && node.id !== targetNodeId) continue;
    if (visibleNodeIds && !visibleNodeIds.has(node.id)) continue;

    const points = resolveAllConnectorPoints(sg, node);
    for (const pt of points) {
      displayPoints.push({
        point: pt,
        vx: pt.x + pt.exitDirection.dx * offsetWorld,
        vy: pt.y + pt.exitDirection.dy * offsetWorld,
      });
    }
  }

  // Find nearest point to mouse for highlight (using visual positions)
  let nearestIdx = -1;
  if (mouseWorldX !== undefined && mouseWorldY !== undefined) {
    let bestDist = Infinity;
    for (let i = 0; i < displayPoints.length; i++) {
      const { vx, vy } = displayPoints[i];
      const dx = vx - mouseWorldX;
      const dy = vy - mouseWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist && dist < SNAP_HIGHLIGHT_THRESHOLD) {
        bestDist = dist;
        nearestIdx = i;
      }
    }
  }

  return (
    <>
      {displayPoints.map(({ point, vx, vy }, i) => {
        const isHighlighted = i === nearestIdx;
        return (
          <div
            key={`${point.x}-${point.y}-${i}`}
            style={{
              position: 'absolute',
              left: vx - (POINT_SIZE * pointScale) / 2,
              top: vy - (POINT_SIZE * pointScale) / 2,
              width: POINT_SIZE * pointScale,
              height: POINT_SIZE * pointScale,
              borderRadius: '50%',
              backgroundColor: isHighlighted ? '#0d99ff' : '#ffffff',
              border: `${2 * pointScale}px solid #0d99ff`,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        );
      })}
    </>
  );
}

function eventAffectsConnectorPoints(
  event: SceneGraphEvent,
  sg: ReturnType<typeof useSceneGraph>,
  canvasId: NodeId,
  targetNodeId?: NodeId | null,
  visibleNodeIds?: Set<NodeId> | null,
): boolean {
  const hasNodeFilter = Boolean(targetNodeId || visibleNodeIds)
  switch (event.type) {
    case 'field-change':
      if (!CONNECTOR_POINT_RELEVANT_FIELDS.has(event.field)) return false;
      return shouldTrackNode(sg, canvasId, event.nodeId, targetNodeId, visibleNodeIds);
    case 'create':
      return hasNodeFilter ? shouldTrackNode(sg, canvasId, event.nodeId, targetNodeId, visibleNodeIds) : true;
    case 'delete':
      return hasNodeFilter ? shouldTrackNode(sg, canvasId, event.nodeId, targetNodeId, visibleNodeIds) : true;
    case 'reparent':
      return hasNodeFilter ? shouldTrackNode(sg, canvasId, event.nodeId, targetNodeId, visibleNodeIds) : true;
    case 'attachment-change':
    case 'attachment-invalidate':
      return false;
  }
}

function shouldTrackNode(
  sg: ReturnType<typeof useSceneGraph>,
  canvasId: NodeId,
  nodeId: NodeId,
  targetNodeId?: NodeId | null,
  visibleNodeIds?: Set<NodeId> | null,
): boolean {
  if (targetNodeId) return nodeId === targetNodeId;
  if (visibleNodeIds) return visibleNodeIds.has(nodeId);

  const node = sg.getNode(nodeId);
  if (!node) return false;
  if (node.id === canvasId) return true;
  return sg.getAncestors(nodeId).some((ancestor) => ancestor.id === canvasId);
}
