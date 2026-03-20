/**
 * localStorage persistence for the scene graph.
 *
 * Serializes the scene graph to JSON and stores it under a URL-scoped key
 * so that different prototypes on the same domain don't collide.
 *
 * Key format: `ppg:<scope>:sceneGraph`
 * - Share URLs: scope is `/share/<branch>` (sha stripped so state persists across deploys)
 * - Local dev: scope is the pathname as-is
 */

import type { NodeId } from './node-id'
import { getLocalId, getSessionId } from './node-id'
import { SceneGraph } from './scene-graph'
import type { SceneGraphListener } from './scene-graph'
import { Selection } from './selection'
import type { SceneNode } from './types'
import { advancePaintIdPast } from './types'

// ── URL-scoped key derivation ──────────────────────────────────────

function getStorageScope(): string {
  const path = window.location.pathname.replace(/\/$/, '')
  const segments = path.split('/').filter(Boolean)
  // /share/<branch>/<sha>/... → scope to /share/<branch>
  if (segments[0] === 'share' && segments.length >= 2) {
    return `/share/${segments[1]}`
  }
  // Local dev or unknown path
  return path || '/'
}

function getStorageKey(suffix: string): string {
  return `ppg:${getStorageScope()}:${suffix}`
}

// ── Serialized format ──────────────────────────────────────────────

interface SerializedSceneGraph {
  /** Schema version for future migration. */
  version: 1
  sessionId: number
  maxLocalId: number
  documentId: NodeId
  /** Nodes as [id, fields] pairs. CANVAS nodes have selection stripped. */
  nodes: Array<[NodeId, Record<string, unknown>]>
}

// ── Core functions ─────────────────────────────────────────────────

export function serializeSceneGraph(sg: SceneGraph): SerializedSceneGraph {
  const nodes: Array<[NodeId, Record<string, unknown>]> = []
  let maxLocalId = 0

  for (const [id, node] of sg.getAllNodes()) {
    const localId = getLocalId(id)
    if (localId > maxLocalId) maxLocalId = localId

    const record = { ...node } as Record<string, unknown>

    // Strip selection from CANVAS nodes — it's ephemeral
    if (node.type === 'CANVAS') {
      delete record.selection
    }

    nodes.push([id, record])
  }

  return {
    version: 1,
    sessionId: getSessionId(sg.documentId),
    maxLocalId,
    documentId: sg.documentId,
    nodes,
  }
}

/** Load a scene graph from localStorage. Returns null on any failure. */
export function loadSceneGraph(): SceneGraph | null {
  try {
    const key = getStorageKey('sceneGraph')
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const data = JSON.parse(raw) as SerializedSceneGraph
    if (data.version !== 1) return null

    const nodes = new Map<NodeId, SceneNode>()
    let maxPaintId = 0

    for (const [id, record] of data.nodes) {
      // Restore selection on CANVAS nodes
      if (record.type === 'CANVAS') {
        record.selection = Selection.EMPTY
      }

      // Track highest paint ID for counter advancement
      for (const paintField of ['fills', 'strokes'] as const) {
        const paints = record[paintField]
        if (Array.isArray(paints)) {
          for (const paint of paints) {
            if (paint && typeof paint === 'object' && typeof paint.id === 'string') {
              const num = parseInt(paint.id.slice(1), 10)
              if (!isNaN(num) && num > maxPaintId) maxPaintId = num
            }
          }
        }
      }

      nodes.set(id, record as unknown as SceneNode)
    }

    // Advance the global paint ID counter past existing IDs
    if (maxPaintId > 0) {
      advancePaintIdPast(maxPaintId)
    }

    return SceneGraph.hydrate(nodes, data.documentId, data.sessionId, data.maxLocalId)
  } catch {
    return null
  }
}

/** Save the scene graph to localStorage. */
export function saveSceneGraph(sg: SceneGraph): void {
  try {
    const key = getStorageKey('sceneGraph')
    const data = serializeSceneGraph(sg)
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Quota exceeded or other storage error — silently fail
    console.warn('Failed to save scene graph to localStorage')
  }
}

/**
 * Subscribe to scene graph events and auto-save after mutations.
 * Debounces saves to 1 second after the last mutation.
 * Returns a cleanup function.
 */
export function installAutoSave(sg: SceneGraph): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  const listener: SceneGraphListener = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      saveSceneGraph(sg)
      timer = null
    }, 1000)
  }

  const unsubscribe = sg.addListener(listener)

  return () => {
    if (timer) clearTimeout(timer)
    unsubscribe()
  }
}

/** Remove the sceneGraph key for the current URL scope. */
export function clearSceneGraphStorage(): void {
  const key = getStorageKey('sceneGraph')
  localStorage.removeItem(key)
}
