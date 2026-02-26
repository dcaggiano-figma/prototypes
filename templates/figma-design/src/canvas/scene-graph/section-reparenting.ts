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

/**
 * Find the smallest-area SECTION that fully contains the given node.
 * Returns null if node is a SECTION (no nesting) or no section contains it.
 */
function findContainingSection(
  store: SceneGraphStore,
  node: GeometryNode,
): GeometryNode | null {
  if (node.type === 'SECTION') return null;

  const nodeRect = getWorldRect(store, node);
  let bestSection: GeometryNode | null = null;
  let bestArea = Infinity;

  for (const candidate of store.getAllNodes()) {
    if (candidate.type !== 'SECTION') continue;
    if (candidate.id === node.id) continue;
    if (!isGeometryNode(candidate)) continue;

    const sectionRect = getWorldRect(store, candidate);
    if (rectContainsRect(sectionRect, nodeRect)) {
      const area = sectionRect.w * sectionRect.h;
      if (area < bestArea) {
        bestArea = area;
        bestSection = candidate;
      }
    }
  }

  return bestSection;
}

type ReparentAction =
  | { action: 'none' }
  | { action: 'adopt'; sectionId: string }
  | { action: 'release' };

/**
 * Decide whether a node needs reparenting:
 * - Fully inside a section that isn't its current parent → adopt
 * - Child of a section but no longer fully inside any → release to root
 * - Otherwise → none
 */
function resolveReparenting(store: SceneGraphStore, nodeId: string): ReparentAction {
  const node = store.getNode(nodeId);
  if (!node || !isGeometryNode(node)) return { action: 'none' };
  if (node.type === 'SECTION') return { action: 'none' };

  const containingSection = findContainingSection(store, node);

  if (containingSection && containingSection.id !== node.parentId) {
    return { action: 'adopt', sectionId: containingSection.id };
  }

  if (!containingSection && node.parentId) {
    const parent = store.getNode(node.parentId);
    if (parent?.type === 'SECTION') {
      return { action: 'release' };
    }
  }

  return { action: 'none' };
}

// ── Orchestrators ────────────────────────────────────────────────────

/**
 * For dragged/created non-section nodes: check each and reparent as needed.
 */
export function applyNodeReparenting(store: SceneGraphStore, nodeIds: string[]): void {
  for (const id of nodeIds) {
    const result = resolveReparenting(store, id);
    if (result.action === 'adopt') {
      store.reparentNodeAdjusted(id, result.sectionId);
    } else if (result.action === 'release') {
      store.reparentNodeAdjusted(id, null);
    }
  }
}

/**
 * For when a section was moved/resized: check for nodes to adopt or release.
 */
export function applySectionReparenting(store: SceneGraphStore, sectionId: string): void {
  const section = store.getNode(sectionId);
  if (!section || section.type !== 'SECTION' || !isGeometryNode(section)) return;

  const sectionRect = getWorldRect(store, section);

  // Check root-level non-section geometry nodes for adoption
  for (const rootNode of store.getRootNodes()) {
    if (rootNode.type === 'SECTION') continue;
    if (rootNode.id === sectionId) continue;
    if (!isGeometryNode(rootNode)) continue;

    const nodeRect = getWorldRect(store, rootNode);
    if (rectContainsRect(sectionRect, nodeRect)) {
      store.reparentNodeAdjusted(rootNode.id, sectionId);
    }
  }

  // Check current children for release
  const childIds = [...section.children];
  for (const childId of childIds) {
    const child = store.getNode(childId);
    if (!child || !isGeometryNode(child)) continue;

    const childRect = getWorldRect(store, child);
    if (!rectContainsRect(sectionRect, childRect)) {
      store.reparentNodeAdjusted(childId, null);
    }
  }
}
