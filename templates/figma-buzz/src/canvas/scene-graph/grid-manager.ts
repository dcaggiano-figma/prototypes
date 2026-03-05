import type { SceneGraphStore } from './store';
import { getWorldPosition, isGeometryNode } from './world-position';
import { FRAME_GAP, SECTION_PAD, recomputeGridLayout } from './grid-layout';

export interface DropTarget {
  sectionId: string
  insertIndex: number
}

/** Check if a node is a managed grid frame (FRAME child of a SECTION) */
export function isManagedFrame(store: SceneGraphStore, nodeId: string): boolean {
  const node = store.getNode(nodeId);
  if (!node || node.type !== 'FRAME') return false;
  if (!node.parentId) return false;
  const parent = store.getNode(node.parentId);
  return !!parent && parent.type === 'SECTION';
}

/** Find the drop target for a dragged frame at the given world position */
export function findDropTarget(
  store: SceneGraphStore,
  worldX: number,
  worldY: number,
  draggedNodeId: string,
): DropTarget | null {
  const roots = store.getRootNodes();
  const sections = roots.filter((n) => n.type === 'SECTION');

  for (const section of sections) {
    if (!isGeometryNode(section)) continue;
    const sWorld = getWorldPosition(store, section);

    // Check if point is within section bounds (with some vertical tolerance)
    if (
      worldY >= sWorld.y - 40
      && worldY <= sWorld.y + section.height + 40
      && worldX >= sWorld.x - 50
      && worldX <= sWorld.x + section.width + 100
    ) {
      // Determine insert index based on X position
      const children = section.children.filter((cid) => cid !== draggedNodeId);
      let insertIndex = children.length;

      for (let i = 0; i < children.length; i++) {
        const child = store.getNode(children[i]);
        if (!child || !isGeometryNode(child)) continue;
        const childWorld = getWorldPosition(store, child);
        const childMidX = childWorld.x + child.width / 2;

        if (worldX < childMidX) {
          insertIndex = i;
          break;
        }
      }

      return { sectionId: section.id, insertIndex };
    }
  }

  return null;
}

/** Apply a grid drop: reparent the node and recompute layout */
export function applyGridDrop(store: SceneGraphStore, nodeId: string, target: DropTarget): void {
  const node = store.getNode(nodeId);
  if (!node) return;

  // Remove from old parent
  if (node.parentId) {
    const oldParent = store.getNode(node.parentId);
    if (oldParent) {
      // If already in the target section, just reorder
      if (node.parentId === target.sectionId) {
        const currentIndex = oldParent.children.indexOf(nodeId);
        const adjustedIndex = currentIndex < target.insertIndex
          ? target.insertIndex - 1
          : target.insertIndex;
        store.reorderNode(nodeId, adjustedIndex);
      } else {
        store.reparentNode(nodeId, target.sectionId, target.insertIndex);
      }
    }
  } else {
    store.reparentNode(nodeId, target.sectionId, target.insertIndex);
  }

  // Recompute grid layout for all sections
  const roots = store.getRootNodes();
  const sectionIds = roots.filter((n) => n.type === 'SECTION').map((n) => n.id);
  recomputeGridLayout(store, sectionIds);
}

/** Get the world-space X position of a drop indicator */
export function getDropIndicatorX(
  store: SceneGraphStore,
  target: DropTarget,
): number {
  const section = store.getNode(target.sectionId);
  if (!section || !isGeometryNode(section)) return 0;

  const sWorld = getWorldPosition(store, section);

  if (target.insertIndex === 0) {
    return sWorld.x + SECTION_PAD;
  }

  const children = section.children;
  if (target.insertIndex >= children.length) {
    const lastChild = store.getNode(children[children.length - 1]);
    if (lastChild && isGeometryNode(lastChild)) {
      const childWorld = getWorldPosition(store, lastChild);
      return childWorld.x + lastChild.width + FRAME_GAP / 2;
    }
  }

  const childAtIndex = store.getNode(children[target.insertIndex]);
  if (childAtIndex && isGeometryNode(childAtIndex)) {
    const childWorld = getWorldPosition(store, childAtIndex);
    return childWorld.x - FRAME_GAP / 2;
  }

  return sWorld.x + SECTION_PAD;
}
