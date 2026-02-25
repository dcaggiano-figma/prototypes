/** Discriminator for node behavior */
export type NodeType = 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'LINE' | 'GROUP' | 'VECTOR'

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

/** Rectangle node */
export interface RectangleNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'RECTANGLE'
}

/** Ellipse node */
export interface EllipseNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'ELLIPSE'
}

/** Text node */
export interface TextNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'TEXT'
  characters: string
  fontSize: number
  fontWeight: number
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT'
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM'
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

/** Group node — bounds derived from children */
export interface GroupNode extends BaseNode {
  type: 'GROUP'
}

/** Union of all scene node types */
export type SceneNode = FrameNode | RectangleNode | EllipseNode | TextNode | LineNode | GroupNode | VectorNode

/** Nodes that have geometry (position/size) */
export type GeometryNode = FrameNode | RectangleNode | EllipseNode | TextNode | LineNode | VectorNode

/** Nodes that have appearance (fills/strokes) */
export type AppearanceNode = FrameNode | RectangleNode | EllipseNode | TextNode | VectorNode
