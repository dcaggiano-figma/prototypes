import type { SceneGraphStore } from '../scene-graph/store';
import type { SceneNode, NodeType } from '../types';
import { isGeometryNode } from '../scene-graph/world-position';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ClipboardPayload {
  nodes: SceneNode[];
  bbox: Rect;
  topLevelIds: string[];
}

let clipboard: ClipboardPayload | null = null;

function collectTopLevelIds(
  store: SceneGraphStore,
  selectedIds: Set<string>,
): string[] {
  const ids: string[] = [];
  for (const id of selectedIds) {
    const node = store.getNode(id);
    if (!node || !isGeometryNode(node)) continue;
    const hasSelectedAncestor = store.getAncestors(id).some((a) =>
      selectedIds.has(a.id),
    );
    if (!hasSelectedAncestor) ids.push(id);
  }
  return ids;
}

/** Compute world position by walking up parent chain within a node map */
function computeWorldPos(
  nodeMap: Map<string, SceneNode>,
  node: SceneNode,
): { x: number; y: number } {
  let x = isGeometryNode(node) ? node.x : 0;
  let y = isGeometryNode(node) ? node.y : 0;
  let current = node;
  while (current.parentId) {
    const parent = nodeMap.get(current.parentId);
    if (!parent) break;
    if (isGeometryNode(parent)) {
      x += parent.x;
      y += parent.y;
    }
    current = parent;
  }
  return { x, y };
}

function computeBBox(
  nodeMap: Map<string, SceneNode>,
  ids: string[],
): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of ids) {
    const node = nodeMap.get(id);
    if (!node || !isGeometryNode(node)) continue;
    const pos = computeWorldPos(nodeMap, node);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + node.width);
    maxY = Math.max(maxY, pos.y + node.height);
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Compute world position using the live store */
function computeWorldPosFromStore(
  store: SceneGraphStore,
  node: SceneNode,
): { x: number; y: number } {
  let x = isGeometryNode(node) ? node.x : 0;
  let y = isGeometryNode(node) ? node.y : 0;
  let current = node;
  while (current.parentId) {
    const parent = store.getNode(current.parentId);
    if (!parent) break;
    if (isGeometryNode(parent)) {
      x += parent.x;
      y += parent.y;
    }
    current = parent;
  }
  return { x, y };
}

function collectNodeTree(store: SceneGraphStore, id: string): SceneNode[] {
  const node = store.getNode(id);
  if (!node) return [];
  return [node, ...store.getDescendants(id)];
}

export function copyNodes(
  store: SceneGraphStore,
  selectedIds: Set<string>,
): void {
  if (selectedIds.size === 0) return;

  const topLevelIds = collectTopLevelIds(store, selectedIds);
  if (topLevelIds.length === 0) return;

  const allNodes: SceneNode[] = [];
  for (const id of topLevelIds) {
    allNodes.push(...collectNodeTree(store, id));
  }

  // Build a map for bbox computation — include ancestors for world pos
  const nodeMap = new Map<string, SceneNode>();
  for (const n of allNodes) nodeMap.set(n.id, n);
  for (const n of allNodes) {
    let current = n;
    while (current.parentId && !nodeMap.has(current.parentId)) {
      const parent = store.getNode(current.parentId);
      if (!parent) break;
      nodeMap.set(parent.id, parent);
      current = parent;
    }
  }

  const bbox = computeBBox(nodeMap, topLevelIds);
  if (!bbox) return;

  clipboard = {
    nodes: structuredClone(allNodes),
    bbox,
    topLevelIds: [...topLevelIds],
  };
}

export function cutNodes(
  store: SceneGraphStore,
  selectedIds: Set<string>,
): void {
  copyNodes(store, selectedIds);
  const topLevelIds = collectTopLevelIds(store, selectedIds);
  for (const id of topLevelIds) {
    store.deleteNode(id);
  }
}

