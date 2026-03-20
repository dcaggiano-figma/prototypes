/**
 * Shared grid layout utilities for canvas-based templates.
 *
 * Templates define their own `GridConfig` (slide sizes, gaps, offsets) and pass
 * it to the shared `recomputeGridLayout` function. Helper functions for
 * computing positions and bounds are also parameterized by config.
 */

import type { NodeId } from '../../scene-graph/node-id'
import { isGeometryNode } from '../../scene-graph/types'
import type { SceneGraph } from '../../scene-graph/scene-graph'

// ── Config ──────────────────────────────────────────────────────────

export interface GridConfig {
  defaultSlideWidth: number
  defaultSlideHeight: number
  slideGap: number
  rowGap: number
  contentTop: number
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Get the local position for a slide at a given row and column index (uses default sizes). */
export function getSlidePosition(_row: number, col: number, config: GridConfig): { x: number; y: number } {
  return {
    x: col * (config.defaultSlideWidth + config.slideGap),
    y: config.contentTop,
  }
}

/** Get the bounding box of a section row (uses default sizes). */
export function getSectionBounds(_row: number, slideCount: number, config: GridConfig): {
  x: number
  y: number
  width: number
  height: number
} {
  const cols = slideCount
  return {
    x: 0,
    y: 0,
    width: cols * config.defaultSlideWidth + Math.max(0, cols - 1) * config.slideGap,
    height: config.contentTop + config.defaultSlideHeight,
  }
}

/** Get the world-space Y offset for a section row (uses default sizes). */
export function getSectionRowY(row: number, config: GridConfig): number {
  const rowHeight = config.contentTop + config.defaultSlideHeight
  return row * (rowHeight + config.rowGap)
}

// ── Grid section type ───────────────────────────────────────────────

/** Node types that act as grid section containers. */
const GRID_SECTION_TYPES = new Set(['SECTION', 'GRID_SECTION'])

function isGridSectionType(type: string): boolean {
  return GRID_SECTION_TYPES.has(type)
}

// ── Layout ──────────────────────────────────────────────────────────

/**
 * Recompute grid layout: repositions all sections and their child slides
 * to maintain the structured grid layout. Uses actual slide sizes so that
 * sections resize to fit their children and rows are consistently spaced.
 *
 * All sections are set to the maximum row width so top borders align.
 */
export function recomputeGridLayout(sg: SceneGraph, sectionIds: NodeId[], config: GridConfig): void {
  // First pass: compute each section's natural width and tallest child
  const sectionData: Array<{
    id: NodeId
    childSizes: Array<{ id: NodeId; width: number; height: number }>
    naturalWidth: number
    maxChildHeight: number
  }> = []

  for (const sectionId of sectionIds) {
    const section = sg.getNode(sectionId)
    if (!section || !isGridSectionType(section.type)) continue

    const childSizes: { id: NodeId; width: number; height: number }[] = []
    for (const childId of section.children) {
      const child = sg.getNode(childId)
      if (!child || !isGeometryNode(child)) continue
      childSizes.push({ id: child.id, width: child.width, height: child.height })
    }

    const maxChildHeight = childSizes.length > 0
      ? Math.max(...childSizes.map((c) => c.height))
      : config.defaultSlideHeight

    // Compute natural width: slides laid out left-to-right
    let cursorX = 0
    for (let col = 0; col < childSizes.length; col++) {
      if (col > 0) cursorX += config.slideGap
      cursorX += childSizes[col].width
    }

    sectionData.push({
      id: sectionId,
      childSizes,
      naturalWidth: cursorX,
      maxChildHeight,
    })
  }

  // Second pass: find the maximum width across all sections
  const maxWidth = sectionData.length > 0
    ? Math.max(...sectionData.map((s) => s.naturalWidth))
    : config.defaultSlideWidth

  // Third pass: position slides and set section bounds
  let cumulativeY = 0
  for (const data of sectionData) {
    // Position each child slide left-to-right
    let cursorX = 0
    for (let col = 0; col < data.childSizes.length; col++) {
      const child = data.childSizes[col]
      if (col > 0) cursorX += config.slideGap

      sg.updateNode(child.id, {
        x: cursorX,
        y: config.contentTop,
      })

      cursorX += child.width
    }

    const sectionHeight = config.contentTop + data.maxChildHeight

    // All sections get the max width so borders align
    sg.updateNode(data.id, {
      x: 0,
      y: cumulativeY,
      width: maxWidth,
      height: sectionHeight,
    })

    cumulativeY += sectionHeight + config.rowGap
  }
}
