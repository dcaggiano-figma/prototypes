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
  RectangleNode,
  EllipseNode,
  TextNode,
  LineNode,
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

// Viewport
export { ViewportProvider, useViewport } from './viewport/provider';

// Tools
export { ToolProvider, useActiveTool } from './tools/provider';
export type { ToolType } from './tools/provider';

// Canvas component
export { Canvas } from './components/Canvas';

// Utilities needed by external consumers
export { isGeometryNode } from './scene-graph/world-position';
