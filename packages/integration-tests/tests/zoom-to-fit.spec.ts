/**
 * Integration tests for zoom-to-fit behavior.
 *
 * Zoom-to-fit (press 1) should center content within the visible canvas
 * area — accounting for sidebar widths — not the full window.
 */

import { test, expect } from './fixtures'

test.describe('Zoom to fit', () => {
  test('centers content between sidebars, not in full window', async ({ canvas }) => {
    // Create a rectangle somewhere on the canvas
    await canvas.createRectangle(50, 50, 200, 150)
    await canvas.deselectAll()

    // Measure sidebar widths by finding the left and right panel boundaries
    const leftSidebar = canvas.page.locator('[data-left-sidebar-panel], [class*="LeftSidebar"] > [class*="panel"]').first()
    const rightPanel = canvas.page.locator('[class*="RightPanel"], [class*="right-panel"]').first()

    // Get the actual visible canvas bounds by checking what's NOT covered by sidebars
    const windowWidth = await canvas.page.evaluate(() => window.innerWidth)

    // The left sidebar rail + panel is roughly 275px, right panel is ~240px
    // We'll detect them from the DOM
    const leftBound = await canvas.page.evaluate(() => {
      // Find the rightmost edge of the left sidebar area
      const main = document.querySelector('main')
      if (!main) return 0
      const rect = main.getBoundingClientRect()
      return rect.left
    })

    const rightBound = await canvas.page.evaluate(() => {
      const main = document.querySelector('main')
      if (!main) return window.innerWidth
      const rect = main.getBoundingClientRect()
      return rect.right
    })

    const visibleCenterX = (leftBound + rightBound) / 2

    // Press 1 to zoom-to-fit
    await canvas.page.keyboard.press('1')
    await canvas.page.waitForTimeout(300)

    // Get the node's screen-space bounding box after zoom-to-fit
    const nodeId = await canvas.firstNodeId()
    const box = await canvas.nodeBounds(nodeId)
    const nodeCenterX = box.x + box.width / 2

    // The node center should be close to the visible center (between sidebars),
    // NOT the window center. With a 1280px window, ~275px left sidebar, ~240px
    // right panel, the visible center is ~(275 + (1280-275-240)/2) = ~657px,
    // while the full window center is 640px. The difference is ~17px.
    //
    // We use a tolerance of 20px because sub-pixel rounding and padding
    // adjustments are expected.
    expect(nodeCenterX).toBeCloseTo(visibleCenterX, -1)

    // Also verify that the node center is NOT at the raw window center
    // (this is what the bug looks like — content centered ignoring sidebars)
    const windowCenterX = windowWidth / 2

    // If sidebars are asymmetric, the visible center should differ from window center
    if (Math.abs(leftBound - (windowWidth - rightBound)) > 30) {
      // Sidebars are asymmetric enough that we can distinguish
      // The node should be closer to the visible center than the window center
      const distToVisible = Math.abs(nodeCenterX - visibleCenterX)
      const distToWindow = Math.abs(nodeCenterX - windowCenterX)
      expect(distToVisible).toBeLessThan(distToWindow)
    }
  })
})
