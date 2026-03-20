/**
 * useBehaviorManager — React hook that creates a BehaviorManager and
 * wires it into the canvas rendering system.
 *
 * Returns pointer event handlers that create CanvasPointerEvents and
 * dispatch them through the BehaviorManager. Also registers a paint
 * callback for behavior overlay drawing (box select, etc.).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { BehaviorManager } from './behavior-manager'
import { createCanvasPointerEvent } from './hit-testing'
import { useRendering } from '../rendering/provider'
import { useSceneGraph, useCanvasId } from '../scene-graph/provider'
import { useSelection } from '../selection/provider'
import { useUndoManager } from '../scene-graph/undo-provider'
import type { Behavior, BehaviorContext } from './types'
import type { NodeId } from '../../scene-graph/node-id'

// ── useBehaviorContext ──────────────────────────────────────────────

/**
 * Create a stable BehaviorContext from the current React context.
 * Call this first, then pass the context to behavior factory functions.
 */
export function useBehaviorContext(): BehaviorContext {
  const { renderLoop, viewport } = useRendering()
  const sg = useSceneGraph()
  const canvasId = useCanvasId()
  const selection = useSelection()
  const um = useUndoManager()

  // Store current values in refs so the context getters always return fresh values
  const sgRef = useRef(sg)
  sgRef.current = sg
  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const umRef = useRef(um)
  umRef.current = um
  const canvasIdRef = useRef(canvasId)
  canvasIdRef.current = canvasId

  return useMemo<BehaviorContext>(() => ({
    sg: () => sgRef.current,
    viewport: () => viewport,
    selection: () => selectionRef.current,
    canvasId: () => canvasIdRef.current,
    undoManager: () => umRef.current,
    requestFrame: () => renderLoop.requestFrame(),
  }), [viewport, renderLoop])
}

// ── useBehaviorManager ──────────────────────────────────────────────

export interface UseBehaviorManagerOptions {
  /** The ordered list of behaviors. Array order = priority. */
  behaviors: Behavior[]

  /**
   * The frame ID the user has entered (for hit-testing context).
   * Passed to `createCanvasPointerEvent` so it resolves hit nodes
   * relative to the entered frame.
   */
  enteredFrameId: NodeId | null
}

export interface UseBehaviorManagerResult {
  /** The BehaviorManager instance. */
  manager: BehaviorManager

  /** Attach to the canvas container's onPointerDown. */
  onPointerDown: (e: React.PointerEvent) => void

  /** Attach to the canvas container's onPointerMove. */
  onPointerMove: (e: React.PointerEvent) => void

  /** Attach to the canvas container's onPointerUp. */
  onPointerUp: (e: React.PointerEvent) => void
}

export function useBehaviorManager(options: UseBehaviorManagerOptions): UseBehaviorManagerResult {
  const { renderLoop, viewport, canvasOverlay } = useRendering()

  // Create the manager (stable reference)
  const manager = useMemo(() => new BehaviorManager(), [])

  // Store manager in a ref for the paint callback
  const managerRef = useRef(manager)
  managerRef.current = manager

  // Update behaviors when the list changes
  useEffect(() => {
    manager.setBehaviors(options.behaviors)
  }, [manager, options.behaviors])

  // Register overlay paint callback for behavior drawing (box select, etc.)
  useEffect(() => {
    return renderLoop.addCallback((frame) => {
      const canvas = canvasOverlay.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      managerRef.current.drawOverlays(ctx, frame.viewport)
    })
  }, [renderLoop, canvasOverlay])

  // Store enteredFrameId in a ref for the event creator
  const enteredFrameIdRef = useRef(options.enteredFrameId)
  enteredFrameIdRef.current = options.enteredFrameId

  // Event handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const event = createCanvasPointerEvent(e.nativeEvent, viewport, enteredFrameIdRef.current)
    manager.handlePointerDown(event)
  }, [manager, viewport])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const event = createCanvasPointerEvent(e.nativeEvent, viewport, enteredFrameIdRef.current)
    manager.handlePointerMove(event)
  }, [manager, viewport])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const event = createCanvasPointerEvent(e.nativeEvent, viewport, enteredFrameIdRef.current)
    manager.handlePointerUp(event)
  }, [manager, viewport])

  return { manager, onPointerDown, onPointerMove, onPointerUp }
}
