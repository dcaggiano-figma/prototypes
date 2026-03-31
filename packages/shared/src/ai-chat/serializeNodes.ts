import type { SceneGraph } from '../scene-graph/scene-graph';
import type { NodeId } from '../scene-graph/node-id';
import type { NodeType, SceneNode } from '../scene-graph/types';
import { isCompoundNode, getTextSlotId } from '../scene-graph/types';
import { getTypeDefaults } from '../canvas/scene-graph/node-defaults';

/** Strip internal IDs from paint objects to reduce token count. */
function compactPaints(paints: Array<Record<string, unknown>>): string {
  const stripped = paints.map(({ id: _id, ...rest }) => rest);
  return JSON.stringify(stripped);
}

/**
 * Serialize a node's properties as a compact key=value string.
 */
function serializeNodeProps(node: SceneNode): string {
  const props: string[] = [`type=${node.type}`, `id=${String(node.id)}`, `name="${node.name}"`];
  // Geometry
  if ('x' in node) props.push(`x=${String(node.x)}`, `y=${String(node.y)}`, `width=${String(node.width)}`, `height=${String(node.height)}`);
  if ('opacity' in node && node.opacity !== 1) props.push(`opacity=${String(node.opacity)}`);
  if ('rotation' in node && node.rotation !== 0) props.push(`rotation=${String(node.rotation)}`);
  // Appearance
  if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) props.push(`fills=${compactPaints(node.fills as unknown as Array<Record<string, unknown>>)}`);
  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) props.push(`strokes=${compactPaints(node.strokes as unknown as Array<Record<string, unknown>>)}`);
  if ('strokeWeight' in node && node.strokeWeight !== 1) props.push(`strokeWeight=${String(node.strokeWeight)}`);
  if ('cornerRadius' in node && node.cornerRadius !== 0) props.push(`cornerRadius=${String(node.cornerRadius)}`);
  // Text
  if ('characters' in node) props.push(`characters="${node.characters}"`);
  if ('fontFamily' in node) {
    props.push(
      `fontFamily="${node.fontFamily}"`,
      `fontSize=${String(node.fontSize)}`,
      `fontWeight=${String(node.fontWeight)}`,
      `lineHeight=${String(node.lineHeight)}`,
      `letterSpacing=${String(node.letterSpacing)}`,
      `textAlignHorizontal="${node.textAlignHorizontal}"`,
      `textAlignVertical="${node.textAlignVertical}"`,
      `textAutoResize="${node.textAutoResize}"`,
    );
  }
  // Layout (frames)
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    props.push(
      `layoutMode="${node.layoutMode}"`,
      `itemSpacing=${String(node.itemSpacing)}`,
      `paddingTop=${String(node.paddingTop)}`,
      `paddingRight=${String(node.paddingRight)}`,
      `paddingBottom=${String(node.paddingBottom)}`,
      `paddingLeft=${String(node.paddingLeft)}`,
    );
  }
  if ('clipsContent' in node && node.clipsContent) props.push('clipsContent=true');
  // Shape-specific
  if ('sides' in node) props.push(`sides=${String(node.sides)}`);
  if ('points' in node) props.push(`points=${String(node.points)}`, `innerRadius=${String(node.innerRadius)}`);
  if ('shapeType' in node) props.push(`shapeType="${node.shapeType}"`);
  // Vector paths (include so AI can recreate vectors)
  if ('paths' in node && Array.isArray(node.paths) && node.paths.length > 0) {
    props.push(`paths=${JSON.stringify(node.paths)}`);
    if ('pathWidth' in node && node.pathWidth != null) props.push(`pathWidth=${String(node.pathWidth)}`);
    if ('pathHeight' in node && node.pathHeight != null) props.push(`pathHeight=${String(node.pathHeight)}`);
  }
  // Visibility
  if (!node.visible) props.push('visible=false');
  return `[${props.join(', ')}]`;
}

/**
 * Recursively serialize a node and its children as an indented tree.
 * Limits depth to avoid excessive token usage.
 */
function serializeSubtree(sg: SceneGraph, nodeId: NodeId, depth: number, maxDepth: number): string {
  const node = sg.getNode(nodeId);
  if (!node) return '';

  const indent = '  '.repeat(depth);
  let result = `${indent}${serializeNodeProps(node)}`;

  if (depth < maxDepth && node.children.length > 0) {
    const childLines = node.children
      .map((childId) => serializeSubtree(sg, childId, depth + 1, maxDepth))
      .filter(Boolean);
    if (childLines.length > 0) {
      result += `\n${indent}  children:\n${childLines.join('\n')}`;
    }
  } else if (node.children.length > 0) {
    result += ` (${String(node.children.length)} children, not expanded)`;
  }

  // Include slot children (e.g., text slot on compound nodes)
  if ('slots' in node && node.slots) {
    const slots = node.slots as unknown as Record<string, NodeId>;
    for (const [slotName, slotId] of Object.entries(slots)) {
      const slotNode = sg.getNode(slotId);
      if (slotNode) {
        result += `\n${indent}  slot.${slotName}: ${serializeNodeProps(slotNode)}`;
      }
    }
  }

  return result;
}

/**
 * Serialize a node's position and size as a compact summary (no children).
 */
