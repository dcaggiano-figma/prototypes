/**
 * Integration tests for align button disabled states.
 *
 * In Figma:
 * - Single top-level non-frame node: align buttons disabled
 * - Single top-level frame with children: align children within frame
 * - Multiple selected nodes: align relative to each other (existing behavior)
 */

import { test, expect } from './fixtures'

test.describe('Align button disabled states', () => {
  test('single top-level rectangle has disabled align buttons', async ({ canvas }) => {
    await canvas.createRectangle(100, 100, 80, 80)
    await canvas.page.waitForTimeout(200)

    // The align-left button in the properties panel should be disabled
    const alignLeft = canvas.page.locator('button[aria-label="Align left"]')
    await expect(alignLeft.first()).toBeVisible()
    await expect(alignLeft.first()).toBeDisabled()
  })

  test('single frame with children aligns children on click', async ({ canvas }) => {
    // Create a large frame
    await canvas.createFrame(50, 50, 300, 300)
    const frameId = (await canvas.nodeIds())[0]

    // Create two rectangles inside the frame bounds (auto-reparented)
    await canvas.createRectangle(80, 80, 60, 60)
    await canvas.createRectangle(200, 150, 60, 60)
    await canvas.page.waitForTimeout(200)

    // Get the child IDs (all nodes except the frame)
    const allIds = await canvas.nodeIds()
    const childIds = allIds.filter((id) => id !== frameId)
    expect(childIds).toHaveLength(2)

    // Record children's initial x positions — they should differ
    const child1Before = await canvas.nodeProperties(childIds[0])
    const child2Before = await canvas.nodeProperties(childIds[1])
    expect(child1Before.x).not.toBe(child2Before.x)

    // Select the frame programmatically (clicking center would hit a child)
    await canvas.selectNode(frameId)
    await canvas.page.waitForTimeout(200)

    // Verify the frame has 2 children in the scene graph
    const childCount = await canvas.page.evaluate((fid) => {
      const sg = (window as unknown as Record<string, unknown>).__sceneGraph as {
        getNode: (id: number) => { children?: number[] } | undefined
      }
      const node = sg.getNode(fid)
      return node?.children?.length ?? 0
    }, frameId)
    expect(childCount).toBe(2)

    // Click "Align left" in the properties panel
    const alignLeft = canvas.page.locator('button[aria-label="Align left"]')
    await expect(alignLeft.first()).toBeVisible()
    await expect(alignLeft.first()).toBeEnabled()
    await alignLeft.first().click()
    await canvas.page.waitForTimeout(200)

    // Both children should now have the same x position (the minimum)
    const child1After = await canvas.nodeProperties(childIds[0])
    const child2After = await canvas.nodeProperties(childIds[1])
    expect(child1After.x).toBe(child2After.x)
  })
})
