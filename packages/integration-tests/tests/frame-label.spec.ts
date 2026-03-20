/**
 * Integration tests for frame label positioning.
 *
 * Frame labels should follow the frame during drag, not snap
 * to the final position on pointerup.
 */

import { test, expect } from './fixtures'

test.describe('Frame label', () => {
  test('label follows frame during drag', async ({ canvas }) => {
    await canvas.createFrame(100, 100, 200, 150)
    await canvas.selectTool('v')

    const nodeId = await canvas.firstNodeId()

    // Get the label element's position before drag
    const labelBefore = await canvas.page.locator(`[data-frame-label="${nodeId}"]`).boundingBox()
    expect(labelBefore).not.toBeNull()

    // Start dragging the frame
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)

    const box = await canvas.nodeBounds(nodeId)
    const sx = box.x + box.width / 2
    const sy = box.y + box.height / 2

    await canvas.page.mouse.move(sx, sy)
    await canvas.page.mouse.down()
    await canvas.page.mouse.move(sx + 100, sy + 80, { steps: 10 })

    // Check label position MID-DRAG (before pointerup)
    const labelDuring = await canvas.page.locator(`[data-frame-label="${nodeId}"]`).boundingBox()
    expect(labelDuring).not.toBeNull()

    // The label should have moved roughly the same distance as the drag
    expect(labelDuring!.x - labelBefore!.x).toBeGreaterThan(50)
    expect(labelDuring!.y - labelBefore!.y).toBeGreaterThan(40)

    await canvas.page.mouse.up()
  })
})
