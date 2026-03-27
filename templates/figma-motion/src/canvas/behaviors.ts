/**
 * Behavior chain configuration for the figma-design canvas.
 *
 * Builds tool-specific behavior arrays using useBehaviorContext.
 * Each tool gets a different chain of behaviors with different priorities.
 */

import { useMemo, useRef } from 'react'
import type { NodeId, NodeType, Paint, ConnectorLineShape } from '@prototype/shared/canvas'
import {
  getTypeDefaults,
  useTextEditing,
  useViewport,
  useBehaviorContext,
  createPanBehavior,
  createHoverBehavior,
  createMoveToolBehavior,
  createBoxSelectBehavior,
  createShapeCreationBehavior,
  createPencilBehavior,
  createTextToolBehavior,
  createCommentBehavior,
  createConnectorBehavior,
} from '@prototype/shared/canvas'
import type { Behavior, BehaviorContext, CanvasPointerEvent, CommentPlacement } from '@prototype/shared/canvas'
import { createPaint } from '@prototype/shared/canvas'

/** Shape tools that support click-drag-to-create */
const CREATION_TOOLS = new Set(['FRAME', 'SECTION', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'])

/** Default fills for newly created shapes */
const SHAPE_FILL = createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })
const FRAME_FILL = createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })
const SECTION_FILL = createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })
const SECTION_STROKE = createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })
const DEFAULT_STROKE = createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })
const TEXT_FILL = createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })

function getFillsForType(nodeType: NodeType): Paint[] {
  if (nodeType === 'LINE') return []
  if (nodeType === 'SECTION') return [SECTION_FILL]
  if (nodeType === 'FRAME') return [FRAME_FILL]
  return [SHAPE_FILL]
}

function getExtraPropsForType(nodeType: NodeType): Record<string, unknown> {
  const extra: Record<string, unknown> = {}
  if (nodeType === 'FRAME') extra.clipsContent = true
  if (nodeType === 'SECTION') {
    extra.strokes = [SECTION_STROKE]
    extra.strokeWeight = 1
    extra.strokeAlign = 'INSIDE'
    extra.cornerRadius = 8
  }
  if (nodeType === 'LINE') {
    extra.strokes = [DEFAULT_STROKE]
    extra.strokeWeight = 1
    extra.strokeAlign = 'CENTER'
  }
  return extra
}

export interface UseBehaviorChainOptions {
  effectiveTool: string
  isSpaceHeld: () => boolean
  onPanStart: () => void
  onPanEnd: () => void

  /** Draw tool state for pencil. */
  drawColor: string
  drawStrokeWeight: number
  drawOpacity: number

  /** SVG overlay for pencil live preview. */
  pencilOverlayRef: React.RefObject<SVGSVGElement | null>

  /** Called when a creation tool creates a node (switch to MOVE, etc.). */
  onToolCreated: () => void

  /** Called when the comment tool places a pin. */
  onCommentPlace: (placement: CommentPlacement) => void

  /** Sticky note creation options. */
  stickyColor: { r: number; g: number; b: number }
  shapeColor: { r: number; g: number; b: number }

  /** Connector creation options. */
  connectorLineShape: ConnectorLineShape

  /** Called when connector hover node changes (for connector point overlay). */
  onConnectorHoverNodeChange: (nodeId: NodeId | null) => void
  onConnectorMouseWorldChange: (world: { x: number; y: number } | null) => void

  /** IDs of selected nodes (for connector point visibility in MOVE tool). */
  selectedIds: ReadonlySet<NodeId>
  connectorHoverNodeId: NodeId | null
}

/**
 * Build the behavior chain for the current tool.
 *
 * Returns a memoized array of behaviors that changes when the tool changes.
 */
