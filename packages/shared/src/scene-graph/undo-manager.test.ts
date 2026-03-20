import { describe, expect, it, vi } from 'vitest'
import { SceneGraph } from './scene-graph'
import { MergeType, UndoManager } from './undo-manager'
import type { CanvasNode, RectangleNode } from './types'

function setup() {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')
  const um = new UndoManager(sg)
  return { sg, canvas, um }
}

// ── Basic undo/redo ──────────────────────────────────────────────────

describe('UndoManager — basic', () => {
  it('starts with nothing to undo or redo', () => {
    const { um } = setup()
    expect(um.canUndo).toBe(false)
    expect(um.canRedo).toBe(false)
  })

  it('records field changes and can undo', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 50)
    um.commit()

    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(50)
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)
  })

  it('redo restores the change', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 50)
    um.commit()

    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)

    um.redo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(50)
  })

  it('multiple undo steps work in order', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 10)
    um.commit()
    sg.setNodeField(rect.id, 'x', 20)
    um.commit()
    sg.setNodeField(rect.id, 'x', 30)
    um.commit()

    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(20)
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(10)
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)
  })

  it('undo with empty buffer auto-commits first', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 50)
    // Don't commit — undo should auto-commit first
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)
  })

  it('commit with empty buffer is a no-op', () => {
    const { um } = setup()
    um.commit()
    expect(um.canUndo).toBe(false)
  })

  it('clear removes all history', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 50)
    um.commit()

    um.clear()
    expect(um.canUndo).toBe(false)
    expect(um.canRedo).toBe(false)
  })
})

// ── Create/delete ───────────────────────────────────────────────────

describe('UndoManager — create/delete', () => {
  it('undo create removes the node', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    expect(sg.getNode(rect.id)).toBeDefined()
    um.undo()
    expect(sg.getNode(rect.id)).toBeUndefined()
  })

  it('redo create restores the node', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    um.undo()
    expect(sg.getNode(rect.id)).toBeUndefined()

    um.redo()
    expect(sg.getNode(rect.id)).toBeDefined()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)
  })

  it('undo delete restores the node', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 20, width: 100, height: 100 })
    um.commit()

    sg.deleteNode(rect.id)
    um.commit()

    expect(sg.getNode(rect.id)).toBeUndefined()
    um.undo()
    expect(sg.getNode(rect.id)).toBeDefined()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(10)
  })

  it('redo delete removes the node again', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.deleteNode(rect.id)
    um.commit()

    um.undo()
    expect(sg.getNode(rect.id)).toBeDefined()

    um.redo()
    expect(sg.getNode(rect.id)).toBeUndefined()
  })
})

// ── Reparent ────────────────────────────────────────────────────────

describe('UndoManager — reparent', () => {
  it('undo reparent moves node back', () => {
    const { sg, canvas, um } = setup()
    const frame1 = sg.createNode('FRAME', canvas.id, { x: 0, y: 0, width: 200, height: 200, clipsContent: false, layoutMode: 'NONE', itemSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 })
    const frame2 = sg.createNode('FRAME', canvas.id, { x: 300, y: 0, width: 200, height: 200, clipsContent: false, layoutMode: 'NONE', itemSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 })
    const rect = sg.createNode('RECTANGLE', frame1.id, { x: 0, y: 0, width: 50, height: 50 })
    um.commit()

    sg.reparentNode(rect.id, frame2.id, 0)
    um.commit()

    expect(sg.getNode(rect.id)!.parentId).toBe(frame2.id)
    um.undo()
    expect(sg.getNode(rect.id)!.parentId).toBe(frame1.id)
  })
})

// ── Dual-stack (tainted/untainted) ──────────────────────────────────

