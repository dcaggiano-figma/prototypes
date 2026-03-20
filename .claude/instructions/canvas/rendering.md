# 3-layer canvas rendering

The canvas uses a 3-layer rendering system coordinated by a RAF loop. All
layers update in the same animation frame, eliminating visual desync between
nodes and overlays ("jello" effect).

All imports come from `@prototype/shared/canvas`.

## Quick start

```tsx
import {
  CanvasLayers,
  useRendering,
  useNodeRef,
  useTrackNode,
} from '@prototype/shared/canvas'

// 1. Wrap your canvas content in CanvasLayers
<CanvasLayers
  sg={sg}
  viewport={vp}
  nodeLayer={<CanvasRenderer />}
  reactOverlay={<SelectionOverlay />}
/>

// 2. In each node renderer, register the DOM element
function RectangleRenderer({ node }) {
  useRendering()
  const ref = useNodeRef<HTMLDivElement>(node.id)
  return <div ref={ref} ... />
}

// 3. In overlay components, register paint callbacks
function SelectionOverlay() {
  const { renderLoop, canvasOverlay } = useRendering()

  useEffect(() => {
    return renderLoop.addCallback((frame) => {
      const ctx = canvasOverlay.current?.getContext('2d')
      if (!ctx) return
      // Draw selection outlines, etc.
    })
  }, [renderLoop, canvasOverlay])

  return <ResizeHandles />
}
```

## The 3 layers

Layers use DOM order and `isolation: isolate` for stacking — no z-index.

```
┌─────────────────────────────────┐
│  React overlay (layer 3)        │  Resize handles, text editing UI
│  DOM elements, screen-space     │  pointer-events: none (children opt in)
├─────────────────────────────────┤
│  Canvas overlay (layer 2)       │  Selection outlines, hover highlights,
│  <canvas> element, screen-space │  dimension labels, drag box, guides
├─────────────────────────────────┤
│  Node layer (layer 1)           │  Scene nodes as DOM elements
│  DOM elements, world-space      │  Zooms with viewport via CSS transform
└─────────────────────────────────┘
```

**Node layer** — zooms with the viewport. Contains the actual scene node DOM
elements (divs for frames/rectangles, SVGs for ellipses/vectors). Receives
pointer events for hit-testing.

**Canvas overlay** — screen-space `<canvas>` for 2D drawing. DPI-aware sizing
and clearing is handled automatically each frame. Paint callbacks draw on it.

**React overlay** — screen-space DOM for interactive UI (resize handles,
rotation handles, text editing). `pointer-events: none` on the layer; children
opt in individually.

## RAF render loop

The `RenderLoop` runs a `requestAnimationFrame` loop that:

1. Flushes dirty nodes from the scene graph (`sg.flushDirty()`)
2. Flushes the viewport dirty flag (`viewport.flushDirty()`)
3. If anything changed, calls all registered paint callbacks in order

```tsx
const { renderLoop } = useRendering()

// Register a callback — returns an unregister function
const unregister = renderLoop.addCallback((frame: FrameState) => {
  frame.dirtyNodes      // Set<NodeId> — nodes that changed
  frame.viewportChanged // boolean — did pan/zoom change?
  frame.forced          // boolean — was this a requestFrame() call?
  frame.viewport        // Viewport instance
  frame.sg              // SceneGraph instance
})

// Force a frame for overlay-only updates (hover, drag box)
renderLoop.requestFrame()
```

Callbacks run in registration order. CanvasLayers registers three built-in
callbacks before any user callbacks:

1. **Node layer painter** — updates DOM styles for dirty nodes
2. **Viewport painter** — updates the world container's CSS transform
3. **Canvas prep** — sizes and clears the `<canvas>` overlay

## Viewport class

Standalone class (not React) for pan/zoom state with dirty tracking.

```tsx
import { Viewport } from '@prototype/shared/canvas'

const vp = new Viewport()
vp.pan(dx, dy)
vp.zoomTo(newScale, cx, cy)
vp.set(originX, originY, scale)

vp.scale       // current zoom level
vp.originX     // pan offset X
vp.originY     // pan offset Y
vp.cssTransform // "matrix(scale, 0, 0, scale, originX, originY)"
vp.zoomPercent // Math.round(scale * 100)

vp.worldToScreen(wx, wy) // { x, y }
vp.screenToWorld(sx, sy) // { x, y }

vp.flushDirty() // returns true if changed since last flush
```

