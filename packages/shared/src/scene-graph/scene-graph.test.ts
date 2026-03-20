import { describe, expect, it } from 'vitest'
import { SceneGraph } from './scene-graph'
import type { SceneGraphEvent } from './scene-graph'
import type { CompoundNode, RectangleNode, ShapeWithTextNode, TextNode } from './types'

function createTestGraph() {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')
  return { sg, canvas }
}

describe('SceneGraph — basics', () => {
  it('creates with a document root', () => {
    const sg = new SceneGraph()
    const doc = sg.getDocument()
    expect(doc.type).toBe('DOCUMENT')
    expect(doc.parentId).toBeNull()
    expect(doc.children).toEqual([])
  })

  it('creates a canvas as child of document', () => {
    const { sg, canvas } = createTestGraph()
    expect(canvas.type).toBe('CANVAS')
    expect(canvas.parentId).toBe(sg.documentId)
    const doc = sg.getDocument()
    expect(doc.children).toContain(canvas.id)
  })

  it('getCanvases returns all pages', () => {
    const sg = new SceneGraph()
    const c1 = sg.createCanvas('Page 1')
    const c2 = sg.createCanvas('Page 2')
    const canvases = sg.getCanvases()
    expect(canvases).toHaveLength(2)
    expect(canvases.map((c) => c.id)).toEqual([c1.id, c2.id])
  })
})

describe('SceneGraph — createNode', () => {
  it('creates a node with defaults', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    expect(rect.type).toBe('RECTANGLE')
    expect(rect.parentId).toBe(canvas.id)
    expect(rect.visible).toBe(true)
    expect(rect.locked).toBe(false)
    expect(rect.compoundOwner).toBeNull()
  })

  it('adds node to parent children', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    const parent = sg.getNodeOrThrow(canvas.id)
    expect(parent.children).toContain(rect.id)
  })

  it('allows custom props', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id, {
      name: 'My Rect',
      x: 100,
      y: 200,
    })
    expect(rect.name).toBe('My Rect')
    expect((rect as RectangleNode).x).toBe(100)
  })

  it('throws on invalid parent', () => {
    const sg = new SceneGraph()
    expect(() => sg.createNode('RECTANGLE', 9999)).toThrow('not found')
  })
})

describe('SceneGraph — compound nodes (slots)', () => {
  it('auto-creates a TEXT slot child for STICKY_NOTE', () => {
    const { sg, canvas } = createTestGraph()
    const sticky = sg.createNode('STICKY_NOTE', canvas.id) as CompoundNode
    expect(sticky.slots).toBeDefined()
    expect(sticky.slots.text).toBeDefined()

    const textNode = sg.getNode(sticky.slots.text) as TextNode
    expect(textNode).toBeDefined()
    expect(textNode.type).toBe('TEXT')
    expect(textNode.compoundOwner).toBe(sticky.id)
    expect(textNode.characters).toBe('')
  })

  it('auto-creates TEXT slot for SHAPE_WITH_TEXT', () => {
    const { sg, canvas } = createTestGraph()
    const shape = sg.createNode('SHAPE_WITH_TEXT', canvas.id, {
      shapeType: 'RECTANGLE',
    }) as ShapeWithTextNode
    expect(shape.slots).toBeDefined()
    expect(shape.slots.text).toBeDefined()

    const textNode = sg.getNode(shape.slots.text) as TextNode
    expect(textNode).toBeDefined()
    expect(textNode.type).toBe('TEXT')
    expect(textNode.compoundOwner).toBe(shape.id)
  })

  it('does NOT create slots for plain shape types', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    expect((rect as unknown as Record<string, unknown>).slots).toBeUndefined()

    const ellipse = sg.createNode('ELLIPSE', canvas.id)
    expect((ellipse as unknown as Record<string, unknown>).slots).toBeUndefined()

    const polygon = sg.createNode('POLYGON', canvas.id)
    expect((polygon as unknown as Record<string, unknown>).slots).toBeUndefined()

    const star = sg.createNode('STAR', canvas.id)
    expect((star as unknown as Record<string, unknown>).slots).toBeUndefined()
  })

  it('does NOT create slots for non-compound types', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    expect((frame as unknown as Record<string, unknown>).slots).toBeUndefined()

    const line = sg.createNode('LINE', canvas.id)
    expect((line as unknown as Record<string, unknown>).slots).toBeUndefined()
  })

  it('slot child is NOT in parent children array', () => {
    const { sg, canvas } = createTestGraph()
    const sticky = sg.createNode('STICKY_NOTE', canvas.id) as CompoundNode
    const parent = sg.getNodeOrThrow(canvas.id)
    expect(parent.children).toContain(sticky.id)
    expect(parent.children).not.toContain(sticky.slots.text)
    expect(sticky.children).toEqual([])
  })

  it('isSlotChild returns true for slot children', () => {
    const { sg, canvas } = createTestGraph()
    const sticky = sg.createNode('STICKY_NOTE', canvas.id) as CompoundNode
    expect(sg.isSlotChild(sticky.slots.text)).toBe(true)
    expect(sg.isSlotChild(sticky.id)).toBe(false)
    expect(sg.isSlotChild(canvas.id)).toBe(false)
  })

  it('getCompoundOwner returns the owner for slot children', () => {
    const { sg, canvas } = createTestGraph()
    const sticky = sg.createNode('STICKY_NOTE', canvas.id) as CompoundNode
    expect(sg.getCompoundOwner(sticky.slots.text)).toBe(sticky.id)
    expect(sg.getCompoundOwner(sticky.id)).toBeNull()
  })
})

