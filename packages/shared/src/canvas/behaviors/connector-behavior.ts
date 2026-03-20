import type { NodeId } from '../../scene-graph/node-id'
import type { ConnectorEndpoint, ConnectorLineShape, GeometryNode, SceneNode } from '../../scene-graph/types'
import { isConnectorNode, isGeometryNode } from '../../scene-graph/types'
import { updateConnectorBounds } from '../connectors/connector-utils'
import { snapToConnectionPoint } from '../connectors/connector-resolve'
import { findNodeNearWorldPoint } from '../scene-graph/selection-utils'
import { getWorldPosition } from '../scene-graph/world-position'
import { getTypeDefaults } from '../scene-graph/node-defaults'
import type { Behavior, BehaviorContext, CanvasPointerEvent } from './types'

interface SnappedPoint {
  x: number
  y: number
  pointIndex: number | null
}

export interface ConnectorBehaviorOptions {
  getLineShape: () => ConnectorLineShape
  onHoverNodeChange: (nodeId: NodeId | null) => void
  onMouseWorldChange: (world: { x: number; y: number } | null) => void
  onCreated?: () => void
}

export interface ConnectorFromMoveBehaviorOptions extends ConnectorBehaviorOptions {
  getSelectedIds: () => ReadonlySet<NodeId>
  getConnectorHoverNodeId: () => NodeId | null
}

export function createConnectorBehavior(
  ctx: BehaviorContext,
  options: ConnectorBehaviorOptions,
): Behavior {
  let connectorId: NodeId | null = null

  return {
    name: 'connector',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      const lineShape = options.getLineShape()
      const startEndpoint = findBestEndpoint(sg, canvasId, event.world.x, event.world.y)
        ?? { type: 'free', x: event.world.x, y: event.world.y }

      const connector = sg.createNode('CONNECTOR', canvasId, {
        ...getTypeDefaults('CONNECTOR'),
        x: event.world.x,
        y: event.world.y,
        width: 0,
        height: 0,
        startEndpoint,
        endEndpoint: { type: 'free', x: event.world.x, y: event.world.y },
        lineShape,
        startCap: 'NONE',
        endCap: 'FILLED_ARROW',
      })
      connectorId = connector.id
      return true
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!connectorId) return
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()

      options.onMouseWorldChange(event.world)

      const safeZoneWorld = 16 / ctx.viewport().scale
      const hoveredId = findNodeNearWorldPoint(sg, canvasId, event.world.x, event.world.y, safeZoneWorld)
      options.onHoverNodeChange(hoveredId ?? null)

      sg.updateNode(connectorId, {
        endEndpoint: { type: 'free', x: event.world.x, y: event.world.y },
      })
    },

    onPointerUp(event: CanvasPointerEvent): void {
      if (!connectorId) return
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      const endEndpoint = findBestEndpoint(sg, canvasId, event.world.x, event.world.y)
        ?? { type: 'free', x: event.world.x, y: event.world.y }

      sg.updateNode(connectorId, { endEndpoint })
      updateConnectorBounds(sg, connectorId)
      ctx.selection().select(connectorId)
      options.onHoverNodeChange(null)
      options.onMouseWorldChange(null)
      ctx.undoManager().commit()
      connectorId = null
      options.onCreated?.()
    },

    onDeactivate(): void {
      cleanupTransientConnector(ctx, options, connectorId)
      connectorId = null
    },
  }
}

