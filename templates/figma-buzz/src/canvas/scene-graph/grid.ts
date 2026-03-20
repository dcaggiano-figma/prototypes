import { createGridHelpers, type DropTarget } from '@prototype/shared/canvas'

export type { DropTarget }

export const SLIDE_WIDTH = 400
export const SLIDE_HEIGHT = 500
export const SLIDE_GAP = 240
export const ROW_GAP = 400

export const grid = createGridHelpers(
  {
    defaultSlideWidth: SLIDE_WIDTH,
    defaultSlideHeight: SLIDE_HEIGHT,
    slideGap: SLIDE_GAP,
    rowGap: ROW_GAP,
    contentTop: 300,
  },
  { slideOverrides: { name: 'Untitled' } },
)

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