describe('SceneGraph — setNodeField', () => {
  it('updates a field and returns old value', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id, { name: 'Rect' })
    const old = sg.setNodeField(rect.id, 'name', 'Renamed')
    expect(old).toBe('Rect')
    expect(sg.getNodeOrThrow(rect.id).name).toBe('Renamed')
  })

  it('no-ops when value is the same', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id, { name: 'Rect' })
    sg.flushDirty() // clear
    const old = sg.setNodeField(rect.id, 'name', 'Rect')
    expect(old).toBe('Rect')
    expect(sg.hasDirty).toBe(false)
  })

  it('creates a new node object (immutability)', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    const before = sg.getNode(rect.id)
    sg.setNodeField(rect.id, 'name', 'Changed')
    const after = sg.getNode(rect.id)
    expect(before).not.toBe(after)
  })
})

describe('SceneGraph — updateNode', () => {
  it('updates multiple fields at once', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0 })
    sg.updateNode(rect.id, { x: 50, y: 75 })
    const updated = sg.getNodeOrThrow(rect.id) as RectangleNode
    expect(updated.x).toBe(50)
    expect(updated.y).toBe(75)
  })
})

describe('SceneGraph — deleteNode', () => {
  it('deletes a node and removes from parent', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    sg.deleteNode(rect.id)
    expect(sg.getNode(rect.id)).toBeUndefined()
    expect(sg.getNodeOrThrow(canvas.id).children).not.toContain(rect.id)
  })

  it('deletes descendants recursively', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const child = sg.createNode('LINE', frame.id)
    sg.deleteNode(frame.id)
    expect(sg.getNode(frame.id)).toBeUndefined()
    expect(sg.getNode(child.id)).toBeUndefined()
  })

  it('deletes slot children when compound node is deleted', () => {
    const { sg, canvas } = createTestGraph()
    const sticky = sg.createNode('STICKY_NOTE', canvas.id) as CompoundNode
    const textId = sticky.slots.text
    expect(sg.getNode(textId)).toBeDefined()
    sg.deleteNode(sticky.id)
    expect(sg.getNode(sticky.id)).toBeUndefined()
    expect(sg.getNode(textId)).toBeUndefined()
  })

  it('throws when trying to delete a slot child directly', () => {
    const { sg, canvas } = createTestGraph()
    const sticky = sg.createNode('STICKY_NOTE', canvas.id) as CompoundNode
    expect(() => sg.deleteNode(sticky.slots.text)).toThrow('compound owner')
  })
})

describe('SceneGraph — reparentNode', () => {
  it('moves a node to a new parent', () => {
    const { sg, canvas } = createTestGraph()
    const frame1 = sg.createNode('FRAME', canvas.id)
    const frame2 = sg.createNode('FRAME', canvas.id)
    const rect = sg.createNode('RECTANGLE', frame1.id)

    sg.reparentNode(rect.id, frame2.id, 0)

    expect(sg.getNodeOrThrow(rect.id).parentId).toBe(frame2.id)
    expect(sg.getNodeOrThrow(frame1.id).children).not.toContain(rect.id)
    expect(sg.getNodeOrThrow(frame2.id).children).toContain(rect.id)
  })

  it('reorders within the same parent', () => {
    const { sg, canvas } = createTestGraph()
    const a = sg.createNode('LINE', canvas.id, { name: 'A' })
    const b = sg.createNode('LINE', canvas.id, { name: 'B' })
    const c = sg.createNode('LINE', canvas.id, { name: 'C' })

    // Move A to the end (index 2, but since A is removed first, effective is 2)
    sg.reparentNode(a.id, canvas.id, 3)

    const children = sg.getNodeOrThrow(canvas.id).children
    expect(children).toEqual([b.id, c.id, a.id])
  })

  it('throws for document root', () => {
    const sg = new SceneGraph()
    const canvas = sg.createCanvas('Page')
    expect(() => sg.reparentNode(sg.documentId, canvas.id, 0)).toThrow('document root')
  })
})

