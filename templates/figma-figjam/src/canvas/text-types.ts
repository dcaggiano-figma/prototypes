import type {
  EllipseNode,
  PolygonNode,
  RectangleNode,
  StarNode,
  StickyNoteNode,
  TextNode,
} from '@prototype/shared/canvas'

/** Text properties that FigJam stores directly on compound nodes at runtime. */
interface RuntimeTextProps {
  characters?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT'
}

/** StickyNoteNode with runtime text properties. */
export type FigJamStickyNoteNode = StickyNoteNode & RuntimeTextProps

/** FigJam shape types that support editable text overlays. */
type FigJamShapeNode = RectangleNode | EllipseNode | PolygonNode | StarNode

/** Shape node with runtime text properties. */
export type FigJamShapeWithTextNode = FigJamShapeNode & RuntimeTextProps

/** All nodes that support text editing in FigJam. */
export type FigJamTextCapableNode = FigJamStickyNoteNode | FigJamShapeWithTextNode | TextNode
