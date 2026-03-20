/**
 * React bindings for the scene graph.
 *
 * These hooks wrap the pure-TS SceneGraph in React primitives. The scene graph
 * itself has no React dependency — these bindings are the bridge.
 *
 * Key design: per-node subscriptions via `useSyncExternalStore`. Because nodes
 * are immutable (mutations create new objects), React can use reference equality
 * to skip re-renders when a node hasn't changed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import type { NodeId } from './node-id'
import type { SceneGraph } from './scene-graph'
import type { SceneGraphEvent } from './scene-graph'
import type { CanvasNode, SceneNode } from './types'

// ── Context ──────────────────────────────────────────────────────────

const SceneGraphContext = createContext<SceneGraph | null>(null)

export interface SceneGraphProviderProps {
  sceneGraph: SceneGraph
  children: ReactNode
}

export function SceneGraphProvider({
  sceneGraph,
  children,
}: SceneGraphProviderProps) {
  return (
    <SceneGraphContext.Provider value={sceneGraph}>
      {children}
    </SceneGraphContext.Provider>
  )
}

// ── Hooks ────────────────────────────────────────────────────────────

/** Get the SceneGraph instance. For imperative use (mutations, traversals). */
export function useSceneGraph(): SceneGraph {
  const sg = useContext(SceneGraphContext)
  if (!sg) throw new Error('useSceneGraph must be used within a SceneGraphProvider')
  return sg
}

/**
 * Subscribe to a single node. Re-renders only when that node changes.
 * Returns undefined if the node doesn't exist.
 */
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

/**
 * Subscribe to a single node. Throws if the node doesn't exist.
 * Use this when you know the node must exist (e.g., rendering a node component).
 */
export function useNodeOrThrow(id: NodeId): SceneNode {
  const node = useNode(id)
  if (!node) throw new Error(`Node ${id} not found`)
  return node
}

/**
 * Subscribe to the children of a node. Re-renders when children are
 * added, removed, or reordered under this parent.
 *
 * Returns a stable array reference when children haven't changed.
 */
export function useChildren(parentId: NodeId): readonly NodeId[] {
  const sg = useSceneGraph()

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event: SceneGraphEvent) => {
        if (eventAffectsChildren(event, parentId)) onStoreChange()
      })
    },
    [sg, parentId],
  )

  const getSnapshot = useCallback(
    () => sg.getNode(parentId)?.children ?? EMPTY_CHILDREN,
    [sg, parentId],
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Subscribe to the list of canvases (pages). Re-renders when pages change. */
export function useCanvases(): CanvasNode[] {
  const sg = useSceneGraph()

  // Track the last result to return a stable reference when unchanged
  const lastRef = useRef<CanvasNode[]>([])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event: SceneGraphEvent) => {
        if (eventAffectsChildren(event, sg.documentId)) onStoreChange()
      })
    },
    [sg],
  )

  const getSnapshot = useCallback(() => {
    const canvases = sg.getCanvases()
    const last = lastRef.current
    // Shallow compare to maintain referential stability
    if (
      canvases.length === last.length &&
      canvases.every((c, i) => c === last[i])
    ) {
      return last
    }
    lastRef.current = canvases
    return canvases
  }, [sg])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Subscribe to whether the scene graph has dirty nodes.
 * Useful for triggering render loops.
 */
export function useHasDirty(): boolean {
  const sg = useSceneGraph()

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Any event means something is dirty
      return sg.addListener(() => onStoreChange())
    },
    [sg],
  )

  const getSnapshot = useCallback(() => sg.hasDirty, [sg])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Get the node count. Re-renders when nodes are created or deleted.
 */
export function useNodeCount(): number {
  const sg = useSceneGraph()

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event: SceneGraphEvent) => {
        if (event.type === 'create' || event.type === 'delete') {
          onStoreChange()
        }
      })
    },
    [sg],
  )

  const getSnapshot = useCallback(() => sg.nodeCount, [sg])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Create a memoized subscribe function for the scene graph.
 * Useful for building custom hooks with `useSyncExternalStore`.
 */
export function useSceneGraphSubscribe(
  filter?: (event: SceneGraphEvent) => boolean,
): (onStoreChange: () => void) => () => void {
  const sg = useSceneGraph()

  return useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event: SceneGraphEvent) => {
        if (!filter || filter(event)) onStoreChange()
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sg, filter],
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

const EMPTY_CHILDREN: readonly NodeId[] = Object.freeze([])

/** Check if an event affects a specific node (for useNode subscriptions). */
function eventAffectsNode(event: SceneGraphEvent, nodeId: NodeId): boolean {
  switch (event.type) {
    case 'field-change':
      return event.nodeId === nodeId
    case 'create':
      return event.nodeId === nodeId
    case 'delete':
      return event.nodeId === nodeId
    case 'reparent':
      return event.nodeId === nodeId
    case 'attachment-change':
      return event.attacheeId === nodeId || event.attachment.anchorNodeId === nodeId
    case 'attachment-invalidate':
      return event.anchorNodeId === nodeId || event.attacheeIds.includes(nodeId)
  }
}

/**
 * Check if an event affects the children of a specific parent.
 * This includes:
 * - A child being created under this parent
 * - A child being deleted from this parent
 * - A child being reparented to/from this parent
 * - The parent's children field changing
 */
function eventAffectsChildren(
  event: SceneGraphEvent,
  parentId: NodeId,
): boolean {
  switch (event.type) {
    case 'create':
      return event.node.parentId === parentId
    case 'delete':
      return event.parentId === parentId
    case 'reparent':
      return event.oldParentId === parentId || event.newParentId === parentId
    case 'field-change':
      return event.nodeId === parentId && event.field === 'children'
    case 'attachment-change':
    case 'attachment-invalidate':
      return false
  }
}