The `ViewportProvider` creates and syncs a Viewport instance from React state.
Access it via `useViewport().instance`.

## Registering node elements

Each node renderer must register its DOM element with the `NodeRegistry` so
the RAF loop can update styles imperatively (the hot path during drag/resize).

```tsx
// For renderers with no existing ref:
function RectangleRenderer({ node }) {
  useRendering()
  const ref = useNodeRef<HTMLDivElement>(node.id)
  return <div ref={ref} style={...} />
}

// For renderers that already have a ref (e.g., TextRenderer with ResizeObserver):
function TextRenderer({ node }) {
  const { nodeRegistry } = useRendering()
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    nodeRegistry.register(node.id, el)
    return () => nodeRegistry.unregister(node.id)
  }, [nodeRegistry, node.id])

  return <div ref={elRef} ... />
}
```

Element types:
- **HTMLDivElement**: Rectangle, Frame, Section, Slide, StickyNote
- **SVGSVGElement**: Ellipse, Vector, Line, Polygon, Star

## Drawing on the canvas overlay

The canvas overlay `<canvas>` is sized and cleared automatically each frame.
Paint callbacks just draw.

```tsx
function SelectionOverlay({ dragBox }) {
  const { renderLoop, canvasOverlay } = useRendering()
  const sg = useSceneGraph()
  const { selectedIds, hoveredId } = useSelection()

  // Store reactive state in refs for the paint callback
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const hoveredIdRef = useRef(hoveredId)
  hoveredIdRef.current = hoveredId
  const dragBoxRef = useRef(dragBox)
  dragBoxRef.current = dragBox

  // Trigger repaint when overlay-only state changes
  useEffect(() => { renderLoop.requestFrame() }, [renderLoop, selectedIds, hoveredId])
  useEffect(() => { renderLoop.requestFrame() }, [renderLoop, dragBox])

  useEffect(() => {
    return renderLoop.addCallback((frame) => {
      const canvas = canvasOverlay.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { scale, originX, originY } = frame.viewport

      // Convert world coords to screen coords
      const sx = worldX * scale + originX
      const sy = worldY * scale + originY

      // Draw using standard Canvas 2D API
      ctx.strokeStyle = '#0d99ff'
      ctx.strokeRect(sx, sy, sw, sh)
    })
  }, [renderLoop, canvasOverlay, sg])

  return <ResizeHandles />
}
```

Key patterns:
- **Refs for mutable state** — the paint callback closes over refs, not React
  state, so it always reads current values without re-registration.
- **`requestFrame()`** — selection and hover changes don't go through scene
  graph dirty tracking. Call `requestFrame()` to ensure the overlay repaints.
- **CSS variables** — resolve design tokens via `getComputedStyle` since the
  Canvas 2D API can't use `var()`:
  ```ts
  const styles = getComputedStyle(document.documentElement)
  const color = styles.getPropertyValue('--color-border-selected').trim() || '#0d99ff'
  ```

## Tracking node positions

`useTrackNode` provides screen-space coordinates for a node, updated each
frame via the RAF loop. Use it for overlay UI that follows a node.

```tsx
const pos = useTrackNode(nodeId)
if (!pos) return null

return (
  <div style={{
    position: 'absolute',
    left: pos.x,
    top: pos.y,
    width: pos.width,
    height: pos.height,
    pointerEvents: 'auto',
  }}>
    {/* Overlay content */}
  </div>
)
```

## File reference

All rendering code lives in `packages/shared/src/canvas/rendering/`:

| File | Purpose |
|------|---------|
| `render-loop.ts` | RenderLoop class, FrameState, PaintCallback |
| `canvas-layers.tsx` | CanvasLayers component, RenderingContext, useRendering |
| `node-registry.ts` | NodeRegistry (Map\<NodeId, Element\>) |
| `node-layer-painter.ts` | Built-in paint callback for DOM style updates |
| `apply-node-styles.ts` | Imperative DOM updater per node type |
| `style-helpers.ts` | Pure functions: nodeTransform, colorToCSS, etc. |
| `use-node-ref.ts` | useNodeRef hook |
| `use-track-node.ts` | useTrackNode hook |

Viewport code lives in `packages/shared/src/canvas/viewport/`:

| File | Purpose |
|------|---------|
| `viewport.ts` | Viewport class (standalone, non-React) |
| `viewport.test.ts` | 19 tests |
| `provider.tsx` | ViewportProvider, useViewport (React wrapper) |
