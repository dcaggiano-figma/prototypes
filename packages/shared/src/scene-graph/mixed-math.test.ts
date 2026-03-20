import { describe, expect, it } from 'vitest'
import { SceneGraph } from './scene-graph'
import { Selection } from './selection'
import { UndoManager } from './undo-manager'
import { createMixedMathHandler } from './mixed-math'
import type { RectangleNode } from './types'

function setup() {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')
  const um = new UndoManager(sg)
  return { sg, canvas, um }
}

describe('createMixedMathHandler', () => {
  it('getValues snapshots per-node values', () => {
    const { sg, canvas, um } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 20, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id])

    const handler = createMixedMathHandler<number>(sg, sel, um, 'x')
    const snapshot = handler.getValues()

    expect(snapshot.get(r1.id)).toBe(10)
    expect(snapshot.get(r2.id)).toBe(20)
  })

  it('onChange applies transform to each node individually', () => {
    const { sg, canvas, um } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 20, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id])

    const handler = createMixedMathHandler<number>(sg, sel, um, 'x')
    const snapshot = handler.getValues()

    // "Mixed + 5" — each node gets +5 applied to its own value
    handler.onChange(snapshot, (v) => v + 5, false)

    expect((sg.getNode(r1.id) as RectangleNode).x).toBe(15)
    expect((sg.getNode(r2.id) as RectangleNode).x).toBe(25)
  })

  it('onChange with commit pushes to undo stack', () => {
    const { sg, canvas, um } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 20, y: 0, width: 50, height: 50 })
    um.commit()

    const sel = new Selection([r1.id, r2.id])
    const handler = createMixedMathHandler<number>(sg, sel, um, 'x')
    const snapshot = handler.getValues()

    handler.onChange(snapshot, (v) => v + 5, true)

    expect(um.canUndo).toBe(true)
    um.undo()
    expect((sg.getNode(r1.id) as RectangleNode).x).toBe(10)
    expect((sg.getNode(r2.id) as RectangleNode).x).toBe(20)
  })

  it('scrub workflow: multiple onChange without commit, then final commit', () => {
    const { sg, canvas, um } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 100, y: 0, width: 50, height: 50 })
    um.commit()

    const sel = new Selection([r1.id, r2.id])
    const handler = createMixedMathHandler<number>(sg, sel, um, 'x')
    const snapshot = handler.getValues()

    // Simulate scrubbing: apply delta from snapshot each tick
    handler.onChange(snapshot, (v) => v + 3, false)
    handler.onChange(snapshot, (v) => v + 6, false)
    handler.onChange(snapshot, (v) => v + 10, true) // final commit

    expect((sg.getNode(r1.id) as RectangleNode).x).toBe(10)
    expect((sg.getNode(r2.id) as RectangleNode).x).toBe(110)

    // Single undo should revert all scrub changes
    um.undo()
    expect((sg.getNode(r1.id) as RectangleNode).x).toBe(0)
    expect((sg.getNode(r2.id) as RectangleNode).x).toBe(100)
  })

  it('drills into groups for fields that do not apply to the group', () => {
    const { sg, canvas, um } = setup()
    const group = sg.createNode('GROUP', canvas.id)
    const r1 = sg.createNode('RECTANGLE', group.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', group.id, { x: 20, y: 0, width: 50, height: 50 })
    const sel = new Selection([group.id])

    const handler = createMixedMathHandler<number>(sg, sel, um, 'x')
    const snapshot = handler.getValues()

    // Should have collected from children, not the group
    expect(snapshot.size).toBe(2)
    expect(snapshot.get(r1.id)).toBe(10)
    expect(snapshot.get(r2.id)).toBe(20)

    handler.onChange(snapshot, (v) => v * 2, true)
    expect((sg.getNode(r1.id) as RectangleNode).x).toBe(20)
    expect((sg.getNode(r2.id) as RectangleNode).x).toBe(40)
  })
})
