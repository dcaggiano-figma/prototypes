import { createGridHelpers, type DropTarget } from '@prototype/shared/canvas'

export type { DropTarget }

export const SLIDE_WIDTH = 1920
export const SLIDE_HEIGHT = 1080
export const SLIDE_GAP = 300
export const ROW_GAP = 500

export const grid = createGridHelpers({
  defaultSlideWidth: SLIDE_WIDTH,
  defaultSlideHeight: SLIDE_HEIGHT,
  slideGap: SLIDE_GAP,
  rowGap: ROW_GAP,
  contentTop: 400,
})

export const {
  getSlidePosition,
  getSectionBounds,
  getSectionRowY,
  recomputeGridLayout,
  isManagedSlide,
  findDropTarget,
  applyGridDrop,
  getDropIndicatorX,
  createSlideAfterFocused,
} = grid
