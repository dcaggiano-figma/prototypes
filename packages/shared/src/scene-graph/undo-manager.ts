/**
 * Undo/redo manager for the scene graph.
 *
 * Listens to scene graph events and records changes. Uses a buffer → commit
 * pattern: changes accumulate in a buffer during interaction, then commit()
 * pushes them as a single batch onto the undo stack.
 *
 * ## Dual-stack system
 *
 * Two parallel stacks — tainted and untainted — enable a critical UX pattern:
 * undo several steps, change selection to copy something, then redo back.
 * Selection changes don't blow away the redo stack because they go to the
 * untainted stack.
 *
 * ## Batch merging
 *
 * Adjacent batches of the same MergeType committed within the merge window
 * (default 500ms) are merged into one undo step. This collapses consecutive
 * keystrokes, repeated nudges, and rapid slider adjustments.
 */

import type { NodeId } from './node-id'
import type { SceneGraph } from './scene-graph'
import type { SceneGraphEvent, SceneGraphListener } from './scene-graph'
import type { SceneNode } from './types'

// ── Change types ──────────────────────────────────────────────────────

export interface FieldChange {
  type: 'field'
  nodeId: NodeId
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface ReparentChange {
  type: 'reparent'
  nodeId: NodeId
  oldParentId: NodeId | null
  oldIndex: number
  newParentId: NodeId | null
  newIndex: number
}

export interface CreateChange {
  type: 'create'
  node: SceneNode
  parentId: NodeId
  index: number
}

export interface DeleteChange {
  type: 'delete'
  node: SceneNode
  parentId: NodeId
  index: number
}

export type Change = FieldChange | ReparentChange | CreateChange | DeleteChange

// ── Batch types ──────────────────────────────────────────────────────

export enum MergeType {
  NUDGE = 'NUDGE',
  TEXT_EDIT = 'TEXT_EDIT',
  OPACITY = 'OPACITY',
  COLOR = 'COLOR',
}

export interface Batch {
  changes: Change[]
  tainting: boolean
  timestamp: number
  mergeType: MergeType | null
}

// ── Non-tainting fields ─────────────────────────────────────────────

/** Fields that don't taint the document (selection, page switching). */
const NON_TAINTING_FIELDS = new Set<string>([
  'selection',
  'currentPage',
])

function isTaintingChange(change: Change): boolean {
  if (change.type === 'field') return !NON_TAINTING_FIELDS.has(change.field)
  return true
}

// ── UndoManager ─────────────────────────────────────────────────────

export class UndoManager {
  private taintedUndoStack: Batch[] = []
  private taintedRedoStack: Batch[] = []
  private untaintedUndoStack: Batch[] = []
  private untaintedRedoStack: Batch[] = []
  private buffer: Change[] = []
  private unsubscribe: (() => void) | null = null

  /** Time window in ms for merging adjacent batches. */
  readonly mergeWindow: number

  constructor(
    private readonly sg: SceneGraph,
    options: { mergeWindow?: number } = {},
  ) {
    this.mergeWindow = options.mergeWindow ?? 500
    this.unsubscribe = sg.addListener(this.handleEvent)
  }

