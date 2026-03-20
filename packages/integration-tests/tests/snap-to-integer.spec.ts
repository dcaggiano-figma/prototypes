/**
 * Integration tests for integer coordinate snapping.
 *
 * Node x, y, width, and height should always be integers after
 * creation and movement operations.
 */

import { test, expect } from './fixtures'

test.describe('Snap to integer coords', () => {
  test('created shape has integer dimensions at non-1x zoom', async ({ canvas }) => {
    // Zoom to 75% so screen-to-world conversion produces fractional values
    await canvas.setZoom(0.75)

    await canvas.createRectangle(100, 100, 80, 80)
    await canvas.selectTool('v')

    const props = await canvas.nodeProperties(await canvas.firstNodeId())
    expect(Number.isInteger(props.x)).toBe(true)
    expect(Number.isInteger(props.y)).toBe(true)
    expect(Number.isInteger(props.width)).toBe(true)
    expect(Number.isInteger(props.height)).toBe(true)
  })

  test('dragged node has integer position at non-1x zoom', async ({ canvas }) => {
    await canvas.createRectangle(100, 100, 80, 80)
    await canvas.selectTool('v')

    // Zoom to 75% before dragging
    await canvas.setZoom(0.75)

    const nodeId = await canvas.firstNodeId()
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)

    // Drag by an odd amount at non-1x zoom — world delta will be fractional
    await canvas.dragNode(nodeId, { x: 73, y: 37 })
    await canvas.page.waitForTimeout(200)

    const props = await canvas.nodeProperties(nodeId)
    expect(Number.isInteger(props.x)).toBe(true)
    expect(Number.isInteger(props.y)).toBe(true)
  })

  test('slow drag at high zoom still moves the node', async ({ canvas }) => {
    // Zoom to 400% BEFORE creating the shape so it stays on-screen
    await canvas.setZoom(4)

    await canvas.createRectangle(100, 100, 80, 80)
    await canvas.selectTool('v')

    const nodeId = await canvas.firstNodeId()
    const before = await canvas.nodeProperties(nodeId)

    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)

    // Drag by 10 screen pixels in many small steps (simulates slow drag).
    // At 4x zoom, 1 screen pixel = 0.25 world pixels,
    // so 10 screen px = 2.5 world px → should round to 2 or 3.
    await canvas.dragNode(nodeId, { x: 10, y: 10 })
    await canvas.page.waitForTimeout(200)

    const after = await canvas.nodeProperties(nodeId)

    // The key assertion: the node actually moved (not stuck at 0 delta)
    expect(after.x).not.toBe(before.x)
    expect(after.y).not.toBe(before.y)
  })

  test('created shape has integer dimensions at 1x zoom', async ({ canvas }) => {
    await canvas.createRectangle(100, 100, 80, 80)
    await canvas.selectTool('v')

    const props = await canvas.nodeProperties(await canvas.firstNodeId())
    expect(Number.isInteger(props.x)).toBe(true)
    expect(Number.isInteger(props.y)).toBe(true)
    expect(Number.isInteger(props.width)).toBe(true)
    expect(Number.isInteger(props.height)).toBe(true)
  })
})
