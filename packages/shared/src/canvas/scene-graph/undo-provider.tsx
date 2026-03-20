import { createContext, useContext, useRef } from 'react'

import { UndoManager } from '../../scene-graph/undo-manager'
import { useSceneGraph } from './provider'

const UndoManagerContext = createContext<UndoManager | null>(null)

export interface UndoManagerProviderProps {
  children: React.ReactNode
  /** Time window in ms for merging adjacent batches. Default 500ms. */
  mergeWindow?: number
}

/**
 * Provides an UndoManager instance tied to the current SceneGraph.
 * Place inside SceneGraphProvider.
 *
 * No useEffect cleanup — React 18 Strict Mode's unmount/remount cycle
 * would dispose the UndoManager (unsubscribing from sg events) while
 * the ref persists, leaving a dead instance. The SceneGraph is stable
 * for the app lifetime, so the subscription is harmless until GC.
 */
export function UndoManagerProvider({ children, mergeWindow }: UndoManagerProviderProps) {
  const sg = useSceneGraph()
  const umRef = useRef<UndoManager | null>(null)
  if (!umRef.current) {
    umRef.current = new UndoManager(sg, { mergeWindow })
  }

  return (
    <UndoManagerContext.Provider value={umRef.current}>{children}</UndoManagerContext.Provider>
  )
}

/** Access the UndoManager for undo/redo operations. */
export function useUndoManager(): UndoManager {
  const um = useContext(UndoManagerContext)
  if (!um) throw new Error('useUndoManager must be used within an UndoManagerProvider')
  return um
}
