/**
 * Scene graph type definitions.
 *
 * All node types live here — including template-specific ones like STICKY_NOTE
 * and CONNECTOR. This ensures any template can work with any node type and
 * copy/paste works across templates.
 *
 * ## Compound nodes and slots
 *
 * Some node types are "compound" — they contain implicit children called slots.
 * Slots are auto-created with the parent, hidden in the layers panel, and can't
 * be independently selected, reparented, or deleted by the user.
 *
 * TEXT is the ONLY node type that has text properties. Sticky notes, shapes with
 * text labels, etc. are compound nodes that contain an implicit TEXT child in
 * their `text` slot. To edit text on a shape, you edit its slot's TEXT node.
 *
 * Slots are separate from `children` — `children` are user-managed, slots are
 * structure-managed. Tree traversal, layers panels, and selection only see
 * `children` by default. Deletion cascades through both.
 */

import type { NodeId } from './node-id'
import type { Selection } from './selection'

// ── Node type discriminator ─────────────────────────────────────────

export type NodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'SECTION'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'LINE'
  | 'GROUP'
  | 'VECTOR'
  | 'POLYGON'
  | 'STAR'
  | 'SHAPE_WITH_TEXT'
  | 'STICKY_NOTE'
  | 'CONNECTOR'
  | 'SLIDE'
  | 'GRID_SECTION'

// ── Value types ─────────────────────────────────────────────────────

/** RGB color with channels 0–255. */
export interface Color {
  r: number
  g: number
  b: number
}

/** Solid color paint. */
export interface SolidPaint {
  type: 'SOLID'
  /** Stable identity for React list keys. Auto-assigned via `createPaint()`. */
  id: string
  color: Color
  opacity: number
  visible: boolean
}

export type Paint = SolidPaint

// ── Paint factory ───────────────────────────────────────────────────

let _paintIdCounter = 0

/** Create a paint with an auto-assigned stable ID. */
export function createPaint(paint: Omit<SolidPaint, 'id'>): Paint {
  return { ...paint, id: `p${++_paintIdCounter}` }
}

/** Advance the paint ID counter past the given value (used after deserialization). */
export function advancePaintIdPast(id: number): void {
  if (id > _paintIdCounter) _paintIdCounter = id
}

/** Ensure a paint has an ID (backwards compat for paints loaded without one). */
export function ensurePaintId(paint: Paint): Paint {
  if (paint.id) return paint
  return { ...paint, id: `p${++_paintIdCounter}` }
}

/** Stroke alignment relative to the path. */
export type StrokeAlign = 'INSIDE' | 'CENTER' | 'OUTSIDE'

/** Visual effect (shadows, blurs). */
export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR'
  visible: boolean
}

// ── Mixins ──────────────────────────────────────────────────────────

/** Position and dimensions in parent coordinate space. */
export interface GeometryMixin {
  x: number
  y: number
  width: number
  height: number
  /** Rotation in degrees, clockwise. */
  rotation: number
  /** Opacity 0–1. */
  opacity: number
}

/** Visual appearance: fills, strokes, effects. */
export interface AppearanceMixin {
  /** Corner radius (uniform). */
  cornerRadius: number
  /** Fill paints, rendered bottom to top. */
  fills: Paint[]
  /** Stroke paints, rendered bottom to top. */
  strokes: Paint[]
  /** Stroke weight in pixels. */
  strokeWeight: number
  /** Stroke alignment relative to the path. */
  strokeAlign: StrokeAlign
  /** Visual effects. */
  effects: Effect[]
}

/**
 * Compound node mixin. Nodes with slots contain implicit children that are
 * auto-managed by the scene graph. Slots are separate from `children`.
 *
 * The slot map is typed per node type (e.g., `{ text: NodeId }` for shapes).
 * Slot children:
 * - Are auto-created when the parent is created
 * - Are auto-deleted when the parent is deleted
 * - Cannot be independently selected, reparented, or deleted by the user
 * - Are hidden in the layers panel
 * - Can be interacted with (e.g., text editing) but not structurally modified
 */
export interface CompoundMixin {
  slots: Readonly<Record<string, NodeId>>
}

/** Slot map for nodes that have an implicit text child. */
export interface TextSlots {
  /** The implicit TEXT child node for this compound node's label/content. */
  text: NodeId
}

// ── Base node ───────────────────────────────────────────────────────

