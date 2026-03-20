import type { SceneGraph } from '../../scene-graph/scene-graph';
import type { NodeId } from '../../scene-graph/node-id';
import type { SceneNode, NodeType } from '../../scene-graph/types';
import { isGeometryNode } from '../../scene-graph/types';
import { getTypeDefaults } from '../scene-graph/node-defaults';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ClipboardPayload {
  nodes: SceneNode[];
  bbox: Rect;
  topLevelIds: NodeId[];
}

let clipboard: ClipboardPayload | null = null;

/**
 * External node shape from Figma clipboard — uses string IDs instead of NodeId.
 */
export interface ExternalNode {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  children: string[];
  visible: boolean;
  locked: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export function copyNodes(
  sg: SceneGraph,
  selectedIds: ReadonlySet<NodeId>,
): void {
  if (selectedIds.size === 0) return;

  const topLevelIds = collectTopLevelIds(sg, selectedIds);
  if (topLevelIds.length === 0) return;

  const allNodes: SceneNode[] = [];
  for (const id of topLevelIds) {
    allNodes.push(...collectNodeTree(sg, id));
  }

  // Build a map for bbox computation — include ancestors for world pos
  const nodeMap = new Map<NodeId, SceneNode>();
  for (const n of allNodes) nodeMap.set(n.id, n);
  for (const n of allNodes) {
    let current = n;
    while (current.parentId != null && !nodeMap.has(current.parentId)) {
      const parent = sg.getNode(current.parentId);
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
  sg: SceneGraph,
  selectedIds: ReadonlySet<NodeId>,
): void {
  copyNodes(sg, selectedIds);
  const topLevelIds = collectTopLevelIds(sg, selectedIds);
  for (const id of topLevelIds) {
    sg.deleteNode(id);
  }
}

export function pasteNodes(
  sg: SceneGraph,
  canvasId: NodeId,
  selectedIds: ReadonlySet<NodeId>,
  viewportCenter: { x: number; y: number },
): NodeId[] {
  if (!clipboard) return [];

  const { nodes, bbox, topLevelIds: originalTopLevelIds } = clipboard;
  const oldToNew = new Map<NodeId, NodeId>();

  // Build lookup map for cloned nodes (for world pos computation)
  const clonedMap = new Map<NodeId, SceneNode>();
  for (const n of nodes) clonedMap.set(n.id, n);

  // Determine paste target
  let pasteParentId: NodeId | null = null;
  let offsetX = 0;
  let offsetY = 0;

  if (selectedIds.size === 1) {
    const targetId = [...selectedIds][0];
    const target = sg.getNode(targetId);
    if (
      target &&
      (target.type === 'FRAME' || target.type === 'SECTION' || target.type === 'GRID_SECTION') &&
      isGeometryNode(target)
    ) {
      pasteParentId = targetId;
      const bboxCenterX = bbox.x + bbox.w / 2;
      const bboxCenterY = bbox.y + bbox.h / 2;
      const targetWorld = computeWorldPosFromSg(sg, target);
      const containerCenterX = targetWorld.x + target.width / 2;
      const containerCenterY = targetWorld.y + target.height / 2;
      offsetX = containerCenterX - bboxCenterX;
      offsetY = containerCenterY - bboxCenterY;
    }
  }

  if (pasteParentId == null) {
    const bboxCenterX = bbox.x + bbox.w / 2;
    const bboxCenterY = bbox.y + bbox.h / 2;
    offsetX = viewportCenter.x - bboxCenterX;
    offsetY = viewportCenter.y - bboxCenterY;
  }

  const topLevelSet = new Set(originalTopLevelIds);

  for (const cloned of nodes) {
    const isTopLevel = topLevelSet.has(cloned.id);

    let parentId: NodeId;
    let x: number;
    let y: number;

    if (isTopLevel) {
      parentId = pasteParentId ?? canvasId;
      const origWorld = computeWorldPos(clonedMap, cloned);
      if (pasteParentId != null) {
        const parentNode = sg.getNode(pasteParentId);
        const parentWorld =
          parentNode && isGeometryNode(parentNode)
            ? computeWorldPosFromSg(sg, parentNode)
            : { x: 0, y: 0 };
        x = origWorld.x + offsetX - parentWorld.x;
        y = origWorld.y + offsetY - parentWorld.y;
      } else {
        x = origWorld.x + offsetX;
        y = origWorld.y + offsetY;
      }
    } else {
      parentId = oldToNew.get(cloned.parentId!) ?? canvasId;
      x = isGeometryNode(cloned) ? cloned.x : 0;
      y = isGeometryNode(cloned) ? cloned.y : 0;
    }

    const props: Record<string, unknown> = {
      ...cloned,
      x,
      y,
    };
    delete props.id;
    delete props.children;
    delete props.parentId;

    const newNode = sg.createNode(cloned.type as NodeType, parentId, {
      ...getTypeDefaults(cloned.type as NodeType),
      ...props,
    });

    oldToNew.set(cloned.id, newNode.id);
  }

  return originalTopLevelIds.map((id) => oldToNew.get(id)!).filter(Boolean);
}

/**
 * Insert externally-provided nodes (e.g. from Figma clipboard) into the scene graph.
 * Nodes arrive with string IDs and parentId relationships wired up between themselves.
 * We remap them into real NodeId values as we insert.
 */
export function pasteExternalNodes(
  sg: SceneGraph,
  canvasId: NodeId,
  nodes: ExternalNode[],
  selectedIds: ReadonlySet<NodeId>,
  viewportCenter: { x: number; y: number },
): NodeId[] {
  if (nodes.length === 0) return [];

  // Find top-level nodes (no parent or parent not in the set)
  const externalIds = new Set(nodes.map((n) => n.id));
  const topLevelNodes = nodes.filter((n) => !n.parentId || !externalIds.has(n.parentId));
  const topLevelIds = topLevelNodes.map((n) => n.id);

  // Build a map keyed by external string ID for world pos computation
  const nodeMap = new Map<string, ExternalNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Compute bounding box of top-level nodes
  const bbox = computeExternalBBox(nodeMap, topLevelIds);
  if (!bbox) return [];

  // Determine paste target
  let pasteParentId: NodeId | null = null;
  let offsetX = 0;
  let offsetY = 0;

  if (selectedIds.size === 1) {
    const targetId = [...selectedIds][0];
    const target = sg.getNode(targetId);
    if (
      target &&
      (target.type === 'FRAME' || target.type === 'SECTION' || target.type === 'GRID_SECTION') &&
      isGeometryNode(target)
    ) {
      pasteParentId = targetId;
      const bboxCenterX = bbox.x + bbox.w / 2;
      const bboxCenterY = bbox.y + bbox.h / 2;
      const targetWorld = computeWorldPosFromSg(sg, target);
      const containerCenterX = targetWorld.x + target.width / 2;
      const containerCenterY = targetWorld.y + target.height / 2;
      offsetX = containerCenterX - bboxCenterX;
      offsetY = containerCenterY - bboxCenterY;
    }
  }

  if (pasteParentId == null) {
    const bboxCenterX = bbox.x + bbox.w / 2;
    const bboxCenterY = bbox.y + bbox.h / 2;
    offsetX = viewportCenter.x - bboxCenterX;
    offsetY = viewportCenter.y - bboxCenterY;
  }

  const topLevelSet = new Set(topLevelIds);
  const oldToNew = new Map<string, NodeId>();

  for (const node of nodes) {
    const isTopLevel = topLevelSet.has(node.id);

    let parentId: NodeId;
    let x: number;
    let y: number;

    if (isTopLevel) {
      parentId = pasteParentId ?? canvasId;
      const origWorld = computeExternalWorldPos(nodeMap, node);
      if (pasteParentId != null) {
        const parentNode = sg.getNode(pasteParentId);
        const parentWorld =
          parentNode && isGeometryNode(parentNode)
            ? computeWorldPosFromSg(sg, parentNode)
            : { x: 0, y: 0 };
        x = origWorld.x + offsetX - parentWorld.x;
        y = origWorld.y + offsetY - parentWorld.y;
      } else {
        x = origWorld.x + offsetX;
        y = origWorld.y + offsetY;
      }
    } else {
      parentId = oldToNew.get(node.parentId!) ?? canvasId;
      x = node.x ?? 0;
      y = node.y ?? 0;
    }

    const props: Record<string, unknown> = {
      ...node,
      x,
      y,
    };
    delete props.id;
    delete props.children;
    delete props.parentId;

    const newNode = sg.createNode(node.type as NodeType, parentId, {
      ...getTypeDefaults(node.type as NodeType),
      ...props,
    });

    oldToNew.set(node.id, newNode.id);
  }

  return topLevelIds.map((id) => oldToNew.get(id)!).filter(Boolean);
}

export function duplicateNodes(
  sg: SceneGraph,
  canvasId: NodeId,
  selectedIds: ReadonlySet<NodeId>,
): NodeId[] {
  if (selectedIds.size === 0) return [];

  const topLevelIds = collectTopLevelIds(sg, selectedIds);
  if (topLevelIds.length === 0) return [];

  const allNodes: SceneNode[] = [];
  for (const id of topLevelIds) {
    allNodes.push(...collectNodeTree(sg, id));
  }

  const cloned = structuredClone(allNodes);
  const oldToNew = new Map<NodeId, NodeId>();
  const topLevelSet = new Set(topLevelIds);

  for (const node of cloned) {
    const isTopLevel = topLevelSet.has(node.id);

    const parentId = isTopLevel
      ? (node.parentId ?? canvasId)
      : (oldToNew.get(node.parentId!) ?? canvasId);

    // Root-level nodes (parent is the canvas) duplicate 40px to the right of the original.
    // Nodes inside a parent frame duplicate at the same position.
    const isRootLevel = isTopLevel && (node.parentId === canvasId || node.parentId == null);
    const x = isGeometryNode(node) ? node.x + (isRootLevel ? node.width + 40 : 0) : 0;
    const y = isGeometryNode(node) ? node.y : 0;

    const props: Record<string, unknown> = {
      ...node,
      x,
      y,
    };
    delete props.id;
    delete props.children;
    delete props.parentId;

    const newNode = sg.createNode(node.type as NodeType, parentId, {
      ...getTypeDefaults(node.type as NodeType),
      ...props,
    });

    oldToNew.set(node.id, newNode.id);
  }

  return topLevelIds.map((id) => oldToNew.get(id)!).filter(Boolean);
}

// ── Helpers ───────────────────────────────────────────────────────────

function collectTopLevelIds(
  sg: SceneGraph,
  selectedIds: ReadonlySet<NodeId>,
): NodeId[] {
  const ids: NodeId[] = [];
  for (const id of selectedIds) {
    const node = sg.getNode(id);
    if (!node || !isGeometryNode(node)) continue;
    const hasSelectedAncestor = sg.getAncestors(id).some((a) =>
      selectedIds.has(a.id),
    );
    if (!hasSelectedAncestor) ids.push(id);
  }
  return ids;
}

/** Compute world position by walking up parent chain within a node map */
function computeWorldPos(
  nodeMap: Map<NodeId, SceneNode>,
  node: SceneNode,
): { x: number; y: number } {
  let x = isGeometryNode(node) ? node.x : 0;
  let y = isGeometryNode(node) ? node.y : 0;
  let current = node;
  while (current.parentId != null) {
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
  nodeMap: Map<NodeId, SceneNode>,
  ids: NodeId[],
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

/** Compute world position using the live scene graph */
function computeWorldPosFromSg(
  sg: SceneGraph,
  node: SceneNode,
): { x: number; y: number } {
  let x = isGeometryNode(node) ? node.x : 0;
  let y = isGeometryNode(node) ? node.y : 0;
  let current = node;
  while (current.parentId != null) {
    const parent = sg.getNode(current.parentId);
    if (!parent) break;
    if (isGeometryNode(parent)) {
      x += parent.x;
      y += parent.y;
    }
    current = parent;
  }
  return { x, y };
}

function collectNodeTree(sg: SceneGraph, id: NodeId): SceneNode[] {
  const node = sg.getNode(id);
  if (!node) return [];
  return [node, ...sg.getDescendants(id)];
}

/** Compute world position by walking up parent chain within an external node map */
function computeExternalWorldPos(
  nodeMap: Map<string, ExternalNode>,
  node: ExternalNode,
): { x: number; y: number } {
  let x = node.x ?? 0;
  let y = node.y ?? 0;
  let current = node;
  while (current.parentId != null) {
    const parent = nodeMap.get(current.parentId);
    if (!parent) break;
    x += parent.x ?? 0;
    y += parent.y ?? 0;
    current = parent;
  }
  return { x, y };
}

function computeExternalBBox(
  nodeMap: Map<string, ExternalNode>,
  ids: string[],
): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of ids) {
    const node = nodeMap.get(id);
    if (!node || node.width == null || node.height == null) continue;
    const pos = computeExternalWorldPos(nodeMap, node);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + node.width);
    maxY = Math.max(maxY, pos.y + node.height);
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
