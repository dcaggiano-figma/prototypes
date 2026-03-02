import { useEffect, useState } from 'react';

import { useSceneGraph } from '../scene-graph/provider';
import { isGeometryNode } from '../scene-graph/world-position';
import { useViewport } from '../viewport/provider';
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
  targetNodeId?: string | null
  /** If set, only show points for these specific nodes (e.g. hovered + selected) */
  visibleNodeIds?: Set<string> | null
}

const POINT_SIZE = 12;
const SNAP_HIGHLIGHT_THRESHOLD = 20;
/** Screen-pixel offset to push points away from the node when connector tool is not active */
const IDLE_OFFSET_PX = 12;

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
  const store = useSceneGraph();
  const { state: viewport } = useViewport();

  // Subscribe to store changes
  const [, bump] = useState(0);
  useEffect(() => store.subscribe(() => bump((n) => n + 1)), [store]);

  if (!active) return null;

  // Inverse scale so points stay constant screen size
  const pointScale = 1 / viewport.scale;

  // When connector tool is NOT active, offset points away from the node
  const offsetWorld = connectorToolActive ? 0 : IDLE_OFFSET_PX * pointScale;

  // Collect all connector points and compute their visual (possibly offset) positions
  const displayPoints: { point: ResolvedPoint; vx: number; vy: number }[] = [];
  const nodes = store.getAllNodes();

  for (const node of nodes) {
    if (!isGeometryNode(node)) continue;
    if (node.type === 'CONNECTOR' || node.type === 'LINE' || node.type === 'VECTOR') continue;
    if (targetNodeId && node.id !== targetNodeId) continue;
    if (visibleNodeIds && !visibleNodeIds.has(node.id)) continue;

    const points = resolveAllConnectorPoints(store, node);
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
