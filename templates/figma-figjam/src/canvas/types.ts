/** Discriminator for node behavior */
export type NodeType = 'FRAME' | 'SECTION' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'LINE' | 'GROUP' | 'VECTOR' | 'POLYGON' | 'STAR' | 'STICKY_NOTE'

/** RGB color with channels 0-255 */
export interface Color {
  r: number
  g: number
  b: number
}

/** Solid color paint */
export interface SolidPaint {
  type: 'SOLID'
  color: Color
  opacity: number
  visible: boolean
}

export type Paint = SolidPaint

/** Stroke definition */
export interface Stroke {
  paint: Paint
  weight: number
  position: 'INSIDE' | 'CENTER' | 'OUTSIDE'
}

/** Visual effect (shadows, blurs) */
export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR'
  visible: boolean
}

/** Base fields shared by every node */
export interface BaseNode {
  /** Unique identifier */
  id: string
  /** Display name shown in layers panel */
  name: string
  /** Discriminator for node behavior */
  type: NodeType
  /** Parent node ID, null for root nodes */
  parentId: string | null
  /** Ordered child node IDs */
  children: string[]
  /** Whether the node is visible */
  visible: boolean
  /** Whether the node is locked (can't be selected on canvas) */
  locked: boolean
}

/** Position and dimensions in parent coordinate space */
export interface GeometryMixin {
  x: number
  y: number
  width: number
  height: number
  /** Rotation in degrees, clockwise */
  rotation: number
  /** Opacity 0-1 */
  opacity: number
}

/** Visual appearance: fills, strokes, effects */
export interface AppearanceMixin {
  /** Corner radius (uniform) */
  cornerRadius: number
  /** Fill paints, rendered bottom to top */
  fills: Paint[]
  /** Stroke paints */
  strokes: Stroke[]
  /** Visual effects */
  effects: Effect[]
}

/** Frame node — supports children, clipping, auto-layout */
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

/** Text properties for shape nodes (rectangle, ellipse, polygon, star) */
export interface ShapeTextMixin {
  characters: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT'
}

/** Rectangle node */
export interface RectangleNode extends BaseNode, GeometryMixin, AppearanceMixin, ShapeTextMixin {
  type: 'RECTANGLE'
}

/** Ellipse node */
export interface EllipseNode extends BaseNode, GeometryMixin, AppearanceMixin, ShapeTextMixin {
  type: 'ELLIPSE'
}

/** Text node */
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

/** Line node */
export interface LineNode extends BaseNode, GeometryMixin {
  type: 'LINE'
  strokes: Stroke[]
}

/** Individual SVG path within a vector node */
export interface VectorPath {
  /** SVG path data (d attribute) */
  d: string
  /** Fill color for this path (overrides node-level fills) */
  fill?: string
}

/** Vector node — supports SVG path data */
export interface VectorNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'VECTOR'
  /** SVG paths that make up this vector */
  paths: VectorPath[]
}

/** Polygon node */
export interface PolygonNode extends BaseNode, GeometryMixin, AppearanceMixin, ShapeTextMixin {
  type: 'POLYGON'
  sides: number
}

/** Star node */
export interface StarNode extends BaseNode, GeometryMixin, AppearanceMixin, ShapeTextMixin {
  type: 'STAR'
  points: number
  innerRadius: number
}

/** Section node — container like frames but with no clipping and no layout */
export interface SectionNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'SECTION'
}

/** Sticky note node */
export interface StickyNoteNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'STICKY_NOTE'
  characters: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  authorName: string
  showAuthor: boolean
}

/** Group node — bounds derived from children */
export interface GroupNode extends BaseNode {
  type: 'GROUP'
}

/** Union of all scene node types */
export type SceneNode = FrameNode | SectionNode | RectangleNode | EllipseNode | TextNode | LineNode | GroupNode | VectorNode | PolygonNode | StarNode | StickyNoteNode

/** Nodes that have geometry (position/size) */
export type GeometryNode = FrameNode | SectionNode | RectangleNode | EllipseNode | TextNode | LineNode | VectorNode | PolygonNode | StarNode | StickyNoteNode

/** Nodes that have appearance (fills/strokes) */
export type AppearanceNode = FrameNode | SectionNode | RectangleNode | EllipseNode | TextNode | VectorNode | PolygonNode | StarNode | StickyNoteNode

/** Shape nodes that support editable text */
export type ShapeWithTextNode = RectangleNode | EllipseNode | PolygonNode | StarNode

/** All nodes that support text editing (shapes + sticky notes) */
export type TextCapableNode = ShapeWithTextNode | StickyNoteNode

/** Shape types that have editable text */
const SHAPE_WITH_TEXT_TYPES = new Set(['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR'])

/** Check if a node is a shape with text properties */
export function isShapeWithText(node: SceneNode): node is ShapeWithTextNode {
  return SHAPE_WITH_TEXT_TYPES.has(node.type)
}

/** Check if a node supports text editing (shapes + sticky notes) */
export function isTextCapableNode(node: SceneNode): node is TextCapableNode {
  return SHAPE_WITH_TEXT_TYPES.has(node.type) || node.type === 'STICKY_NOTE'
}