describe('UndoManager — dual stack', () => {
  it('selection changes go to untainted stack', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    // Change selection (non-tainting)
    const sel = (sg.getNode(canvas.id) as CanvasNode).selection
    sg.setNodeField(canvas.id, 'selection', sel.withSelected([rect.id], sg))
    um.commit()

    // Should be undoable
    expect(um.canUndo).toBe(true)
    um.undo()
    expect((sg.getNode(canvas.id) as CanvasNode).selection.isEmpty).toBe(true)
  })

  it('selection change does not clear tainted redo stack', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    // Make a tainting change
    sg.setNodeField(rect.id, 'x', 50)
    um.commit()

    // Undo it
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)

    // Change selection (non-tainting) — should NOT clear redo
    const sel = (sg.getNode(canvas.id) as CanvasNode).selection
    sg.setNodeField(canvas.id, 'selection', sel.withSelected([rect.id], sg))
    um.commit()

    // Redo should still work for the tainting change
    expect(um.canRedo).toBe(true)
    um.redo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(50)
  })

  it('undo-select-copy-redo workflow', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    // Move rect to x=50
    sg.setNodeField(rect.id, 'x', 50)
    um.commit()

    // Move rect to x=100
    sg.setNodeField(rect.id, 'x', 100)
    um.commit()

    // Undo twice
    um.undo()
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)

    // Change selection (to "copy" something)
    const sel = (sg.getNode(canvas.id) as CanvasNode).selection
    sg.setNodeField(canvas.id, 'selection', sel.withSelected([rect.id], sg))
    um.commit()

    // Redo twice — should restore the tainted changes
    um.redo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(50)
    um.redo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(100)
  })

  it('undo property change does not revert selection', () => {
    const { sg, canvas, um } = setup()
    sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    const rect2 = sg.createNode('RECTANGLE', canvas.id, { x: 200, y: 0, width: 100, height: 100 })
    const rect3 = sg.createNode('RECTANGLE', canvas.id, { x: 400, y: 0, width: 100, height: 100 })
    um.commit()

    // Select rect3 (simulating the last-created node being auto-selected)
    const sel0 = (sg.getNode(canvas.id) as CanvasNode).selection
    sg.setNodeField(canvas.id, 'selection', sel0.withSelected([rect3.id], sg))
    um.commit()

    // Click rect2 to select it — this goes into the buffer
    const sel1 = (sg.getNode(canvas.id) as CanvasNode).selection
    sg.setNodeField(canvas.id, 'selection', sel1.withSelected([rect2.id], sg))
    // Don't commit yet — the property change happens before commit

    // Update rect2's X property in the same "interaction" (same buffer)
    sg.setNodeField(rect2.id, 'x', 500)
    um.commit()

    // Undo should revert X but keep rect2 selected
    um.undo()
    expect((sg.getNode(rect2.id) as RectangleNode).x).toBe(200)
    const selAfter = (sg.getNode(canvas.id) as CanvasNode).selection
    expect(selAfter.isDirectlySelected(rect2.id)).toBe(true)
  })

  it('tainting change after undo clears redo', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 50)
    um.commit()

    um.undo()

    // Make a NEW tainting change — should clear redo
    sg.setNodeField(rect.id, 'x', 99)
    um.commit()

    expect(um.canRedo).toBe(false)
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(99)
  })
})

// ── Batch merging ───────────────────────────────────────────────────

describe('UndoManager — batch merging', () => {
  it('merges adjacent batches with same MergeType within window', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 10)
    um.commit(MergeType.NUDGE)

    sg.setNodeField(rect.id, 'x', 20)
    um.commit(MergeType.NUDGE)

    sg.setNodeField(rect.id, 'x', 30)
    um.commit(MergeType.NUDGE)

    // All three nudges should merge into one undo step
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)
  })

  it('does not merge different MergeTypes', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100, opacity: 1 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 10)
    um.commit(MergeType.NUDGE)

    sg.setNodeField(rect.id, 'opacity', 0.5)
    um.commit(MergeType.OPACITY)

    // Two different types — should be two undo steps
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).opacity).toBe(1)
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(10)

    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)
  })

  it('does not merge batches without MergeType', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 10)
    um.commit() // no MergeType

    sg.setNodeField(rect.id, 'x', 20)
    um.commit() // no MergeType

    // Should be two separate undo steps
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(10)
  })

  it('does not merge batches with structural changes', () => {
    const { sg, canvas, um } = setup()

    sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit(MergeType.NUDGE)

    sg.createNode('RECTANGLE', canvas.id, { x: 50, y: 0, width: 100, height: 100 })
    um.commit(MergeType.NUDGE)

    // Structural changes should not merge — two undo steps
    um.undo()
    const children = sg.getNode(canvas.id)!.children
    expect(children).toHaveLength(1)
  })

  it('does not merge outside the merge window', () => {
    const { sg, canvas } = setup()
    const um = new UndoManager(sg, { mergeWindow: 100 })

    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    let now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    sg.setNodeField(rect.id, 'x', 10)
    um.commit(MergeType.NUDGE)

    // Jump 200ms — outside the 100ms merge window
    now = 1200
    sg.setNodeField(rect.id, 'x', 20)
    um.commit(MergeType.NUDGE)

    vi.restoreAllMocks()

    // Should be two separate undo steps
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(10)
  })
})

// ── Buffer ──────────────────────────────────────────────────────────

describe('UndoManager — buffer', () => {
  it('accumulates changes in the buffer', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    sg.setNodeField(rect.id, 'x', 10)
    sg.setNodeField(rect.id, 'x', 20)
    sg.setNodeField(rect.id, 'x', 30)

    expect(um.bufferSize).toBe(3)

    um.commit()

    // All three changes collapse into one undo step
    um.undo()
    expect((sg.getNode(rect.id) as RectangleNode).x).toBe(0)
  })
})

// ── Dispose ─────────────────────────────────────────────────────────

describe('UndoManager — dispose', () => {
  it('stops recording after dispose', () => {
    const { sg, canvas, um } = setup()
    const rect = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 100, height: 100 })
    um.commit()

    um.dispose()

    sg.setNodeField(rect.id, 'x', 50)
    expect(um.bufferSize).toBe(0)
  })
})
