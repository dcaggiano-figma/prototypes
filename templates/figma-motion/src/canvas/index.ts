// Canvas module public API
// All external code should import from this barrel export.

export * from '@prototype/shared/canvas'

// Tools (local)
export { ToolProvider, useActiveTool } from './tools/provider'
export type { ToolType } from './tools/provider'

// Canvas component (local)
export { Canvas } from './components/Canvas'
