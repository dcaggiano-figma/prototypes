import type {
  AppearanceMixin, GeometryMixin, NodeType, Paint, SceneNode,
} from '../types';
import { getWorldPosition, isGeometryNode } from './world-position';

// ── Defaults ──────────────────────────────────────────────────────────

const GEOMETRY_DEFAULTS: GeometryMixin = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
};

const APPEARANCE_DEFAULTS: AppearanceMixin = {
  cornerRadius: 0,
  fills: [{
    type: 'SOLID', color: { r: 196, g: 196, b: 196 }, opacity: 1, visible: true,
  }],
  strokes: [],
  effects: [],
};

const FRAME_DEFAULTS = {
  clipsContent: true,
  layoutMode: 'NONE' as const,
  itemSpacing: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
};

const TEXT_APPEARANCE: AppearanceMixin = {
  cornerRadius: 0,
  fills: [{
    type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true,
  }],
  strokes: [],
  effects: [],
};

const TEXT_DEFAULTS = {
  characters: '',
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 20,
  letterSpacing: 0,
  textAlignHorizontal: 'LEFT' as const,
  textAlignVertical: 'TOP' as const,
  textAutoResize: 'WIDTH_AND_HEIGHT' as const,
};

function getTypeDefaults(type: NodeType): Partial<SceneNode> {
  switch (type) {
    case 'FRAME':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, ...FRAME_DEFAULTS };
    case 'RECTANGLE':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS };
    case 'ELLIPSE':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS };
    case 'TEXT':
      return { ...GEOMETRY_DEFAULTS, ...TEXT_APPEARANCE, ...TEXT_DEFAULTS, width: 120, height: 22 };
    case 'LINE':
      return {
        ...GEOMETRY_DEFAULTS,
        strokes: [{
          paint: { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true },
          weight: 1,
          position: 'CENTER' as const,
        }],
      };
    case 'POLYGON':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, sides: 3 };
    case 'STAR':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, points: 5, innerRadius: 0.382 };
    case 'VECTOR':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, paths: [] };
    case 'SECTION':
      return {
        ...GEOMETRY_DEFAULTS,
        ...APPEARANCE_DEFAULTS,
        fills: [{ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true }],
        strokes: [{
          paint: { type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true },
          weight: 1,
          position: 'INSIDE' as const,
        }],
        cornerRadius: 8,
      };
    case 'GROUP':
      return {};
  }
}

// ── Store ─────────────────────────────────────────────────────────────

let nextId = 1;

function generateId(): string {
  return `node_${nextId++}`;
}

export interface SceneGraphStore {
  /** Get a node by ID */
  getNode(id: string): SceneNode | undefined

  /** Get all root-level nodes in order */
  getRootNodes(): SceneNode[]

  /** Get all nodes as a flat array */
  getAllNodes(): SceneNode[]

  /** Create a new node and add to the tree */
  createNode(type: NodeType, props?: Partial<SceneNode>): SceneNode

  /** Update properties on a node */
  updateNode(id: string, updates: Partial<SceneNode>): void

  /** Delete a node and its descendants */
  deleteNode(id: string): void

  /** Move a node to a new parent at a given index */
  reparentNode(id: string, newParentId: string | null, index: number): void

  /** Reparent a node while preserving its world position (adjusts local coords) */
  reparentNodeAdjusted(id: string, newParentId: string | null): void

  /** Reorder a node within its siblings */
  reorderNode(id: string, newIndex: number): void

  /** Walk the tree depth-first */
  walk(callback: (node: SceneNode, depth: number) => void): void

  /** Find a node by ID (alias for getNode) */
  findById(id: string): SceneNode | undefined

  /** Get all ancestors from node to root */
  getAncestors(id: string): SceneNode[]

  /** Get all descendants depth-first */
  getDescendants(id: string): SceneNode[]

  /** Subscribe to store changes */
  subscribe(listener: () => void): () => void

  /** Get a snapshot for React useSyncExternalStore */
  getSnapshot(): SceneNode[]

  /** Page background fill */
  getPageBackground(): Paint
  /** Update page background fill */
  setPageBackground(fill: Paint): void
}

