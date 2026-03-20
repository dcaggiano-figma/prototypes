/**
 * Integration tests for undo/redo.
 *
 * Coordinates are in canvas-logical space — (0,0) is the top-left of
 * the drawing area, past the left sidebar.
 */

import { test, expect } from './fixtures'

test.describe('Undo/redo', () => {
  test('undo creation removes the node', async ({ canvas }) => {
    const before = await canvas.nodeCount()

    await canvas.createRectangle(100, 200, 100, 100)
    expect(await canvas.nodeCount()).toBe(before + 1)

    await canvas.undo()
    expect(await canvas.nodeCount()).toBe(before)
  })

  test('redo after undo restores the node', async ({ canvas }) => {
    const before = await canvas.nodeCount()

    await canvas.createRectangle(100, 200, 100, 100)
    expect(await canvas.nodeCount()).toBe(before + 1)

    await canvas.undo()
    expect(await canvas.nodeCount()).toBe(before)

    await canvas.redo()
    expect(await canvas.nodeCount()).toBe(before + 1)
  })

  test('undo delete restores the node', async ({ canvas }) => {
    await canvas.createRectangle(100, 200, 100, 100)
    const afterCreate = await canvas.nodeCount()

    await canvas.deleteSelected()
    await canvas.page.waitForTimeout(200)
    expect(await canvas.nodeCount()).toBe(afterCreate - 1)

    await canvas.undo()
    expect(await canvas.nodeCount()).toBe(afterCreate)
  })
})
