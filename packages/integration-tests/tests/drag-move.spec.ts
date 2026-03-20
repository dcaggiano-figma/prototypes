/**
 * Integration tests for node drag-move behavior.
 *
 * Uses node-based click/drag helpers so tests don't depend on
 * knowing exact canvas-logical positions after creation.
 */

import { test, expect } from './fixtures'

test.describe('Drag move', () => {
  test('drag moves a node', async ({ canvas }) => {
    await canvas.createRectangle(100, 200, 100, 100)
    await canvas.selectTool('v')

    const [nodeId] = await canvas.nodeIds()
    const initialBox = await canvas.nodeBounds(nodeId)

    // Click to select, then drag 100px right and 50px down
    await canvas.clickNode(nodeId)
    await canvas.page.waitForTimeout(100)
    await canvas.dragNode(nodeId, { x: 100, y: 50 })
    await canvas.page.waitForTimeout(200)

    const afterBox = await canvas.nodeBounds(nodeId)
    expect(afterBox.x - initialBox.x).toBeGreaterThan(50)
    expect(afterBox.y - initialBox.y).toBeGreaterThan(25)
  })

  test('drag does not move unselected nodes', async ({ canvas }) => {
    await canvas.createRectangle(50, 200, 80, 80)
    await canvas.createRectangle(300, 200, 80, 80)
    await canvas.selectTool('v')

    const [firstId, secondId] = await canvas.nodeIds()
    const initialBox = await canvas.nodeBounds(secondId)

    // Select and drag only the first node
    await canvas.clickNode(firstId)
    await canvas.page.waitForTimeout(100)
    await canvas.dragNode(firstId, { x: 100, y: 100 })
    await canvas.page.waitForTimeout(200)

    // Second node should not have moved
    const afterBox = await canvas.nodeBounds(secondId)
    expect(Math.abs(afterBox.x - initialBox.x)).toBeLessThan(2)
    expect(Math.abs(afterBox.y - initialBox.y)).toBeLessThan(2)
  })
})
