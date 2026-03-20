// Behavior system — composable pointer interaction handlers for the canvas.

export type {
  CanvasPointerEvent,
  Behavior,
  BehaviorContext,
} from './types'
export * from './behavior-manager'
export * from './hit-testing'
export * from './pan-behavior'
export * from './hover-behavior'
export * from './click-select-behavior'
export * from './drag-move-behavior'
export * from './box-select-behavior'
export * from './move-tool-behavior'
export * from './grid-drag-behavior'
export * from './shape-creation-behavior'
export * from './pencil-behavior'
export * from './text-tool-behavior'
export * from './connector-behavior'
export * from './standard-behavior-chain'
export type { CommentPlacement } from './comment-behavior'
export { createCommentBehavior } from './comment-behavior'
export * from './use-behavior-manager'
