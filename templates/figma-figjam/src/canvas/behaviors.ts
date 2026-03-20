/**
 * Behavior chain configuration for the figma-figjam canvas.
 *
 * Builds tool-specific behavior arrays using useBehaviorContext.
 * FigJam has additional tools vs figma-design: STICKY_NOTE, PEN (marker/highlighter),
 * CONNECTOR, and single-click text editing on sticky notes.
 */

import { useMemo, useRef } from 'react'
import type { NodeId, NodeType, ConnectorLineShape } from '@prototype/shared/canvas'
import {
  isTextCapableNode,
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
  createConnectorFromMoveBehavior,
  createPaint,
} from '@prototype/shared/canvas'
import type { Behavior, BehaviorContext, CanvasPointerEvent, CommentPlacement } from '@prototype/shared/canvas'

/** Default fills for newly created shapes */
const TEXT_FILL = createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })

/** Default size for new sticky notes */
const STICKY_DEFAULT_SIZE = 240

function getExtraPropsForType(nodeType: NodeType, polygonSides: number): Record<string, unknown> {
  const extra: Record<string, unknown> = {}
  if (nodeType === 'SECTION') {
    extra.cornerRadius = 8
    extra.strokes = [{
      paint: createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true }),
      weight: 1,
      position: 'INSIDE',
    }]
  }
  if (nodeType === 'LINE') {
    extra.strokes = [createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })]
    extra.strokeWeight = 1
    extra.strokeAlign = 'CENTER'
  }
  if (nodeType === 'POLYGON') {
    extra.sides = polygonSides
  }
  return extra
}

