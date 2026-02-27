import type {
  AppearanceMixin, GeometryMixin, GeometryNode, NodeType, Paint, SceneNode, ShapeTextMixin, StickyNoteNode,
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

const STICKY_NOTE_DEFAULTS: Omit<StickyNoteNode, keyof import('../types').BaseNode | keyof GeometryMixin | keyof AppearanceMixin> = {
  characters: '',
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 400,
  authorName: 'You',
  showAuthor: true,
};

const SHAPE_TEXT_DEFAULTS: ShapeTextMixin = {
  characters: '',
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 400,
  textAlignHorizontal: 'CENTER',
};

function getTypeDefaults(type: NodeType): Partial<SceneNode> {
  switch (type) {
    case 'FRAME':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, ...FRAME_DEFAULTS };
    case 'RECTANGLE':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, ...SHAPE_TEXT_DEFAULTS };
    case 'ELLIPSE':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, ...SHAPE_TEXT_DEFAULTS };
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
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, ...SHAPE_TEXT_DEFAULTS, sides: 3 };
    case 'STAR':
      return { ...GEOMETRY_DEFAULTS, ...APPEARANCE_DEFAULTS, ...SHAPE_TEXT_DEFAULTS, points: 5, innerRadius: 0.382 };
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
    case 'STICKY_NOTE':
      return {
        ...GEOMETRY_DEFAULTS,
        ...APPEARANCE_DEFAULTS,
        ...STICKY_NOTE_DEFAULTS,
        width: 240,
        height: 240,
        cornerRadius: 0,
        fills: [{
          type: 'SOLID', color: { r: 255, g: 226, b: 153 }, opacity: 1, visible: true,
        }],
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
    color: { r: 245, g: 244, b: 243 },
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
      const defaultName = type === 'STICKY_NOTE' ? `Sticky Note ${num}` : type === 'SECTION' ? 'Section' : `${type.charAt(0)}${type.slice(1).toLowerCase()} ${num}`;
      const node = {
        id,
        name: props.name ?? defaultName,
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
      const worldPos = getWorldPosition(store, node as GeometryNode);

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
          const parentWorld = getWorldPosition(store, newParent as GeometryNode);
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

// ── Demo scene: FigJam-style sticky notes and shapes ──────────────────

export const DEMO_SCENE: SceneNode[] = [
  // Yellow sticky note
  {
    id: 'sticky_1',
    name: 'Sticky Note 1',
    type: 'STICKY_NOTE',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: -280,
    y: -120,
    width: 240,
    height: 240,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [{ type: 'SOLID', color: { r: 255, g: 226, b: 153 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [{ type: 'DROP_SHADOW', visible: true }],
    characters: 'Welcome to FigJam!',
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 400,
    authorName: 'You',
    showAuthor: true,
  } as SceneNode,
  // Pink sticky note
  {
    id: 'sticky_2',
    name: 'Sticky Note 2',
    type: 'STICKY_NOTE',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: 0,
    y: -140,
    width: 240,
    height: 240,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [{ type: 'SOLID', color: { r: 255, g: 184, b: 168 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [{ type: 'DROP_SHADOW', visible: true }],
    characters: 'Add your ideas here',
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 400,
    authorName: 'You',
    showAuthor: true,
  } as SceneNode,
  // Green sticky note
  {
    id: 'sticky_3',
    name: 'Sticky Note 3',
    type: 'STICKY_NOTE',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: -140,
    y: 160,
    width: 240,
    height: 240,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [{ type: 'SOLID', color: { r: 179, g: 239, b: 189 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [{ type: 'DROP_SHADOW', visible: true }],
    characters: 'Click to edit',
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 400,
    authorName: 'You',
    showAuthor: true,
  } as SceneNode,
  // Purple circle
  {
    id: 'circle_1',
    name: 'Circle 1',
    type: 'ELLIPSE',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: 200,
    y: -60,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [{ type: 'SOLID', color: { r: 196, g: 167, b: 255 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
    characters: 'Ideas',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 400,
    textAlignHorizontal: 'CENTER',
  } as SceneNode,
  // Blue diamond (4-sided polygon)
  {
    id: 'diamond_1',
    name: 'Diamond 1',
    type: 'POLYGON',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: 220,
    y: 80,
    width: 80,
    height: 80,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [{ type: 'SOLID', color: { r: 147, g: 197, b: 253 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
    sides: 4,
    characters: 'Action',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 400,
    textAlignHorizontal: 'CENTER',
  } as SceneNode,
  // Connector line
  {
    id: 'line_1',
    name: 'Connector',
    type: 'LINE',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: 75,
    y: 55,
    width: 125,
    height: 0,
    rotation: -25,
    opacity: 1,
    strokes: [{
      paint: { type: 'SOLID', color: { r: 100, g: 100, b: 100 }, opacity: 1, visible: true },
      weight: 2,
      position: 'CENTER' as const,
    }],
  } as SceneNode,
];