  /** Stop listening to scene graph events. */
  dispose(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  // ── Buffer ──────────────────────────────────────────────────────

  /** Number of uncommitted changes in the buffer. */
  get bufferSize(): number {
    return this.buffer.length
  }

  /**
   * Commit the current buffer as a batch onto the appropriate stack.
   * Does nothing if the buffer is empty.
   *
   * Optionally specify a MergeType to allow merging with adjacent batches
   * of the same type within the merge window.
   */
  commit(mergeType: MergeType | null = null): void {
    if (this.buffer.length === 0) return

    const changes = this.buffer
    this.buffer = []

    // Split non-tainting changes (selection, page) from tainting changes
    // so they go to separate stacks. This prevents undo of a property
    // change from also reverting the selection.
    const taintingChanges: Change[] = []
    const nonTaintingChanges: Change[] = []
    for (const change of changes) {
      if (isTaintingChange(change)) {
        taintingChanges.push(change)
      } else {
        nonTaintingChanges.push(change)
      }
    }

    const now = Date.now()

    // Commit non-tainting changes to untainted stack first
    if (nonTaintingChanges.length > 0) {
      const untaintedBatch: Batch = {
        changes: nonTaintingChanges,
        tainting: false,
        timestamp: now,
        mergeType: null,
      }
      if (!this.tryMerge(this.untaintedUndoStack, untaintedBatch)) {
        this.untaintedUndoStack.push(untaintedBatch)
      }
    }

    // Commit tainting changes to tainted stack
    if (taintingChanges.length > 0) {
      const taintedBatch: Batch = {
        changes: taintingChanges,
        tainting: true,
        timestamp: now,
        mergeType,
      }

      // Merge untainted history into tainted stacks
      this.taintedUndoStack.push(...this.untaintedUndoStack)
      this.untaintedUndoStack = []
      // Clear both redo stacks (we've branched)
      this.taintedRedoStack = []
      this.untaintedRedoStack = []

      // Try to merge with the previous tainted batch
      if (this.tryMerge(this.taintedUndoStack, taintedBatch)) return
      this.taintedUndoStack.push(taintedBatch)
    }
  }

  // ── Undo / Redo ─────────────────────────────────────────────────

  /** Whether an undo operation is available. */
  get canUndo(): boolean {
    return this.taintedUndoStack.length > 0 || this.untaintedUndoStack.length > 0
  }

  /** Whether a redo operation is available. */
  get canRedo(): boolean {
    return this.taintedRedoStack.length > 0 || this.untaintedRedoStack.length > 0
  }

  /** Undo the most recent batch. */
  undo(): void {
    // Auto-commit any pending buffer changes first
    if (this.buffer.length > 0) this.commit()

    // Pick the most recent batch across both stacks
    const tainted = this.taintedUndoStack[this.taintedUndoStack.length - 1]
    const untainted = this.untaintedUndoStack[this.untaintedUndoStack.length - 1]

    if (!tainted && !untainted) return

    // Pick whichever is more recent (or whichever exists)
    const useTainted = !untainted || (tainted && tainted.timestamp > untainted.timestamp)

    if (useTainted && tainted) {
      this.taintedUndoStack.pop()
      const redoBatch = this.applyBatchReverse(tainted)
      this.taintedRedoStack.push(redoBatch)
    } else if (untainted) {
      this.untaintedUndoStack.pop()
      const redoBatch = this.applyBatchReverse(untainted)
      this.untaintedRedoStack.push(redoBatch)
    }
  }

  /** Redo the most recently undone batch. */
  redo(): void {
    // Auto-commit any pending buffer changes first
    if (this.buffer.length > 0) this.commit()

    // Prefer tainted redo (document changes are more likely what user wants)
    const tainted = this.taintedRedoStack[this.taintedRedoStack.length - 1]
    const untainted = this.untaintedRedoStack[this.untaintedRedoStack.length - 1]

    if (!tainted && !untainted) return

    // Prefer tainted, fallback to untainted
    const useTainted = tainted != null

    if (useTainted && tainted) {
      this.taintedRedoStack.pop()
      const undoBatch = this.applyBatchForward(tainted)
      this.taintedUndoStack.push(undoBatch)
    } else if (untainted) {
      this.untaintedRedoStack.pop()
      const undoBatch = this.applyBatchForward(untainted)
      this.untaintedUndoStack.push(undoBatch)
    }
  }

  /** Clear all undo/redo history and the buffer. */
  clear(): void {
    this.taintedUndoStack = []
    this.taintedRedoStack = []
    this.untaintedUndoStack = []
    this.untaintedRedoStack = []
    this.buffer = []
  }

  // ── Internals ───────────────────────────────────────────────────

  /** Scene graph event handler — records changes into the buffer. */
  private handleEvent: SceneGraphListener = (event: SceneGraphEvent) => {
    // Don't record changes that are being applied by undo/redo
    if (this.sg.isUndoingOrRedoing) return

    const change = eventToChange(event, this.sg)
    if (change) this.buffer.push(change)
  }

  /**
   * Try to merge a batch into the top of a stack. Returns true if merged.
   *
   * Merging conditions:
   * - Both batches have the same non-null mergeType
   * - They're within the merge window
   * - Neither involves create/delete changes
   */
  private tryMerge(stack: Batch[], batch: Batch): boolean {
    if (!batch.mergeType || stack.length === 0) return false

    const top = stack[stack.length - 1]
    if (top.mergeType !== batch.mergeType) return false
    if (batch.timestamp - top.timestamp > this.mergeWindow) return false

    // Don't merge batches that involve structural changes
    if (hasStructuralChanges(top) || hasStructuralChanges(batch)) return false

    // Merge: extend the top batch with the new changes, update timestamp
    // For field changes on the same node+field, keep the original oldValue
    // and update to the new newValue
    for (const change of batch.changes) {
      const existing = findMatchingFieldChange(top.changes, change)
      if (existing) {
        // Update the existing change's newValue to the latest
        existing.newValue = (change as FieldChange).newValue
      } else {
        top.changes.push(change)
      }
    }
    top.timestamp = batch.timestamp
    return true
  }

  /**
   * Apply a batch in reverse (for undo). Returns the same batch for redo.
   * Changes are applied in reverse order.
   *
   * Change objects describe a transition (old → new) and pass through
   * unchanged. The direction (forward vs reverse) determines which
   * value gets applied.
   */
  private applyBatchReverse(batch: Batch): Batch {
    this.sg.setIsUndoingOrRedoing(true)
    try {
      for (let i = batch.changes.length - 1; i >= 0; i--) {
        this.applyChangeReverse(batch.changes[i])
      }
    } finally {
      this.sg.setIsUndoingOrRedoing(false)
    }
    return batch
  }

  /**
   * Apply a batch forward (for redo). Returns the same batch for undo.
   * Changes are applied in order.
   */
  private applyBatchForward(batch: Batch): Batch {
    this.sg.setIsUndoingOrRedoing(true)
    try {
      for (const change of batch.changes) {
        this.applyChangeForward(change)
      }
    } finally {
      this.sg.setIsUndoingOrRedoing(false)
    }
    return batch
  }

  /** Apply a single change in reverse (undo). */
  private applyChangeReverse(change: Change): void {
    switch (change.type) {
      case 'field':
        this.sg.setNodeField(change.nodeId, change.field, change.oldValue)
        break
      case 'reparent':
        if (change.oldParentId != null) {
          this.sg.reparentNode(change.nodeId, change.oldParentId, change.oldIndex)
        }
        break
      case 'create':
        // Undo create = delete
        this.sg.deleteNode(change.node.id)
        break
      case 'delete':
        // Undo delete = recreate at the original position
        this.recreateNode(change.node, change.parentId, change.index)
        break
    }
  }

  /** Apply a single change forward (redo). */
  private applyChangeForward(change: Change): void {
    switch (change.type) {
      case 'field':
        this.sg.setNodeField(change.nodeId, change.field, change.newValue)
        break
      case 'reparent':
        if (change.newParentId != null) {
          this.sg.reparentNode(change.nodeId, change.newParentId, change.newIndex)
        }
        break
      case 'create':
        // Redo create = recreate
        this.recreateNode(change.node, change.parentId, change.index)
        break
      case 'delete':
        // Redo delete = delete again
        this.sg.deleteNode(change.node.id)
        break
    }
  }

  /**
   * Recreate a node from a snapshot at a specific position.
   * Used by undo-delete and redo-create.
   */
  private recreateNode(node: SceneNode, parentId: NodeId, index: number): void {
    // Strip parentId and type — createNodeAt sets these
    const { parentId: _pid, type: _type, id, ...rest } = node as unknown as Record<string, unknown>
    this.sg.createNodeAt(
      node.type,
      parentId,
      index,
      { id: id as NodeId, ...rest },
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Convert a scene graph event to a Change for the undo buffer. */
function eventToChange(event: SceneGraphEvent, sg: SceneGraph): Change | null {
  switch (event.type) {
    case 'field-change':
      return {
        type: 'field',
        nodeId: event.nodeId,
        field: event.field,
        oldValue: event.oldValue,
        newValue: event.newValue,
      }
    case 'reparent':
      return {
        type: 'reparent',
        nodeId: event.nodeId,
        oldParentId: event.oldParentId,
        oldIndex: event.oldIndex,
        newParentId: event.newParentId,
        newIndex: event.newIndex,
      }
    case 'create': {
      const parent = event.node.parentId
      if (parent == null) return null
      const parentNode = sg.getNode(parent)
      if (!parentNode) return null
      const index = parentNode.children.indexOf(event.nodeId)
      return {
        type: 'create',
        node: event.node,
        parentId: parent,
        index: index >= 0 ? index : parentNode.children.length - 1,
      }
    }
    case 'delete':
      return {
        type: 'delete',
        node: event.node,
        parentId: event.parentId,
        index: event.index,
      }
    case 'attachment-change':
    case 'attachment-invalidate':
      return null
  }
}

/** Check if a batch contains create or delete changes. */
function hasStructuralChanges(batch: Batch): boolean {
  return batch.changes.some((c) => c.type === 'create' || c.type === 'delete')
}

/**
 * Find a matching field change in a change list (same nodeId + field).
 * Used for merge optimization — keep original oldValue, update newValue.
 */
function findMatchingFieldChange(changes: Change[], candidate: Change): FieldChange | undefined {
  if (candidate.type !== 'field') return undefined
  return changes.find(
    (c): c is FieldChange =>
      c.type === 'field' && c.nodeId === candidate.nodeId && c.field === candidate.field,
  )
}
