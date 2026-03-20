/**
 * Integration tests for box (marquee) selection behavior.
 *
 * Box selection should select nodes as soon as the marquee intersects them,
 * not only when fully enclosed.
 */

import { test, expect } from './fixtures'

test.describe('Box selection', () => {
  test.beforeEach(async ({ canvas }) => {
    await canvas.createRectangle(100, 100, 80, 80)
    await canvas.createRectangle(250, 100, 80, 80)
    await canvas.selectTool('v')
  })

  test('drag enclosing both nodes selects both', async ({ canvas }) => {
    await canvas.drag(50, 50, 400, 250)
    await canvas.page.waitForTimeout(200)

    const ids = await canvas.nodeIds()
    expect(await canvas.isNodeSelected(ids[0])).toBe(true)
    expect(await canvas.isNodeSelected(ids[1])).toBe(true)
  })

  test('drag enclosing single node selects only that node', async ({ canvas }) => {
    // Box fully encloses first rect (100,100,80,80) but misses second (250,100,80,80)
    await canvas.drag(80, 80, 200, 200)
    await canvas.page.waitForTimeout(200)

    const ids = await canvas.nodeIds()
    expect(await canvas.isNodeSelected(ids[0])).toBe(true)
    expect(await canvas.isNodeSelected(ids[1])).toBe(false)
  })

  test('partial overlap selects the node', async ({ canvas }) => {
    // Drag a box that only partially overlaps the first rect (100,100,80,80).
    // Box from (50,50) to (110,110) — overlaps top-left corner only.
    await canvas.drag(50, 50, 110, 110)
    await canvas.page.waitForTimeout(200)

    const ids = await canvas.nodeIds()
    expect(await canvas.isNodeSelected(ids[0])).toBe(true)
    expect(await canvas.isNodeSelected(ids[1])).toBe(false)
  })

  test('drag on empty area clears selection', async ({ canvas }) => {
    const [nodeId] = await canvas.nodeIds()
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)
    expect(await canvas.isNodeSelected(nodeId)).toBe(true)

    // Drag in empty space far from nodes
    await canvas.drag(500, 400, 600, 500)
    await canvas.page.waitForTimeout(200)

    expect(await canvas.isNodeSelected(nodeId)).toBe(false)
  })

  test('box select then delete removes selected nodes', async ({ canvas }) => {
    expect(await canvas.nodeCount()).toBe(2)

    const ids = await canvas.nodeIds()
    const boxes = await Promise.all(ids.map((id) => canvas.nodeBounds(id)))
    const minX = Math.min(...boxes.map((b) => b.x)) - 20
    const minY = Math.min(...boxes.map((b) => b.y)) - 20
    const maxX = Math.max(...boxes.map((b) => b.x + b.width)) + 20
    const maxY = Math.max(...boxes.map((b) => b.y + b.height)) + 20

    await canvas.page.mouse.move(minX, minY)
    await canvas.page.mouse.down()
    await canvas.page.mouse.move(maxX, maxY, { steps: 5 })
    await canvas.page.mouse.up()
    await canvas.page.waitForTimeout(200)

    await canvas.deleteSelected()
    await canvas.page.waitForTimeout(200)

    expect(await canvas.nodeCount()).toBe(0)
  })
})
