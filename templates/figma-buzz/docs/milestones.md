# Milestones

Each milestone is scoped to roughly one day of work with heavy AI assistance.
Status: `[ ]` not started, `[~]` in progress, `[x]` done.

## Dependency graph

```
M1 App Shell ──────────┬──────────> M5 Layers Panel ─────┐
                       │                                  │
M2 Scene Graph ────────┼──────────> M6 Properties Panel ──┼──> M9 Integration
                       │                                  │
M3 Tailwind Theme ─────┘                                  │
                                                          │
M4a Viewport ──> M4b Rendering ──> M7 Selection ──────────┘
                                                          │
                                   M8 Toolbar ────────────┘
```

### Parallel tracks

Three independent tracks can be worked on simultaneously:

```
Track A (Data):      M2 Scene Graph
Track B (Shell):     M1 App Shell ──> M3 Tailwind Theme
Track C (Canvas):    M4a Viewport ──> M4b Rendering ──> M7 Selection
```

After tracks converge, panels and toolbar can also be parallelized:

```
Track D (Panels):    M5 Layers Panel ┐
Track E (Panels):    M6 Properties   ├──> M9 Integration
Track F (Toolbar):   M8 Toolbar      ┘
```

---

## M1: App shell and layout `[x]`

Set up the foundational grid layout that all other work builds on.

### Deliverables

- [x] `<App>` component: CSS grid with three columns (left sidebar, canvas,
      right sidebar) and a bottom toolbar region
- [x] `<Providers>` wrapper with FPL `<ThemeProvider>`
- [ ] `<Layers>` portal system for overlay regions (dynamic + fixed layers)
- [x] Left sidebar chrome: file name header, Pages section, Layers section
      (empty placeholders)
- [x] Right sidebar chrome: Design/Prototype tabs, section headers (Position,
      Layout, Appearance, Fill, Stroke, Effects, Export)
- [x] Bottom toolbar bar (empty, styled)
- [x] Top-right header area (avatar, play, share button)
- [x] Verify no state at the `<App>` level — all state in providers

### Layout spec

```
┌──────────┬────────────────────────────────┬──────────────┐
│ 240px    │           1fr                  │   260px      │
│          │                                │              │
│  LEFT    │          CANVAS                │   RIGHT      │
│  SIDEBAR │                                │   SIDEBAR    │
│          │                                │              │
│          │                                │              │
├──────────┴──────────────┬─────────────────┴──────────────┤
│                         │ 48px toolbar                   │
└─────────────────────────┴────────────────────────────────┘
```

---

## M2: Scene graph data model `[x]`

Build the data layer that everything reads from. No UI — pure data and logic.

### Deliverables

- [x] `SceneNode` union type: `FrameNode | RectangleNode | EllipseNode |
      TextNode | LineNode | GroupNode`
- [x] `SceneGraph` class/store with tree structure (nodes have parent + children
      references)
- [x] CRUD API: `createNode`, `updateNode`, `deleteNode`, `reparentNode`,
      `reorderNode`
- [x] Style system: defaults per node type, only overrides stored
- [x] `SceneGraphProvider` + `useSceneGraph()` hook
- [x] Hardcoded demo scene matching north star: one blue rectangle, one peach
      ellipse with brown stroke
- [x] Traversal helpers: `walk`, `findById`, `getAncestors`, `getDescendants`

### Node type sketch

```
BaseNode {
  id: string
  name: string
  type: NodeType
  parent: string | null
  children: string[]
  visible: boolean
  locked: boolean
}

GeometryNode extends BaseNode {
  x, y, width, height: number
  rotation: number
  opacity: number
  cornerRadius: number
  fills: Fill[]
  strokes: Stroke[]
  effects: Effect[]
}

FrameNode extends GeometryNode {
  type: 'FRAME'
  clipsContent: boolean
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
}

RectangleNode extends GeometryNode { type: 'RECTANGLE' }
EllipseNode extends GeometryNode { type: 'ELLIPSE' }
```

---

## M3: Tailwind FPL theme `[x]`

Set up tailwind v4 with an FPL-aligned custom theme so all subsequent UI work
can use utility classes that match Figma's design system.

### Deliverables

- [ ] Create `@figma/fpl-tailwind-config` package under `fpl/foundations/` (based on
      the ai-prototype-scaffold reference)
