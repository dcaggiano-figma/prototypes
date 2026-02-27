import type { GeometryNode } from '../types';
import type { SceneGraphStore } from './store';
import { getWorldPosition, isGeometryNode } from './world-position';

// ── Types ────────────────────────────────────────────────────────────

export type AlignDirection = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

export type DistributeDirection = 'horizontal' | 'vertical';

// ── Internal helpers ─────────────────────────────────────────────────

/** Resolve selected IDs to geometry nodes, filtering out non-geometry or missing nodes. */
function collectGeometryNodes(
  store: SceneGraphStore,
  selectedIds: Set<string>,
): GeometryNode[] {
  const nodes: GeometryNode[] = [];
  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (node && isGeometryNode(node)) {
      nodes.push(node);
    }
  }
  return nodes;
}

/** Get the world position of a node's parent (returns origin for root nodes). */
function getParentWorldPos(
  store: SceneGraphStore,
  node: GeometryNode,
): { x: number; y: number } {
  if (!node.parentId) return { x: 0, y: 0 };
  const parent = store.getNode(node.parentId);
  if (!parent || !isGeometryNode(parent)) return { x: 0, y: 0 };
  return getWorldPosition(store, parent);
}

// ── alignNodes ───────────────────────────────────────────────────────

/**
 * Align selected geometry nodes along the given direction.
 * Requires 2+ geometry nodes in the selection; otherwise it's a no-op.
 */
export function alignNodes(
  store: SceneGraphStore,
  selectedIds: Set<string>,
  direction: AlignDirection,
): void {
  const nodes = collectGeometryNodes(store, selectedIds);
  if (nodes.length < 2) return;

  // Compute world-space bounds for each node
  const entries = nodes.map((node) => {
    const world = getWorldPosition(store, node);
    return { node, worldX: world.x, worldY: world.y };
  });

  // Compute group bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const { node, worldX, worldY } of entries) {
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX + node.width);
    minY = Math.min(minY, worldY);
    maxY = Math.max(maxY, worldY + node.height);
  }

  // Align each node
  for (const { node, worldX, worldY } of entries) {
    let targetWorldX = worldX;
    let targetWorldY = worldY;

    switch (direction) {
      case 'left':
        targetWorldX = minX;
        break;
      case 'center-h':
        targetWorldX = (minX + maxX) / 2 - node.width / 2;
        break;
      case 'right':
        targetWorldX = maxX - node.width;
        break;
      case 'top':
        targetWorldY = minY;
        break;
      case 'center-v':
        targetWorldY = (minY + maxY) / 2 - node.height / 2;
        break;
      case 'bottom':
        targetWorldY = maxY - node.height;
        break;
    }

    // Convert world target back to local coordinates
    const parentWorld = getParentWorldPos(store, node);
    store.updateNode(node.id, {
      x: targetWorldX - parentWorld.x,
      y: targetWorldY - parentWorld.y,
    });
  }
}

// ── distributeNodes ──────────────────────────────────────────────────

/**
 * Distribute selected geometry nodes with equal spacing along the given axis.
 * Requires 3+ geometry nodes in the selection; otherwise it's a no-op.
 */
export function distributeNodes(
  store: SceneGraphStore,
  selectedIds: Set<string>,
  direction: DistributeDirection,
): void {
  const nodes = collectGeometryNodes(store, selectedIds);
  if (nodes.length < 3) return;

  // Compute world-space positions
  const entries = nodes.map((node) => {
    const world = getWorldPosition(store, node);
    return { node, worldX: world.x, worldY: world.y };
  });

  if (direction === 'horizontal') {
    // Sort by world X position
    entries.sort((a, b) => a.worldX - b.worldX);

    const first = entries[0];
    const last = entries[entries.length - 1];
    const totalSpan = last.worldX + last.node.width - first.worldX;
    const sumOfWidths = entries.reduce((sum, e) => sum + e.node.width, 0);
    const gap = (totalSpan - sumOfWidths) / (entries.length - 1);

    // Position middle nodes
    let currentX = first.worldX + first.node.width + gap;
    for (let i = 1; i < entries.length - 1; i++) {
      const { node } = entries[i];
      const parentWorld = getParentWorldPos(store, node);
      store.updateNode(node.id, {
        x: currentX - parentWorld.x,
      });
      currentX += node.width + gap;
    }
  } else {
    // Sort by world Y position
    entries.sort((a, b) => a.worldY - b.worldY);

    const first = entries[0];
    const last = entries[entries.length - 1];
    const totalSpan = last.worldY + last.node.height - first.worldY;
    const sumOfHeights = entries.reduce((sum, e) => sum + e.node.height, 0);
    const gap = (totalSpan - sumOfHeights) / (entries.length - 1);

    // Position middle nodes
    let currentY = first.worldY + first.node.height + gap;
    for (let i = 1; i < entries.length - 1; i++) {
      const { node } = entries[i];
      const parentWorld = getParentWorldPos(store, node);
      store.updateNode(node.id, {
        y: currentY - parentWorld.y,
      });
      currentY += node.height + gap;
    }
  }
}

// ── wrapInSection ────────────────────────────────────────────────────

/**
 * Wrap all selected geometry nodes in a new SECTION node with 40px padding.
 * The new section is selected after creation.
 */
export function wrapInSection(
  store: SceneGraphStore,
  selection: { selectedIds: Set<string>; select: (id: string) => void },
): void {
  const nodes = collectGeometryNodes(store, selection.selectedIds);
  if (nodes.length === 0) return;

  // Compute world-space bounding box of all selected geometry nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const world = getWorldPosition(store, node);
    minX = Math.min(minX, world.x);
    minY = Math.min(minY, world.y);
    maxX = Math.max(maxX, world.x + node.width);
    maxY = Math.max(maxY, world.y + node.height);
  }

  const spanW = maxX - minX;
  const spanH = maxY - minY;

  // Create a section with 40px padding around the bounding box
  const section = store.createNode('SECTION', {
    x: minX - 40,
    y: minY - 40,
    width: spanW + 80,
    height: spanH + 80,
  });

  // Reparent all selected nodes into the new section (preserves world position)
  for (const node of nodes) {
    store.reparentNodeAdjusted(node.id, section.id);
  }

  // Select the new section
  selection.select(section.id);
}