export function pasteNodes(
  store: SceneGraphStore,
  selectedIds: Set<string>,
  viewportCenter: { x: number; y: number },
): string[] {
  if (!clipboard) return [];

  const { nodes, bbox, topLevelIds: originalTopLevelIds } = clipboard;
  const oldToNew = new Map<string, string>();

  // Build lookup map for cloned nodes (for world pos computation)
  const clonedMap = new Map<string, SceneNode>();
  for (const n of nodes) clonedMap.set(n.id, n);

  // Determine paste target
  let pasteParentId: string | null = null;
  let offsetX = 0;
  let offsetY = 0;

  if (selectedIds.size === 1) {
    const targetId = [...selectedIds][0];
    const target = store.getNode(targetId);
    if (
      target &&
      (target.type === 'FRAME' || target.type === 'SECTION') &&
      isGeometryNode(target)
    ) {
      pasteParentId = targetId;
      const bboxCenterX = bbox.x + bbox.w / 2;
      const bboxCenterY = bbox.y + bbox.h / 2;
      const targetWorld = computeWorldPosFromStore(store, target);
      const containerCenterX = targetWorld.x + target.width / 2;
      const containerCenterY = targetWorld.y + target.height / 2;
      offsetX = containerCenterX - bboxCenterX;
      offsetY = containerCenterY - bboxCenterY;
    }
  }

  if (!pasteParentId) {
    const bboxCenterX = bbox.x + bbox.w / 2;
    const bboxCenterY = bbox.y + bbox.h / 2;
    offsetX = viewportCenter.x - bboxCenterX;
    offsetY = viewportCenter.y - bboxCenterY;
  }

  const topLevelSet = new Set(originalTopLevelIds);

  for (const cloned of nodes) {
    const isTopLevel = topLevelSet.has(cloned.id);

    let parentId: string | null;
    let x: number;
    let y: number;

    if (isTopLevel) {
      parentId = pasteParentId;
      const origWorld = computeWorldPos(clonedMap, cloned);
      if (pasteParentId) {
        const parentNode = store.getNode(pasteParentId);
        const parentWorld =
          parentNode && isGeometryNode(parentNode)
            ? computeWorldPosFromStore(store, parentNode)
            : { x: 0, y: 0 };
        x = origWorld.x + offsetX - parentWorld.x;
        y = origWorld.y + offsetY - parentWorld.y;
      } else {
        x = origWorld.x + offsetX;
        y = origWorld.y + offsetY;
      }
    } else {
      parentId = oldToNew.get(cloned.parentId!) ?? null;
      x = isGeometryNode(cloned) ? cloned.x : 0;
      y = isGeometryNode(cloned) ? cloned.y : 0;
    }

    const props: Partial<SceneNode> = {
      ...cloned,
      children: [],
      parentId,
      x,
      y,
    } as Partial<SceneNode>;
    delete (props as Record<string, unknown>).id;
    const newNode = store.createNode(cloned.type as NodeType, props);

    oldToNew.set(cloned.id, newNode.id);
  }

  return originalTopLevelIds.map((id) => oldToNew.get(id)!).filter(Boolean);
}

export function duplicateNodes(
  store: SceneGraphStore,
  selectedIds: Set<string>,
): string[] {
  if (selectedIds.size === 0) return [];

  const topLevelIds = collectTopLevelIds(store, selectedIds);
  if (topLevelIds.length === 0) return [];

  const allNodes: SceneNode[] = [];
  for (const id of topLevelIds) {
    allNodes.push(...collectNodeTree(store, id));
  }

  const cloned = structuredClone(allNodes);
  const oldToNew = new Map<string, string>();
  const topLevelSet = new Set(topLevelIds);

  for (const node of cloned) {
    const isTopLevel = topLevelSet.has(node.id);

    const parentId = isTopLevel
      ? node.parentId
      : (oldToNew.get(node.parentId!) ?? null);

    const x = isGeometryNode(node) ? node.x + (isTopLevel ? node.width + 100 : 0) : 0;
    const y = isGeometryNode(node) ? node.y : 0;

    const props: Partial<SceneNode> = {
      ...node,
      children: [],
      parentId,
      x,
      y,
    } as Partial<SceneNode>;
    delete (props as Record<string, unknown>).id;
    const newNode = store.createNode(node.type as NodeType, props);

    oldToNew.set(node.id, newNode.id);
  }

  return topLevelIds.map((id) => oldToNew.get(id)!).filter(Boolean);
}