- [ ] Map FPL tokens to tailwind: colors, spacing, radius, shadows, font
      families, font weights, z-index, durations
- [ ] Wire into protofig's `vite.config.ts`
- [ ] Verify classes work: `bg-bg`, `text-text`, `rounded-md`, `shadow-x200`
- [ ] Document the mapping in `docs/tailwind-theme.md`

---

## M4a: Canvas viewport `[x]`

The coordinate system and gesture handling for the infinite canvas.

**Reference**: https://github.com/bschlenk/affine-explorer/blob/main/src/hooks/use-origin-scale.ts
— prior art for the `{ origin, scale }` model and wheel gesture handling. Can
be adapted directly or used as a reference.

### Deliverables

- [x] `ViewportProvider` storing a 2D affine transform matrix
- [x] `useViewport()` hook exposing: `matrix`, `zoom`, `offset`,
      `screenToWorld(x, y)`, `worldToScreen(x, y)`
- [x] Scroll handler: pan the viewport on wheel events
- [x] Pinch handler: zoom on pinch/ctrl+wheel (zoom toward cursor)
- [ ] Zoom controls: zoom to fit, zoom to 100%, zoom in/out
- [x] Canvas background: subtle dot grid that moves with viewport

### Coordinate system

```
World space (infinite):
  ───────────────────────────>  +X
  │
  │     ┌─────────┐
  │     │  Frame   │
  │     │  (200,   │
  │     │   150)   │
  │     └─────────┘
  │
  ▼ +Y

Screen space (viewport window):
  Determined by: screenPos = matrix * worldPos
  matrix = [scaleX, 0, 0, scaleY, translateX, translateY]
```

---

## M4b: Canvas rendering `[x]`

Render the scene graph as actual DOM nodes inside the viewport.

**Depends on**: M2 (scene graph), M4a (viewport)

### Deliverables

- [x] `<CanvasRenderer>` component that reads scene graph and viewport
- [x] Frames render as `<div>` elements (clip children, supports future
      flexbox/grid)
- [x] Rectangles render as `<div>` with border-radius
- [x] Ellipses render as `<svg>` with `<ellipse>` element
- [x] Apply world-space transforms: position, size, rotation
- [x] Apply styles: fills (solid color), strokes (color, weight, position),
      opacity, corner radius
- [ ] Viewport culling: skip nodes entirely outside the viewport
- [x] Nodes render in correct z-order (scene graph order)

### Rendering strategy

```
<div class="canvas-world" style="transform: matrix(...)">
  ┌─ FrameNode ─────────────────────────────────────────┐
  │  <div style="position:absolute; left; top; w; h;    │
  │    background: fill; border: stroke; overflow:clip"> │
  │    {children}                                        │
  │  </div>                                              │
  └──────────────────────────────────────────────────────┘

  ┌─ EllipseNode ───────────────────────────────────────┐
  │  <svg style="position:absolute; left; top; w; h;">   │
  │    <ellipse cx cy rx ry fill stroke stroke-width />  │
  │  </svg>                                              │
  └──────────────────────────────────────────────────────┘

  ┌─ RectangleNode ─────────────────────────────────────┐
  │  <div style="position:absolute; left; top; w; h;    │
  │    background: fill; border: stroke; border-radius"> │
  │  </div>                                              │
  └──────────────────────────────────────────────────────┘
</div>
```

---

## M5: Layers panel `[x]`

The left sidebar tree view of the scene graph.

**Depends on**: M1 (app shell), M2 (scene graph)

### Deliverables

- [x] List all nodes from scene graph with proper nesting/indentation
- [x] Node type icons (rectangle, ellipse, frame, text, etc.) from `@figma/fpl-icons`
- [x] Node names as editable text (double-click to rename)
- [x] Click to select (wired to shared selection state)
- [x] Selected node highlighted with blue background
- [x] Visibility toggle (eye icon)
- [ ] Drag to reorder (stretch goal)

### Panel layout

```
┌─────────────────────────┐
│ Layers                  │
├─────────────────────────┤
│ ● Ellipse 1        [👁] │  ← selected (blue bg)
│ □ Rectangle 1      [👁] │
└─────────────────────────┘
```

---

## M6: Properties panel `[x]`

The right sidebar showing properties of the selected node.