function serializeNodeBounds(node: SceneNode): string {
  const parts: string[] = [`type=${node.type}`, `id=${String(node.id)}`, `name="${node.name}"`];
  if ('x' in node) parts.push(`x=${String(node.x)}`, `y=${String(node.y)}`, `width=${String(node.width)}`, `height=${String(node.height)}`);
  return `[${parts.join(', ')}]`;
}

/**
 * Serialize selected nodes with their full subtrees for AI context.
 * Includes parent node bounds so the AI knows where to place new nodes relative to the selection.
 */
export function serializeSelectedNodes(sg: SceneGraph, selectedIds: ReadonlySet<NodeId>, canvasId: NodeId): string {
  const trees: string[] = [];
  const parentIds = new Set<NodeId>();

  for (const id of selectedIds) {
    const tree = serializeSubtree(sg, id, 0, 3);
    if (tree) trees.push(tree);
    // Collect non-canvas parent IDs for spatial context
    const node = sg.getNode(id);
    if (node?.parentId != null && node.parentId !== canvasId) {
      parentIds.add(node.parentId);
    }
  }

  if (trees.length === 0) return `[Canvas ID: ${String(canvasId)}]\nNo objects selected.`;

  let result = `[Canvas ID: ${String(canvasId)}]\nSelected objects:\n${trees.join('\n\n')}`;

  // Include parent containers so the AI can place new nodes within bounds
  if (parentIds.size > 0) {
    const parentLines: string[] = [];
    for (const pid of parentIds) {
      const parentNode = sg.getNode(pid);
      if (parentNode) parentLines.push(serializeNodeBounds(parentNode));
    }
    if (parentLines.length > 0) {
      result += `\n\nParent containers (place new nodes within these bounds):\n${parentLines.join('\n')}`;
    }
  }

  return result;
}

/**
 * Create a node with type defaults, handling compound nodes (STICKY_NOTE, SHAPE_WITH_TEXT).
 * If the AI passes `characters` for a compound node, it's applied to the auto-created text slot.
 * Returns the new node's string ID.
 */
export function createNodeWithDefaults(
  sg: SceneGraph,
  nodeType: string,
  parentId: NodeId,
  props: Record<string, unknown>,
): string {
  const type = nodeType as NodeType;

  // For compound nodes (STICKY_NOTE, SHAPE_WITH_TEXT), extract text properties
  // intended for the auto-created slot child. For TEXT nodes, keep all props.
  const isCompoundType = type === 'STICKY_NOTE' || type === 'SHAPE_WITH_TEXT';
  const textProps: Record<string, unknown> = {};
  const nodeProps: Record<string, unknown> = {};

  if (isCompoundType) {
    // Font-related fields go to the text slot child; `characters` stays on
    // the compound node itself because the renderer reads it directly from
    // the sticky/shape node, NOT from the text slot.
    const TEXT_SLOT_FIELDS = new Set([
      'fontFamily', 'fontSize', 'fontWeight',
      'lineHeight', 'letterSpacing', 'textAlignHorizontal',
      'textAlignVertical', 'textAutoResize',
    ]);
    for (const [key, value] of Object.entries(props)) {
      if (TEXT_SLOT_FIELDS.has(key)) {
        textProps[key] = value;
      } else {
        nodeProps[key] = value;
      }
    }
  } else {
    Object.assign(nodeProps, props);
  }

  // Force textAutoResize to NONE for TEXT nodes so explicit width/height are respected.
  // The canvas has no text layout engine, so auto-resize would compute 0 dimensions.
  if (type === 'TEXT') {
    nodeProps.textAutoResize = 'NONE';
  }

  // AI-created sticky notes should show "Claude · AI" as the author
  if (type === 'STICKY_NOTE' && !('authorName' in nodeProps)) {
    nodeProps.authorName = 'Claude \u00B7 AI';
  }

  const node = sg.createNode(type, parentId, { ...getTypeDefaults(type), ...nodeProps });

  // For compound nodes, apply font properties to the auto-created text slot
  if (isCompoundNode(node) && Object.keys(textProps).length > 0) {
    const textSlotId = getTextSlotId(node);
    if (textSlotId != null) {
      sg.updateNode(textSlotId, textProps);
    }
  }

  return String(node.id);
}

/**
 * Update a node, routing font properties to the text slot for compound nodes.
 * `characters` stays on the compound node (the renderer reads it from there).
 * Only font-related fields are routed to the text slot child.
 */
export function updateNodeWithTextRouting(
  sg: SceneGraph,
  nodeId: NodeId,
  updates: Record<string, unknown>,
): void {
  const node = sg.getNode(nodeId);
  if (!node) return;

  if (isCompoundNode(node)) {
    const TEXT_SLOT_FIELDS = new Set([
      'fontFamily', 'fontSize', 'fontWeight',
      'lineHeight', 'letterSpacing', 'textAlignHorizontal',
      'textAlignVertical', 'textAutoResize',
    ]);
    const textUpdates: Record<string, unknown> = {};
    const nodeUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (TEXT_SLOT_FIELDS.has(key)) {
        textUpdates[key] = value;
      } else {
        nodeUpdates[key] = value;
      }
    }
    if (Object.keys(nodeUpdates).length > 0) {
      sg.updateNode(nodeId, nodeUpdates);
    }
    if (Object.keys(textUpdates).length > 0) {
      const textSlotId = getTextSlotId(node);
      if (textSlotId != null) {
        sg.updateNode(textSlotId, textUpdates);
      }
    }
  } else {
    sg.updateNode(nodeId, updates);
  }
}
