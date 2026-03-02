# Scene graph

The scene graph is the core data model. It represents every object on the
canvas as a typed node in a tree structure.

## Data model

### Node types

```
NodeType = 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'LINE' | 'GROUP'
```

### Base node

Every node has these fields:

```ts
interface BaseNode {
  /** Unique identifier */
  id: string
  /** Display name shown in layers panel */
  name: string
  /** Discriminator for node behavior */
  type: NodeType
  /** Parent node ID, null for root nodes */
  parentId: string | null
  /** Ordered child node IDs */
  children: string[]
  /** Whether the node is visible */
  visible: boolean
  /** Whether the node is locked (can't be selected on canvas) */
  locked: boolean
}
```

### Geometry

Shared by all visual nodes:

```ts
interface GeometryMixin {
  /** Position in parent's coordinate space */
  x: number
  y: number
  /** Dimensions */
  width: number
  height: number
  /** Rotation in degrees, clockwise */
  rotation: number
  /** Opacity 0-1 */
  opacity: number
}
```

### Appearance

```ts
interface AppearanceMixin {
  /** Corner radius (uniform for now) */
  cornerRadius: number
  /** Fill paints, rendered bottom to top */
  fills: Paint[]
  /** Stroke paints */
  strokes: Stroke[]
  /** Visual effects (shadows, blurs) */
  effects: Effect[]
}
```

### Paints and strokes

```ts
interface SolidPaint {
  type: 'SOLID'
  color: { r: number; g: number; b: number }
  opacity: number
  visible: boolean
}

type Paint = SolidPaint
// Future: GradientPaint, ImagePaint

interface Stroke {
  paint: Paint
  weight: number
  position: 'INSIDE' | 'CENTER' | 'OUTSIDE'
}

interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR'
  visible: boolean
  // ... type-specific fields
}
```

### Concrete node types

```ts
interface FrameNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'FRAME'
  /** Whether children are clipped to frame bounds */
  clipsContent: boolean
  /** Auto-layout direction */
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  /** Gap between auto-layout children */
  itemSpacing: number
  /** Padding */
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
}

interface RectangleNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'RECTANGLE'
}

interface EllipseNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'ELLIPSE'
}

interface TextNode extends BaseNode, GeometryMixin, AppearanceMixin {
  type: 'TEXT'
  characters: string
  fontSize: number
  fontWeight: number
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT'
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM'
}

interface LineNode extends BaseNode, GeometryMixin {
  type: 'LINE'
  strokes: Stroke[]
}

interface GroupNode extends BaseNode {
  type: 'GROUP'
  /** Groups don't have their own geometry — bounds are derived */
}

type SceneNode =
  | FrameNode
  | RectangleNode
  | EllipseNode
  | TextNode
  | LineNode
  | GroupNode
```

## Store structure

Flat map for O(1) lookups, tree structure via ID references:

```
┌─────────────────────────────────────────────┐
│ SceneGraphStore                             │
│                                             │
│  nodes: Map<string, SceneNode>              │
│    "node_1" → { type: 'RECTANGLE', ... }   │
│    "node_2" → { type: 'ELLIPSE', ... }     │
│                                             │
│  rootIds: ["node_1", "node_2"]              │
│    (top-level ordering)                     │
│                                             │
│  Tree derived from parent/children refs:    │
│                                             │
│    [root]                                   │
│    ├── node_1 (Rectangle 1)                 │
│    └── node_2 (Ellipse 1)                   │
│                                             │
└─────────────────────────────────────────────┘
```

## API

```ts
interface SceneGraphAPI {
  /** Get a node by ID */
  getNode(id: string): SceneNode | undefined

  /** Get all root-level nodes in order */
  getRootNodes(): SceneNode[]

  /** Create a new node and add to the tree */
  createNode(type: NodeType, props: Partial<SceneNode>): SceneNode

  /** Update properties on a node */
  updateNode(id: string, updates: Partial<SceneNode>): void

  /** Delete a node and its descendants */
  deleteNode(id: string): void

  /** Move a node to a new parent at a given index */
  reparentNode(id: string, newParentId: string | null, index: number): void

  /** Reorder a node within its siblings */
  reorderNode(id: string, newIndex: number): void

  /** Walk the tree depth-first */
  walk(callback: (node: SceneNode, depth: number) => void): void

  /** Find a node by ID */
  findById(id: string): SceneNode | undefined

  /** Get all ancestors from node to root */
  getAncestors(id: string): SceneNode[]

  /** Get all descendants depth-first */
  getDescendants(id: string): SceneNode[]
}
```

## Defaults

To keep storage minimal, only non-default values are persisted. Defaults per
mixin:

```ts
const GEOMETRY_DEFAULTS = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
}

const APPEARANCE_DEFAULTS = {
  cornerRadius: 0,
  fills: [{ type: 'SOLID', color: { r: 196, g: 196, b: 196 }, opacity: 1, visible: true }],
  strokes: [],
  effects: [],
}

const FRAME_DEFAULTS = {
  clipsContent: true,
  layoutMode: 'NONE',
  itemSpacing: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
}
```

## Demo scene (north star)

The initial hardcoded scene matching the screenshot:

```ts
const DEMO_SCENE: SceneNode[] = [
  {
    id: 'rect_1',
    name: 'Rectangle 1',
    type: 'RECTANGLE',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: 410,
    y: 180,
    width: 300,
    height: 250,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [{ type: 'SOLID', color: { r: 126, g: 200, b: 227 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
  },
  {
    id: 'ellipse_1',
    name: 'Ellipse 1',
    type: 'ELLIPSE',
    parentId: null,
    children: [],
    visible: true,
    locked: false,
    x: 530,
    y: 270,
    width: 206,
    height: 206,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0,
    fills: [{ type: 'SOLID', color: { r: 234, g: 171, b: 146 }, opacity: 1, visible: true }],
    strokes: [
      {
        paint: { type: 'SOLID', color: { r: 98, g: 57, b: 40 }, opacity: 1, visible: true },
        weight: 2,
        position: 'INSIDE',
      },
    ],
    effects: [],
  },
]
```
