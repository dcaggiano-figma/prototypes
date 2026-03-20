/**
 * React hooks for reading and writing selection properties.
 *
 * `useSelectionProperty` follows a `useState`-like tuple API:
 * ```ts
 * const [opacity, setOpacity] = useSelectionProperty<number>('opacity')
 * ```
 *
 * The setter commits to the undo stack by default. Pass `{ commit: false }`
 * to suppress (e.g., during slider drags — commit on pointerup instead).
 */

import { useCallback, useRef, useSyncExternalStore } from 'react'

import type { Mixed } from '../../scene-graph/mixed'
import type { MergeType } from '../../scene-graph/undo-manager'
import type { MixedChangeHandler } from '../formatters/mixed-number-formatter'
import { createMixedMathHandler } from '../../scene-graph/mixed-math'
import { getSelectionValue } from '../../scene-graph/selection-properties'
import { clobberValue } from '../../scene-graph/selection-properties'
import type { NodeId } from '../../scene-graph/node-id'
import type { CanvasNode, SceneNode } from '../../scene-graph/types'
import { useSceneGraph, useCanvasId } from './provider'
import { useUndoManager } from './undo-provider'

// ── Types ────────────────────────────────────────────────────────────

type KeysOfUnion<T> = T extends T ? keyof T : never

export type SelectionPropertyKey = Extract<KeysOfUnion<SceneNode>, string>

export type SelectionPropertyValue<K extends SelectionPropertyKey> =
  SceneNode extends infer N
    ? N extends Record<K, unknown>
      ? N[K]
      : never
    : never

export interface SetPropertyOptions {
  /** Whether to commit to the undo stack. Default: true. */
  commit?: boolean
  /** MergeType for batch merging (e.g., MergeType.OPACITY for slider drags). */
  mergeType?: MergeType | null
}

export type SetPropertyFn<T> = (value: T, options?: SetPropertyOptions) => void

export type SelectionPropertyTuple<T> = [T | Mixed | undefined, SetPropertyFn<T>]

export interface BatchSetOptions {
  /** Whether to commit to the undo stack. Default: true. */
  commit?: boolean
  /** MergeType for batch merging. */
  mergeType?: MergeType | null
}

export type BatchSetFn = (
  updates: Record<string, unknown>,
  options?: BatchSetOptions,
) => void

// ── useSelectionProperty ─────────────────────────────────────────────

/**
 * Read and write a single field across the current selection.
 *
 * Returns `[value | MIXED | undefined, setter]`. The setter writes to all
 * applicable nodes and commits by default.
 */
export function useSelectionProperty<K extends SelectionPropertyKey>(
  field: K,
): SelectionPropertyTuple<SelectionPropertyValue<K>>
export function useSelectionProperty<T>(field: string): SelectionPropertyTuple<T>
export function useSelectionProperty<T>(field: string): SelectionPropertyTuple<T> {
  const value = useSelectionPropertyValue<T>(field)
  const setter = useSelectionPropertySetterForField<T>(field)
  return [value, setter]
}

// ── useSelectionPropertyValue ────────────────────────────────────────

/**
 * Read-only: get the collected value for a field across the selection.
 * Returns `T` (all same), `MIXED` (values differ), or `undefined` (N/A).
 */
