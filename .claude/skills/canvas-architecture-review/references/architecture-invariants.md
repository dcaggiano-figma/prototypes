# Architecture Invariants

Use these invariants to evaluate whether a change fits the canvas/template architecture.

## Source-of-truth note

If architecture docs and code diverge, prefer these sources in order:
- current code in `packages/shared/src/canvas/index.ts` and `packages/shared/src/scene-graph/`
- current template composition code such as template-local `behaviors.ts`, render bridges, and provider trees
- docs, when they still match the code

Do not approve a duplicate abstraction just because a doc failed to mention the shared one.

## 1. Shared foundations stay shared

These concepts belong in shared code when they define the common model of the canvas system:
- node types
- scene-graph data model and mutation API
- selection semantics and invariants
- viewport math
- undo/redo recording semantics
- shared behavior machinery
- shared rendering infrastructure
- shared connector primitives
- shared grid/layout primitives
- shared label/text-editing infrastructure when the editing model is common

Review flags:
- a template creates its own competing scene-graph, selection, viewport, or undo abstraction
- a template reimplements shared behavior-manager concepts locally
- a shared primitive is copied into multiple templates instead of extended once in shared

Preferred pattern:
- extend the shared abstraction once, then let templates opt into it

Examples of already-shared surfaces:
- behavior factories and behavior-manager infrastructure
- 3-layer rendering infrastructure
- connector path/point/resolution utilities
- grid layout / grid manager utilities
- label editing and text-editing providers
- selection-property hooks and paint helpers

## 2. Node types must preserve interoperability

The system goal is that nodes can move between prototypes and templates. A new node type should almost never exist only inside one template.

Review flags:
- new template-local node type definitions
- local unions or ad hoc "pseudo-node" models that shadow shared node types
- copy/paste code that special-cases a template's private node representation

Preferred pattern:
- if it is a real reusable canvas entity, add the node type in shared so every template can understand it
- keep template-specific rendering or interaction logic local if the model is shared

Escalation question:
- is this truly a new node type, or is it behavior/visual treatment on top of an existing type?

## 3. Prefer behavior composition over product branching

Shared code should not switch on template/product identity.

Review flags:
- `if (template === ...)`
- `switch (productType)`
- checks for figma-design vs figjam vs slides inside shared behaviors, selection code, or rendering foundations
- a single shared behavior with product-specific branches for visuals or interactions

Preferred pattern:
- separate behaviors per template
- separate render functions or event-handler injections composed into a shared behavior shell
- template-specific behavior chains that pick shared pieces and local pieces in different orders

Example:
- bad: shared selection behavior switches outline style by template
- good: shared selection event handling composes with a template-specific outline renderer, or templates choose distinct selection behaviors

## 4. Do not invent a new abstraction when one already exists

The main drift risk is AI code adding a second way to solve the same problem.

Review flags:
- new ad hoc event dispatch on top of the behavior system
- direct pointer logic inside `Canvas.tsx` after behavior extraction
- custom mutation batching that bypasses undo/redo commit patterns
- bespoke subscription/state containers instead of the existing scene-graph or provider APIs
- local formatter/property-state patterns that bypass selection-property hooks

Preferred pattern:
- use the established abstraction, even if it needs extension
- if the abstraction is missing one seam, add that seam instead of routing around it

## 5. Shared code must stay generic, not template-aware

Shared code can know about all node types. It should not know which template is using them.

Review flags:
- shared code imports template settings, constants, tool enums, or template components
- shared modules read product mode to decide behavior
- shared code contains assumptions that only hold in one template's UI

Preferred pattern:
- shared code accepts callbacks, renderers, factories, or behavior arrays from the template layer
- template layer owns its tool selection and visual composition

Current healthy pattern:
- templates compose behavior chains from shared factories and add thin local wrappers where product behavior truly differs

## 6. Distinguish model differences from visual differences

Many changes that look like "new behavior" are actually only visual differences.

Review flags:
- new shared branching for outline styles, handles, labels, or overlays when interactions are otherwise identical
- duplicated interaction logic only because rendering differs

Preferred pattern:
- share the event logic
- inject the visual/render piece

Use this test:
- if pointer acceptance, drag logic, selection semantics, and mutation logic are identical, the system probably wants one interaction abstraction with pluggable rendering

## 7. Distinguish model differences from tool differences

Some requests look like they need a new node type but are actually solved by different mouse behaviors.

Review flags:
- introducing a persistent node type for what is really a transient interaction mode
- encoding tool state into node shape when no durable document data changed

Preferred pattern:
- implement a behavior or compose behaviors differently
- add document model only when the file truly needs to persist a new concept

## 8. Scene graph stays React-decoupled

The scene graph and shared data model should not slide back into React-coupled state.

Review flags:
- React state becoming the source of truth for scene data
- shared model code depending on React lifecycle for correctness
- direct in-place mutation of node fields or nested objects

Preferred pattern:
- scene graph as the authority
- immutable field replacement through scene-graph APIs
- React bindings subscribe to the model, not the reverse

## 9. Preserve render-loop and dirty-tracking principles

The 3-layer rendering model exists to keep overlays and nodes in sync.

Review flags:
- React state updates driving overlay position independently from node updates
- new per-frame work that ignores dirty tracking
- node visuals updated in one path while overlay visuals update in another frame
- reintroducing transform-based positioning where left/top sync is required by current architecture

Preferred pattern:
- shared render loop coordinates DOM node updates, canvas overlay repaint, and React overlay positioning
- reactive state changes that affect paint are flushed into that coordinated frame

## 10. Preserve undo/redo semantics

Mutations should flow through the existing commit model.

Review flags:
- direct mutations that never commit
- new change flows that merge incorrectly or break tainted vs untainted behavior
- selection or property changes bundled in a way that regresses expected undo behavior

Preferred pattern:
- use the undo manager and selection-property hooks
- batch related mutations intentionally
- keep selection-only changes non-tainting where the architecture expects that

## 11. Preserve selection invariants

Selection semantics are part of the architecture, not incidental UI state.

Review flags:
- code that treats selection as an arbitrary mutable set outside the canvas node
- local caches that can drift from the scene graph's selection
- interactions that violate parent/child selection rules or box-select semantics

Preferred pattern:
- selection stored on the canvas node
- use the shared selection APIs and utilities

## 12. Favor extending seams over creating forks

When shared code is close but not quite enough, the right move is usually to add a seam.

Good seams:
- injected render functions
- callbacks for template-local actions
- behavior composition
- node-type render registries
- shared utilities factored out of duplicate template code

Bad seams:
- template checks in shared code
- duplicated copies of shared modules
- escape hatches that bypass invariants

## 13. Prefer canonical seams over doc drift

If a doc and the code disagree about where an abstraction belongs:
- follow the seams shown in shared exports and live template integrations
- update the docs separately if needed, but do not introduce a duplicate implementation to match the docs
