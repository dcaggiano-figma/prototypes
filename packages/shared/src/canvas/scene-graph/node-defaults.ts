/**
 * Default property values for each node type.
 * Used when creating nodes via the SceneGraph — templates call
 * `sg.createNode('RECTANGLE', canvasId, { ...getTypeDefaults('RECTANGLE'), ...overrides })`.
 */

import type {
  AppearanceMixin,
  ConnectorNode,
  GeometryMixin,
  NodeType,
  SceneNode,
  StickyNoteNode,
} from '../../scene-graph/types'
import { createPaint } from '../../scene-graph/types'

// ── Shared mixins ──────────────────────────────────────────────────

const GEOMETRY_DEFAULTS: GeometryMixin = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
}

const APPEARANCE_DEFAULTS: AppearanceMixin = {
  cornerRadius: 0,
  fills: [createPaint({
    type: 'SOLID', color: { r: 196, g: 196, b: 196 }, opacity: 1, visible: true,
  })],
  strokes: [],
  strokeWeight: 1,
  strokeAlign: 'CENTER',
  effects: [],
}

const FRAME_DEFAULTS = {
  clipsContent: true,
  layoutMode: 'NONE' as const,
  itemSpacing: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
}

const TEXT_APPEARANCE: AppearanceMixin = {
  cornerRadius: 0,
  fills: [createPaint({
    type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true,
  })],
  strokes: [],
  strokeWeight: 1,
  strokeAlign: 'CENTER',
  effects: [],
}

const TEXT_DEFAULTS = {
  characters: '',
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 20,
  letterSpacing: 0,
  textAlignHorizontal: 'LEFT' as const,
  textAlignVertical: 'TOP' as const,
  textAutoResize: 'WIDTH_AND_HEIGHT' as const,
}

const STICKY_NOTE_DEFAULTS: Omit<StickyNoteNode, 'id' | 'name' | 'type' | 'parentId' | 'children' | 'visible' | 'locked' | 'compoundOwner' | keyof GeometryMixin | keyof AppearanceMixin | 'slots'> = {
  authorName: 'You',
  showAuthor: true,
}

// ── getTypeDefaults ────────────────────────────────────────────────

export function getTypeDefaults(type: NodeType): Partial<SceneNode> & Record<string, unknown> {
  switch (type) {
    case 'FRAME':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, ...FRAME_DEFAULTS }
    case 'RECTANGLE':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS }
    case 'ELLIPSE':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS }
    case 'TEXT':
      return { ...GEOMETRY_DEFAULTS, ...TEXT_APPEARANCE, ...TEXT_DEFAULTS, width: 120, height: 22 }
    case 'LINE':
      return {
        ...GEOMETRY_DEFAULTS,
        strokes: [createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })],
        strokeWeight: 1,
        strokeAlign: 'CENTER' as const,
        strokeDashPattern: [],
        startCap: 'NONE' as const,
        endCap: 'NONE' as const,
      }
    case 'POLYGON':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, sides: 3 }
    case 'STAR':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, points: 5, innerRadius: 0.382 }
    case 'VECTOR':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, paths: [] }
    case 'SECTION':
      return {
        ...GEOMETRY_DEFAULTS,
        ...APPEARANCE_DEFAULTS,
        fills: [createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })],
        strokes: [createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })],
        strokeWeight: 1,
        strokeAlign: 'INSIDE' as const,
        cornerRadius: 8,
      }
    case 'GRID_SECTION':
      return {
        ...GEOMETRY_DEFAULTS,
        ...APPEARANCE_DEFAULTS,
        fills: [createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })],
        strokes: [createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })],
        strokeWeight: 1,
        strokeAlign: 'INSIDE' as const,
        cornerRadius: 8,
      }
    case 'SLIDE':
      return {
        ...GEOMETRY_DEFAULTS,
        ...APPEARANCE_DEFAULTS,
        fills: [createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })],
        strokes: [createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })],
        strokeWeight: 1,
        strokeAlign: 'INSIDE' as const,
        width: 400,
        height: 500,
        clipsContent: true,
      }
    case 'SHAPE_WITH_TEXT':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, shapeType: 'RECTANGLE' as const }
    case 'STICKY_NOTE':
      return {
        ...GEOMETRY_DEFAULTS,
        ...APPEARANCE_DEFAULTS,
        ...STICKY_NOTE_DEFAULTS,
        width: 240,
        height: 240,
        cornerRadius: 0,
        fills: [createPaint({
          type: 'SOLID', color: { r: 255, g: 226, b: 153 }, opacity: 1, visible: true,
        })],
      }
    case 'CONNECTOR':
      return {
        ...GEOMETRY_DEFAULTS,
        startEndpoint: { type: 'free', x: 0, y: 0 },
        endEndpoint: { type: 'free', x: 100, y: 0 },
        lineShape: 'CURVE' as ConnectorNode['lineShape'],
        startCap: 'NONE' as ConnectorNode['startCap'],
        endCap: 'FILLED_ARROW' as ConnectorNode['endCap'],
        strokes: [createPaint({ type: 'SOLID', color: { r: 100, g: 100, b: 100 }, opacity: 1, visible: true })],
        strokeWeight: 3,
        strokeAlign: 'CENTER' as const,
        strokeDashPattern: [],
        elbowMidpointOffset: 0.5,
      }
    case 'GROUP':
      return {}
    case 'DOCUMENT':
    case 'CANVAS':
      return {}
  }
}
