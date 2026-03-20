/**
 * Integration tests for shape placement behavior.
 *
 * Tests single-click centering, first-element positioning,
 * and live preview during drag-create.
 */

import { test, expect } from './fixtures'

test.describe('Shape placement', () => {
  test('single-click node is centered under click point', async ({ canvas }) => {
    // Create a first element so the 0,0 logic doesn't apply
    await canvas.createRectangle(100, 100, 80, 80)

    // Read the viewport state before clicking
    const screenX = 200 + 300 // canvas-logical + CANVAS_OFFSET_X
    const screenY = 200 + 60  // canvas-logical + CANVAS_OFFSET_Y
    const worldClick = await canvas.page.evaluate(
      ({ sx, sy }) => {
        const vp = (window as unknown as Record<string, unknown>).__viewport as {
          originX: number; originY: number; scale: number
        }
        return { x: (sx - vp.originX) / vp.scale, y: (sy - vp.originY) / vp.scale }
      },
      { sx: screenX, sy: screenY },
    )

    // Single-click to create the second rectangle
    await canvas.selectTool('r')
    await canvas.click(200, 200)
    await canvas.page.waitForTimeout(300)
    await canvas.waitForNodeCount(2)

    const ids = await canvas.nodeIds()
    const secondId = ids[ids.length - 1]
    const props = await canvas.nodeProperties(secondId)

    // Default rectangle is 100x100. The node center should match the click.
    const centerX = props.x + props.width / 2
    const centerY = props.y + props.height / 2
    expect(Math.abs(centerX - worldClick.x)).toBeLessThan(3)
    expect(Math.abs(centerY - worldClick.y)).toBeLessThan(3)
  })

  test('first element is placed at 0,0', async ({ canvas }) => {
    // Create the first element on the canvas
    await canvas.selectTool('r')
    await canvas.click(200, 200)
    await canvas.page.waitForTimeout(300)
    await canvas.waitForNodeCount(1)

    const nodeId = await canvas.firstNodeId()
    const props = await canvas.nodeProperties(nodeId)

    // First element should always be at 0,0 regardless of where we clicked
    expect(props.x).toBe(0)
    expect(props.y).toBe(0)
  })

  test('first element appears on screen where the user clicked', async ({ canvas }) => {
    const clickX = 200
    const clickY = 200
    const screen = canvas.toScreen(clickX, clickY)

    await canvas.selectTool('r')
    await canvas.page.mouse.click(screen.x, screen.y)
    await canvas.page.waitForTimeout(300)
    await canvas.waitForNodeCount(1)

    // The node's bounding box center should be near the click screen position
    const nodeId = await canvas.firstNodeId()
    const box = await canvas.nodeBounds(nodeId)
    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2

    expect(Math.abs(centerX - screen.x)).toBeLessThan(5)
    expect(Math.abs(centerY - screen.y)).toBeLessThan(5)
  })

  test('node is visible during drag-create', async ({ canvas }) => {
    await canvas.selectTool('r')

    // Start a slow drag to create a shape
    const start = canvas.toScreen(100, 100)
    await canvas.page.mouse.move(start.x, start.y)
    await canvas.page.mouse.down()

    // Move partway through the drag
    await canvas.page.mouse.move(start.x + 80, start.y + 80, { steps: 5 })
    await canvas.page.waitForTimeout(100)

    // The node should exist with non-zero dimensions
    expect(await canvas.nodeCount()).toBe(1)
    const nodeId = await canvas.firstNodeId()
    const props = await canvas.nodeProperties(nodeId)
    expect(props.width).toBeGreaterThan(20)
    expect(props.height).toBeGreaterThan(20)

    // The node should be selected during drag so the overlay draws
    // the selection outline and dimension label.
    expect(await canvas.isNodeSelected(nodeId)).toBe(true)

    // Complete the drag
    await canvas.page.mouse.up()
    await canvas.page.waitForTimeout(200)
  })
})
