// Canvas module public API
// All external code should import from this barrel export.

// Types (shared data model contract)
export type {
  NodeType,
  Color,
  SolidPaint,
  Paint,
  Stroke,
  Effect,
  BaseNode,
  GeometryMixin,
  AppearanceMixin,
  ShapeTextMixin,
  FrameNode,
  SectionNode,
  RectangleNode,
  EllipseNode,
  TextNode,
  LineNode,
  PolygonNode,
  StarNode,
  StickyNoteNode,
  VectorPath,
  VectorNode,
  GroupNode,
  ConnectorNode,
  ConnectorEndpoint,
  ConnectorEndpointConnected,
  ConnectorEndpointEdge,
  ConnectorEndpointFree,
  ConnectorCap,
  ConnectorLineShape,
  SceneNode,
  GeometryNode,
  AppearanceNode,
  ShapeWithTextNode,
  TextCapableNode,
} from './types';

export { isShapeWithText, isTextCapableNode, isConnectorNode } from './types';

// Scene Graph
export {
  SceneGraphProvider,
  useSceneGraph,
  useRootNodes,
  useNode,
  usePageBackground,
} from './scene-graph/provider';
export type { SceneGraphStore } from './scene-graph/provider';

// Selection
export { SelectionProvider, useSelection } from './selection/provider';

// Text editing
export { TextEditingProvider, useTextEditing } from './text-editing/provider';

// Viewport
export { ViewportProvider, useViewport } from './viewport/provider';

// Tools
export { ToolProvider, useActiveTool } from './tools/provider';
export type { ToolType, MarkerSubType } from './tools/provider';

// Canvas component
export { Canvas } from './components/Canvas';

// Utilities needed by external consumers
export { getWorldPosition, isGeometryNode } from './scene-graph/world-position';

// Selection utilities
export { getSelectionBBox, collectDraggableIds, pointInRect, findNodeAtWorldPoint } from './scene-graph/selection-utils';
export type { Rect } from './scene-graph/selection-utils';

// Alignment & layout utilities
export { alignNodes, distributeNodes, wrapInSection } from './scene-graph/alignment';
export type { AlignDirection, DistributeDirection } from './scene-graph/alignment';
