/**
 * Integration tests for frame default size on single-click.
 *
 * In Figma, clicking with the frame tool (no drag) creates a 100x100 frame.
 */

import { test, expect } from './fixtures'

test.describe('Frame default size', () => {
  test('single-click frame is 100x100', async ({ canvas }) => {
    await canvas.selectTool('f')

    // Single-click (no drag) to create a frame
    const screen = canvas.toScreen(200, 200)
    await canvas.page.mouse.click(screen.x, screen.y)
    await canvas.page.waitForTimeout(300)

    await canvas.waitForNodeCount(1)
    const nodeId = await canvas.firstNodeId()
    const props = await canvas.nodeProperties(nodeId)

    expect(props.width).toBe(100)
    expect(props.height).toBe(100)
  })
})
