import type { NodeId } from '../../scene-graph/node-id'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import {
  applyGridDrop,
  createSlideAfterFocused,
  findDropTarget,
  getDropIndicatorX,
  isManagedSlide,
  type DropTarget,
  type GridConfig,
} from './grid-manager'
import {
  getSectionBounds,
  getSectionRowY,
  getSlidePosition,
  recomputeGridLayout,
} from './grid-layout'

export type { DropTarget, GridConfig } from './grid-manager'

export interface GridHelperOptions {
  slideOverrides?: Record<string, unknown>
}

export function createGridHelpers(config: GridConfig, options: GridHelperOptions = {}) {
  return {
    config,

    getSlidePosition(row: number, col: number) {
      return getSlidePosition(row, col, config)
    },

    getSectionBounds(row: number, slideCount: number) {
      return getSectionBounds(row, slideCount, config)
    },

    getSectionRowY(row: number) {
      return getSectionRowY(row, config)
    },

    recomputeGridLayout(sg: SceneGraph, sectionIds: NodeId[]) {
      recomputeGridLayout(sg, sectionIds, config)
    },

    isManagedSlide(sg: SceneGraph, nodeId: NodeId) {
      return isManagedSlide(sg, nodeId)
    },

    findDropTarget(
      sg: SceneGraph,
      canvasId: NodeId,
      worldX: number,
      worldY: number,
      draggedNodeId: NodeId,
    ): DropTarget | null {
      return findDropTarget(sg, canvasId, worldX, worldY, draggedNodeId)
    },

    applyGridDrop(sg: SceneGraph, canvasId: NodeId, nodeId: NodeId, target: DropTarget) {
      applyGridDrop(sg, canvasId, nodeId, target, config)
    },

    getDropIndicatorX(sg: SceneGraph, target: DropTarget): number {
      return getDropIndicatorX(sg, target, config)
    },

    createSlideAfterFocused(sg: SceneGraph, canvasId: NodeId, focusedSlideId: NodeId | null): NodeId | null {
      return createSlideAfterFocused(sg, canvasId, focusedSlideId, config, options.slideOverrides)
    },
  }
}
