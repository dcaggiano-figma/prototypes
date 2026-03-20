import { describe, expect, it } from 'vitest'
import { SceneGraph } from './scene-graph'
import { Selection } from './selection'
import { MIXED } from './mixed'
import { createPaint } from './types'
import {
  CollectMode,
  collectValues,
  clobberValue,
  getSelectionValue,
} from './selection-properties'
import type { RectangleNode } from './types'

function setup() {
  const sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')
  return { sg, canvas }
}

// ── collectValues ────────────────────────────────────────────────────

describe('collectValues', () => {
  it('returns empty set when field does not apply', () => {
    const { sg, canvas } = setup()
    const sel = new Selection([canvas.id])
    // CANVAS doesn't have 'x'
    const values = collectValues(sg, sel, 'x')
    expect(values.size).toBe(0)
  })

  it('returns single value when all nodes match', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 50, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id])

    const values = collectValues<number>(sg, sel, 'x')
    expect(values.size).toBe(1)
    expect(values.has(10)).toBe(true)
  })

  it('returns multiple values when nodes differ', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 20, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id])

    const values = collectValues<number>(sg, sel, 'x')
    expect(values.size).toBe(2)
    expect(values.has(10)).toBe(true)
    expect(values.has(20)).toBe(true)
  })

  it('stops at AT_MOST_2 by default', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 20, y: 0, width: 50, height: 50 })
    const r3 = sg.createNode('RECTANGLE', canvas.id, { x: 30, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id, r3.id])

    // Default mode is AT_MOST_2 — should stop after finding 2 unique values
    const values = collectValues<number>(sg, sel, 'x')
    expect(values.size).toBe(2)
  })

  it('collects all values in ALL mode', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 20, y: 0, width: 50, height: 50 })
    const r3 = sg.createNode('RECTANGLE', canvas.id, { x: 30, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id, r3.id])

    const values = collectValues<number>(sg, sel, 'x', CollectMode.ALL)
    expect(values.size).toBe(3)
  })

  it('drills into groups when field does not apply to container', () => {
    const { sg, canvas } = setup()
    // GROUP has no geometry or appearance mixins — only BaseNode fields
    const group = sg.createNode('GROUP', canvas.id)
    sg.createNode('RECTANGLE', group.id, { x: 0, y: 0, width: 50, height: 50, opacity: 0.5 })
    sg.createNode('RECTANGLE', group.id, { x: 50, y: 0, width: 50, height: 50, opacity: 0.5 })
    const sel = new Selection([group.id])

    // GROUP does NOT have opacity — should drill into children (both 0.5)
    const opacityValues = collectValues<number>(sg, sel, 'opacity')
    expect(opacityValues.size).toBe(1)
    expect(opacityValues.has(0.5)).toBe(true)
  })

  it('does not drill when field applies to the container', () => {
    const { sg, canvas } = setup()
    const frame = sg.createNode('FRAME', canvas.id, {
      x: 0, y: 0, width: 200, height: 200, opacity: 1,
      clipsContent: false, layoutMode: 'NONE',
      itemSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    })
    sg.createNode('RECTANGLE', frame.id, { x: 0, y: 0, width: 50, height: 50, opacity: 0.3 })
    const sel = new Selection([frame.id])

    // FRAME has opacity — should collect from frame itself, not drill into children
    const values = collectValues<number>(sg, sel, 'opacity')
    expect(values.size).toBe(1)
    expect(values.has(1)).toBe(true)
  })

  it('skips invisible children during drill-down', () => {
    const { sg, canvas } = setup()
    const group = sg.createNode('GROUP', canvas.id)
    sg.createNode('RECTANGLE', group.id, { x: 0, y: 0, width: 50, height: 50, cornerRadius: 5 })
    const r2 = sg.createNode('RECTANGLE', group.id, { x: 50, y: 0, width: 50, height: 50, cornerRadius: 10 })
    sg.setNodeField(r2.id, 'visible', false)
    const sel = new Selection([group.id])

    const values = collectValues<number>(sg, sel, 'cornerRadius')
    expect(values.size).toBe(1)
    expect(values.has(5)).toBe(true)
  })

  it('deduplicates object values by deep equality', () => {
    const { sg, canvas } = setup()
    const fill = createPaint({ type: 'SOLID', color: { r: 255, g: 0, b: 0 }, opacity: 1, visible: true })
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 50, height: 50, fills: [fill] })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 50, y: 0, width: 50, height: 50, fills: [fill] })
    const sel = new Selection([r1.id, r2.id])

    // Same fill array content — should deduplicate to 1
    const values = collectValues(sg, sel, 'fills')
    expect(values.size).toBe(1)
  })
})

