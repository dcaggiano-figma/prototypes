import type { SceneGraphStore } from './store';
import { getWorldPosition, isGeometryNode } from './world-position';

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Compute the combined world-space bounding box of all selected nodes */
export function getSelectionBBox(
  store: SceneGraphStore,
  selectedIds: Set<string>,
): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (!node || !isGeometryNode(node)) continue;
    const pos = getWorldPosition(store, node);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + node.width);
    maxY = Math.max(maxY, pos.y + node.height);
  }

  if (!isFinite(minX)) return null;
  return {
    x: minX, y: minY, w: maxX - minX, h: maxY - minY,
  };
}

export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Collect IDs of all selected geometry nodes for dragging */
export function collectDraggableIds(
  store: SceneGraphStore,
  selectedIds: Set<string>,
): string[] {
  const ids: string[] = [];
  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (node && isGeometryNode(node)) ids.push(id);
  }
  return ids;
}