/** Shape tools that support click-drag-to-create */
const CREATION_TOOLS = new Set(['SECTION', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'])

export interface UseBehaviorChainOptions {
  effectiveTool: string
  isSpaceHeld: () => boolean
  onPanStart: () => void
  onPanEnd: () => void

  /** Draw tool state for pencil (marker/highlighter). */
  drawColor: string
  drawStrokeWeight: number
  drawOpacity: number

  /** SVG overlay for pencil live preview. */
  pencilOverlayRef: React.RefObject<SVGSVGElement | null>

  /** Called when a creation tool creates a node. */
  onToolCreated: () => void

  /** Called when the comment tool places a pin. */
  onCommentPlace: (placement: CommentPlacement) => void

  /** Sticky note creation options. */
  stickyColor: { r: number; g: number; b: number }
  sectionFillColor: { r: number; g: number; b: number }
  shapeColor: { r: number; g: number; b: number }
  authorName: string

  /** Connector creation options. */
  connectorLineShape: ConnectorLineShape

  /** Called when connector/sticky-note hover node changes (for connector point overlay). */
  onConnectorHoverNodeChange: (nodeId: NodeId | null) => void
  onConnectorMouseWorldChange: (world: { x: number; y: number } | null) => void

  /** IDs of selected nodes (for connector point visibility in MOVE tool). */
  selectedIds: ReadonlySet<NodeId>
  connectorHoverNodeId: NodeId | null

  /** Number of sides for polygon shape creation */
  polygonSides: number
}

/**
 * Build the behavior chain for the current tool.
 */
export function useBehaviorChain(options: UseBehaviorChainOptions): Behavior[] {
  const ctx = useBehaviorContext()
  const textEditing = useTextEditing()
  const viewport = useViewport()

  const optionsRef = useRef(options)
  optionsRef.current = options
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const textEditingRef = useRef(textEditing)
  textEditingRef.current = textEditing

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
        if (!ctx.selection().isSelected(nodeId)) return

        if (node.type === 'TEXT') {
          textEditingRef.current.startEditing(nodeId)
        } else if (isTextCapableNode(node)) {
          if (textEditingRef.current.editingNodeId === nodeId) {
            // Already editing — select all text via DOM
            requestAnimationFrame(() => {
              const el = document.querySelector(
                `[data-node-id="${nodeId}"] [contenteditable="true"]`,
              ) as HTMLElement | null
              if (el) {
                const range = document.createRange()
                range.selectNodeContents(el)
                const sel = window.getSelection()
                sel?.removeAllRanges()
                sel?.addRange(range)
              }
            })
          } else {
            textEditingRef.current.startEditing(nodeId, true)
          }
        } else if (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'GRID_SECTION') {
          ctx.selection().enterFrame(nodeId)
        }
      },
    })

    // FigJam single-click-on-selected enters text editing for sticky notes.
    // We wrap the move tool to inject this behavior on pointerUp.
    const moveToolWithStickyEdit = createMoveToolWithStickyEdit(moveTool, ctx, textEditingRef)

    const boxSelect = createBoxSelectBehavior(ctx)

    const shapeCreation = createShapeCreationBehavior(ctx, {
      getNodeType: () => optionsRef.current.effectiveTool as NodeType,
      getFills: (nodeType) => {
        const o = optionsRef.current
        if (nodeType === 'LINE') return []
        if (nodeType === 'SECTION') return [createPaint({ type: 'SOLID', color: o.sectionFillColor, opacity: 1, visible: true })]
        return [createPaint({ type: 'SOLID', color: o.shapeColor, opacity: 1, visible: true })]
      },
      getExtraProps: (nodeType) => getExtraPropsForType(nodeType, optionsRef.current.polygonSides),
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
      getAuthorName: () => optionsRef.current.authorName,
      startEditing: (nodeId) => textEditingRef.current.startEditing(nodeId),
      onCreated: () => optionsRef.current.onToolCreated(),
    })

    const connector = createConnectorBehavior(ctx, {
      getLineShape: () => optionsRef.current.connectorLineShape,
      onHoverNodeChange: (nodeId) => optionsRef.current.onConnectorHoverNodeChange(nodeId),
      onMouseWorldChange: (world) => optionsRef.current.onConnectorMouseWorldChange(world),
      onCreated: () => optionsRef.current.onToolCreated(),
    })

    // Connector drag from visible connection points in MOVE mode
    const connectorFromMove = createConnectorFromMoveBehavior(ctx, {
      getLineShape: () => optionsRef.current.connectorLineShape,
      getSelectedIds: () => optionsRef.current.selectedIds,
      getConnectorHoverNodeId: () => optionsRef.current.connectorHoverNodeId,
      onHoverNodeChange: (nodeId) => optionsRef.current.onConnectorHoverNodeChange(nodeId),
      onMouseWorldChange: (world) => optionsRef.current.onConnectorMouseWorldChange(world),
      onCreated: () => optionsRef.current.onToolCreated(),
    })

    return { pan, hover, moveTool: moveToolWithStickyEdit, boxSelect, shapeCreation, pencil, textTool, comment, stickyNote, connector, connectorFromMove }
  }, [ctx])

  return useMemo(() => {
    const { pan, hover, moveTool, boxSelect, shapeCreation, pencil, textTool, comment, stickyNote, connector, connectorFromMove } = behaviors
    switch (options.effectiveTool) {
      case 'HAND':
        return [pan, hover]
      case 'MOVE':
        return [pan, connectorFromMove, moveTool, boxSelect, hover]
      case 'PENCIL':
      case 'PEN':
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

// ── Figjam-specific behaviors ─────────────────────────────────────

/** Sticky note: click to place, then enter text editing */
interface StickyNoteOptions {
  getColor: () => { r: number; g: number; b: number }
  getAuthorName: () => string
  startEditing: (nodeId: NodeId) => void
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
        authorName: options.getAuthorName(),
      })
      ctx.selection().select(node.id)
      options.startEditing(node.id)
      ctx.undoManager().commit()
      options.onCreated?.()
      return true
    },
  }
}

/** Wraps move-tool to inject single-click-on-already-selected text editing for sticky notes */
function createMoveToolWithStickyEdit(
  inner: Behavior,
  ctx: BehaviorContext,
  textEditingRef: React.RefObject<ReturnType<typeof useTextEditing>>,
): Behavior {
  let downHitId: NodeId | null = null
  let wasAlreadySelected = false

  return {
    ...inner,
    name: 'move-tool',

    onPointerDown(event: CanvasPointerEvent): boolean {
      downHitId = event.hitNodeId
      wasAlreadySelected = event.hitNodeId ? ctx.selection().isSelected(event.hitNodeId) : false
      return inner.onPointerDown?.(event) ?? false
    },

    onPointerUp(event: CanvasPointerEvent): void {
      inner.onPointerUp?.(event)

      // After move-tool's pointerUp, check for single-click-on-selected text-capable node
      if (downHitId && wasAlreadySelected && !textEditingRef.current?.editingNodeId && event.dragDistance < 3) {
        const node = ctx.sg().getNode(downHitId)
        if (node && isTextCapableNode(node)) {
          textEditingRef.current?.startEditing(downHitId, false)
        }
      }
      downHitId = null
      wasAlreadySelected = false
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
