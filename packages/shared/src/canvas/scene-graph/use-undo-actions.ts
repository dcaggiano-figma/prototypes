import { useCallback, useMemo, useSyncExternalStore } from 'react'

import { useSceneGraph } from './provider'
import { useUndoManager } from './undo-provider'

export interface UndoActions {
  undo(): void
  redo(): void
  canUndo: boolean
  canRedo: boolean
}

/**
 * Subscribe to undo/redo state and return action callbacks.
 *
 * Wire up to your template's action system:
 * ```ts
 * const { undo, redo } = useUndoActions()
 * useAction('undo', undo)
 * useAction('redo', redo)
 * ```
 */
export function useUndoActions(): UndoActions {
  const um = useUndoManager()
  const sg = useSceneGraph()

  const undo = useCallback(() => um.undo(), [um])
  const redo = useCallback(() => um.redo(), [um])

  // Subscribe to scene graph changes to get reactive canUndo/canRedo.
  // The UndoManager doesn't have its own event system — it piggybacks
  // on the scene graph listener to recheck on every mutation.
  const subscribe = useCallback(
    (onStoreChange: () => void) => sg.addListener(onStoreChange),
    [sg],
  )

  const getCanUndo = useCallback(() => um.canUndo, [um])
  const getCanRedo = useCallback(() => um.canRedo, [um])

  const canUndo = useSyncExternalStore(subscribe, getCanUndo, getCanUndo)
  const canRedo = useSyncExternalStore(subscribe, getCanRedo, getCanRedo)

  return useMemo(() => ({ undo, redo, canUndo, canRedo }), [undo, redo, canUndo, canRedo])
}
