# Scene Graph

The scene graph is the canonical document model for every canvas-based app and
template in this repo.

It lives in `packages/shared/src/scene-graph/` and is consumed through
`@prototype/shared/canvas`.

## Core model

The scene graph is a pure TypeScript system with no React dependency.

It stores nodes in a flat `Map<NodeId, SceneNode>` and represents tree
structure through `parentId` and `children`. This gives:

- O(1) lookup by node ID
- straightforward reparent/reorder operations
- one shared model that every template can understand

All node fields are treated as immutable values. Mutations replace field values
rather than mutating nested structures in place. This is required for undo/redo
and predictable event snapshots.

## Hierarchy

The document tree is:

`DOCUMENT -> CANVAS -> scene nodes`

- `DOCUMENT` is the root and is not rendered.
- `CANVAS` represents a page and owns page-local state such as
  `backgroundColor` and `selection`.
- All rendered nodes live under a `CANVAS`, either directly or nested under
  other nodes.

## Node IDs

`NodeId` is a 32-bit integer encoded as:

`[12 bits session][20 bits local]`

This supports:

- fast single-player IDs in session `0`
- distinct client sessions for multiplayer-oriented work
- reserved negative-session space for special operations such as paste

Use the shared helpers:

- `makeNodeId(sessionId, localId)`
- `getSessionId(nodeId)`
- `getLocalId(nodeId)`
- `NodeIdGenerator`

## Node types

All persistent node types live in shared so any template can understand them.

The current shared union is:

```ts
type NodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'SECTION'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'LINE'
  | 'GROUP'
  | 'VECTOR'
  | 'POLYGON'
  | 'STAR'
  | 'SHAPE_WITH_TEXT'
  | 'STICKY_NOTE'
  | 'CONNECTOR'
  | 'SLIDE'
  | 'GRID_SECTION'
```

Not every template renders every type, but every template can structurally
understand them.

## Base fields

Every node has these fields from `BaseNode`:

```ts
interface BaseNode {
  id: NodeId
  name: string
  type: NodeType
  parentId: NodeId | null
  children: NodeId[]
  visible: boolean
  locked: boolean
  compoundOwner: NodeId | null
}
```

Important note:

- `children` are user-managed structural children
- implicit slot children are not stored in `children`

## Mixins

Shared capabilities are modeled with mixins.

### GeometryMixin

```ts
interface GeometryMixin {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
}
```

### AppearanceMixin

```ts
interface AppearanceMixin {
  cornerRadius: number
  fills: Paint[]
  strokes: Paint[]
  strokeWeight: number
  strokeAlign: 'INSIDE' | 'CENTER' | 'OUTSIDE'
  effects: Effect[]
}
```

### CompoundMixin

Compound nodes own implicit slot children that are managed by the scene graph.

```ts
interface CompoundMixin {
  slots: Readonly<Record<string, NodeId>>
}
```

## Compound nodes and slots

`TEXT` is the only node type with text properties.

Nodes such as `STICKY_NOTE` and `SHAPE_WITH_TEXT` model editable text by owning
an implicit `TEXT` slot child instead of duplicating text fields on the parent.

Slot rules:

- slots are auto-created with the compound parent
- slots are auto-deleted with the compound parent
- slot children cannot be independently selected, reparented, or deleted
- slot children are hidden from the layers panel
- slot descendants carry `compoundOwner` so structural rules remain enforced

This is a core invariant, not a template preference.

## Selection

Selection is stored on each `CanvasNode` as an immutable `Selection` instance.

That means selection is part of the shared document model, not an arbitrary
React-only set.

Key operations include:

- `withSelected(nodeIds, sg)`
- `withToggled(nodeId, sg)`
- `withAdded(nodeIds, sg)`
- `cleared()`
- `isDirectlySelected(nodeId)`
- `isSelected(nodeId, sg)`
- `getDirectSelection()`
- `getEffectiveSelection(sg)`

Key invariant:

- the direct selection set never contains both an ancestor and its descendant

Selecting a parent removes descendants from the direct set. Descendants remain
effectively selected through ancestry.

## SceneGraph API

### Reads

Representative read operations:

- `getNode(id)`
- `getNodeOrThrow(id)`
- `getDocument()`
- `getCanvases()`
- `getAncestors(id)`
- `getDescendants(id)`
- `walk(rootId, callback)`
- `walkLayersOrder(rootId, callback)`

### Mutations

Representative mutation operations:

- `setNodeField(nodeId, field, value)`
- `updateNode(nodeId, updates)`
- `createNode(type, parentId, props?)`
- `createNodeAt(type, parentId, index, props?)`
- `deleteNode(nodeId)`
- `reparentNode(nodeId, newParentId, index)`
- `reorderNode(nodeId, newIndex)`
- `createCanvas(name, backgroundColor?)`

All persistent document changes should flow through these APIs.

## Events and dirty tracking

The scene graph emits shared events for structural and field changes:

- `field-change`
- `reparent`
- `create`
- `delete`

The scene graph also tracks dirty nodes so the shared render loop can update
only what changed.

Key APIs:

- `addListener(listener)`
- `flushDirty()`
- `hasDirty`

## Undo / redo

Undo is built on scene-graph events and immutable value snapshots.

The shared `UndoManager` uses a buffer/commit model and separate tainted vs
untainted history so workflows such as selection changes vs document changes can
behave correctly.

Review implication:

- direct mutation or bypassing commit boundaries is an architectural bug, not
  just a style issue

## Defaults and shared helpers

Use shared helpers instead of inventing local defaults:

- `getTypeDefaults(type)` for node creation defaults
- shared selection-property helpers for property editing
- shared paint helpers such as `createPaint()`

## React bindings

React bindings are thin adapters over the scene graph and related shared model
objects.

Important hooks exposed through `@prototype/shared/canvas` include:

- `useSceneGraph()`
- `useCanvasId()`
- `useNode(id)`
- `useSelection()`
- `useViewport()`
- `useViewportState()`

These bindings subscribe to model state. They are not alternate sources of
truth for the document.

## Architectural guardrails

When extending the canvas model:

- add truly reusable persistent node concepts in shared
- keep template-specific visuals and behaviors outside the scene-graph core
- preserve compound-node, selection, and undo invariants
- prefer extending shared seams over introducing template-local forks of the
  document model
