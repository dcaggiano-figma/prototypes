import { describe, it, expect, beforeEach } from 'vitest'

import { SceneGraph } from './scene-graph'
import { Selection } from './selection'
import type { NodeId } from './node-id'
import type { Paint } from './types'
import { createPaint } from './types'
import {
  collectSelectionPaints,
  updateSelectionPaint,
  addSelectionPaint,
  removeSelectionPaint,
} from './selection-paints'

// ── Helpers ──────────────────────────────────────────────────────────

function makePaint(r: number, g: number, b: number, opacity = 1, visible = true): Paint {
  return createPaint({ type: 'SOLID', color: { r, g, b }, opacity, visible })
}

const red = makePaint(255, 0, 0)
const green = makePaint(0, 255, 0)
const blue = makePaint(0, 0, 255)
const halfRed = makePaint(255, 0, 0, 0.5)

let sg: SceneGraph
let canvasId: NodeId

function createRect(fills: Paint[]): NodeId {
  const node = sg.createNode('RECTANGLE', canvasId, {
    x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1,
    cornerRadius: 0, fills, strokes: [], strokeWeight: 1, strokeAlign: 'CENTER', effects: [],
  })
  return node.id
}

function createGroup(children: NodeId[]): NodeId {
  const group = sg.createNode('GROUP', canvasId)
  for (const childId of children) {
    const index = sg.getNodeOrThrow(group.id).children.length
    sg.reparentNode(childId, group.id, index)
  }
  return group.id
}

beforeEach(() => {
  sg = new SceneGraph()
  const canvas = sg.createCanvas('Page 1')
  canvasId = canvas.id
})

// ── collectSelectionPaints ───────────────────────────────────────────

describe('collectSelectionPaints', () => {
  it('returns empty for empty selection', () => {
    const result = collectSelectionPaints(sg, Selection.EMPTY, 'fills')
    expect(result).toEqual([])
  })

  it('collects paints from a single node', () => {
    const id = createRect([red, green])
    const sel = new Selection([id])
    const result = collectSelectionPaints(sg, sel, 'fills')

    expect(result).toHaveLength(2)
    expect(result[0].paint).toEqual(red)
    expect(result[0].locations).toEqual([{ nodeId: id, field: 'fills', index: 0 }])
    expect(result[1].paint).toEqual(green)
    expect(result[1].locations).toEqual([{ nodeId: id, field: 'fills', index: 1 }])
  })

  it('deduplicates identical paints across nodes', () => {
    const id1 = createRect([red])
    const id2 = createRect([red])
    const sel = new Selection([id1, id2])
    const result = collectSelectionPaints(sg, sel, 'fills')

    expect(result).toHaveLength(1)
    expect(result[0].paint).toEqual(red)
    expect(result[0].locations).toHaveLength(2)
    expect(result[0].locations[0].nodeId).toBe(id1)
    expect(result[0].locations[1].nodeId).toBe(id2)
  })

  it('keeps different paints separate', () => {
    const id1 = createRect([red])
    const id2 = createRect([green])
    const sel = new Selection([id1, id2])
    const result = collectSelectionPaints(sg, sel, 'fills')

    expect(result).toHaveLength(2)
    expect(result[0].paint).toEqual(red)
    expect(result[1].paint).toEqual(green)
  })

  it('treats different opacity as different paints', () => {
    const id1 = createRect([red])
    const id2 = createRect([halfRed])
    const sel = new Selection([id1, id2])
    const result = collectSelectionPaints(sg, sel, 'fills')

    expect(result).toHaveLength(2)
  })

  it('drills down through groups', () => {
    const rectId = createRect([blue])
    const groupId = createGroup([rectId])
    const sel = new Selection([groupId])
    const result = collectSelectionPaints(sg, sel, 'fills')

    expect(result).toHaveLength(1)
    expect(result[0].paint).toEqual(blue)
    expect(result[0].locations[0].nodeId).toBe(rectId)
  })

  it('skips invisible children during group drill-down', () => {
    const visibleId = createRect([red])
    const hiddenId = createRect([green])
    sg.setNodeField(hiddenId, 'visible', false)
    const groupId = createGroup([visibleId, hiddenId])
    const sel = new Selection([groupId])
    const result = collectSelectionPaints(sg, sel, 'fills')

    expect(result).toHaveLength(1)
    expect(result[0].paint).toEqual(red)
  })

  it('returns empty for nodes without fills (e.g., empty group)', () => {
    const groupId = createGroup([])
    const sel = new Selection([groupId])
    const result = collectSelectionPaints(sg, sel, 'fills')

    expect(result).toEqual([])
  })

  it('collects from multiple paints on multiple nodes', () => {
    const id1 = createRect([red, green])
    const id2 = createRect([green, blue])
    const sel = new Selection([id1, id2])
    const result = collectSelectionPaints(sg, sel, 'fills')

    // red (from id1:0), green (from id1:1 + id2:0), blue (from id2:1)
    expect(result).toHaveLength(3)
    expect(result[0].paint).toEqual(red)
    expect(result[0].locations).toHaveLength(1)
    expect(result[1].paint).toEqual(green)
    expect(result[1].locations).toHaveLength(2)
    expect(result[2].paint).toEqual(blue)
    expect(result[2].locations).toHaveLength(1)
  })
})

