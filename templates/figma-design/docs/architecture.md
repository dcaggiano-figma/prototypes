# Architecture

Detailed system architecture for Protofig.

## Component tree

```tsx
<Providers>                    // ← all state lives here
  <ThemeProvider>              //    FPL theme (light/dark, brand)
  <SceneGraphProvider>         //    scene graph store + API
  <SelectionProvider>          //    selected node IDs
  <ViewportProvider>           //    affine transform, zoom, pan
  <ToolProvider>               //    active tool state

  <App>                        // ← CSS grid, ZERO state, never rerenders
    <LeftSidebar>
      <FileHeader />           //    "Untitled" / "Drafts"
      <PagesPanel />           //    page list
      <LayersPanel />          //    node tree
    </LeftSidebar>

    <CanvasArea>
      <CanvasViewport>         //    applies affine transform
        <CanvasRenderer />     //    renders scene graph as DOM
      </CanvasViewport>
      <SelectionOverlay />     //    2D canvas for outlines/handles
    </CanvasArea>

    <RightSidebar>
      <SidebarHeader />        //    Design/Prototype tabs, zoom %
      <NodeHeader />           //    node type + name
      <PositionSection />
      <LayoutSection />
      <AppearanceSection />
      <FillSection />
      <StrokeSection />
      <EffectsSection />
      <ExportSection />
    </RightSidebar>

    <BottomToolbar />          //    tool icons
  </App>

  <Layers>                     //    fullscreen overlay portal targets
    <Toolbar slot="dynamic" /> //    floating UI (tooltips, menus)
    <HelpMenu slot="fixed" />
  </Layers>
```

## Data flow

```
User interaction
       │
       ▼
┌──────────────┐     dispatch()     ┌──────────────┐
│  Event       │ ──────────────────>│  Store        │
│  Handlers    │                    │  (SceneGraph, │
│  (canvas,    │                    │   Selection,  │
│   panels)    │                    │   Viewport)   │
└──────────────┘                    └──────┬───────┘
                                          │
                                   context value
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │  Subscribers   │
                                  │  (Canvas,      │
                                  │   Layers,      │
                                  │   Properties)  │
                                  └───────────────┘
```

All state mutations go through the store API. Components subscribe via
context and rerender only when the slice of state they care about changes.

## CSS grid layout

```css
.app {
  display: grid;
  grid-template-columns: 240px 1fr 260px;
  grid-template-rows: 1fr 48px;
  grid-template-areas:
    "left   canvas  right"
    "left   toolbar right";
  height: 100vh;
  overflow: hidden;
}
```

Sidebars are fixed-width. Canvas takes remaining space. Toolbar sits at the
bottom of the canvas area. Sidebars span the full height.

Refined layout (toolbar floats over canvas):

```css
.app {
  display: grid;
  grid-template-columns: 240px 1fr 260px;
  grid-template-rows: 1fr;
  grid-template-areas: "left canvas right";
  height: 100vh;
  overflow: hidden;
}
```

The toolbar is `position: fixed` at the bottom-center, floating over the
canvas area.

## Viewport transform

The viewport is an affine transform matrix that maps world coordinates to
screen coordinates.

```
Screen = Matrix * World

Matrix = | sx  0  tx |     sx, sy = scale (zoom)
         | 0   sy ty |     tx, ty = translate (pan)
         | 0   0  1  |

worldToScreen(wx, wy):
  sx = wx * scale + tx
  sy = wy * scale + ty

screenToWorld(sx, sy):
  wx = (sx - tx) / scale
  wy = (sy - ty) / scale
```

### Gesture handling

- **Wheel**: `deltaX`/`deltaY` → pan
- **Ctrl+Wheel** or **pinch**: `deltaY` → zoom toward cursor position
- **Space+drag**: pan

### Reference implementation

Viewport gestures are based on prior art from `bschlenk/affine-explorer`:
https://github.com/bschlenk/affine-explorer/blob/main/src/hooks/use-origin-scale.ts

Key approach: store `{ origin: { x, y }, scale }`. On wheel events:
- **Pan**: `origin += { -deltaX, -deltaY }`
- **Zoom**: `scaleBy = 1 - deltaY / 100`, then recompute origin so the point
  under the cursor stays fixed:
  ```
  origin = mouse - (mouse - origin) * scaleBy
  scale  = scale * scaleBy
  ```

The wheel listener must use `{ passive: false }` and call `preventDefault()` to
prevent browser scroll/zoom. The `relativeMouse` helper converts clientX/Y to
element-local coordinates via `getBoundingClientRect()`.

### Zoom math (detailed)

Zoom happens toward the cursor so the point under the cursor stays fixed:

```
newScale = oldScale * (1 - deltaY / 100)
newOrigin = cursorLocal - (cursorLocal - oldOrigin) * scaleBy
```

Expanded:
```
newTx = cursorX - (cursorX - oldTx) * (newScale / oldScale)
newTy = cursorY - (cursorY - oldTy) * (newScale / oldScale)
```

## Canvas rendering

Nodes are rendered as absolutely-positioned DOM elements inside a transformed
container.

```
<div class="canvas-root" style="position:relative; overflow:hidden">
  <div class="canvas-world" style="transform: matrix(sx, 0, 0, sy, tx, ty);
                                    transform-origin: 0 0;">
    <!-- scene graph nodes rendered here -->
    <div data-node-id="rect1"
         style="position:absolute;
                left:100px; top:50px;
                width:300px; height:250px;
                background:#7EC8E3;">
    </div>

    <svg data-node-id="ellipse1"
         style="position:absolute;
                left:200px; top:150px;
                width:206px; height:206px;">
      <ellipse cx="103" cy="103" rx="103" ry="103"
               fill="#EAAB92"
               stroke="#623928" stroke-width="2" />
    </svg>
  </div>
</div>
```

## Selection overlay

A `<canvas>` element sits on top of the DOM canvas at the same size. It renders
selection affordances in screen space:

```
┌─ Screen-space canvas overlay ─────────────────────────┐
│                                                       │
│    ┌─·─·─·─·─·─·─·─·─·─┐                            │
│    ·                     ·   ← 1px blue outline       │
│    ·    (selected node)  ·                            │
│    ·                     ·                            │
│    └─·─·─·─·─·─·─·─·─·─┘                            │
│    □                     □   ← white resize handles   │
│         [206 × 206]          ← blue dimension label   │
└───────────────────────────────────────────────────────┘
```

The overlay repaints only when selection or viewport changes, not every frame.

## Scene graph store

See `docs/scene-graph.md` for the full data model.

The store is a flat map of node IDs to node objects, with parent/child
references forming the tree. This makes lookups O(1) and tree operations
straightforward.

```
store = {
  nodes: Map<string, SceneNode>
  rootIds: string[]              // top-level node order
}
```

## Event system

Canvas mouse events flow through a dispatcher that routes based on active tool:

```
mousedown/mousemove/mouseup on canvas
       │
       ▼
┌──────────────┐
│  Dispatcher  │──── activeTool === 'MOVE'     → SelectionBehavior
│              │──── activeTool === 'RECTANGLE' → DrawRectBehavior
│              │──── activeTool === 'ELLIPSE'   → DrawEllipseBehavior
│              │──── ...
└──────────────┘

Each behavior implements:
  onPointerDown(e, worldPos)
  onPointerMove(e, worldPos)
  onPointerUp(e, worldPos)
```
