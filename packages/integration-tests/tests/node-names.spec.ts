/**
 * Integration tests for node naming conventions.
 *
 * New nodes should have sentence case names like "Rectangle 1", not "RECTANGLE 1".
 */

import { test, expect } from './fixtures'

test.describe('Node names', () => {
  test('rectangle has sentence case name', async ({ canvas }) => {
    await canvas.createRectangle(100, 100, 80, 80)
    const nodeId = await canvas.firstNodeId()
    const name = await canvas.nodeName(nodeId)
    expect(name).toMatch(/^Rectangle \d+$/)
  })

  test('frame has sentence case name', async ({ canvas }) => {
    await canvas.createFrame(100, 100, 200, 150)
    const nodeId = await canvas.firstNodeId()
    const name = await canvas.nodeName(nodeId)
    expect(name).toMatch(/^Frame \d+$/)
  })

  test('ellipse has sentence case name', async ({ canvas }) => {
    await canvas.createEllipse(100, 100, 80, 80)
    const nodeId = await canvas.firstNodeId()
    const name = await canvas.nodeName(nodeId)
    expect(name).toMatch(/^Ellipse \d+$/)
  })
})
