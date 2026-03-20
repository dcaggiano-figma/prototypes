/**
 * Canvas-specific type guards for text-capable nodes.
 * Used by FigJam to identify nodes that support text editing.
 */

import type {
  RectangleNode,
  EllipseNode,
  PolygonNode,
  StarNode,
  StickyNoteNode,
  TextNode,
} from '../scene-graph/types'

/** Shape nodes that support editable text (FigJam shapes) */
export type ShapeWithTextNode = RectangleNode | EllipseNode | PolygonNode | StarNode

/** All nodes that support text editing (shapes + sticky notes + text nodes) */
export type TextCapableNode = ShapeWithTextNode | StickyNoteNode | TextNode

const SHAPE_WITH_TEXT_TYPES = new Set(['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR'])

/** Check if a node is a shape with text properties */
export function isShapeWithText(node: { type: string }): node is ShapeWithTextNode {
  return SHAPE_WITH_TEXT_TYPES.has(node.type)
}

/** Check if a node supports text editing (shapes + sticky notes + text nodes) */
export function isTextCapableNode(node: { type: string }): node is TextCapableNode {
  return SHAPE_WITH_TEXT_TYPES.has(node.type) || node.type === 'STICKY_NOTE' || node.type === 'TEXT'
}
