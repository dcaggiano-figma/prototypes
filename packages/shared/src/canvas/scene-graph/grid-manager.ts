/**
 * Shared grid manager utilities for canvas-based templates.
 *
 * Provides functions for managing slide grid operations: drag-and-drop,
 * reparenting, and slide creation within grid sections. All functions
 * accept a GridConfig to parameterize layout calculations.
 */

import type { NodeId } from '../../scene-graph/node-id'
import { isGeometryNode } from '../../scene-graph/types'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import { getWorldPosition } from './world-position'
import { getTypeDefaults } from './node-defaults'
import { recomputeGridLayout, type GridConfig } from './grid-layout'

export type { GridConfig } from './grid-layout'

export interface DropTarget {
  sectionId: NodeId
  insertIndex: number
}

/** Node types that act as grid section containers. */
const GRID_SECTION_TYPES = new Set(['SECTION', 'GRID_SECTION'])

function isGridSectionType(type: string): boolean {
  return GRID_SECTION_TYPES.has(type)
}

/** Check if a node is a managed grid slide (SLIDE child of a grid section) */
export function isManagedSlide(sg: SceneGraph, nodeId: NodeId): boolean {
  const node = sg.getNode(nodeId)
  if (!node || node.type !== 'SLIDE') return false
  if (!node.parentId) return false
  const parent = sg.getNode(node.parentId)
  return !!parent && isGridSectionType(parent.type)
}

/** Find the drop target for a dragged slide at the given world position */
export function findDropTarget(
  sg: SceneGraph,
  canvasId: NodeId,
  worldX: number,
  worldY: number,
  draggedNodeId: NodeId,
): DropTarget | null {
  const canvas = sg.getNode(canvasId)
  if (!canvas) return null

  const roots = canvas.children.map((id) => sg.getNode(id)).filter(Boolean)
  const sections = roots.filter((n) => isGridSectionType(n!.type))

  for (const section of sections) {
    if (!section || !isGeometryNode(section)) continue
    const sWorld = getWorldPosition(sg, section)

    // Check if point is within section bounds (with some vertical tolerance)
    if (
      worldY >= sWorld.y - 40
      && worldY <= sWorld.y + section.height + 40
      && worldX >= sWorld.x - 50
      && worldX <= sWorld.x + section.width + 100
    ) {
      // Determine insert index based on X position
      const children = section.children.filter((cid) => cid !== draggedNodeId)
      let insertIndex = children.length

      for (let i = 0; i < children.length; i++) {
        const child = sg.getNode(children[i])
        if (!child || !isGeometryNode(child)) continue
        const childWorld = getWorldPosition(sg, child)
        const childMidX = childWorld.x + child.width / 2

        if (worldX < childMidX) {
          insertIndex = i
          break
        }
      }

      return { sectionId: section.id, insertIndex }
    }
  }

  return null
}

/** Apply a grid drop: reparent the node and recompute layout */
export function applyGridDrop(sg: SceneGraph, canvasId: NodeId, nodeId: NodeId, target: DropTarget, config: GridConfig): void {
  const node = sg.getNode(nodeId)
  if (!node) return

  // Remove from old parent
  if (node.parentId) {
    const oldParent = sg.getNode(node.parentId)
    if (oldParent) {
      // If already in the target section, just reorder
      if (node.parentId === target.sectionId) {
        const currentIndex = oldParent.children.indexOf(nodeId)
        const adjustedIndex = currentIndex < target.insertIndex
          ? target.insertIndex - 1
          : target.insertIndex
        sg.reorderNode(nodeId, adjustedIndex)
      } else {
        sg.reparentNode(nodeId, target.sectionId, target.insertIndex)
      }
    }
  } else {
    sg.reparentNode(nodeId, target.sectionId, target.insertIndex)
  }

  // Recompute grid layout for all sections
  const canvas = sg.getNode(canvasId)
  if (!canvas) return
  const sectionIds = canvas.children
    .map((id) => sg.getNode(id))
    .filter((n) => n && isGridSectionType(n.type))
    .map((n) => n!.id)
  recomputeGridLayout(sg, sectionIds, config)
}

/** Get the world-space X position of a drop indicator */
export function getDropIndicatorX(
  sg: SceneGraph,
  target: DropTarget,
  config: GridConfig,
): number {
  const section = sg.getNode(target.sectionId)
  if (!section || !isGeometryNode(section)) return 0

  const sWorld = getWorldPosition(sg, section)

  if (target.insertIndex === 0) {
    return sWorld.x
  }

  const children = section.children
  if (target.insertIndex >= children.length) {
    const lastChild = sg.getNode(children[children.length - 1])
    if (lastChild && isGeometryNode(lastChild)) {
      const childWorld = getWorldPosition(sg, lastChild)
      return childWorld.x + lastChild.width + config.slideGap / 2
    }
  }

  const childAtIndex = sg.getNode(children[target.insertIndex])
  if (childAtIndex && isGeometryNode(childAtIndex)) {
    const childWorld = getWorldPosition(sg, childAtIndex)
    return childWorld.x - config.slideGap / 2
  }

  return sWorld.x
}

/** Create a new slide after the currently focused slide in the same section */
export function createSlideAfterFocused(
  sg: SceneGraph,
  canvasId: NodeId,
  focusedSlideId: NodeId | null,
  config: GridConfig,
  slideOverrides?: Record<string, unknown>,
): NodeId | null {
  if (!focusedSlideId) {
    // No focused slide — add to first section
    const canvas = sg.getNode(canvasId)
    if (!canvas) return null
    const roots = canvas.children.map((id) => sg.getNode(id)).filter(Boolean)
    const firstSection = roots.find((n) => isGridSectionType(n!.type))
    if (!firstSection) return null

    const newSlide = sg.createNode('SLIDE', firstSection.id, { ...getTypeDefaults('SLIDE'), ...slideOverrides })
    const sectionIds = canvas.children
      .map((id) => sg.getNode(id))
      .filter((n) => n && isGridSectionType(n.type))
      .map((n) => n!.id)
    recomputeGridLayout(sg, sectionIds, config)
    return newSlide.id
  }

  const focusedNode = sg.getNode(focusedSlideId)
  if (!focusedNode || !focusedNode.parentId) return null

  const section = sg.getNode(focusedNode.parentId)
  if (!section || !isGridSectionType(section.type)) return null

  // Find index of focused slide within section
  const idx = section.children.indexOf(focusedSlideId)
  const insertIndex = idx >= 0 ? idx + 1 : section.children.length

  // Create a new slide node at the correct position
  const newSlide = sg.createNodeAt('SLIDE', section.id, insertIndex, { ...getTypeDefaults('SLIDE'), ...slideOverrides })

  // Recompute grid layout for all sections
  const canvas = sg.getNode(canvasId)
  if (!canvas) return null
  const sectionIds = canvas.children
    .map((id) => sg.getNode(id))
    .filter((n) => n && isGridSectionType(n.type))
    .map((n) => n!.id)
  recomputeGridLayout(sg, sectionIds, config)

  return newSlide.id
}