// ── updateSelectionPaint ─────────────────────────────────────────────

describe('updateSelectionPaint', () => {
  it('replaces a paint at all locations', () => {
    const id1 = createRect([red])
    const id2 = createRect([red])
    const sel = new Selection([id1, id2])
    const paints = collectSelectionPaints(sg, sel, 'fills')

    updateSelectionPaint(sg, paints[0].locations, blue)

    const node1 = sg.getNode(id1)!
    const node2 = sg.getNode(id2)!
    expect((node1 as { fills: Paint[] }).fills[0]).toEqual(blue)
    expect((node2 as { fills: Paint[] }).fills[0]).toEqual(blue)
  })

  it('only replaces at the specified index', () => {
    const id = createRect([red, green])
    const sel = new Selection([id])
    const paints = collectSelectionPaints(sg, sel, 'fills')

    // Update only green (index 1)
    updateSelectionPaint(sg, paints[1].locations, blue)

    const node = sg.getNode(id)!
    const fills = (node as { fills: Paint[] }).fills
    expect(fills[0]).toEqual(red)
    expect(fills[1]).toEqual(blue)
  })
})

// ── addSelectionPaint ────────────────────────────────────────────────

describe('addSelectionPaint', () => {
  it('appends a paint to all applicable nodes', () => {
    const id1 = createRect([red])
    const id2 = createRect([green])
    const sel = new Selection([id1, id2])

    addSelectionPaint(sg, sel, 'fills', blue)

    const fills1 = (sg.getNode(id1)! as { fills: Paint[] }).fills
    const fills2 = (sg.getNode(id2)! as { fills: Paint[] }).fills
    expect(fills1).toHaveLength(2)
    expect(fills1[1]).toEqual(blue)
    expect(fills2).toHaveLength(2)
    expect(fills2[1]).toEqual(blue)
  })

  it('drills through groups to find applicable nodes', () => {
    const rectId = createRect([red])
    const groupId = createGroup([rectId])
    const sel = new Selection([groupId])

    addSelectionPaint(sg, sel, 'fills', green)

    const fills = (sg.getNode(rectId)! as { fills: Paint[] }).fills
    expect(fills).toHaveLength(2)
    expect(fills[1]).toEqual(green)
  })
})

// ── removeSelectionPaint ─────────────────────────────────────────────

describe('removeSelectionPaint', () => {
  it('removes a paint from all locations', () => {
    const id1 = createRect([red, green])
    const id2 = createRect([red, blue])
    const sel = new Selection([id1, id2])
    const paints = collectSelectionPaints(sg, sel, 'fills')

    // Remove red (appears at index 0 in both nodes)
    removeSelectionPaint(sg, paints[0].locations)

    const fills1 = (sg.getNode(id1)! as { fills: Paint[] }).fills
    const fills2 = (sg.getNode(id2)! as { fills: Paint[] }).fills
    expect(fills1).toHaveLength(1)
    expect(fills1[0]).toEqual(green)
    expect(fills2).toHaveLength(1)
    expect(fills2[0]).toEqual(blue)
  })

  it('handles removing the only paint', () => {
    const id = createRect([red])
    const sel = new Selection([id])
    const paints = collectSelectionPaints(sg, sel, 'fills')

    removeSelectionPaint(sg, paints[0].locations)

    const fills = (sg.getNode(id)! as { fills: Paint[] }).fills
    expect(fills).toHaveLength(0)
  })

  it('handles removing a paint that appears at different indices', () => {
    const id = createRect([red, green, red])
    const sel = new Selection([id])
    const paints = collectSelectionPaints(sg, sel, 'fills')

    // red is deduplicated — has locations at index 0 and index 2
    const redPaint = paints.find((p) => JSON.stringify(p.paint) === JSON.stringify(red))!
    expect(redPaint.locations).toHaveLength(2)

    removeSelectionPaint(sg, redPaint.locations)

    const fills = (sg.getNode(id)! as { fills: Paint[] }).fills
    expect(fills).toHaveLength(1)
    expect(fills[0]).toEqual(green)
  })
})
