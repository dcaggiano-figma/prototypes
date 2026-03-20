import { describe, expect, it } from 'vitest'

import { SceneGraph } from '../../scene-graph/scene-graph'
import type { ConnectorNode } from '../../scene-graph/types'
import { getTypeDefaults } from '../scene-graph/node-defaults'
import { installConnectorAttachmentLifecycle } from './connector-utils'

function createTestScene() {
  const sg = new SceneGraph()
  const unsubscribe = installConnectorAttachmentLifecycle(sg)
  const canvas = sg.createCanvas('Page 1')
  const rect1 = sg.createNode('RECTANGLE', canvas.id, {
    ...getTypeDefaults('RECTANGLE'),
    x: 100, y: 100, width: 50, height: 50,
  })
  const rect2 = sg.createNode('RECTANGLE', canvas.id, {
    ...getTypeDefaults('RECTANGLE'),
    x: 300, y: 100, width: 50, height: 50,
  })
  const connector = sg.createNode('CONNECTOR', canvas.id, {
    ...getTypeDefaults('CONNECTOR'),
    startEndpoint: { type: 'connected', nodeId: rect1.id, pointIndex: 0 },
    endEndpoint: { type: 'connected', nodeId: rect2.id, pointIndex: 0 },
  }) as ConnectorNode
  return { sg, unsubscribe, rect1, rect2, connector }
}

describe('installConnectorAttachmentLifecycle', () => {
  it('registers connector endpoint attachments for attached endpoints', () => {
    const { sg, connector, rect1, rect2, unsubscribe } = createTestScene()

    expect(sg.getAttachmentsForAttachee(connector.id)).toEqual([
      expect.objectContaining({ key: 'connector:start', anchorNodeId: rect1.id }),
      expect.objectContaining({ key: 'connector:end', anchorNodeId: rect2.id }),
    ])

    unsubscribe()
  })

  it('updates connector bounds when an attached anchor moves', () => {
    const { sg, rect1, connector, unsubscribe } = createTestScene()
    const before = sg.getNodeOrThrow(connector.id) as ConnectorNode

    sg.setNodeField(rect1.id, 'x', 160)

    const after = sg.getNodeOrThrow(connector.id) as ConnectorNode
    expect(after.x).not.toBe(before.x)
    expect(after.width).not.toBe(before.width)

    unsubscribe()
  })

  it('detaches deleted anchors to free world-space endpoints', () => {
    const { sg, rect1, connector, unsubscribe } = createTestScene()

    sg.deleteNode(rect1.id)

    const updated = sg.getNodeOrThrow(connector.id) as ConnectorNode
    expect(updated.startEndpoint.type).toBe('free')
    if (updated.startEndpoint.type === 'free') {
      expect(updated.startEndpoint.x).toBe(125)
      expect(updated.startEndpoint.y).toBe(100)
    }
    expect(sg.getAttachmentsForAttachee(connector.id)).toEqual([
      expect.objectContaining({ key: 'connector:end' }),
    ])

    unsubscribe()
  })
})
