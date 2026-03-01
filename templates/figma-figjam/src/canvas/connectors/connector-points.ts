import type { NodeType, SceneNode } from '../types';

/** A connector point definition: position as fraction of node bounds + exit direction */
export interface ConnectorPointDef {
  id: string
  label: string
  /** X position as fraction of node width (0 = left, 1 = right) */
  xFraction: number
  /** Y position as fraction of node height (0 = top, 1 = bottom) */
  yFraction: number
  /** Exit direction as unit vector */
  exitDirection: { dx: number; dy: number }
}

/** Connector point configuration for a node type */
export interface ConnectorPointConfig {
  points: ConnectorPointDef[]
}

// ── Default configs ──────────────────────────────────────────────────

const CARDINAL_MIDPOINTS: ConnectorPointDef[] = [
  { id: 'top', label: 'Top', xFraction: 0.5, yFraction: 0, exitDirection: { dx: 0, dy: -1 } },
  { id: 'right', label: 'Right', xFraction: 1, yFraction: 0.5, exitDirection: { dx: 1, dy: 0 } },
  { id: 'bottom', label: 'Bottom', xFraction: 0.5, yFraction: 1, exitDirection: { dx: 0, dy: 1 } },
  { id: 'left', label: 'Left', xFraction: 0, yFraction: 0.5, exitDirection: { dx: -1, dy: 0 } },
];

const RECTANGULAR_CONFIG: ConnectorPointConfig = { points: CARDINAL_MIDPOINTS };

// Ellipse uses the same 4 cardinal midpoints — resolver maps to perimeter
const ELLIPSE_CONFIG: ConnectorPointConfig = { points: CARDINAL_MIDPOINTS };

/** Registry of connector point configs per node type */
const registry = new Map<NodeType, ConnectorPointConfig>();

// Register defaults
registry.set('FRAME', RECTANGULAR_CONFIG);
registry.set('SECTION', RECTANGULAR_CONFIG);
registry.set('RECTANGLE', RECTANGULAR_CONFIG);
registry.set('STICKY_NOTE', RECTANGULAR_CONFIG);
registry.set('TEXT', RECTANGULAR_CONFIG);
registry.set('ELLIPSE', ELLIPSE_CONFIG);

/** Generate vertex-based connector points for a regular polygon */
function generatePolygonPoints(sides: number): ConnectorPointDef[] {
  const points: ConnectorPointDef[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    const xFrac = 0.5 + 0.5 * Math.cos(angle);
    const yFrac = 0.5 + 0.5 * Math.sin(angle);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    points.push({
      id: `vertex-${i}`,
      label: `Vertex ${i}`,
      xFraction: xFrac,
      yFraction: yFrac,
      exitDirection: { dx, dy },
    });
  }
  return points;
}

/** Generate vertex-based connector points for a star (outer points only) */
function generateStarPoints(pointCount: number): ConnectorPointDef[] {
  const points: ConnectorPointDef[] = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (2 * Math.PI * i) / pointCount - Math.PI / 2;
    const xFrac = 0.5 + 0.5 * Math.cos(angle);
    const yFrac = 0.5 + 0.5 * Math.sin(angle);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    points.push({
      id: `tip-${i}`,
      label: `Tip ${i}`,
      xFraction: xFrac,
      yFraction: yFrac,
      exitDirection: { dx, dy },
    });
  }
  return points;
}

/**
 * Get the connector point config for a node type.
 * For polygons/stars, dynamically generates points based on node properties.
 */
export function getConnectorPointConfig(nodeType: NodeType, nodeProps?: SceneNode): ConnectorPointConfig {
  if (nodeType === 'POLYGON' && nodeProps && 'sides' in nodeProps) {
    return { points: generatePolygonPoints(nodeProps.sides) };
  }
  if (nodeType === 'STAR' && nodeProps && 'points' in nodeProps) {
    return { points: generateStarPoints(nodeProps.points) };
  }
  return registry.get(nodeType) ?? RECTANGULAR_CONFIG;
}

/** Register a custom connector point config for a node type */
export function registerConnectorPointConfig(nodeType: NodeType, config: ConnectorPointConfig): void {
  registry.set(nodeType, config);
}
