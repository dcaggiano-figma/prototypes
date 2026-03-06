import type { SceneGraphStore } from './store';
import type { GeometryNode } from '../types';
import { getWorldPosition, isGeometryNode } from './world-position';

// ── Types ────────────────────────────────────────────────────────────

interface WorldRect {
  x: number
  y: number
  w: number
  h: number
}

/** Returns true if the node is a container type (FRAME, SLIDE, or SECTION) */
export function isContainer(node: { type: string }): boolean {
  return node.type === 'FRAME' || node.type === 'SLIDE' || node.type === 'SECTION';
}

// ── Utility functions ────────────────────────────────────────────────

/** Get the world-space bounding rect of a geometry node */
function getWorldRect(store: SceneGraphStore, node: GeometryNode): WorldRect {
  const pos = getWorldPosition(store, node);
  return { x: pos.x, y: pos.y, w: node.width, h: node.height };
}

/** Returns true if `inner` is fully contained within `outer` (inclusive edges) */
function rectContainsRect(outer: WorldRect, inner: WorldRect): boolean {
  return (
    inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.w <= outer.x + outer.w
    && inner.y + inner.h <= outer.y + outer.h
  );
}

/** Returns true if the two rects overlap at all */
function rectsOverlap(a: WorldRect, b: WorldRect): boolean {
  return (
    a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y
  );
}

/** Returns true if `ancestorId` is an ancestor of `node` */
function isAncestorOf(store: SceneGraphStore, node: { parentId: string | null }, ancestorId: string): boolean {
  let currentId = node.parentId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    const parent = store.getNode(currentId);
    if (!parent) break;
    currentId = parent.parentId;
  }
  return false;
}

/**
 * Find the smallest-area container (FRAME or SECTION) that fully contains the given node.
 * Returns null if node is a section (sections don't auto-nest) or no container contains it.
 */
function findContainingParent(
  store: SceneGraphStore,
  node: GeometryNode,
): GeometryNode | null {
  if (node.type === 'SECTION') return null;
  if (node.type === 'SLIDE') return null;

  const nodeRect = getWorldRect(store, node);
  let bestContainer: GeometryNode | null = null;
  let bestArea = Infinity;

  // Collect ancestor IDs so we don't reparent to a grandparent/ancestor of the current parent
  const ancestorIds = new Set<string>();
  if (node.parentId) {
    for (const anc of store.getAncestors(node.parentId)) {
      ancestorIds.add(anc.id);
    }
  }

  for (const candidate of store.getAllNodes()) {
    if (!isContainer(candidate)) continue;
    if (candidate.id === node.id) continue;
    if (!isGeometryNode(candidate)) continue;
    // Prevent circular parenting
    if (isAncestorOf(store, candidate, node.id)) continue;
    // Don't adopt into an ancestor of the current parent
    if (ancestorIds.has(candidate.id)) continue;

    const containerRect = getWorldRect(store, candidate);
    if (rectContainsRect(containerRect, nodeRect)) {
      const area = containerRect.w * containerRect.h;
      if (area < bestArea) {
        bestArea = area;
        bestContainer = candidate;
      }
    }
  }

  return bestContainer;
}

type ReparentAction =
  | { action: 'none' }
  | { action: 'adopt'; containerId: string }
  | { action: 'release' };

/**
 * Decide whether a node needs reparenting:
 * - Fully inside a container that isn't its current parent → adopt
 * - Child of a container but no longer fully inside any → release to root
 * - Otherwise → none
 */
function resolveReparenting(store: SceneGraphStore, nodeId: string): ReparentAction {
  const node = store.getNode(nodeId);
  if (!node || !isGeometryNode(node)) return { action: 'none' };
  if (node.type === 'SECTION') return { action: 'none' };

  const containingParent = findContainingParent(store, node);

  if (containingParent && containingParent.id !== node.parentId) {
    return { action: 'adopt', containerId: containingParent.id };
  }

  if (!containingParent && node.parentId) {
    const parent = store.getNode(node.parentId);
    if (parent && isContainer(parent) && isGeometryNode(parent)) {
      const parentRect = getWorldRect(store, parent);
      const nodeRect = getWorldRect(store, node);
      // Only release when the child is completely outside the parent
      if (!rectsOverlap(parentRect, nodeRect)) {
        return { action: 'release' };
      }
    }
  }

  return { action: 'none' };
}

// ── Orchestrators ────────────────────────────────────────────────────

/**
 * For dragged/created non-container nodes: check each and reparent as needed.
 */
export function applyNodeReparenting(store: SceneGraphStore, nodeIds: string[]): void {
  for (const id of nodeIds) {
    const result = resolveReparenting(store, id);
    if (result.action === 'adopt') {
      store.reparentNodeAdjusted(id, result.containerId);
    } else if (result.action === 'release') {
      store.reparentNodeAdjusted(id, null);
    }
  }
}

/**
 * For when a container (frame or section) was moved/resized: check for nodes to adopt or release.
 */
export function applyContainerReparenting(store: SceneGraphStore, containerId: string): void {
  const container = store.getNode(containerId);
  if (!container || !isContainer(container) || !isGeometryNode(container)) return;

  const containerRect = getWorldRect(store, container);

  // Check root-level geometry nodes for adoption (sections excluded — they don't auto-nest)
  for (const rootNode of store.getRootNodes()) {
    if (rootNode.type === 'SECTION') continue;
    if (rootNode.id === containerId) continue;
    if (!isGeometryNode(rootNode)) continue;

    const nodeRect = getWorldRect(store, rootNode);
    if (rectContainsRect(containerRect, nodeRect)) {
      store.reparentNodeAdjusted(rootNode.id, containerId);
    }
  }

  // Check current children for release
  const childIds = [...container.children];
  for (const childId of childIds) {
    const child = store.getNode(childId);
    if (!child || !isGeometryNode(child)) continue;

    const childRect = getWorldRect(store, child);
    // Only release when the child is completely outside the container
    if (!rectsOverlap(containerRect, childRect)) {
      store.reparentNodeAdjusted(childId, null);
    }
  }
}