describe('SceneGraph — dirty tracking', () => {
  it('marks nodes dirty on create', () => {
    const { sg, canvas } = createTestGraph()
    sg.flushDirty() // clear initial
    sg.createNode('RECTANGLE', canvas.id)
    const dirty = sg.flushDirty()
    expect(dirty.size).toBeGreaterThan(0)
  })

  it('flushDirty resets the set', () => {
    const { sg, canvas } = createTestGraph()
    sg.createNode('RECTANGLE', canvas.id)
    sg.flushDirty()
    expect(sg.hasDirty).toBe(false)
    expect(sg.flushDirty().size).toBe(0)
  })

  it('marks dirty on setNodeField', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    sg.flushDirty()
    sg.setNodeField(rect.id, 'name', 'Changed')
    expect(sg.hasDirty).toBe(true)
    expect(sg.flushDirty().has(rect.id)).toBe(true)
  })
})

describe('SceneGraph — event system', () => {
  it('emits create events', () => {
    const { sg, canvas } = createTestGraph()
    const events: SceneGraphEvent[] = []
    sg.addListener((e) => events.push(e))
    const rect = sg.createNode('RECTANGLE', canvas.id)
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'create', nodeId: rect.id }),
    )
  })

  it('emits field-change events', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    const events: SceneGraphEvent[] = []
    sg.addListener((e) => events.push(e))
    sg.setNodeField(rect.id, 'name', 'New Name')
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'field-change',
        nodeId: rect.id,
        field: 'name',
        oldValue: expect.any(String),
        newValue: 'New Name',
      }),
    )
  })

  it('emits delete events', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    const events: SceneGraphEvent[] = []
    sg.addListener((e) => events.push(e))
    sg.deleteNode(rect.id)
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'delete', nodeId: rect.id }),
    )
  })

  it('emits reparent events', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const rect = sg.createNode('RECTANGLE', canvas.id)
    const events: SceneGraphEvent[] = []
    sg.addListener((e) => events.push(e))
    sg.reparentNode(rect.id, frame.id, 0)
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'reparent',
        nodeId: rect.id,
        oldParentId: canvas.id,
        newParentId: frame.id,
      }),
    )
  })

  it('unsubscribe removes listener', () => {
    const { sg, canvas } = createTestGraph()
    const events: SceneGraphEvent[] = []
    const unsub = sg.addListener((e) => events.push(e))
    unsub()
    sg.createNode('RECTANGLE', canvas.id)
    expect(events).toHaveLength(0)
  })

  it('emits attachment events and invalidates attached nodes on anchor geometry changes', () => {
    const { sg, canvas } = createTestGraph()
    const anchor = sg.createNode('RECTANGLE', canvas.id)
    const attachee = sg.createNode('ELLIPSE', canvas.id)
    const events: SceneGraphEvent[] = []
    sg.addListener((e) => events.push(e))

    sg.attachNode(attachee.id, {
      key: 'test',
      kind: 'unit-test',
      anchorNodeId: anchor.id,
    })
    sg.setNodeField(anchor.id, 'x', 120)

    expect(events).toContainEqual(expect.objectContaining({
      type: 'attachment-change',
      action: 'attach',
      attacheeId: attachee.id,
    }))
    expect(events).toContainEqual(expect.objectContaining({
      type: 'attachment-invalidate',
      reason: 'geometry-change',
      anchorNodeId: anchor.id,
      attacheeIds: [attachee.id],
    }))
  })
})

describe('SceneGraph — traversal', () => {
  it('getAncestors walks up to document', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const rect = sg.createNode('RECTANGLE', frame.id)

    const ancestors = sg.getAncestors(rect.id)
    expect(ancestors.map((n) => n.id)).toEqual([frame.id, canvas.id, sg.documentId])
  })

  it('getDescendants returns all nested nodes', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const child1 = sg.createNode('LINE', frame.id)
    const child2 = sg.createNode('LINE', frame.id)

    const descendants = sg.getDescendants(frame.id)
    expect(descendants.map((n) => n.id)).toEqual([child1.id, child2.id])
  })

  it('walk visits depth-first', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id, { name: 'Frame' })
    sg.createNode('LINE', frame.id, { name: 'Line' })

    const visited: string[] = []
    sg.walk(canvas.id, (node) => visited.push(node.name))
    expect(visited).toEqual(['Page 1', 'Frame', 'Line'])
  })
})
