/**
 * CanvasLayers — 3-layer container for the canvas rendering system.
 *
 * Uses DOM order and `isolation: isolate` on each layer instead of z-index.
 * The wrapper creates a new stacking context, and each layer creates its own
 * isolated stacking context so internal z-index usage doesn't leak.
 *
 * Layer order (bottom to top in DOM):
 * 1. Node layer — actual scene nodes as DOM elements, zooms with viewport
 * 2. Canvas overlay — <canvas> element for selection outlines, guides, etc.
 * 3. React overlay — DOM elements that track node positions (text editing, etc.)
 *
 * Only the node layer scales with the viewport. The upper two layers render
 * in screen space — overlays always appear at the same visual size regardless
 * of zoom level.
 *
 * Requires RenderingProvider as an ancestor. Uses the shared rendering context
 * for the RenderLoop, NodeRegistry, and canvasOverlay ref.
 */

import { useEffect, useRef } from 'react'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import type { Viewport } from '../viewport/viewport'
import { useRendering, RenderingProvider } from './provider'
import { createNodeLayerPainter } from './node-layer-painter'

// Re-export useRendering and types from the provider for backwards compat
export { useRendering } from './provider'
export type { RenderingContext } from './provider'

// ── Component ────────────────────────────────────────────────────────

export interface CanvasLayersProps {
  /**
   * SceneGraph instance. Required when RenderingProvider is not in the tree.
   * @deprecated Use RenderingProvider in the Providers stack instead.
   */
  sg?: SceneGraph
  /**
   * Viewport instance. Required when RenderingProvider is not in the tree.
   * @deprecated Use RenderingProvider in the Providers stack instead.
   */
  viewport?: Viewport
  /** Content for the node layer (scene node elements). Zooms with viewport. */
  nodeLayer: React.ReactNode
  /** Content for the React overlay layer. Screen-space, doesn't zoom. */
  reactOverlay?: React.ReactNode
}

export function CanvasLayers(props: CanvasLayersProps) {
  // If sg/viewport are passed and no RenderingProvider exists, wrap in one.
  // This supports legacy usage where CanvasLayers creates its own provider.
  if (props.sg && props.viewport) {
    return (
      <RenderingProvider sg={props.sg} viewport={props.viewport}>
        <CanvasLayersInner nodeLayer={props.nodeLayer} reactOverlay={props.reactOverlay} />
      </RenderingProvider>
    )
  }

  return <CanvasLayersInner nodeLayer={props.nodeLayer} reactOverlay={props.reactOverlay} />
}

interface CanvasLayersInnerProps {
  nodeLayer: React.ReactNode
  reactOverlay?: React.ReactNode
}

function CanvasLayersInner({ nodeLayer, reactOverlay }: CanvasLayersInnerProps) {
  const { renderLoop, nodeRegistry, viewport, canvasOverlay } = useRendering()
  const worldContainerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)

  // Attach the local canvas ref to the shared canvasOverlay ref from RenderingProvider.
  // This lets any component with useRendering() access the canvas element.
  useEffect(() => {
    const mutableRef = canvasOverlay as React.MutableRefObject<HTMLCanvasElement | null>
    mutableRef.current = canvasElRef.current
    return () => { mutableRef.current = null }
  }, [canvasOverlay])

  // Set initial viewport transform on the world container
  useEffect(() => {
    const el = worldContainerRef.current
    if (el) el.style.transform = viewport.cssTransform
  }, [viewport])

  // Request a frame when the container resizes so the canvas overlay
  // redraws at the correct dimensions instead of stretching.
  const wrapperRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver(() => { renderLoop.requestFrame() })
    observer.observe(el)
    return () => observer.disconnect()
  }, [renderLoop])

  // Register built-in paint callbacks, then start the loop.
  //
  // Canvas prep is prepended so it always runs first, even though child
  // components (like SelectionOverlay) register their callbacks before
  // this parent effect fires (React fires children's effects first).
  useEffect(() => {
    // Size and clear the canvas overlay each frame so paint callbacks
    // can draw on a fresh, correctly-sized canvas.
    // Prepended so it runs before any other callback (e.g. SelectionOverlay).
    const unregisterCanvasPrep = renderLoop.addCallback(() => {
      const canvas = canvasElRef.current
      if (!canvas) return

      const parent = canvas.parentElement
      if (!parent) return

      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth
      const h = parent.clientHeight
      const pw = w * dpr
      const ph = h * dpr

      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
    }, { prepend: true })

    const unregisterNodePainter = renderLoop.addCallback(createNodeLayerPainter(nodeRegistry))

    // Update the world container's CSS transform when viewport changes
    const unregisterViewportPainter = renderLoop.addCallback((frame) => {
      if (!frame.viewportChanged) return
      const el = worldContainerRef.current
      if (el) el.style.transform = frame.viewport.cssTransform
    })

    renderLoop.start()
    return () => {
      unregisterCanvasPrep()
      unregisterNodePainter()
      unregisterViewportPainter()
      renderLoop.stop()
    }
  }, [renderLoop, nodeRegistry])

  return (
    <>
      {/* Wrapper creates a stacking context for the 3 layers */}
      <div ref={wrapperRef} style={wrapperStyle}>
        {/* Layer 1: Node layer — zooms with viewport, receives pointer events */}
        <div style={nodeLayerStyle}>
          <div ref={worldContainerRef} style={worldContainerStyle}>
            {nodeLayer}
          </div>
        </div>

        {/* Layer 2: Canvas overlay — screen-space <canvas> for selection, guides */}
        <div style={overlayLayerStyle}>
          <canvas ref={canvasElRef} style={canvasStyle} />
        </div>

        {/* Layer 3: React overlay — screen-space DOM for text editing, resize handles */}
        <div style={overlayLayerStyle}>
          {reactOverlay}
        </div>
      </div>
    </>
  )
}

// ── Ref-stable style objects ─────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  isolation: 'isolate',
}

/** Base layer positioning. */
const baseLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  isolation: 'isolate',
}

/** Node layer receives pointer events for hit testing. */
const nodeLayerStyle: React.CSSProperties = {
  ...baseLayerStyle,
}

/** Overlay layers are pointer-events: none; interactive children opt in. */
const overlayLayerStyle: React.CSSProperties = {
  ...baseLayerStyle,
  pointerEvents: 'none',
}

const worldContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  transformOrigin: '0 0',
}

const canvasStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'block',
}
