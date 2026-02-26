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
  SceneNode,
  GeometryNode,
  AppearanceNode,
} from './types';

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
export { isGeometryNode } from './scene-graph/world-position';
