/**
 * React hook for reading and writing paints across the current selection.
 *
 * Returns a flat list of unique paints with mutation functions. The UI
 * renders one row per `SelectionPaint` and calls `updatePaint` on change —
 * no array index management needed.
 *
 * ```ts
 * const { paints, updatePaint, addPaint, removePaint } = useSelectionPaints('fills')
 * ```
 */

import { useCallback, useRef, useSyncExternalStore } from 'react'

import type { Paint, CanvasNode } from '../../scene-graph/types'
export type { SelectionPaint, PaintLocation } from '../../scene-graph/selection-paints'
import {
  collectSelectionPaints,
  updateSelectionPaint,
  addSelectionPaint,
  removeSelectionPaint,
  type SelectionPaint,
  type PaintLocation,
} from '../../scene-graph/selection-paints'
import { useSceneGraph, useCanvasId } from './provider'
import { useUndoManager } from './undo-provider'

// ── Types ────────────────────────────────────────────────────────────

export interface PaintMutationOptions {
  /** Whether to commit to the undo stack. Default: true. */
  commit?: boolean
}

export interface UseSelectionPaintsResult {
  /** Unique paints collected across all selected nodes. */
  paints: SelectionPaint[]
  /** Replace a paint everywhere it appears. */
  updatePaint: (original: Paint, updated: Paint, opts?: PaintMutationOptions) => void
  /** Add a new paint to all applicable selected nodes. */
  addPaint: (paint: Paint, opts?: PaintMutationOptions) => void
  /** Remove a paint from all nodes where it appears. */
  removePaint: (original: Paint, opts?: PaintMutationOptions) => void
  /** Toggle visibility of a paint everywhere it appears. */
  toggleVisibility: (original: Paint, opts?: PaintMutationOptions) => void
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useSelectionPaints(field: 'fills' | 'strokes'): UseSelectionPaintsResult {
  const sg = useSceneGraph()
  const canvasId = useCanvasId()
  const um = useUndoManager()
  const lastRef = useRef<SelectionPaint[]>([])

  const subscribe = useCallback(
    (onStoreChange: () => void) => sg.addListener(onStoreChange),
    [sg],
  )

  const getSnapshot = useCallback(() => {
    const canvas = sg.getNode(canvasId) as CanvasNode | undefined
    if (!canvas) return lastRef.current

    const next = collectSelectionPaints(sg, canvas.selection, field)

    // Stable reference if nothing changed
    if (selectionPaintsEqual(lastRef.current, next)) return lastRef.current
    lastRef.current = next
    return next
  }, [sg, canvasId, field])

  const paints = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  /** Find the SelectionPaint entry matching a paint by deep equality. */
  const findLocations = useCallback(
    (original: Paint): PaintLocation[] => {
      const key = JSON.stringify(original)
      // Use freshly collected paints to get current locations
      const canvas = sg.getNode(canvasId) as CanvasNode | undefined
      if (!canvas) return []
      const current = collectSelectionPaints(sg, canvas.selection, field)
      const match = current.find((sp) => JSON.stringify(sp.paint) === key)
      return match?.locations ?? []
    },
    [sg, canvasId, field],
  )

  const updatePaint = useCallback(
    (original: Paint, updated: Paint, opts: PaintMutationOptions = {}) => {
      const { commit = true } = opts
      const locations = findLocations(original)
      if (locations.length === 0) return
      updateSelectionPaint(sg, locations, updated)
      if (commit) um.commit(null)
    },
    [sg, um, findLocations],
  )

  const addPaint = useCallback(
    (paint: Paint, opts: PaintMutationOptions = {}) => {
      const { commit = true } = opts
      const canvas = sg.getNode(canvasId) as CanvasNode | undefined
      if (!canvas) return
      addSelectionPaint(sg, canvas.selection, field, paint)
      if (commit) um.commit(null)
    },
    [sg, canvasId, um, field],
  )

  const removePaint = useCallback(
    (original: Paint, opts: PaintMutationOptions = {}) => {
      const { commit = true } = opts
      const locations = findLocations(original)
      if (locations.length === 0) return
      removeSelectionPaint(sg, locations)
      if (commit) um.commit(null)
    },
    [sg, um, findLocations],
  )

  const toggleVisibility = useCallback(
    (original: Paint, opts: PaintMutationOptions = {}) => {
      const { commit = true } = opts
      const locations = findLocations(original)
      if (locations.length === 0) return
      updateSelectionPaint(sg, locations, { ...original, visible: !original.visible })
      if (commit) um.commit(null)
    },
    [sg, um, findLocations],
  )

  return { paints, updatePaint, addPaint, removePaint, toggleVisibility }
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Shallow comparison of SelectionPaint arrays to avoid unnecessary rerenders. */
function selectionPaintsEqual(a: SelectionPaint[], b: SelectionPaint[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    // Compare paint values by JSON (deep equality)
    if (JSON.stringify(a[i].paint) !== JSON.stringify(b[i].paint)) return false
    // Compare location counts
    if (a[i].locations.length !== b[i].locations.length) return false
  }
  return true
}
