/**
 * Shared Playwright fixtures for figma-design integration tests.
 *
 * Provides a `canvas` helper object with common canvas operations:
 * creating shapes, selecting nodes, dragging, and reading state.
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test'

/**
 * The left sidebar is ~275px wide. All canvas coordinates should be
 * offset by this amount to ensure interactions land on the canvas,
 * not the sidebar.
 */
const CANVAS_OFFSET_X = 300
const CANVAS_OFFSET_Y = 60

// ── Canvas helper ─────────────────────────────────────────────────────

export class CanvasHelper {
  readonly page: Page
  readonly container: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.locator('.fixed.inset-0.overflow-hidden')
  }

  /** Navigate to the app and wait for the canvas to be ready. */
  async goto() {
    await this.page.goto('/')
    await this.container.waitFor({ state: 'visible' })
  }

  /** Press a keyboard shortcut to switch tools. */
  async selectTool(key: string) {
    await this.page.keyboard.press(key)
    await this.page.waitForTimeout(100)
  }

  /**
   * Convert canvas-logical coordinates to screen coordinates.
   * Canvas (0,0) maps to the top-left of the actual drawing area
   * (past the left sidebar and toolbar).
   */
  toScreen(x: number, y: number) {
    return { x: x + CANVAS_OFFSET_X, y: y + CANVAS_OFFSET_Y }
  }

  /**
   * Click-drag on the canvas to create a shape.
   * Coordinates are in canvas-logical space (0,0 = top-left of drawing area).
   */
  async dragCreate(x: number, y: number, width: number, height: number) {
    const start = this.toScreen(x, y)

    await this.page.mouse.move(start.x, start.y)
    await this.page.mouse.down()
    await this.page.mouse.move(start.x + width, start.y + height, { steps: 5 })
    await this.page.mouse.up()

    // Wait for shape creation + tool revert to propagate
    await this.page.waitForTimeout(150)
  }

  /** Click at a position in canvas-logical space. */
  async click(x: number, y: number) {
    const screen = this.toScreen(x, y)
    await this.page.mouse.click(screen.x, screen.y)
  }

  /** Drag from one canvas-logical position to another. */
  async drag(fromX: number, fromY: number, toX: number, toY: number) {
    const start = this.toScreen(fromX, fromY)
    const end = this.toScreen(toX, toY)

    await this.page.mouse.move(start.x, start.y)
    await this.page.mouse.down()
    await this.page.mouse.move(end.x, end.y, { steps: 10 })
    await this.page.mouse.up()
  }

  /** Get all node elements currently in the DOM. */
  nodeElements() {
    return this.page.locator('[data-node-id]')
  }

  /**
   * Get the first DOM element for a node (by ID).
   * Nodes may have multiple elements (e.g. frame + title label),
   * so this returns the first match which is the primary element.
   */
  nodeElement(nodeId: number) {
    return this.page.locator(`[data-node-id="${nodeId}"]`).first()
  }

  /**
   * Get a node's bounding box in screen coordinates.
   * Returns `{ x, y, width, height }` or throws if the node isn't found.
   */
  async nodeBounds(nodeId: number) {
    const box = await this.nodeElement(nodeId).boundingBox()
    if (!box) throw new Error(`Node ${nodeId} has no bounding box`)
    return box
  }

  /**
   * Click on a node's center, with an optional pixel offset.
   * Much more reliable than guessing canvas-logical coordinates.
   */
  async clickNode(nodeId: number, offset?: { x?: number; y?: number }) {
    const box = await this.nodeBounds(nodeId)
    const cx = box.x + box.width / 2 + (offset?.x ?? 0)
    const cy = box.y + box.height / 2 + (offset?.y ?? 0)
    await this.page.mouse.click(cx, cy)
  }

  /**
   * Drag a node from its center (+ optional offset) by a given delta.
   * Clicks on the node first to select, then drags.
   */
  async dragNode(
    nodeId: number,
    delta: { x: number; y: number },
    offset?: { x?: number; y?: number },
  ) {
    const box = await this.nodeBounds(nodeId)
    const sx = box.x + box.width / 2 + (offset?.x ?? 0)
    const sy = box.y + box.height / 2 + (offset?.y ?? 0)

    await this.page.mouse.move(sx, sy)
    await this.page.mouse.down()
    await this.page.mouse.move(sx + delta.x, sy + delta.y, { steps: 10 })
    await this.page.mouse.up()
  }

  /** Get all unique node IDs currently in the DOM. */
  async nodeIds(): Promise<number[]> {
    const ids = await this.page.$$eval('[data-node-id]', (els) => {
      const seen = new Set<number>()
      for (const el of els) {
        const id = Number((el as HTMLElement).dataset.nodeId)
        if (!isNaN(id)) seen.add(id)
      }
      return [...seen]
    })
    return ids
  }

  /** Get the number of unique nodes on the canvas. */
  async nodeCount(): Promise<number> {
    return (await this.nodeIds()).length
  }

  /**
   * Create a rectangle at the given canvas-logical position.
   * Handles tool selection and waits for the node to appear.
   */
  async createRectangle(x: number, y: number, width: number, height: number) {
    const before = await this.nodeCount()
    await this.selectTool('r')
    await this.dragCreate(x, y, width, height)
    await this.waitForNodeCount(before + 1)
  }

  /** Create a frame at the given canvas-logical position. */
  async createFrame(x: number, y: number, width: number, height: number) {
    const before = await this.nodeCount()
    await this.selectTool('f')
    await this.dragCreate(x, y, width, height)
    await this.waitForNodeCount(before + 1)
  }

  /** Create an ellipse at the given canvas-logical position. */
  async createEllipse(x: number, y: number, width: number, height: number) {
    const before = await this.nodeCount()
    await this.selectTool('o')
    await this.dragCreate(x, y, width, height)
    await this.waitForNodeCount(before + 1)
  }

  /** Wait for a specific number of unique nodes to exist. */
  async waitForNodeCount(count: number) {
    await expect
      .poll(() => this.nodeCount(), { timeout: 5000, message: `Expected ${count} nodes` })
      .toBe(count)
  }

  /** Get the first node ID. Throws if no nodes exist. */
  async firstNodeId(): Promise<number> {
    const ids = await this.nodeIds()
    if (ids.length === 0) throw new Error('No nodes on canvas')
    return ids[0]
  }

  /**
   * Read a node's scene graph properties (x, y, width, height) via the app's
   * internal state. Evaluates in the page context to access the React fiber.
   */
  async nodeProperties(nodeId: number): Promise<{ x: number; y: number; width: number; height: number }> {
    return this.page.evaluate((id) => {
      const sg = (window as unknown as Record<string, unknown>).__sceneGraph as {
        getNode: (id: number) => { x: number; y: number; width: number; height: number } | undefined
      } | undefined
      if (!sg) throw new Error('Scene graph not exposed on window.__sceneGraph')
      const node = sg.getNode(id)
      if (!node) throw new Error(`Node ${id} not found`)
      return { x: node.x, y: node.y, width: node.width, height: node.height }
    }, nodeId)
  }

  /** Read a node's name from the scene graph. */
  async nodeName(nodeId: number): Promise<string> {
    return this.page.evaluate((id) => {
      const sg = (window as unknown as Record<string, unknown>).__sceneGraph as {
        getNode: (id: number) => { name: string } | undefined
      } | undefined
      if (!sg) throw new Error('Scene graph not exposed on window.__sceneGraph')
      const node = sg.getNode(id)
      if (!node) throw new Error(`Node ${id} not found`)
      return node.name
    }, nodeId)
  }

  /**
   * Set the viewport zoom level via the app's internal viewport.
   * Keeps the center of the viewport fixed.
   */
  async setZoom(scale: number) {
    await this.page.evaluate((s) => {
      const vp = (window as unknown as Record<string, unknown>).__viewport as {
        set: (ox: number, oy: number, scale: number) => void
        originX: number
        originY: number
        scale: number
      } | undefined
      if (!vp) throw new Error('Viewport not exposed on window.__viewport')
      // Keep the viewport center fixed while changing zoom
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const ratio = s / vp.scale
      const newOx = cx - (cx - vp.originX) * ratio
      const newOy = cy - (cy - vp.originY) * ratio
      vp.set(newOx, newOy, s)
    }, scale)
    await this.page.waitForTimeout(100)
  }

  /** Check if a node is currently selected via the scene graph. */
  async isNodeSelected(nodeId: number): Promise<boolean> {
    return this.page.evaluate((id) => {
      const sg = (window as unknown as Record<string, unknown>).__sceneGraph as {
        getCanvases: () => Array<{ selection?: { isDirectlySelected: (id: number) => boolean } }>
      } | undefined
      if (!sg) return false
      const canvases = sg.getCanvases()
      if (canvases.length === 0) return false
      return canvases[0].selection?.isDirectlySelected(id) ?? false
    }, nodeId)
  }

  /**
   * Select a node by ID via the scene graph (bypasses pointer hit-testing).
   * Useful when clicking would hit overlapping children.
   */
  async selectNode(nodeId: number) {
    await this.page.evaluate((id) => {
      const sg = (window as unknown as Record<string, unknown>).__sceneGraph as {
        getCanvases: () => Array<{ id: number; selection?: { withSelected: (ids: number[], sg: unknown) => unknown } }>
        setNodeField: (nodeId: number, field: string, value: unknown) => void
      } | undefined
      if (!sg) throw new Error('Scene graph not exposed on window.__sceneGraph')
      const canvases = sg.getCanvases()
      if (canvases.length === 0) throw new Error('No canvases found')
      const canvas = canvases[0]
      if (!canvas.selection) throw new Error('Canvas has no selection')
      const newSel = canvas.selection.withSelected([id], sg)
      sg.setNodeField(canvas.id, 'selection', newSel)
    }, nodeId)
    await this.page.waitForTimeout(100)
  }

  /** Press Escape to deselect all. */
  async deselectAll() {
    await this.page.keyboard.press('Escape')
  }

  /** Select all (Ctrl+A — works cross-platform in Playwright Chromium). */
  async selectAll() {
    await this.page.keyboard.press('Control+a')
  }

  /** Delete selected nodes. */
  async deleteSelected() {
    await this.page.keyboard.press('Backspace')
  }

  /** Undo (Ctrl+Z — works cross-platform in Playwright Chromium). */
  async undo() {
    await this.page.keyboard.press('Control+z')
    await this.page.waitForTimeout(200)
  }

  /** Redo (Ctrl+Shift+Z — works cross-platform in Playwright Chromium). */
  async redo() {
    await this.page.keyboard.press('Control+Shift+z')
    await this.page.waitForTimeout(200)
  }
}

// ── Test fixture ──────────────────────────────────────────────────────

interface CanvasFixtures {
  canvas: CanvasHelper
}

export const test = base.extend<CanvasFixtures>({
  canvas: async ({ page }, use) => {
    const canvas = new CanvasHelper(page)
    await canvas.goto()
    await use(canvas)
  },
})

export { expect } from '@playwright/test'