export function createSceneGraph(initialNodes?: SceneNode[]): SceneGraphStore {
  const nodes = new Map<string, SceneNode>();
  let rootIds: string[] = [];
  const listeners = new Set<() => void>();
  let pageBackground: Paint = {
    type: 'SOLID',
    color: { r: 245, g: 245, b: 245 },
    opacity: 1,
    visible: true,
  };

  // Snapshot for useSyncExternalStore — new array ref on every mutation
  let snapshot: SceneNode[] = [];

  function updateSnapshot() {
    snapshot = rootIds.map((id) => nodes.get(id)!).filter(Boolean);
  }

  function notify() {
    updateSnapshot();
    for (const listener of listeners) {
      listener();
    }
  }

  // Initialize with provided nodes
  if (initialNodes) {
    for (const node of initialNodes) {
      nodes.set(node.id, { ...node });
      if (node.parentId === null) {
        rootIds.push(node.id);
      }
    }
    // Ensure nextId is beyond any existing IDs
    for (const node of initialNodes) {
      const match = node.id.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= nextId) nextId = num + 1;
      }
    }
    updateSnapshot();
  }

  function walkNode(
    nodeId: string,
    depth: number,
    callback: (node: SceneNode, depth: number) => void,
  ) {
    const node = nodes.get(nodeId);
    if (!node) return;
    callback(node, depth);
    for (const childId of node.children) {
      walkNode(childId, depth + 1, callback);
    }
  }

  const store: SceneGraphStore = {
    getNode(id) {
      return nodes.get(id);
    },

    getRootNodes() {
      return rootIds.map((id) => nodes.get(id)!).filter(Boolean);
    },

    getAllNodes() {
      return Array.from(nodes.values());
    },

    createNode(type, props = {}) {
      const defaults = getTypeDefaults(type);
      const id = props.id ?? generateId();
      const num = id.match(/\d+$/)?.[0] ?? id;
      const node = {
        id,
        name: props.name ?? (type === 'SECTION' ? 'Section' : `${type.charAt(0)}${type.slice(1).toLowerCase()} ${num}`),
        type,
        parentId: props.parentId ?? null,
        children: [],
        visible: true,
        locked: false,
        ...defaults,
        ...props,
      } as SceneNode;

      nodes.set(id, node);

      if (node.parentId) {
        const parent = nodes.get(node.parentId);
        if (parent) {
          parent.children.push(id);
        }
      } else {
        rootIds.push(id);
      }

      notify();
      return node;
    },

    updateNode(id, updates) {
      const node = nodes.get(id);
      if (!node) return;
      // Create new object reference so useSyncExternalStore detects changes
      nodes.set(id, { ...node, ...updates } as SceneNode);
      notify();
    },

    deleteNode(id) {
      const node = nodes.get(id);
      if (!node) return;

      // Recursively delete descendants
      for (const childId of [...node.children]) {
        store.deleteNode(childId);
      }

      // Remove from parent's children
      if (node.parentId) {
        const parent = nodes.get(node.parentId);
        if (parent) {
          parent.children = parent.children.filter((cid) => cid !== id);
        }
      } else {
        rootIds = rootIds.filter((rid) => rid !== id);
      }

      nodes.delete(id);
      notify();
    },

    reparentNode(id, newParentId, index) {
      const node = nodes.get(id);
      if (!node) return;

      // Remove from old parent
      if (node.parentId) {
        const oldParent = nodes.get(node.parentId);
        if (oldParent) {
          oldParent.children = oldParent.children.filter((cid) => cid !== id);
        }
      } else {
        rootIds = rootIds.filter((rid) => rid !== id);
      }

      // Add to new parent
      node.parentId = newParentId;
      if (newParentId) {
        const newParent = nodes.get(newParentId);
        if (newParent) {
          newParent.children.splice(index, 0, id);
        }
      } else {
        rootIds.splice(index, 0, id);
      }

      notify();
    },

    reparentNodeAdjusted(id, newParentId) {
      const node = nodes.get(id);
      if (!node || !isGeometryNode(node)) return;

      // Already at the target parent — nothing to do
      if (node.parentId === newParentId) return;

      // Snapshot world position before reparenting
      const worldPos = getWorldPosition(store, node);

      // Remove from old parent
      if (node.parentId) {
        const oldParent = nodes.get(node.parentId);
        if (oldParent) {
          oldParent.children = oldParent.children.filter((cid) => cid !== id);
        }
      } else {
        rootIds = rootIds.filter((rid) => rid !== id);
      }

      // Compute new parent's world position
      let newParentWorldX = 0;
      let newParentWorldY = 0;
      if (newParentId) {
        const newParent = nodes.get(newParentId);
        if (newParent && isGeometryNode(newParent)) {
          const parentWorld = getWorldPosition(store, newParent);
          newParentWorldX = parentWorld.x;
          newParentWorldY = parentWorld.y;
        }
      }

      // Attach to new parent
      node.parentId = newParentId;
      if (newParentId) {
        const newParent = nodes.get(newParentId);
        if (newParent) {
          newParent.children.push(id);
        }
      } else {
        rootIds.push(id);
      }

      // Adjust local coords to preserve world position
      node.x = worldPos.x - newParentWorldX;
      node.y = worldPos.y - newParentWorldY;

      // Update the map entry so React sees the change
      nodes.set(id, { ...node } as SceneNode);

      notify();
    },

    reorderNode(id, newIndex) {
      const node = nodes.get(id);
      if (!node) return;

      if (node.parentId) {
        const parent = nodes.get(node.parentId);
        if (!parent) return;
        parent.children = parent.children.filter((cid) => cid !== id);
        parent.children.splice(newIndex, 0, id);
      } else {
        rootIds = rootIds.filter((rid) => rid !== id);
        rootIds.splice(newIndex, 0, id);
      }

      notify();
    },

    walk(callback) {
      for (const rootId of rootIds) {
        walkNode(rootId, 0, callback);
      }
    },

    findById(id) {
      return nodes.get(id);
    },

    getAncestors(id) {
      const ancestors: SceneNode[] = [];
      let current = nodes.get(id);
      while (current?.parentId) {
        const parent = nodes.get(current.parentId);
        if (!parent) break;
        ancestors.push(parent);
        current = parent;
      }
      return ancestors;
    },

    getDescendants(id) {
      const descendants: SceneNode[] = [];
      const node = nodes.get(id);
      if (!node) return descendants;

      function collect(nodeId: string) {
        const n = nodes.get(nodeId);
        if (!n) return;
        for (const childId of n.children) {
          const child = nodes.get(childId);
          if (child) {
            descendants.push(child);
            collect(childId);
          }
        }
      }

      collect(id);
      return descendants;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot() {
      return snapshot;
    },

    getPageBackground() {
      return pageBackground;
    },

    setPageBackground(fill) {
      pageBackground = fill;
      notify();
    },
  };

  return store;
}