**Depends on**: M1 (app shell), M2 (scene graph)

### Deliverables

- [x] Show node type name and icons in header
- [x] Position section: X/Y inputs, rotation input
- [x] Layout section: W/H inputs
- [x] Appearance section: opacity input, corner radius input
- [x] Fill section: color swatch, hex input, opacity %
- [x] Stroke section: color swatch, hex input, opacity %, position dropdown
      (inside/center/outside), weight input
- [x] Effects section header (placeholder)
- [x] Export section header (placeholder)
- [x] All inputs wired to scene graph — editing updates the node
- [ ] Alignment buttons in Position section
- [ ] Constrain proportions toggle in Layout section
- [ ] Fill/stroke visibility toggle and add/remove buttons

### Panel layout

```
┌───────────────────────────┐
│ Design  Prototype   100%  │
├───────────────────────────┤
│ Ellipse   ⚙ ◐ ❐ ⋯       │
├───────────────────────────┤
│ Position                  │
│ [≡][+][≡] [T][+][⊥]     │
│ X [-81    ] Y [-106    ]  │
│ Rotation [0°]             │
├───────────────────────────┤
│ Layout                    │
│ W [206    ] H [206     ]  │
├───────────────────────────┤
│ Appearance                │
│ Opacity [100%] Radius [0] │
├───────────────────────────┤
│ Fill                  + — │
│ [■ EAAB92] [100 %] 👁    │
├───────────────────────────┤
│ Stroke                + — │
│ [■ 623928] [100 %] 👁    │
│ Position [Inside] Wt [2]  │
├───────────────────────────┤
│ Effects               + — │
├───────────────────────────┤
│ Export                + — │
└───────────────────────────┘
```

---

## M7: Selection system `[x]`

Click-to-select on the canvas with visual feedback.

**Depends on**: M4b (rendering), M2 (scene graph)

### Deliverables

- [x] `SelectionProvider` + `useSelection()` hook (selected node IDs)
- [x] Click a rendered node to select it
- [x] Click empty canvas to deselect
- [x] Shift+click for multi-select
- [x] Selection UI overlay (2D canvas layer):
  - Blue outline around selected nodes
  - Resize handles at corners and edge midpoints
  - Dimension label below selection (e.g. "206 x 206")
- [x] Selection synced between canvas and layers panel
- [x] Hit testing: topmost visible node wins

### Selection overlay

```
     ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
     ◻                      ◻    ◻ = resize handle
     │                      │    ── = blue outline
            ┌──────┐
     │      │shape │        │
            └──────┘
     ◻                      ◻
     └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
            [206 × 206]          dimension label
```

---

## M8: Bottom toolbar `[x]`

The floating tool bar at the bottom of the canvas.

**Depends on**: M1 (app shell)

### Deliverables

- [x] Toolbar container: centered, floating, rounded, with shadow
- [x] Tool icons from `@figma/fpl-icons`: Move, Frame, Rectangle, Ellipse, Text, Pen
- [x] Active tool highlight
- [x] `ToolProvider` + `useActiveTool()` hook
- [ ] Dropdown menus on tools with chevrons (shape picker: rectangle, ellipse,
      line, polygon, star)
- [x] Keyboard shortcuts: V (move), F (frame), R (rect), O (ellipse), T (text)

### Toolbar layout

```
┌───────────────────────────────────────────────────┐
│  [↖ ▾] [⊞ ▾] [○ ▾] [◇ ▾] [T] [✎] [⬡] [⚙]  │  [✧] [▣] [</>] │
└───────────────────────────────────────────────────┘
```

---

## M9: Integration and polish `[~]`

Wire everything together and make it feel like the north star screenshot.

**Depends on**: M5, M6, M7, M8

### Deliverables

- [x] All panels reading from shared scene graph and selection state
- [x] Editing a property in the right panel updates the canvas in real-time
- [x] Selecting on canvas highlights in layers panel and populates properties
- [x] Toolbar tool selection affects canvas interaction mode
- [x] File name in top-left ("Untitled"), "Drafts" subtitle
- [x] Pages section with "Page 1"
- [x] Top-right: user avatar, play button, Share button
- [x] Design/Prototype tab toggle in right sidebar header
- [x] Zoom percentage display
- [x] Overall visual polish pass to match north star screenshot
