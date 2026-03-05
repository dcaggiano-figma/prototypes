import type { SceneGraphStore } from './store';
import { isGeometryNode } from './world-position';

// ── Layout constants ────────────────────────────────────────────────

export const FRAME_WIDTH = 400;
export const FRAME_HEIGHT = 500;
export const FRAME_GAP = 100;
export const ROW_GAP = 200;
export const FRAMES_PER_ROW = 3;

/** Uniform padding inside sections (all sides) */
export const SECTION_PAD = 100;

// ── Helpers ─────────────────────────────────────────────────────────

/** Get the world position for a frame at a given row and column index (uses default sizes) */
export function getFramePosition(_row: number, col: number): { x: number; y: number } {
  return {
    x: SECTION_PAD + col * (FRAME_WIDTH + FRAME_GAP),
    y: SECTION_PAD,
  };
}

/** Get the bounding box of a section row (includes padding around frames, uses default sizes) */
export function getSectionBounds(_row: number, frameCount: number): {
  x: number
  y: number
  width: number
  height: number
} {
  const cols = Math.min(frameCount, FRAMES_PER_ROW);
  return {
    x: 0,
    y: 0,
    width: SECTION_PAD * 2 + cols * FRAME_WIDTH + Math.max(0, cols - 1) * FRAME_GAP,
    height: SECTION_PAD * 2 + FRAME_HEIGHT,
  };
}

/** Get the world-space Y offset for a section row (uses default sizes) */
export function getSectionRowY(row: number): number {
  const rowHeight = SECTION_PAD * 2 + FRAME_HEIGHT;
  return row * (rowHeight + ROW_GAP);
}

/**
 * Recompute grid layout: repositions all sections and their child frames
 * to maintain the structured grid layout. Uses actual frame sizes so that
 * sections resize to fit their children and rows are consistently spaced.
 */
export function recomputeGridLayout(store: SceneGraphStore, sectionIds: string[]): void {
  let cumulativeY = 0;

  for (let row = 0; row < sectionIds.length; row++) {
    const sectionId = sectionIds[row];
    const section = store.getNode(sectionId);
    if (!section || section.type !== 'SECTION') continue;

    // Gather actual child frame sizes
    const childSizes: { id: string; width: number; height: number }[] = [];
    for (const childId of section.children) {
      const child = store.getNode(childId);
      if (!child || !isGeometryNode(child)) continue;
      childSizes.push({ id: child.id, width: child.width, height: child.height });
    }

    // Compute the tallest frame in this section
    const maxChildHeight = childSizes.length > 0
      ? Math.max(...childSizes.map((c) => c.height))
      : FRAME_HEIGHT;

    // Position each child frame: lay out left-to-right using actual widths
    let cursorX = SECTION_PAD;
    for (let col = 0; col < childSizes.length; col++) {
      const child = childSizes[col];
      if (col > 0) cursorX += FRAME_GAP;

      // Align frames to the top of the content area
      store.updateNode(child.id, {
        x: cursorX,
        y: SECTION_PAD,
      });

      cursorX += child.width;
    }

    // Compute section bounds from actual children
    const sectionWidth = cursorX + SECTION_PAD;
    const sectionHeight = SECTION_PAD * 2 + maxChildHeight;

    // Update section position and size
    store.updateNode(sectionId, {
      x: 0,
      y: cumulativeY,
      width: sectionWidth,
      height: sectionHeight,
    });

    // Advance cumulative Y for next row
    cumulativeY += sectionHeight + ROW_GAP;
  }
}