export function useSelectionPropertyValue<K extends SelectionPropertyKey>(
  field: K,
): SelectionPropertyValue<K> | Mixed | undefined
export function useSelectionPropertyValue<T>(field: string): T | Mixed | undefined
export function useSelectionPropertyValue<T>(field: string): T | Mixed | undefined {
  const sg = useSceneGraph()
  const canvasId = useCanvasId()
  const lastRef = useRef<T | Mixed | undefined>(undefined)

  const subscribe = useCallback(
    (onStoreChange: () => void) => sg.addListener(onStoreChange),
    [sg],
  )

  const getSnapshot = useCallback(() => {
    const canvas = sg.getNode(canvasId) as CanvasNode | undefined
    if (!canvas) return undefined
    const next = getSelectionValue<T>(sg, canvas.selection, field)
    // Stable reference for primitives and MIXED (symbol)
    if (next === lastRef.current) return lastRef.current
    // Deep equality check for objects to avoid unnecessary rerenders
    if (
      next !== undefined
      && typeof next === 'object'
      && lastRef.current !== undefined
      && typeof lastRef.current === 'object'
      && JSON.stringify(next) === JSON.stringify(lastRef.current)
    ) {
      return lastRef.current
    }
    lastRef.current = next
    return next
  }, [sg, canvasId, field])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ── useSelectionPropertyValues ───────────────────────────────────────

/**
 * Read multiple fields at once. Returns an object mapping each field to
 * its collected value.
 */
export function useSelectionPropertyValues<K extends string>(
  ...fields: K[]
): Record<K, unknown | Mixed | undefined> {
  const sg = useSceneGraph()
  const canvasId = useCanvasId()
  const lastRef = useRef<Record<K, unknown | Mixed | undefined> | null>(null)

  const subscribe = useCallback(
    (onStoreChange: () => void) => sg.addListener(onStoreChange),
    [sg],
  )

  const getSnapshot = useCallback(() => {
    const canvas = sg.getNode(canvasId) as CanvasNode | undefined
    if (!canvas) return {} as Record<K, unknown | Mixed | undefined>

    const result = {} as Record<K, unknown | Mixed | undefined>
    let changed = lastRef.current === null
    for (const field of fields) {
      const next = getSelectionValue(sg, canvas.selection, field)
      result[field] = next
      if (!changed && lastRef.current && lastRef.current[field] !== next) {
        changed = true
      }
    }
    if (!changed) return lastRef.current!
    lastRef.current = result
    return result
  }, [sg, canvasId, ...fields])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ── useSelectionPropertySetter ───────────────────────────────────────

/**
 * Write-only: returns a batch setter for setting multiple fields atomically.
 *
 * ```ts
 * const setProperties = useSelectionPropertySetter()
 * setProperties({ opacity: 0.5, cornerRadius: 8 })
 * ```
 */
export function useSelectionPropertySetter(): BatchSetFn {
  const sg = useSceneGraph()
  const canvasId = useCanvasId()
  const um = useUndoManager()

  return useCallback(
    (updates: Record<string, unknown>, options: BatchSetOptions = {}) => {
      const { commit = true, mergeType = null } = options
      const canvas = sg.getNode(canvasId) as CanvasNode | undefined
      if (!canvas) return

      for (const [field, value] of Object.entries(updates)) {
        clobberValue(sg, canvas.selection, field, value)
      }
      if (commit) um.commit(mergeType)
    },
    [sg, canvasId, um],
  )
}

// ── useMixedChangeHandler ────────────────────────────────────────────

/**
 * Returns a MixedChangeHandler for a specific field. Used by NumericField
 * to support mixed scrubbing and mixed math expressions.
 *
 * The handler snapshots per-node values on the first call and reuses the
 * snapshot until commit, so scrub ticks apply relative to the original values.
 */
export function useMixedChangeHandler(field: string): MixedChangeHandler {
  const sg = useSceneGraph()
  const canvasId = useCanvasId()
  const um = useUndoManager()
  const snapshotRef = useRef<Map<NodeId, number> | null>(null)

  return useCallback(
    (transform: (v: number) => number, commit: boolean) => {
      const canvas = sg.getNode(canvasId) as CanvasNode | undefined
      if (!canvas) return

      const handler = createMixedMathHandler<number>(sg, canvas.selection, um, field)

      // Snapshot on first call (scrub start), reuse for subsequent ticks
      if (!snapshotRef.current) {
        snapshotRef.current = handler.getValues()
      }

      handler.onChange(snapshotRef.current, transform, commit)

      // Clear snapshot on commit so next operation gets a fresh one
      if (commit) {
        snapshotRef.current = null
      }
    },
    [sg, canvasId, um, field],
  )
}

// ── Internal: per-field setter ───────────────────────────────────────

function useSelectionPropertySetterForField<K extends SelectionPropertyKey>(
  field: K,
): SetPropertyFn<SelectionPropertyValue<K>>
function useSelectionPropertySetterForField<T>(field: string): SetPropertyFn<T>
function useSelectionPropertySetterForField<T>(field: string): SetPropertyFn<T> {
  const sg = useSceneGraph()
  const canvasId = useCanvasId()
  const um = useUndoManager()

  return useCallback(
    (value: T, options: SetPropertyOptions = {}) => {
      const { commit = true, mergeType = null } = options
      const canvas = sg.getNode(canvasId) as CanvasNode | undefined
      if (!canvas) return

      clobberValue(sg, canvas.selection, field, value)
      if (commit) um.commit(mergeType)
    },
    [sg, canvasId, um, field],
  )
}
