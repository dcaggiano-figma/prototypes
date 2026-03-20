// Canvas module public API
// Shared infrastructure for canvas-based templates.
// Template-specific code (Canvas.tsx, renderers, tools, overlays) stays local.

// Scene graph types (source of truth)
export * from '../scene-graph/types'
export * from '../scene-graph/node-id'
export * from '../scene-graph/scene-graph'
export * from '../scene-graph/selection'
export * from '../scene-graph/undo-manager'
export { MIXED, type Mixed, isMixed, notMixed } from '../scene-graph/mixed'

// Scene graph React hooks
export * from './scene-graph/provider'
export * from './scene-graph/undo-provider'
export * from './scene-graph/use-undo-actions'
export * from './scene-graph/use-selection-property'
export * from './scene-graph/use-selection-paints'

// Formatters (ScrubbableInput integration)
export * from './formatters'

// Node defaults
export * from './scene-graph/node-defaults'

// Selection
export * from './selection/provider'
export { SelectionOverlay, HANDLE_VISIBILITY_THRESHOLD } from './selection/overlay'
export { drawDimensionLabel, getRotatedEdgeAnchor, type RotatedEdgeAnchor } from './selection/draw-helpers'
export { getLineEndpoints, lineParamsFromEndpoints } from './selection/resize-utils'
export * from './node-behavior'

// Text editing
export * from './text-editing/provider'

// Label editing
export * from './label-editing/provider'

// Viewport
export * from './viewport/viewport'
export * from './viewport/provider'

// Alignment
export * from './scene-graph/alignment'

// Selection utilities
export * from './scene-graph/selection-utils'

// World position & geometry
export * from './scene-graph/world-position'

// Container reparenting
export * from './scene-graph/container-reparenting'

// Connector cleanup
export * from './scene-graph/connector-cleanup'

// Canvas-specific text guards (FigJam shapes/sticky notes)
export { type TextCapableNode, isShapeWithText, isTextCapableNode } from './text-guards'

// Path smoothing
export * from './tools/path-smoothing'

// Rendering (3-layer system, RAF loop, imperative updates)
export * from './rendering'

// Behaviors (composable pointer interaction handlers)
export * from './behaviors'

// Grid layout and management
export * from './scene-graph/grid-layout'
export * from './scene-graph/grid-manager'
export * from './scene-graph/grid-helpers'

// Actions (shared action hooks)
export * from './actions/use-nudge-actions'

// Connectors (path computation, point definitions, resolution, rendering)
export * from './connectors'
