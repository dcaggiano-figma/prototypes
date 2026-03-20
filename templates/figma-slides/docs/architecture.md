# Architecture

Canonical architecture for the shared canvas system used by `apps/prototype`
and the canvas-based templates.

## Core principles

- Shared document model: node types, scene graph, selection semantics, undo,
  viewport math, behavior infrastructure, rendering infrastructure, connectors,
  and grid utilities live in `packages/shared`.
- Template-local composition: each template chooses its tool chains, renderers,
  visual treatments, and product-specific wrappers without forking shared
  foundations.
- No product branching in shared code: shared modules can understand all node
  types, but they should not switch on template or product identity.
- Cross-template interoperability matters: new persistent node concepts belong
  in shared so copy/paste and document operations work everywhere.

## High-level structure

The system has four major layers:

1. `packages/shared/src/scene-graph/`
   Pure TypeScript document model and undo/redo primitives.
2. `packages/shared/src/canvas/`
   React bindings, viewport, selection APIs, rendering infrastructure,
   behaviors, connectors, grid utilities, and editing helpers.
3. Template-local canvas code
   Tool chains, node renderers, template-specific behaviors, and product UI.
4. App shell
   Sidebars, toolbars, panels, routing, and other product surfaces.

## Providers and ownership

The exact provider tree differs slightly by template, but the ownership model is
consistent:

- `SceneGraphProvider` owns the `SceneGraph` instance and active canvas/page.
- `UndoManagerProvider` records scene-graph mutations through the shared commit
  model.
- `ViewportProvider` owns a stable `Viewport` instance and exposes both
  imperative access (`useViewport()`) and reactive state (`useViewportState()`).
- `SelectionProvider` exposes selection APIs, but the selection state itself
  lives on the active `CanvasNode` inside the scene graph.
- Text-editing, label-editing, connector endpoint drag, and tool providers sit
  alongside these shared foundations where needed.
- Rendering is coordinated through the shared rendering infrastructure, usually
  via a template-local render bridge that wires the current scene graph and
  viewport into the shared render loop.

The important rule is that React providers expose and coordinate model objects;
they are not alternate sources of truth for document state.

## Scene graph

The document model is a flat `Map<NodeId, SceneNode>` plus tree references via
`parentId` and `children`. The hierarchy is:

`DOCUMENT -> CANVAS -> scene nodes`

Every persistent canvas object is a shared node type. The current union includes
document/page nodes, shape primitives, text, groups, connectors, sticky notes,
slides, and grid sections.

Selection is stored on each `CanvasNode` as an immutable `Selection` object.
This keeps selection semantics inside the document model, which lets undo/redo,
copy/paste, and shared selection utilities operate consistently.

## Viewport

Viewport state is owned by a stable `Viewport` class instance, not mirrored as
independent React state.

Key properties:

- single source of truth for pan and zoom
- `worldToScreen()` and `screenToWorld()` conversions
- subscription API for reactive UI
- dirty tracking for render-loop coordination

`useViewport()` is for imperative access. `useViewportState()` is for reactive
subscribers that need rerenders.

## Rendering

Rendering uses a shared 3-layer model coordinated by a render loop:

1. Node layer
   DOM/SVG nodes that represent the document itself.
2. Canvas overlay layer
   Screen-space `<canvas>` for selection outlines, dimension labels, drag
   boxes, hover affordances, and other paint-driven overlays.
3. React overlay layer
   Screen-space React UI that tracks nodes when DOM components are a better fit
   than canvas drawing.

Shared rendering infrastructure includes:

- `RenderLoop`
- node registry and `useNodeRef()`
- imperative style application for dirty nodes
- `useTrackNode()` for overlay tracking
- shared sticky-note and shape-text overlay helpers

The render loop keeps node updates and overlays in sync so interactions do not
detach visually.

## Behavior system

Pointer interactions are handled by composable `Behavior` objects.

Shared behavior infrastructure provides:

- `BehaviorManager`
- hit testing
- shared behavior factories such as pan, hover, move, box select, shape
  creation, pencil, text, comment, and grid drag

Templates assemble these into tool-specific chains in priority order. That is
the main extension seam for product-specific interaction design.

Preferred pattern:

- shared event logic where behavior is genuinely common
- template-local wrappers, callbacks, or render hooks where product behavior
  differs

Avoid:

- monolithic pointer logic in `Canvas.tsx`
- template checks inside shared behaviors
- duplicate local behavior managers

## Editing and properties

Property editing flows through shared selection-property hooks and the shared
undo model.

Important patterns:

- document mutations go through scene-graph APIs
- scrubs and drags use commit boundaries intentionally
- mixed values are handled through shared selection-property and formatter
  infrastructure
- text and label editing use shared providers when the editing model is common

## Connectors and grid

Connectors and grid/layout utilities are shared infrastructure, not isolated
template inventions.

This means reviews should treat these as established seams:

- shared connector path/point/resolution helpers
- shared connector renderer and overlay support
- shared grid layout and grid manager utilities

Templates can choose whether and how to expose those concepts in the UI, but
they should not re-model them from scratch.

## Template-local responsibilities

Templates still own:

- behavior chain assembly for their tool system
- product-specific renderers and visual styling
- template-specific node affordances layered on top of shared node types
- app shell UI, menus, sidebars, and product panels

The goal is not to push everything into shared. The goal is to keep shared
abstractions canonical and keep template differences compositional.

## Review heuristics

When evaluating changes, prefer these outcomes:

- extend a shared abstraction instead of creating a parallel local one
- inject callbacks or render helpers instead of branching on template identity
- add truly reusable node types in shared
- solve transient interaction problems with behaviors before adding persistent
  document model

If a doc and the code disagree about where an abstraction belongs, follow the
shared exports and live template integrations.
