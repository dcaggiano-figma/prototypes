import type { SceneGraphStore } from './store';
import { isGeometryNode } from './world-position';

// ── Layout constants ────────────────────────────────────────────────

export const SLIDE_WIDTH = 400;
export const SLIDE_HEIGHT = 500;
export const SLIDE_GAP = 100;
export const ROW_GAP = 200;

/** Vertical offset from section top to slide content area */
const CONTENT_TOP = 40;

// ── Helpers ─────────────────────────────────────────────────────────

/** Get the local position for a slide at a given row and column index (uses default sizes) */
export function getSlidePosition(_row: number, col: number): { x: number; y: number } {
  return {
    x: col * (SLIDE_WIDTH + SLIDE_GAP),
    y: CONTENT_TOP,
  };
}

/** Get the bounding box of a section row (uses default sizes) */
export function getSectionBounds(_row: number, slideCount: number): {
  x: number
  y: number
  width: number
  height: number
} {
  const cols = slideCount;
  return {
    x: 0,
    y: 0,
    width: cols * SLIDE_WIDTH + Math.max(0, cols - 1) * SLIDE_GAP,
    height: CONTENT_TOP + SLIDE_HEIGHT,
  };
}

/** Get the world-space Y offset for a section row (uses default sizes) */
export function getSectionRowY(row: number): number {
  const rowHeight = CONTENT_TOP + SLIDE_HEIGHT;
  return row * (rowHeight + ROW_GAP);
}

/**
 * Recompute grid layout: repositions all sections and their child slides
 * to maintain the structured grid layout. Uses actual slide sizes so that
 * sections resize to fit their children and rows are consistently spaced.
 *
 * All sections are set to the maximum row width so top borders align.
 */
export function recomputeGridLayout(store: SceneGraphStore, sectionIds: string[]): void {
  // First pass: compute each section's natural width and tallest child
  const sectionData: Array<{
    id: string
    childSizes: Array<{ id: string; width: number; height: number }>
    naturalWidth: number
    maxChildHeight: number
  }> = [];

  for (const sectionId of sectionIds) {
    const section = store.getNode(sectionId);
    if (!section || section.type !== 'SECTION') continue;

    const childSizes: { id: string; width: number; height: number }[] = [];
    for (const childId of section.children) {
      const child = store.getNode(childId);
      if (!child || !isGeometryNode(child)) continue;
      childSizes.push({ id: child.id, width: child.width, height: child.height });
    }

    const maxChildHeight = childSizes.length > 0
      ? Math.max(...childSizes.map((c) => c.height))
      : SLIDE_HEIGHT;

    // Compute natural width: slides laid out left-to-right
    let cursorX = 0;
    for (let col = 0; col < childSizes.length; col++) {
      if (col > 0) cursorX += SLIDE_GAP;
      cursorX += childSizes[col].width;
    }

    sectionData.push({
      id: sectionId,
      childSizes,
      naturalWidth: cursorX,
      maxChildHeight,
    });
  }

  // Second pass: find the maximum width across all sections
  const maxWidth = sectionData.length > 0
    ? Math.max(...sectionData.map((s) => s.naturalWidth))
    : SLIDE_WIDTH;

  // Third pass: position slides and set section bounds
  let cumulativeY = 0;
  for (const data of sectionData) {
    // Position each child slide left-to-right
    let cursorX = 0;
    for (let col = 0; col < data.childSizes.length; col++) {
      const child = data.childSizes[col];
      if (col > 0) cursorX += SLIDE_GAP;

      store.updateNode(child.id, {
        x: cursorX,
        y: CONTENT_TOP,
      });

      cursorX += child.width;
    }

    const sectionHeight = CONTENT_TOP + data.maxChildHeight;

    // All sections get the max width so borders align
    store.updateNode(data.id, {
      x: 0,
      y: cumulativeY,
      width: maxWidth,
      height: sectionHeight,
    });

    cumulativeY += sectionHeight + ROW_GAP;
  }
}