/** Base fields shared by every node. */
export interface BaseNode {
  /** Unique identifier. */
  id: NodeId
  /** Display name shown in layers panel. */
  name: string
  /** Discriminator for node behavior. */
  type: NodeType
  /** Parent node ID, null for root (DOCUMENT). */
  parentId: NodeId | null
  /**
   * Ordered child node IDs (user-managed).
   * Does NOT include slot children — those are in `slots`.
   */
  children: NodeId[]
  /** Whether the node is visible. */
  visible: boolean
  /** Whether the node is locked (can't be selected on canvas). */
  locked: boolean
  /**
   * If this node is part of a compound node's implicit structure, this points
   * to the compound owner. Null for regular user-created nodes. Set on every
   * node in the implicit sub-tree, not just slot roots.
   *
   * Nodes with a compoundOwner:
   * - Cannot be independently selected, reparented, or deleted
   * - Are hidden in the layers panel
   * - Can be interacted with (e.g., text editing) but not structurally modified
   */
  compoundOwner: NodeId | null
}

// ── Document and canvas nodes ───────────────────────────────────────

/** Document node — root of the entire file. One per file, not rendered. */
export interface DocumentNode extends BaseNode {
  type: 'DOCUMENT'
}

/** Canvas node — represents a page. Children of DOCUMENT. */
export interface CanvasNode extends BaseNode {
  type: 'CANVAS'
  /** Page background color. */
  backgroundColor: Color
  /** Whether the page background is visible. When false, show a checkerboard. */
  backgroundVisible: boolean
  /** Selection state for this page. */
  selection: Selection
}

// ── Shape nodes ─────────────────────────────────────────────────────

/** Frame node — supports children, clipping, auto-layout. */
export interface FrameNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'FRAME'
  clipsContent: boolean
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'
  itemSpacing: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
}

/** Rectangle node. */
export interface RectangleNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'RECTANGLE'
}

/** Ellipse node. */
export interface EllipseNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'ELLIPSE'
}

/**
 * Text node — the ONLY node type with text properties.
 * All other "text" is modeled as a compound node with a TEXT slot child.
 */
export interface TextNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'TEXT'
  characters: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT'
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM'
  textAutoResize: 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'NONE'
}

/** Line node. */
export interface LineNode extends BaseNode, GeometryMixin {
  type: 'LINE'
  strokes: Paint[]
  strokeWeight: number
  strokeAlign: StrokeAlign
  strokeDashPattern: number[]
  startCap: ConnectorCap
  endCap: ConnectorCap
}

/** Individual SVG path within a vector node. */
export interface VectorPath {
  /** SVG path data (d attribute). */
  d: string
  /** Fill color for this path (overrides node-level fills). */
  fill?: string
}

/** Vector node — supports SVG path data. */
export interface VectorNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'VECTOR'
  /** SVG paths that make up this vector. */
  paths: VectorPath[]
  /** Original path coordinate width (for scaling). Falls back to node width if unset. */
  pathWidth?: number
  /** Original path coordinate height (for scaling). Falls back to node height if unset. */
  pathHeight?: number
}

/** Polygon node. */
export interface PolygonNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'POLYGON'
  sides: number
}

/** Star node. */
export interface StarNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'STAR'
  points: number
  innerRadius: number
}

/** Section node — container like frames but with no clipping and no layout. */
export interface SectionNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'SECTION'
}

/** Grid section node — infrastructure container for grid layout rows. Like SECTION but managed by the grid system. */
export interface GridSectionNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'GRID_SECTION'
}

/** Slide node — grid-managed container inside sections, supports clipping. */
export interface SlideNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'SLIDE'
  clipsContent: boolean
}

/** The underlying shape geometry for a SHAPE_WITH_TEXT node. */
export type ShapeType = 'RECTANGLE' | 'ELLIPSE' | 'POLYGON' | 'STAR'

/**
 * Shape-with-text node — a FigJam primitive that renders a shape with an
 * editable text label. Compound node with an implicit TEXT slot.
 *
 * In Figma Design, basic shapes (RECTANGLE, ELLIPSE, etc.) don't have text.
 * In FigJam, shapes that show text are a distinct type.
 */
export interface ShapeWithTextNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'SHAPE_WITH_TEXT'
  /** Which shape geometry to render. */
  shapeType: ShapeType
  slots: TextSlots
}

/**
 * Sticky note node — compound, has an implicit TEXT slot.
 * Rendered as a colored card with the text content inside.
 */
export interface StickyNoteNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'STICKY_NOTE'
  slots: TextSlots
  authorName: string
  showAuthor: boolean
}

/** Group node — bounds derived from children. */
export interface GroupNode extends BaseNode {
  type: 'GROUP'
}

// ── Connector types ─────────────────────────────────────────────────

export type ConnectorCap = 'NONE' | 'LINE_ARROW' | 'FILLED_ARROW' | 'REVERSE_TRIANGLE' | 'CIRCLE' | 'DIAMOND'

