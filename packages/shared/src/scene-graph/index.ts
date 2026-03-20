// Scene graph public API — pure TypeScript, no React dependency.

// Node IDs
export {
  type NodeId,
  makeNodeId,
  getSessionId,
  getLocalId,
  NodeIdGenerator,
} from './node-id'

// Types
export {
  type NodeType,
  type Color,
  type SolidPaint,
  type Paint,
  type StrokeAlign,
  type Effect,
  type GeometryMixin,
  type AppearanceMixin,
  type CompoundMixin,
  type TextSlots,
  type BaseNode,
  type DocumentNode,
  type CanvasNode,
  type FrameNode,
  type SectionNode,
  type SlideNode,
  type RectangleNode,
  type EllipseNode,
  type TextNode,
  type LineNode,
  type VectorPath,
  type VectorNode,
  type PolygonNode,
  type StarNode,
  type ShapeType,
  type ShapeWithTextNode,
  type StickyNoteNode,
  type GroupNode,
  type ConnectorCap,
  type ConnectorLineShape,
  type ConnectorEndpointConnected,
  type ConnectorEndpointEdge,
  type ConnectorEndpointFree,
  type ConnectorEndpoint,
  type ConnectorNode,
  type SceneNode,
  type GeometryNode,
  type AppearanceNode,
  type CompoundNode,
  isGeometryNode,
  isConnectorNode,
  isCompoundNode,
  getTextSlotId,
  createPaint,
  ensurePaintId,
} from './types'

// Scene graph
export {
  SceneGraph,
  type SceneGraphEvent,
  type FieldChangeEvent,
  type ReparentEvent,
  type CreateEvent,
  type DeleteEvent,
  type AttachmentRecord,
  type AttachmentChangeEvent,
  type AttachmentInvalidateEvent,
  type SceneGraphListener,
} from './scene-graph'

// Selection
export { Selection } from './selection'

// Mixed sentinel
export { MIXED, type Mixed, isMixed, notMixed } from './mixed'

// Selection properties
export {
  CollectMode,
  collectValues,
  getSelectionValue,
  clobberValue,
} from './selection-properties'

// Math parser
export {
  evaluateExpression,
  ErrorType,
  type Answer,
  type AnswerSuccess,
  type AnswerError,
  type ErrorInfo,
} from './math-parser'

// Mixed math (per-node operations for scrubbing and math expressions)
export { type MixedMathHandler, createMixedMathHandler } from './mixed-math'

// Selection paints (paint-centric multi-node abstraction)
export {
  type PaintLocation,
  type SelectionPaint,
  collectSelectionPaints,
  updateSelectionPaint,
  addSelectionPaint,
  removeSelectionPaint,
} from './selection-paints'

// Undo/redo
export {
  UndoManager,
  MergeType,
  type Batch,
  type Change,
  type FieldChange,
  type ReparentChange,
  type CreateChange,
  type DeleteChange,
} from './undo-manager'