export function useBehaviorChain(options: UseBehaviorChainOptions): Behavior[] {
  const ctx = useBehaviorContext()
  const textEditing = useTextEditing()
  const viewport = useViewport()

  // Store options and deps in refs so behaviors always read current values.
  // Behaviors are imperative — they run on each pointer event, not reactively.
  // Refs ensure they always see fresh values without triggering recreation.
  const optionsRef = useRef(options)
  optionsRef.current = options
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const textEditingRef = useRef(textEditing)
  textEditingRef.current = textEditing

  // Create all behavior instances once. They live for the component lifetime
  // and read mutable state imperatively through ctx getters and refs.
  const behaviors = useMemo(() => {
    const pan = createPanBehavior({
      isSpaceHeld: () => optionsRef.current.isSpaceHeld(),
      onPan: (dx, dy) => {
        viewportRef.current.setState((prev) => ({
          ...prev,
          origin: { x: prev.origin.x + dx, y: prev.origin.y + dy },
        }))
      },
      onPanStart: () => optionsRef.current.onPanStart(),
      onPanEnd: () => optionsRef.current.onPanEnd(),
    })

    const hover = createHoverBehavior(ctx)

    const moveTool = createMoveToolBehavior(ctx, {
      onDoubleClick: (nodeId: NodeId) => {
        const node = ctx.sg().getNode(nodeId)
        if (!node) return

        if (ctx.selection().isSelected(nodeId)) {
          if (node.type === 'TEXT') {
            textEditingRef.current.startEditing(nodeId)
          } else if (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'GRID_SECTION') {
            ctx.selection().enterFrame(nodeId)
          }
        }
      },
    })

    const boxSelect = createBoxSelectBehavior(ctx)

    const shapeCreation = createShapeCreationBehavior(ctx, {
      getNodeType: () => optionsRef.current.effectiveTool as NodeType,
      getFills: getFillsForType,
      getExtraProps: getExtraPropsForType,
      onCreated: () => optionsRef.current.onToolCreated(),
    })

    const pencil = createPencilBehavior(ctx, {
      getSvgOverlay: () => optionsRef.current.pencilOverlayRef.current,
      getColor: () => parseHexColor(optionsRef.current.drawColor),
      getStrokeWeight: () => optionsRef.current.drawStrokeWeight,
      getOpacity: () => optionsRef.current.drawOpacity / 100,
    })

    const textTool = createTextToolBehavior(ctx, {
      getFills: () => [TEXT_FILL],
      startEditing: (nodeId) => textEditingRef.current.startEditing(nodeId),
      onCreated: () => optionsRef.current.onToolCreated(),
    })

    const comment = createCommentBehavior(ctx, {
      onPlace: (placement) => optionsRef.current.onCommentPlace(placement),
    })

    const stickyNote = createStickyNoteBehavior(ctx, {
      getColor: () => optionsRef.current.stickyColor,
      onCreated: () => optionsRef.current.onToolCreated(),
    })

    const connector = createConnectorBehavior(ctx, {
      getLineShape: () => optionsRef.current.connectorLineShape,
      onHoverNodeChange: (nodeId) => optionsRef.current.onConnectorHoverNodeChange(nodeId),
      onMouseWorldChange: (world) => optionsRef.current.onConnectorMouseWorldChange(world),
      onCreated: () => optionsRef.current.onToolCreated(),
    })

    return { pan, hover, moveTool, boxSelect, shapeCreation, pencil, textTool, comment, stickyNote, connector }
  }, [ctx])

  // Select the active chain based on the current tool.
  // Only the array identity changes — behavior instances are stable.
  return useMemo(() => {
    const { pan, hover, moveTool, boxSelect, shapeCreation, pencil, textTool, comment, stickyNote, connector } = behaviors
    switch (options.effectiveTool) {
      case 'HAND':
        return [pan, hover]
      case 'MOVE':
        return [pan, moveTool, boxSelect, hover]
      case 'PENCIL':
        return [pan, pencil, hover]
      case 'TEXT':
        return [pan, textTool, hover]
      case 'COMMENT':
        return [pan, comment, hover]
      case 'STICKY_NOTE':
        return [pan, stickyNote, hover]
      case 'CONNECTOR':
        return [pan, connector, hover]
      default:
        if (CREATION_TOOLS.has(options.effectiveTool)) {
          return [pan, shapeCreation, hover]
        }
        return []
    }
  }, [options.effectiveTool, behaviors])
}

// ── Sticky note & connector behaviors ─────────────────────────────

/** Default size for new sticky notes */
const STICKY_DEFAULT_SIZE = 240

/** Sticky note: click to place at cursor position */
interface StickyNoteOptions {
  getColor: () => { r: number; g: number; b: number }
  onCreated?: () => void
}

function createStickyNoteBehavior(ctx: BehaviorContext, options: StickyNoteOptions): Behavior {
  return {
    name: 'sticky-note',
    onPointerDown(event: CanvasPointerEvent): boolean {
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      const color = options.getColor()
      const node = sg.createNode('STICKY_NOTE', canvasId, {
        ...getTypeDefaults('STICKY_NOTE'),
        x: event.world.x - STICKY_DEFAULT_SIZE / 2,
        y: event.world.y - STICKY_DEFAULT_SIZE / 2,
        width: STICKY_DEFAULT_SIZE,
        height: STICKY_DEFAULT_SIZE,
        fills: [createPaint({ type: 'SOLID', color, opacity: 1, visible: true })],
      })
      ctx.selection().select(node.id)
      ctx.undoManager().commit()
      options.onCreated?.()
      return true
    },
  }
}

/** Parse a CSS hex color (#RRGGBB or #RGB) to {r, g, b} (0–255) */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    }
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}