export type ConnectorLineShape = 'CURVE' | 'ELBOW' | 'STRAIGHT' | 'LINE'

/** Endpoint attached to a fixed connection point on a node (by index). */
export interface ConnectorEndpointConnected {
  type: 'connected'
  nodeId: NodeId
  pointIndex: number
}

/** Endpoint attached to a node's edge at an arbitrary position. */
export interface ConnectorEndpointEdge {
  type: 'edge'
  nodeId: NodeId
  xFraction: number
  yFraction: number
}

/** Endpoint floating freely in world space. */
export interface ConnectorEndpointFree {
  type: 'free'
  x: number
  y: number
}

export type ConnectorEndpoint =
  | ConnectorEndpointConnected
  | ConnectorEndpointEdge
  | ConnectorEndpointFree

/** Connector node — connects two points/nodes with a path. */
export interface ConnectorNode extends BaseNode, GeometryMixin {
  type: 'CONNECTOR'
  startEndpoint: ConnectorEndpoint
  endEndpoint: ConnectorEndpoint
  lineShape: ConnectorLineShape
  startCap: ConnectorCap
  endCap: ConnectorCap
  strokes: Paint[]
  strokeWeight: number
  strokeAlign: StrokeAlign
  strokeDashPattern: number[]
  /** Offset for elbow midpoint (0.1–0.9), controls where the first turn happens. */
  elbowMidpointOffset: number
}

// ── Union types ─────────────────────────────────────────────────────

/**
 * Union of all scene node types.
 *
 * SERIALIZATION CONSTRAINT: All fields on scene node types MUST be
 * JSON-serializable (numbers, strings, booleans, arrays, plain objects).
 * The one exception is `selection` on CanvasNode, which is stripped during
 * serialization and restored as Selection.EMPTY on load.
 * See storage.ts for the serialization implementation.
 */
export type SceneNode =
  | DocumentNode
  | CanvasNode
  | FrameNode
  | SectionNode
  | GridSectionNode
  | SlideNode
  | RectangleNode
  | EllipseNode
  | TextNode
  | LineNode
  | GroupNode
  | VectorNode
  | PolygonNode
  | StarNode
  | ShapeWithTextNode
  | StickyNoteNode
  | ConnectorNode

/** Nodes that have geometry (position/size). */
export type GeometryNode =
  | FrameNode
  | SectionNode
  | GridSectionNode
  | SlideNode
  | RectangleNode
  | EllipseNode
  | TextNode
  | LineNode
  | VectorNode
  | PolygonNode
  | StarNode
  | ShapeWithTextNode
  | StickyNoteNode
  | ConnectorNode

/** Nodes that have appearance (fills/strokes). */
export type AppearanceNode =
  | FrameNode
  | SectionNode
  | GridSectionNode
  | SlideNode
  | RectangleNode
  | EllipseNode
  | TextNode
  | VectorNode
  | PolygonNode
  | StarNode
  | ShapeWithTextNode
  | StickyNoteNode

/**
 * Compound nodes — nodes that contain implicit slot children.
 * These are "custom nodes" that present as a single entity to the user
 * but are internally built from multiple nodes (e.g., a shape + its text label).
 */
export type CompoundNode =
  | ShapeWithTextNode
  | StickyNoteNode

// ── Type guards ─────────────────────────────────────────────────────

const GEOMETRY_TYPES = new Set<NodeType>([
  'FRAME', 'SECTION', 'GRID_SECTION', 'SLIDE', 'RECTANGLE', 'ELLIPSE', 'TEXT', 'LINE',
  'VECTOR', 'POLYGON', 'STAR', 'SHAPE_WITH_TEXT', 'STICKY_NOTE', 'CONNECTOR',
])

const COMPOUND_TYPES = new Set<NodeType>([
  'SHAPE_WITH_TEXT', 'STICKY_NOTE',
])

export function isGeometryNode(node: SceneNode): node is GeometryNode {
  return GEOMETRY_TYPES.has(node.type)
}

export function isConnectorNode(node: SceneNode): node is ConnectorNode {
  return node.type === 'CONNECTOR'
}

/**
 * Check if a node is a compound node (has implicit slot children).
 * Compound nodes present as a single entity but contain implicit TEXT children.
 */
export function isCompoundNode(node: SceneNode): node is CompoundNode {
  return COMPOUND_TYPES.has(node.type)
}

/**
 * Get the text slot NodeId from a compound node, if it has one.
 * Returns undefined for non-compound nodes.
 */
export function getTextSlotId(node: SceneNode): NodeId | undefined {
  if (!isCompoundNode(node)) return undefined
  return node.slots.text
}
