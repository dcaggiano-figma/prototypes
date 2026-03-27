# Protofig

A prototyping environment for Figma — a live interactive clone built with an
HTML canvas (DOM-based, not `<canvas>`). Designed to be easy to work with for
humans and AI alike.

## North star

See `docs/north-star.png`. The goal is to boot up and see a Figma-like editor
with a layers panel, canvas with shapes, properties panel, and toolbar. Early
milestones do NOT need components, instances, or other deep Figma features.

## Tech stack

- **Framework**: React Router v7 (Vite)
- **Components**: `@figma/fpl-components` (50+ Figma design system components)
- **Icons**: `@figma/fpl-icons` (1,651+ icons)
- **Tokens**: `@figma/fpl-tokens` (colors, spacing, radius, elevation, typography)
- **Styling**: Tailwind CSS v4 with a custom FPL theme plugin
- **Language**: TypeScript (strict)

## Architecture

The top level app fits in a standard macbook viewport. Every standalone region
is its own component. A top level context provides scene graph data to all
children.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           <Providers>                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                             <App>                                   │ │
│ │  ┌────────────┐  ┌──────────────────────────┐  ┌─────────────────┐  │ │
│ │  │  Left      │  │                          │  │  Right          │  │ │
│ │  │  Sidebar   │  │       Canvas             │  │  Sidebar        │  │ │
│ │  │            │  │                          │  │                 │  │ │
│ │  │  - Pages   │  │   (viewport + shapes)    │  │  - Properties   │  │ │
│ │  │  - Layers  │  │                          │  │  - Fill         │  │ │
│ │  │            │  │                          │  │  - Stroke       │  │ │
│ │  └────────────┘  └──────────────────────────┘  └─────────────────┘  │ │
│ │  ┌──────────────────────────────────────────────────────────────┐   │ │
│ │  │                     Bottom Toolbar                           │   │ │
│ │  └──────────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │  <Layers>  (portal-based overlay layers for dynamic z-index)        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key rules

- `<App>` is a CSS grid wrapper. It NEVER rerenders — zero state at this level.
- All state lives in providers and flows through context.
- `<Layers>` provides fullscreen overlay regions that components can portal into.
  Dynamic layer elements re-order by last interaction/focus.
- `<App>` sets up global keyboard shortcuts, scroll forwarding, and the mouse
  behavior event listener system for the canvas.

### Canvas

- **Viewport**: Affine transform matrix controlled by scroll/pinch gestures.
  Provides world-to-screen and screen-to-world coordinate conversion.
- **Rendering**: Frames are `<div>`s (supports flexbox/grid), everything else
  is `<svg>`. DOM-based for accessibility.
- **Ephemeral UI**: A 2D `<canvas>` overlay for selection outlines, resize
  handles, drag boxes. Renders in local or screen space, DPI-aware, only
  invalidates when something changes.

### Scene graph

- Singleton store with a tree of typed nodes (Frame, Rectangle, Ellipse, etc.)
- API for reorder, reparent, create, update, delete
- Efficient storage: only non-default values stored, everything else uses
  assumed defaults
- Supports style layering for future component/instance support

## Project conventions

- Always use **pnpm**, never npm.
- Use FPL components, tokens, and icons whenever possible.
- Use tailwind for most styles, FPL Stack for flexbox layouts.
- Structure files with exports first, then helpers.
- Comments above the line, `/**` for interfaces/props, `//` for explanations.
- Prefer early returns over else. Ternary when both branches return.
- Cast to `unknown` or specific types, never `any`.

## Docs

Living documentation lives in `docs/`. These files are updated as we build and
serve as context for resuming work across sessions.

- `docs/milestones.md` — Day-sized milestones and dependency graph
- `docs/architecture.md` — Detailed system architecture and data flow
- `docs/scene-graph.md` — Scene graph data model and API
- `docs/north-star.png` — Target screenshot we're building toward
