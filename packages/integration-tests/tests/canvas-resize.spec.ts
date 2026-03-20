/**
 * Integration tests for canvas overlay resizing with viewport changes.
 *
 * The canvas overlay should adjust its size when the browser viewport changes.
 */

import { test, expect } from './fixtures'

test.describe('Canvas overlay resize', () => {
  test('overlay canvas resizes with viewport', async ({ canvas }) => {
    // Create a node and select it to trigger overlay drawing
    await canvas.createRectangle(100, 100, 100, 100)
    await canvas.selectTool('v')
    const [nodeId] = await canvas.nodeIds()
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(200)

    const canvasEl = canvas.page.locator('canvas')
    const initialBox = await canvasEl.boundingBox()
    expect(initialBox).toBeTruthy()

    // Resize the viewport
    await canvas.page.setViewportSize({ width: 1024, height: 600 })
    await canvas.page.waitForTimeout(300)

    const afterBox = await canvasEl.boundingBox()
    expect(afterBox).toBeTruthy()

    // The canvas overlay should have resized
    expect(afterBox!.width).not.toBe(initialBox!.width)
    expect(afterBox!.height).not.toBe(initialBox!.height)
  })
})
