import { describe, expect, it } from 'vitest'
import { SceneGraph } from '../../scene-graph/scene-graph'
import { getTypeDefaults } from './node-defaults'
import { cleanupConnectorsForDeletion, findConnectorsReferencingNodes } from './connector-cleanup'
import type { ConnectorNode } from '../../scene-graph/types'

function createTestScene() {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')
  const rect1 = sg.createNode('RECTANGLE', canvas.id, {
    ...getTypeDefaults('RECTANGLE'),
    name: 'Rect 1',
    x: 100, y: 100, width: 50, height: 50,
  })
  const rect2 = sg.createNode('RECTANGLE', canvas.id, {
    ...getTypeDefaults('RECTANGLE'),
    name: 'Rect 2',
    x: 300, y: 100, width: 50, height: 50,
  })
  const connector = sg.createNode('CONNECTOR', canvas.id, {
    ...getTypeDefaults('CONNECTOR'),
    name: 'Connector 1',
    startEndpoint: { type: 'connected', nodeId: rect1.id, pointIndex: 0 },
    endEndpoint: { type: 'connected', nodeId: rect2.id, pointIndex: 0 },
  })
  return { sg, canvas, rect1, rect2, connector }
}

describe('findConnectorsReferencingNodes', () => {
  it('finds connectors attached to a node', () => {
    const { sg, canvas, rect1, connector } = createTestScene()
    const found = findConnectorsReferencingNodes(sg, canvas.id, new Set([rect1.id]))
    expect(found).toHaveLength(1)
    expect(found[0].id).toBe(connector.id)
  })

  it('returns empty for unconnected nodes', () => {
    const { sg, canvas } = createTestScene()
    const unrelated = sg.createNode('ELLIPSE', canvas.id, getTypeDefaults('ELLIPSE'))
    const found = findConnectorsReferencingNodes(sg, canvas.id, new Set([unrelated.id]))
    expect(found).toHaveLength(0)
  })
})

describe('cleanupConnectorsForDeletion', () => {
  it('deletes connector when both endpoints reference deleted nodes', () => {
    const { sg, canvas, rect1, rect2, connector } = createTestScene()
    const deleted = cleanupConnectorsForDeletion(sg, canvas.id, new Set([rect1.id, rect2.id]))
    expect(deleted.has(connector.id)).toBe(true)
    expect(sg.getNode(connector.id)).toBeUndefined()
  })

  it('converts endpoint to free when only start references deleted node', () => {
    const { sg, canvas, rect1, connector } = createTestScene()
    const deleted = cleanupConnectorsForDeletion(sg, canvas.id, new Set([rect1.id]))
    expect(deleted.size).toBe(0)

    const updated = sg.getNode(connector.id) as ConnectorNode
    expect(updated.startEndpoint.type).toBe('free')
    // Should be at rect1's center (100 + 50/2, 100 + 50/2)
    if (updated.startEndpoint.type === 'free') {
      expect(updated.startEndpoint.x).toBe(125)
      expect(updated.startEndpoint.y).toBe(125)
    }
    // End endpoint should be unchanged
    expect(updated.endEndpoint.type).toBe('connected')
  })

  it('converts endpoint to free when only end references deleted node', () => {
    const { sg, canvas, rect2, connector } = createTestScene()
    const deleted = cleanupConnectorsForDeletion(sg, canvas.id, new Set([rect2.id]))
    expect(deleted.size).toBe(0)

    const updated = sg.getNode(connector.id) as ConnectorNode
    expect(updated.startEndpoint.type).toBe('connected')
    expect(updated.endEndpoint.type).toBe('free')
    // Should be at rect2's center (300 + 50/2, 100 + 50/2)
    if (updated.endEndpoint.type === 'free') {
      expect(updated.endEndpoint.x).toBe(325)
      expect(updated.endEndpoint.y).toBe(125)
    }
  })

  it('skips connectors that are themselves being deleted', () => {
    const { sg, canvas, rect1, connector } = createTestScene()
    // Include the connector in the deletion set
    const deleted = cleanupConnectorsForDeletion(sg, canvas.id, new Set([rect1.id, connector.id]))
    // Should not have deleted the connector (it's in the deletion set, caller handles it)
    expect(deleted.size).toBe(0)
    // Connector should still exist (caller will delete it)
    expect(sg.getNode(connector.id)).toBeDefined()
  })

  it('handles edge endpoints', () => {
    const { sg, canvas, rect1 } = createTestScene()
    const rect3 = sg.createNode('RECTANGLE', canvas.id, {
      ...getTypeDefaults('RECTANGLE'),
      x: 500, y: 200, width: 80, height: 60,
    })
    sg.createNode('CONNECTOR', canvas.id, {
      ...getTypeDefaults('CONNECTOR'),
      startEndpoint: { type: 'edge', nodeId: rect1.id, xFraction: 0.5, yFraction: 0.5 },
      endEndpoint: { type: 'edge', nodeId: rect3.id, xFraction: 0, yFraction: 0.5 },
    })

    const deleted = cleanupConnectorsForDeletion(sg, canvas.id, new Set([rect1.id]))
    expect(deleted.size).toBe(0)
  })
})
