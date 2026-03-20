import {
  createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore,
} from 'react'

import { SceneGraph } from '../../scene-graph/scene-graph'
import type { SceneGraphEvent } from '../../scene-graph/scene-graph'
import type { NodeId } from '../../scene-graph/node-id'
import type { Paint, SceneNode } from '../../scene-graph/types'
import { createPaint } from '../../scene-graph/types'
import { installConnectorAttachmentLifecycle } from '../connectors/connector-utils'
import { installAutoSave, loadSceneGraph } from '../../scene-graph/storage'


const SceneGraphContext = createContext<SceneGraph | null>(null)

export interface SceneGraphProviderProps {
  children: React.ReactNode
  /** Provide an existing SceneGraph instance, or one will be created. */
  sceneGraph?: SceneGraph
  /** Factory for the template's default scene. Used on first visit and after reset. */
  createDefault?: () => SceneGraph
}

export function SceneGraphProvider({ children, sceneGraph, createDefault }: SceneGraphProviderProps) {
  const sgRef = useRef<SceneGraph | null>(sceneGraph ?? null)
  if (!sgRef.current) {
    // Try loading from localStorage first
    sgRef.current = loadSceneGraph()
    if (!sgRef.current) {
      // Fall back to template default or empty scene
      if (createDefault) {
        sgRef.current = createDefault()
      } else {
        sgRef.current = new SceneGraph()
        sgRef.current.createCanvas('Page 1')
      }
    }
  }

  // Expose for integration tests and debugging (Vite replaces at build time)
  if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
    (window as unknown as Record<string, unknown>).__sceneGraph = sgRef.current
  }

  useEffect(() => installConnectorAttachmentLifecycle(sgRef.current!), [])
  useEffect(() => installAutoSave(sgRef.current!), [])

  return (
    <SceneGraphContext.Provider value={sgRef.current}>{children}</SceneGraphContext.Provider>
  )
}

/** Access the scene graph for imperative operations */
export function useSceneGraph(): SceneGraph {
  const sg = useContext(SceneGraphContext)
  if (!sg) throw new Error('useSceneGraph must be used within a SceneGraphProvider')
  return sg
}

/**
 * Get the ID of the first (active) canvas.
 * Most templates are single-page, so this is the primary canvas.
 */
export function useCanvasId(): NodeId {
  const sg = useSceneGraph()
  const canvases = sg.getCanvases()
  if (canvases.length === 0) throw new Error('No canvases found in scene graph')
  return canvases[0].id
}

/** Subscribe to a single node by ID — rerenders only when that node changes */
export function useNode(id: NodeId): SceneNode | undefined {
  const sg = useSceneGraph()

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event: SceneGraphEvent) => {
        if (eventAffectsNode(event, id)) onStoreChange()
      })
    },
    [sg, id],
  )

  const getSnapshot = useCallback(() => sg.getNode(id), [sg, id])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Subscribe to the children of a canvas (page). */
export function useRootNodes(canvasId: NodeId): SceneNode[] {
  const sg = useSceneGraph()
  const lastRef = useRef<SceneNode[]>([])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event: SceneGraphEvent) => {
        switch (event.type) {
          case 'create':
            if (event.node.parentId === canvasId) onStoreChange()
            break
          case 'delete':
            if (event.parentId === canvasId) onStoreChange()
            break
          case 'reparent':
            if (event.oldParentId === canvasId || event.newParentId === canvasId) onStoreChange()
            break
          case 'field-change':
            if (event.nodeId === canvasId && event.field === 'children') onStoreChange()
            break
          case 'attachment-change':
          case 'attachment-invalidate':
            break
        }
      })
    },
    [sg, canvasId],
  )

  const getSnapshot = useCallback(() => {
    const canvas = sg.getNode(canvasId)
    if (!canvas) return lastRef.current
    const nodes = canvas.children
      .map((id) => sg.getNode(id))
      .filter((n): n is SceneNode => n != null)
    const last = lastRef.current
    if (
      nodes.length === last.length
      && nodes.every((n, i) => n === last[i])
    ) {
      return last
    }
    lastRef.current = nodes
    return nodes
  }, [sg, canvasId])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Subscribe to the page background color */