export function createConnectorFromMoveBehavior(
  ctx: BehaviorContext,
  options: ConnectorFromMoveBehaviorOptions,
): Behavior {
  let connectorId: NodeId | null = null

  return {
    name: 'connector-from-move',

    onPointerDown(event: CanvasPointerEvent): boolean {
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      const lineShape = options.getLineShape()
      const selectedIds = options.getSelectedIds()
      const hoverNodeId = options.getConnectorHoverNodeId()
      const startEndpoint = findVisibleConnectorPoint(
        sg,
        canvasId,
        event.world.x,
        event.world.y,
        12 / ctx.viewport().scale,
        selectedIds,
        hoverNodeId,
      )

      if (!startEndpoint) return false

      const connector = sg.createNode('CONNECTOR', canvasId, {
        ...getTypeDefaults('CONNECTOR'),
        x: event.world.x,
        y: event.world.y,
        width: 0,
        height: 0,
        startEndpoint,
        endEndpoint: { type: 'free', x: event.world.x, y: event.world.y },
        lineShape,
        startCap: 'NONE',
        endCap: 'FILLED_ARROW',
      })
      connectorId = connector.id
      return true
    },

    onPointerDrag(event: CanvasPointerEvent): void {
      if (!connectorId) return
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      options.onMouseWorldChange(event.world)

      const safeZoneWorld = 16 / ctx.viewport().scale
      const hoveredId = findNodeNearWorldPoint(sg, canvasId, event.world.x, event.world.y, safeZoneWorld)
      options.onHoverNodeChange(hoveredId ?? null)
      sg.updateNode(connectorId, {
        endEndpoint: { type: 'free', x: event.world.x, y: event.world.y },
      })
    },

    onPointerUp(event: CanvasPointerEvent): void {
      if (!connectorId) return
      const sg = ctx.sg()
      const canvasId = ctx.canvasId()
      const endEndpoint = findBestEndpoint(sg, canvasId, event.world.x, event.world.y)
        ?? { type: 'free', x: event.world.x, y: event.world.y }

      sg.updateNode(connectorId, { endEndpoint })
      updateConnectorBounds(sg, connectorId)
      options.onHoverNodeChange(null)
      options.onMouseWorldChange(null)
      ctx.undoManager().commit()
      connectorId = null
    },

    onDeactivate(): void {
      cleanupTransientConnector(ctx, options, connectorId)
      connectorId = null
    },
  }
}

function cleanupTransientConnector(
  ctx: BehaviorContext,
  options: ConnectorBehaviorOptions,
  connectorId: NodeId | null,
): void {
  if (connectorId !== null) {
    const node = ctx.sg().getNode(connectorId)
    if (node) ctx.sg().deleteNode(connectorId)
    options.onHoverNodeChange(null)
    options.onMouseWorldChange(null)
  }
}

function findBestEndpoint(
  sg: ReturnType<BehaviorContext['sg']>,
  canvasId: NodeId,
  worldX: number,
  worldY: number,
): ConnectorEndpoint | null {
  const allNodes = sg.getDescendants(canvasId)
  let bestEndpoint: ConnectorEndpoint | null = null
  let bestDist = Infinity

  for (const node of allNodes) {
    if (!isEligibleConnectorTarget(node)) continue

    const snapped = snapToConnectionPoint(sg, node, worldX, worldY, 30)
    if (!snapped) continue

    const dx = snapped.x - worldX
    const dy = snapped.y - worldY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < bestDist) {
      bestDist = dist
      bestEndpoint = resolveEndpoint(sg, node, snapped)
    }
  }

  return bestEndpoint
}

function findVisibleConnectorPoint(
  sg: ReturnType<BehaviorContext['sg']>,
  canvasId: NodeId,
  worldX: number,
  worldY: number,
  idleOffsetWorld: number,
  selectedIds: ReadonlySet<NodeId>,
  hoverNodeId: NodeId | null,
): ConnectorEndpoint | null {
  const allNodes = sg.getDescendants(canvasId)
  for (const node of allNodes) {
    if (!isEligibleConnectorTarget(node) || node.type === 'TEXT') continue

    const isVisible = selectedIds.has(node.id) || hoverNodeId === node.id
    if (!isVisible) continue

    const threshold = 20 + idleOffsetWorld
    const snapped = snapToConnectionPoint(sg, node, worldX, worldY, threshold)
    if (!snapped || snapped.pointIndex === null) continue

    const dx = snapped.x - worldX
    const dy = snapped.y - worldY
    if (Math.sqrt(dx * dx + dy * dy) > threshold) continue

    return resolveEndpoint(sg, node, snapped)
  }

  return null
}

function isEligibleConnectorTarget(node: SceneNode): node is GeometryNode & { type: string } {
  return isGeometryNode(node) && !isConnectorNode(node) && node.type !== 'LINE' && node.type !== 'VECTOR'
}

function resolveEndpoint(
  sg: ReturnType<BehaviorContext['sg']>,
  node: GeometryNode & { type: string },
  snapped: SnappedPoint,
): ConnectorEndpoint {
  if (snapped.pointIndex !== null) {
    return { type: 'connected', nodeId: node.id, pointIndex: snapped.pointIndex }
  }

  const nodeWorld = getWorldPosition(sg, node)
  const xFraction = node.width > 0 ? (snapped.x - nodeWorld.x) / node.width : 0.5
  const yFraction = node.height > 0 ? (snapped.y - nodeWorld.y) / node.height : 0.5
  return { type: 'edge', nodeId: node.id, xFraction, yFraction }
}
