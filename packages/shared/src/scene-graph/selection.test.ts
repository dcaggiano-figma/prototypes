import { describe, expect, it } from 'vitest'
import { SceneGraph } from './scene-graph'
import { Selection } from './selection'

function createTestGraph() {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')
  return { sg, canvas }
}

describe('Selection — basics', () => {
  it('starts empty', () => {
    const sel = new Selection()
    expect(sel.isEmpty).toBe(true)
    expect(sel.size).toBe(0)
  })

  it('withSelected creates a selection', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    const sel = new Selection().withSelected([rect.id], sg)
    expect(sel.size).toBe(1)
    expect(sel.isDirectlySelected(rect.id)).toBe(true)
  })

  it('cleared returns empty', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)
    const sel = new Selection().withSelected([rect.id], sg)
    const cleared = sel.cleared()
    expect(cleared.isEmpty).toBe(true)
  })

  it('cleared returns same instance if already empty', () => {
    const sel = new Selection()
    expect(sel.cleared()).toBe(sel)
  })
})

describe('Selection — invariants', () => {
  it('selecting a parent removes descendants from selection', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const child = sg.createNode('LINE', frame.id)

    // Select both child and parent
    const sel = new Selection().withSelected([child.id, frame.id], sg)
    // Only the parent should be in the direct selection
    expect(sel.isDirectlySelected(frame.id)).toBe(true)
    expect(sel.isDirectlySelected(child.id)).toBe(false)
  })

  it('selecting a child removes ancestors from selection', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const child = sg.createNode('LINE', frame.id)

    // Start with frame selected, then add child
    const sel1 = new Selection().withSelected([frame.id], sg)
    const sel2 = sel1.withSelected([child.id], sg)
    expect(sel2.isDirectlySelected(child.id)).toBe(true)
    expect(sel2.isDirectlySelected(frame.id)).toBe(false)
  })

  it('sibling selection is fine', () => {
    const { sg, canvas } = createTestGraph()
    const a = sg.createNode('LINE', canvas.id)
    const b = sg.createNode('LINE', canvas.id)

    const sel = new Selection().withSelected([a.id, b.id], sg)
    expect(sel.size).toBe(2)
    expect(sel.isDirectlySelected(a.id)).toBe(true)
    expect(sel.isDirectlySelected(b.id)).toBe(true)
  })
})

describe('Selection — withToggled', () => {
  it('adds a node when not selected', () => {
    const { sg, canvas } = createTestGraph()
    const a = sg.createNode('LINE', canvas.id)
    const b = sg.createNode('LINE', canvas.id)

    const sel = new Selection().withSelected([a.id], sg)
    const toggled = sel.withToggled(b.id, sg)
    expect(toggled.size).toBe(2)
    expect(toggled.isDirectlySelected(a.id)).toBe(true)
    expect(toggled.isDirectlySelected(b.id)).toBe(true)
  })

  it('removes a node when already selected', () => {
    const { sg, canvas } = createTestGraph()
    const a = sg.createNode('LINE', canvas.id)
    const b = sg.createNode('LINE', canvas.id)

    const sel = new Selection().withSelected([a.id, b.id], sg)
    const toggled = sel.withToggled(a.id, sg)
    expect(toggled.size).toBe(1)
    expect(toggled.isDirectlySelected(a.id)).toBe(false)
    expect(toggled.isDirectlySelected(b.id)).toBe(true)
  })
})

describe('Selection — isSelected (indirect)', () => {
  it('child of selected parent is indirectly selected', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const child = sg.createNode('LINE', frame.id)

    const sel = new Selection().withSelected([frame.id], sg)
    expect(sel.isSelected(child.id, sg)).toBe(true)
    expect(sel.isDirectlySelected(child.id)).toBe(false)
  })

  it('grandchild of selected parent is indirectly selected', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const inner = sg.createNode('FRAME', frame.id)
    const leaf = sg.createNode('LINE', inner.id)

    const sel = new Selection().withSelected([frame.id], sg)
    expect(sel.isSelected(leaf.id, sg)).toBe(true)
  })

  it('unrelated node is not selected', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const other = sg.createNode('LINE', canvas.id)

    const sel = new Selection().withSelected([frame.id], sg)
    expect(sel.isSelected(other.id, sg)).toBe(false)
  })
})

describe('Selection — getEffectiveSelection', () => {
  it('includes direct and all descendants', () => {
    const { sg, canvas } = createTestGraph()
    const frame = sg.createNode('FRAME', canvas.id)
    const child1 = sg.createNode('LINE', frame.id)
    const child2 = sg.createNode('LINE', frame.id)

    const sel = new Selection().withSelected([frame.id], sg)
    const effective = sel.getEffectiveSelection(sg)
    expect(effective.has(frame.id)).toBe(true)
    expect(effective.has(child1.id)).toBe(true)
    expect(effective.has(child2.id)).toBe(true)
  })

  it('single node selection returns just that node', () => {
    const { sg, canvas } = createTestGraph()
    const rect = sg.createNode('RECTANGLE', canvas.id)

    const sel = new Selection().withSelected([rect.id], sg)
    const effective = sel.getEffectiveSelection(sg)
    expect(effective.size).toBe(1)
    expect(effective.has(rect.id)).toBe(true)
  })
})

describe('Selection — iteration', () => {
  it('iterates over directly selected nodes', () => {
    const { sg, canvas } = createTestGraph()
    const a = sg.createNode('LINE', canvas.id)
    const b = sg.createNode('LINE', canvas.id)

    const sel = new Selection().withSelected([a.id, b.id], sg)
    const ids = [...sel]
    expect(ids).toContain(a.id)
    expect(ids).toContain(b.id)
    expect(ids).toHaveLength(2)
  })
})
