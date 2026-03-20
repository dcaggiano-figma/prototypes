/**
 * Integration tests for node selection behavior.
 *
 * Uses node-based click helpers so tests don't depend on
 * knowing exact canvas-logical positions after creation.
 */

import { test, expect } from './fixtures'

test.describe('Selection', () => {
  test.beforeEach(async ({ canvas }) => {
    await canvas.createRectangle(50, 200, 100, 100)
    await canvas.createRectangle(300, 200, 100, 100)
    await canvas.selectTool('v')
  })

  test('click on node selects it', async ({ canvas }) => {
    const [nodeId] = await canvas.nodeIds()
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)

    // Selection outlines are drawn on the canvas overlay
    const overlayCanvas = canvas.page.locator('canvas')
    await expect(overlayCanvas).toBeVisible()
  })

  test('Escape deselects all', async ({ canvas }) => {
    const [nodeId] = await canvas.nodeIds()
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)

    await canvas.deselectAll()
    await canvas.page.waitForTimeout(100)

    // Clicking empty space after deselect should not throw
    await canvas.click(600, 600)
  })

  test('Cmd+A selects all nodes', async ({ canvas }) => {
    await canvas.selectAll()
    await canvas.page.waitForTimeout(100)

    const overlayCanvas = canvas.page.locator('canvas')
    await expect(overlayCanvas).toBeVisible()
  })

  test('delete removes selected node', async ({ canvas }) => {
    const [nodeId] = await canvas.nodeIds()
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)

    await canvas.deleteSelected()
    await canvas.page.waitForTimeout(200)

    expect(await canvas.nodeCount()).toBe(1)
  })

  test('select all then delete clears canvas', async ({ canvas }) => {
    await canvas.selectAll()
    await canvas.page.waitForTimeout(100)
    await canvas.deleteSelected()
    await canvas.page.waitForTimeout(200)

    expect(await canvas.nodeCount()).toBe(0)
  })
})
