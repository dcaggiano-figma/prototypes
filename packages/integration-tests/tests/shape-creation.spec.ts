/**
 * Integration tests for shape creation on the figma-design canvas.
 *
 * Coordinates are in canvas-logical space — (0,0) is the top-left of
 * the drawing area, past the left sidebar.
 */

import { test, expect } from './fixtures'

test.describe('Shape creation', () => {
  test('creates a rectangle via drag', async ({ canvas }) => {
    const before = await canvas.nodeCount()

    await canvas.selectTool('r')
    await canvas.dragCreate(100, 200, 200, 150)

    await canvas.waitForNodeCount(before + 1)
  })

  test('creates a frame via drag', async ({ canvas }) => {
    const before = await canvas.nodeCount()

    await canvas.selectTool('f')
    await canvas.dragCreate(100, 100, 300, 200)

    await canvas.waitForNodeCount(before + 1)
  })

  test('creates an ellipse via drag', async ({ canvas }) => {
    const before = await canvas.nodeCount()

    await canvas.selectTool('o')
    await canvas.dragCreate(200, 200, 150, 150)

    await canvas.waitForNodeCount(before + 1)
  })

  test('creates a line via drag', async ({ canvas }) => {
    const before = await canvas.nodeCount()

    await canvas.selectTool('l')
    await canvas.dragCreate(100, 300, 200, 100)

    await canvas.waitForNodeCount(before + 1)
  })

  test('creation tool reverts to move after creating', async ({ canvas }) => {
    await canvas.createRectangle(100, 200, 100, 100)
    const count = await canvas.nodeCount()

    // Clicking empty canvas should NOT create another shape
    await canvas.click(500, 500)
    await canvas.page.waitForTimeout(200)

    expect(await canvas.nodeCount()).toBe(count)
  })

  test('delete removes selected nodes', async ({ canvas }) => {
    await canvas.createRectangle(100, 200, 100, 100)
    const afterCreate = await canvas.nodeCount()

    await canvas.deleteSelected()
    await canvas.page.waitForTimeout(200)

    expect(await canvas.nodeCount()).toBe(afterCreate - 1)
  })
})
