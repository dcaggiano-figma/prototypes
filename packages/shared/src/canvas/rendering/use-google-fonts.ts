/**
 * useGoogleFonts — dynamically loads Google Fonts for all fonts in the scene graph.
 *
 * Injects <link> elements into the document head for each unique font family
 * found on TEXT nodes. Listens for scene graph events so new fonts are loaded
 * as they appear (via field changes or node creation).
 *
 * The module-level `loadedFonts` set persists across re-renders and re-mounts,
 * ensuring each font is only loaded once per session.
 */

import { useEffect } from 'react'
import { useSceneGraph } from '../scene-graph/provider'
import type { SceneGraph } from '../../scene-graph/scene-graph'
import type { SceneGraphEvent } from '../../scene-graph/scene-graph'
import { isSystemOrGenericFont } from './font-utils'

// Module-level set to track fonts we've already injected <link> elements for.
// Persists across re-renders and re-mounts.
const loadedFonts = new Set<string>()

// Discrete weights to request. Google Fonts returns 200 and silently omits
// weights the font doesn't have, so this is safe for all fonts.
const WEIGHTS = '300;400;500;600;700;800;900'

function loadGoogleFont(fontFamily: string): void {
  const trimmed = fontFamily.trim()
  if (!trimmed || isSystemOrGenericFont(trimmed) || loadedFonts.has(trimmed)) return

  loadedFonts.add(trimmed)

  const encoded = trimmed.replace(/ /g, '+')
  const url = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${WEIGHTS}&display=swap`

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

function scanSceneGraphFonts(sg: SceneGraph): void {
  for (const node of sg.getAllNodes().values()) {
    if ('fontFamily' in node && typeof node.fontFamily === 'string') {
      loadGoogleFont(node.fontFamily)
    }
  }
}

/**
 * Hook that dynamically loads Google Fonts for all fonts used in the scene graph.
 * Should be called inside SceneGraphProvider.
 */
export function useGoogleFonts(): void {
  const sg = useSceneGraph()

  useEffect(() => {
    // Scan existing nodes on mount
    scanSceneGraphFonts(sg)

    // Listen for new fonts added via field changes or node creation
    return sg.addListener((event: SceneGraphEvent) => {
      if (
        event.type === 'field-change' &&
        event.field === 'fontFamily' &&
        typeof event.newValue === 'string'
      ) {
        loadGoogleFont(event.newValue)
      } else if (
        event.type === 'create' &&
        'fontFamily' in event.node &&
        typeof event.node.fontFamily === 'string'
      ) {
        loadGoogleFont(event.node.fontFamily)
      }
    })
  }, [sg])
}

/** Render-nothing component that loads Google Fonts for the scene graph. */
export function FontLoader(): null {
  useGoogleFonts()
  return null
}