// ── getSelectionValue ────────────────────────────────────────────────

describe('getSelectionValue', () => {
  it('returns undefined when field does not apply', () => {
    const { sg, canvas } = setup()
    const sel = new Selection([canvas.id])
    expect(getSelectionValue(sg, sel, 'x')).toBeUndefined()
  })

  it('returns value when all same', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id])
    expect(getSelectionValue<number>(sg, sel, 'x')).toBe(10)
  })

  it('returns MIXED when values differ', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 10, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 20, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id])
    expect(getSelectionValue(sg, sel, 'x')).toBe(MIXED)
  })

  it('returns value for single node selection', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 42, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id])
    expect(getSelectionValue<number>(sg, sel, 'x')).toBe(42)
  })
})

// ── clobberValue ─────────────────────────────────────────────────────

describe('clobberValue', () => {
  it('sets field on all selected nodes', () => {
    const { sg, canvas } = setup()
    const r1 = sg.createNode('RECTANGLE', canvas.id, { x: 0, y: 0, width: 50, height: 50 })
    const r2 = sg.createNode('RECTANGLE', canvas.id, { x: 50, y: 0, width: 50, height: 50 })
    const sel = new Selection([r1.id, r2.id])

    clobberValue(sg, sel, 'x', 99)

    expect((sg.getNode(r1.id) as RectangleNode).x).toBe(99)
    expect((sg.getNode(r2.id) as RectangleNode).x).toBe(99)
  })

  it('drills into groups the same way collectValues does', () => {
    const { sg, canvas } = setup()
    const group = sg.createNode('GROUP', canvas.id)
    const r1 = sg.createNode('RECTANGLE', group.id, { x: 0, y: 0, width: 50, height: 50, cornerRadius: 0 })
    const r2 = sg.createNode('RECTANGLE', group.id, { x: 50, y: 0, width: 50, height: 50, cornerRadius: 0 })
    const sel = new Selection([group.id])

    // GROUP doesn't have cornerRadius — should drill into children
    clobberValue(sg, sel, 'cornerRadius', 8)

    expect((sg.getNode(r1.id) as RectangleNode).cornerRadius).toBe(8)
    expect((sg.getNode(r2.id) as RectangleNode).cornerRadius).toBe(8)
  })

  it('skips invisible children during drill-down', () => {
    const { sg, canvas } = setup()
    const group = sg.createNode('GROUP', canvas.id)
    const r1 = sg.createNode('RECTANGLE', group.id, { x: 0, y: 0, width: 50, height: 50, cornerRadius: 0 })
    const r2 = sg.createNode('RECTANGLE', group.id, { x: 50, y: 0, width: 50, height: 50, cornerRadius: 0 })
    sg.setNodeField(r2.id, 'visible', false)
    const sel = new Selection([group.id])

    clobberValue(sg, sel, 'cornerRadius', 8)

    expect((sg.getNode(r1.id) as RectangleNode).cornerRadius).toBe(8)
    // r2 is invisible — should not be modified
    expect((sg.getNode(r2.id) as RectangleNode).cornerRadius).toBe(0)
  })

  it('symmetry: clobber after collect updates exactly the same nodes', () => {
    const { sg, canvas } = setup()
    // GROUP has no opacity — drill-down collects from children
    const group = sg.createNode('GROUP', canvas.id)
    const r1 = sg.createNode('RECTANGLE', group.id, { x: 0, y: 0, width: 50, height: 50, opacity: 0.5 })
    const r2 = sg.createNode('RECTANGLE', group.id, { x: 50, y: 0, width: 50, height: 50, opacity: 0.8 })

    const sel = new Selection([group.id])
    const before = getSelectionValue<number>(sg, sel, 'opacity')
    expect(before).toBe(MIXED) // children have different opacities

    // Clobber sets both children to the same value
    clobberValue(sg, sel, 'opacity', 0.5)
    const after = getSelectionValue<number>(sg, sel, 'opacity')
    expect(after).toBe(0.5) // now all same

    expect((sg.getNode(r1.id) as RectangleNode).opacity).toBe(0.5)
    expect((sg.getNode(r2.id) as RectangleNode).opacity).toBe(0.5)
  })
})
