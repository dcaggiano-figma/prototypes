import { useMemo, useRef } from 'react'
import type { NodeId } from '../../scene-graph/node-id'
import type { NodeType, Paint } from '../../scene-graph/types'
import { createPaint } from '../../scene-graph/types'
import { useTextEditing } from '../text-editing/provider'
import { useViewport } from '../viewport/provider'
import { useBehaviorContext } from './use-behavior-manager'
import { createBoxSelectBehavior } from './box-select-behavior'
import { createCommentBehavior, type CommentPlacement } from './comment-behavior'
import { createGridDragBehavior } from './grid-drag-behavior'
import { createHoverBehavior } from './hover-behavior'
import { createMoveToolBehavior } from './move-tool-behavior'
import { createPanBehavior } from './pan-behavior'
import { createPencilBehavior } from './pencil-behavior'
import { createShapeCreationBehavior } from './shape-creation-behavior'
import { createTextToolBehavior } from './text-tool-behavior'
import type { Behavior, BehaviorContext } from './types'

const CREATION_TOOLS = new Set(['FRAME', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR'])

const SHAPE_FILL = createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true })
const FRAME_FILL = createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true })
const DEFAULT_STROKE = createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })
const TEXT_FILL = createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })

function getFillsForType(nodeType: NodeType): Paint[] {
  if (nodeType === 'LINE') return []
  if (nodeType === 'FRAME') return [FRAME_FILL]
  return [SHAPE_FILL]
}

function getExtraPropsForType(nodeType: NodeType): Record<string, unknown> {
  const extra: Record<string, unknown> = {}
  if (nodeType === 'FRAME') extra.clipsContent = true
  if (nodeType === 'LINE') {
    extra.strokes = [DEFAULT_STROKE]
    extra.strokeWeight = 1
    extra.strokeAlign = 'CENTER'
  }
  return extra
}

export interface StandardGridBehaviorAdapter<TDropTarget> {
  isManagedSlide: (sg: ReturnType<BehaviorContext['sg']>, nodeId: NodeId) => boolean
  findDropTarget: (
    sg: ReturnType<BehaviorContext['sg']>,
    canvasId: NodeId,
    worldX: number,
    worldY: number,
    draggedNodeId: NodeId,
  ) => TDropTarget | null
  applyGridDrop: (
    sg: ReturnType<BehaviorContext['sg']>,
    canvasId: NodeId,
    nodeId: NodeId,
    target: TDropTarget,
  ) => void
}

export interface UseStandardBehaviorChainOptions<TDropTarget> {
  effectiveTool: string
  isSpaceHeld: () => boolean
  onPanStart: () => void
  onPanEnd: () => void
  drawColor: string
  drawStrokeWeight: number
  drawOpacity: number
  pencilOverlayRef: React.RefObject<SVGSVGElement | null>
  onToolCreated: () => void
  onCommentPlace: (placement: CommentPlacement) => void
  onGridDropTargetChange: (target: TDropTarget | null) => void
  isSlideView: () => boolean
  grid: StandardGridBehaviorAdapter<TDropTarget>
}

export function useStandardBehaviorChain<TDropTarget>(
  options: UseStandardBehaviorChainOptions<TDropTarget>,
): Behavior[] {
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

    const gridDrag = createGridDragBehavior(ctx, {
      isManagedNode: (nodeId) =>
        !optionsRef.current.isSlideView() && optionsRef.current.grid.isManagedSlide(ctx.sg(), nodeId),
      findDropTarget: (worldX, worldY, draggedNodeId) =>
        optionsRef.current.grid.findDropTarget(ctx.sg(), ctx.canvasId(), worldX, worldY, draggedNodeId),
      onDrop: (nodeId, target) =>
        optionsRef.current.grid.applyGridDrop(ctx.sg(), ctx.canvasId(), nodeId, target as TDropTarget),
      onDropTargetChange: (target) =>
        optionsRef.current.onGridDropTargetChange(target as TDropTarget | null),
    })

    const moveTool = createMoveToolBehavior(ctx, {
      onDoubleClick: (nodeId: NodeId) => {
        const node = ctx.sg().getNode(nodeId)
        if (!node) return
        if (!ctx.selection().isSelected(nodeId)) return

        if (node.type === 'TEXT') {
          textEditingRef.current.startEditing(nodeId)
        } else if (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'GRID_SECTION') {
          ctx.selection().enterFrame(nodeId)
        }
      },
      filterDraggable: (nodeId) => {
        const node = ctx.sg().getNode(nodeId)
        if (!node) return true
        if (node.type === 'SECTION' || node.type === 'GRID_SECTION') return false
        if (node.type === 'SLIDE' && optionsRef.current.isSlideView()) return false
        return true
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

    return { pan, hover, gridDrag, moveTool, boxSelect, shapeCreation, pencil, textTool, comment }
  }, [ctx])

  return useMemo(() => {
    const { pan, hover, gridDrag, moveTool, boxSelect, shapeCreation, pencil, textTool, comment } = behaviors
    switch (options.effectiveTool) {
      case 'HAND':
        return [pan, hover]
      case 'MOVE':
        return [pan, gridDrag, moveTool, boxSelect, hover]
      case 'PENCIL':
        return [pan, pencil, hover]
      case 'TEXT':
        return [pan, textTool, hover]
      case 'COMMENT':
        return [pan, comment, hover]
      default:
        if (CREATION_TOOLS.has(options.effectiveTool)) {
          return [pan, shapeCreation, hover]
        }
        return []
    }
  }, [options.effectiveTool, behaviors])
}

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
