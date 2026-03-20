/**
 * RenderingProvider — exposes the rendering context (RenderLoop,
 * NodeRegistry, canvasOverlay ref) to the component tree.
 *
 * Lives in the top-level Providers stack so any component (behaviors,
 * overlays, tools) can call useRendering() without being nested inside
 * CanvasLayers' DOM.
 *
 * CanvasLayers consumes this context and attaches the canvasOverlay ref
 * to its <canvas> element.
 */

import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import type { Viewport } from '../viewport/viewport'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import { RenderLoop } from './render-loop'
import { NodeRegistry } from './node-registry'

// ── Context ──────────────────────────────────────────────────────────

export interface RenderingContext {
  /** The render loop instance for registering paint callbacks. */
  renderLoop: RenderLoop
  /** Registry mapping NodeId → DOM element for imperative updates. */
  nodeRegistry: NodeRegistry
  /** The Viewport instance (non-React) for coordinate transforms. */
  viewport: Viewport
  /** Ref to the canvas overlay element for 2D drawing (selection outlines, guides, etc.). */
  canvasOverlay: React.RefObject<HTMLCanvasElement | null>
}

const RenderingCtx = createContext<RenderingContext | null>(null)

export function useRendering(): RenderingContext {
  const ctx = useContext(RenderingCtx)
  if (!ctx) throw new Error('useRendering must be used within RenderingProvider')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────

export interface RenderingProviderProps {
  sg: SceneGraph
  viewport: Viewport
  children: React.ReactNode
}

export function RenderingProvider({ sg, viewport, children }: RenderingProviderProps) {
  const nodeRegistry = useMemo(() => new NodeRegistry(), [])
  const renderLoop = useMemo(() => new RenderLoop(sg, viewport), [sg, viewport])
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    renderLoop.setBeforePaint(() => {
      flushSync(() => {})
    })
    return () => renderLoop.setBeforePaint(null)
  }, [renderLoop])

  const ctx = useMemo<RenderingContext>(
    () => ({ renderLoop, nodeRegistry, viewport, canvasOverlay: canvasOverlayRef }),
    [renderLoop, nodeRegistry, viewport],
  )

  return <RenderingCtx.Provider value={ctx}>{children}</RenderingCtx.Provider>
}
