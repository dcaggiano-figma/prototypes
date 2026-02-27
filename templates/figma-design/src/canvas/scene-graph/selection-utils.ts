import type { SceneGraphStore } from './store';
import { getWorldPosition, isGeometryNode } from './world-position';

export interface ScreenRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Compute the combined screen-space bounding box of all selected geometry nodes.
 * Handles LINE nodes (uses AABB of rotated endpoints) and rotated shapes.
 */
export function computeGroupScreenBBox(
  store: SceneGraphStore,
  selectedIds: Set<string>,
  viewport: { scale: number; origin: { x: number; y: number } },
): ScreenRect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (!node || !isGeometryNode(node)) continue;

    const world = getWorldPosition(store, node);

    if (node.type === 'LINE') {
      // Line: compute AABB from start and end points
      const rad = (node.rotation ?? 0) * Math.PI / 180;
      const dx = node.width * Math.cos(rad);
      const dy = node.width * Math.sin(rad);
      const endWX = world.x + dx;
      const endWY = world.y + dy;

      const sx1 = world.x * viewport.scale + viewport.origin.x;
      const sy1 = world.y * viewport.scale + viewport.origin.y;
      const sx2 = endWX * viewport.scale + viewport.origin.x;
      const sy2 = endWY * viewport.scale + viewport.origin.y;

      minX = Math.min(minX, sx1, sx2);
      minY = Math.min(minY, sy1, sy2);
      maxX = Math.max(maxX, sx1, sx2);
      maxY = Math.max(maxY, sy1, sy2);
    } else {
      const rotation = node.rotation ?? 0;
      const sx = world.x * viewport.scale + viewport.origin.x;
      const sy = world.y * viewport.scale + viewport.origin.y;
      const sw = node.width * viewport.scale;
      const sh = node.height * viewport.scale;

      if (rotation !== 0) {
        // Compute AABB of the rotated rectangle
        const rad = rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;
        const hw = sw / 2;
        const hh = sh / 2;

        // Four corners relative to center
        const corners = [
          { dx: -hw, dy: -hh },
          { dx: hw, dy: -hh },
          { dx: hw, dy: hh },
          { dx: -hw, dy: hh },
        ];

        for (const c of corners) {
          const rx = cx + c.dx * cos - c.dy * sin;
          const ry = cy + c.dx * sin + c.dy * cos;
          minX = Math.min(minX, rx);
          minY = Math.min(minY, ry);
          maxX = Math.max(maxX, rx);
          maxY = Math.max(maxY, ry);
        }
      } else {
        minX = Math.min(minX, sx);
        minY = Math.min(minY, sy);
        maxX = Math.max(maxX, sx + sw);
        maxY = Math.max(maxY, sy + sh);
      }
    }
  }

  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}