// ── Demo scene: Figma logo from actual SVG paths ─────────────────────

const LOGO_SIZE = 64;

function vectorChild(
  id: string,
  name: string,
  d: string,
  fill: string,
): SceneNode {
  return {
    id,
    name,
    type: 'VECTOR',
    parentId: 'frame_1',
    children: [],
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [],
    strokes: [],
    effects: [],
    paths: [{ d, fill }],
  } as SceneNode;
}

export const DEMO_SCENE: SceneNode[] = [
  {
    id: 'frame_1',
    name: 'Figma Logo',
    type: 'FRAME',
    parentId: null,
    children: ['green_1', 'orange_1', 'blue_1', 'red_1', 'purple_1'],
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [],
    strokes: [],
    effects: [],
    clipsContent: false,
    layoutMode: 'NONE',
    itemSpacing: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  // Bottom-left: Green
  vectorChild(
    'green_1',
    'Green',
    'M11.9999 52.0001C11.9999 46.4772 16.477 42.0001 21.9999 42.0001H31.9999V52.0001C31.9999 57.5229 27.5227 62.0001 21.9999 62.0001V62.0001C16.477 62.0001 11.9999 57.5229 11.9999 52.0001V52.0001Z',
    '#24CB71',
  ),
  // Top-right: Orange
  vectorChild(
    'orange_1',
    'Orange',
    'M32 2V22H42C47.5228 22 52 17.5228 52 12V12C52 6.47715 47.5228 2 42 2L32 2Z',
    '#FF7237',
  ),
  // Middle-right: Blue circle
  vectorChild(
    'blue_1',
    'Blue',
    'M41.9166 21.9999C47.4394 21.9999 51.9166 26.4771 51.9166 31.9999C51.9166 37.5228 47.4394 41.9999 41.9166 41.9999C36.3938 41.9999 31.9166 37.5228 31.9166 31.9999C31.9166 26.4771 36.3938 21.9999 41.9166 21.9999Z',
    '#00B6FF',
  ),
  // Top-left: Red
  vectorChild(
    'red_1',
    'Red',
    'M11.9999 11.9999C11.9999 17.5228 16.477 21.9999 21.9999 21.9999L31.9999 21.9999L31.9999 1.99994L21.9999 1.99994C16.477 1.99994 11.9999 6.47709 11.9999 11.9999V11.9999Z',
    '#FF3737',
  ),
  // Middle-left: Purple
  vectorChild(
    'purple_1',
    'Purple',
    'M11.9999 32.0001C11.9999 37.5229 16.477 42.0001 21.9999 42.0001H31.9999L31.9999 22.0001L21.9999 22.0001C16.477 22.0001 11.9999 26.4772 11.9999 32.0001V32.0001Z',
    '#874FFF',
  ),
];
