# FigJam

A prototyping environment for FigJam — a live interactive whiteboard clone
built with an HTML canvas (DOM-based). Reuses the canvas/scene-graph/selection/
viewport core from `figma-design` but strips the full editor chrome in favor of
an always-floating layout with a FigJam-specific toolbar.

## Tech stack

- **Framework**: React Router v7 (Vite)
- **Components**: `@figma/fpl-components` (50+ Figma design system components)
- **Icons**: `@figma/fpl-icons` (1,651+ icons)
- **Tokens**: `@figma/fpl-tokens` (colors, spacing, radius, elevation, typography)
- **Styling**: Tailwind CSS v4 with a custom FPL theme plugin
- **Language**: TypeScript (strict)

## Architecture

All UI is floating — no left rail, right panel, or mode switcher.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           <Providers>                                   │
│  ┌──────────────────┐                          ┌──────────────────────┐ │
│  │ FigJamFileHeader  │  (top-left)              │  FigJamTopRight     │ │
│  └──────────────────┘                          └──────────────────────┘ │
│                                                                         │
│                     ┌──────────────────────┐                            │
│                     │ FloatingObjectToolbar │  (above selection)        │
│                     └──────────────────────┘                            │
│                                                                         │
│                           Canvas                                        │
│                     (dot grid + shapes)                                  │
│                                                                         │
│                     ┌──────────────────────┐                            │
│                     │   SecondaryToolbar    │  (conditional)            │
│                     │   FigJamToolbar       │  (bottom center)         │
│                     └──────────────────────┘                            │
│                                                  ┌───────────────────┐ │
│                                                  │ FigJamZoomControls│ │
│                                                  └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key differences from `figma-design`

- Single mode: `'figjam'` (sulli/purple brand)
- No left rail, left panel, or right panel
- Floating file header, top-right controls, and zoom controls
- FigJam toolbar with raised illustration buttons for marker, sticky, shapes
- Secondary toolbars for shapes/connectors and sticky note colors
- Dark floating toolbar above selected objects
- Dot grid canvas background

### Canvas

Same as `figma-design`:
- **Viewport**: Affine transform with scroll/pinch zoom
- **Rendering**: Frames as divs, shapes as SVG, DOM-based
- **Ephemeral UI**: 2D canvas overlay for selection outlines, resize handles
- **Dot grid**: CSS radial-gradient scaled with viewport zoom

### Scene graph

Same store architecture with colored sticky notes and shapes as demo scene.

## Project conventions

- Always use **pnpm**, never npm.
- Use FPL components, tokens, and icons whenever possible.
- Use tailwind for most styles.
- Prefer early returns over else.
