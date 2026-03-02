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

/** Find the topmost geometry node containing a world-space point (skip sections) */
export function findNodeAtWorldPoint(
  store: SceneGraphStore,
  wx: number,
  wy: number,
): string | undefined {
  const roots = store.getRootNodes();
  // Iterate in reverse so later (topmost) nodes win
  for (let i = roots.length - 1; i >= 0; i--) {
    const node = roots[i];
    if (!isGeometryNode(node)) continue;
    if (node.type === 'SECTION') continue;
    const pos = getWorldPosition(store, node);
    if (pointInRect(wx, wy, { x: pos.x, y: pos.y, w: node.width, h: node.height })) {
      return node.id;
    }
  }
  return undefined;
}

/** Find the topmost geometry node within a padded safe zone of a world-space point */
export function findNodeNearWorldPoint(
  store: SceneGraphStore,
  wx: number,
  wy: number,
  padding: number,
): string | undefined {
  const roots = store.getRootNodes();
  for (let i = roots.length - 1; i >= 0; i--) {
    const node = roots[i];
    if (!isGeometryNode(node)) continue;
    if (node.type === 'SECTION') continue;
    if (node.type === 'CONNECTOR' || node.type === 'LINE' || node.type === 'VECTOR') continue;
    const pos = getWorldPosition(store, node);
    if (pointInRect(wx, wy, {
      x: pos.x - padding,
      y: pos.y - padding,
      w: node.width + padding * 2,
      h: node.height + padding * 2,
    })) {
      return node.id;
    }
  }
  return undefined;
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