export function usePageBackground(canvasId: NodeId): Paint {
  const sg = useSceneGraph()

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event: SceneGraphEvent) => {
        if (event.type === 'field-change' && event.nodeId === canvasId && (event.field === 'backgroundColor' || event.field === 'backgroundVisible')) {
          onStoreChange()
        }
      })
    },
    [sg, canvasId],
  )

  // Cache the snapshot so useSyncExternalStore sees the same reference
  // when nothing changed (required to avoid infinite re-render loops).
  const lastRef = useRef<Paint>(DEFAULT_PAGE_BG)

  const getSnapshot = useCallback(() => {
    const canvas = sg.getNode(canvasId)
    if (!canvas || canvas.type !== 'CANVAS') return lastRef.current

    const { backgroundColor, backgroundVisible } = canvas
    const visible = backgroundVisible ?? true
    const prev = lastRef.current
    if (
      prev.color.r === backgroundColor.r
      && prev.color.g === backgroundColor.g
      && prev.color.b === backgroundColor.b
      && prev.visible === visible
    ) {
      return prev
    }

    const next: Paint = createPaint({ type: 'SOLID', color: backgroundColor, opacity: 1, visible })
    lastRef.current = next
    return next
  }, [sg, canvasId])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export const DEFAULT_PAGE_BG: Paint = createPaint({ type: 'SOLID', color: { r: 245, g: 244, b: 243 }, opacity: 1, visible: true })

/** Check if a paint matches the default page background (used to swap in a theme-aware CSS token) */
export function isDefaultPageBackground(paint: Paint): boolean {
  const { r, g, b } = paint.color
  const d = DEFAULT_PAGE_BG.color
  return r === d.r && g === d.g && b === d.b
}

/**
 * Relative luminance (0 = black, 1 = white) per WCAG 2.0.
 * Uses sRGB linearization then the standard 0.2126R + 0.7152G + 0.0722B formula.
 * Input values are 0–255.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Returns `'dark'` when the canvas background is dark (light text needed),
 * `'light'` when the canvas background is light (dark text needed).
 *
 * When the page background hasn't been customised (still matches DEFAULT_PAGE_BG),
 * the scheme is derived from the app's resolved theme (`data-preferred-theme` on
 * `<body>`) so it tracks light/dark mode automatically without parsing CSS colors.
 *
 * When the user has set a custom page background, luminance is computed from the
 * RGB value to decide the scheme.
 */
export function useCanvasColorScheme(canvasId: NodeId): 'light' | 'dark' {
  const pageBg = usePageBackground(canvasId)
  const isDefault = isDefaultPageBackground(pageBg)

  // Track the resolved theme attribute so we re-render when the user toggles dark mode
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => readResolvedTheme())

  useEffect(() => {
    if (!isDefault) return

    // Observe changes to data-preferred-theme on <body>
    const observer = new MutationObserver(() => {
      setResolvedTheme(readResolvedTheme())
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-preferred-theme'] })

    // Also listen for OS-level changes (covers the "system" theme setting)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onMediaChange = () => setResolvedTheme(readResolvedTheme())
    mq.addEventListener('change', onMediaChange)

    return () => {
      observer.disconnect()
      mq.removeEventListener('change', onMediaChange)
    }
  }, [isDefault])

  if (isDefault) {
    return resolvedTheme
  }

  const { r, g, b } = pageBg.color
  return relativeLuminance(r, g, b) < 0.4 ? 'dark' : 'light'
}

/** Read the resolved theme from the body attribute set by useAppTheme */
function readResolvedTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return document.body.getAttribute('data-preferred-theme') === 'dark' ? 'dark' : 'light'
}

function eventAffectsNode(event: SceneGraphEvent, nodeId: NodeId): boolean {
  switch (event.type) {
    case 'field-change':
    case 'create':
    case 'delete':
    case 'reparent':
      return event.nodeId === nodeId
    case 'attachment-change':
      return event.attacheeId === nodeId || event.attachment.anchorNodeId === nodeId
    case 'attachment-invalidate':
      return event.anchorNodeId === nodeId || event.attacheeIds.includes(nodeId)
  }
}
