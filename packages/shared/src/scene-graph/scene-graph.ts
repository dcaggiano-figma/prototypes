/**
 * Scene graph — the core data model.
 *
 * A standalone TypeScript class with no React dependency. Manages a flat map of
 * nodes with tree structure encoded via parentId/children. All mutations go
 * through this class, which emits events and tracks dirty nodes.
 *
 * Immutability principle: all node fields are treated as immutable values. To
 * change a field, create a new value and call setNodeField(). This is critical
 * for undo/redo — old/new values are stored as snapshots, not diffs.
 */

import type { NodeId } from './node-id'
import { NodeIdGenerator } from './node-id'
import { Selection } from './selection'
import type {
  BaseNode,
  CanvasNode,
  DocumentNode,
  NodeType,
  SceneNode,
  TextNode,
} from './types'
import { createPaint } from './types'

// ── Events ──────────────────────────────────────────────────────────

export interface FieldChangeEvent {
  type: 'field-change'
  nodeId: NodeId
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface ReparentEvent {
  type: 'reparent'
  nodeId: NodeId
  oldParentId: NodeId | null
  newParentId: NodeId | null
  oldIndex: number
  newIndex: number
}

export interface CreateEvent {
  type: 'create'
  nodeId: NodeId
  node: SceneNode
}

export interface DeleteEvent {
  type: 'delete'
  nodeId: NodeId
  node: SceneNode
  parentId: NodeId
  index: number
}

export interface AttachmentRecord {
  key: string
  kind: string
  anchorNodeId: NodeId
  payload?: unknown
}

export interface AttachmentChangeEvent {
  type: 'attachment-change'
  action: 'attach' | 'detach'
  attacheeId: NodeId
  attachment: AttachmentRecord
}

export interface AttachmentInvalidateEvent {
  type: 'attachment-invalidate'
  reason: 'geometry-change' | 'reparent' | 'delete'
  anchorNodeId: NodeId
  attacheeIds: NodeId[]
}

export type SceneGraphEvent =
  | FieldChangeEvent
  | ReparentEvent
  | CreateEvent
  | DeleteEvent
  | AttachmentChangeEvent
  | AttachmentInvalidateEvent

export type SceneGraphListener = (event: SceneGraphEvent) => void

// ── Constants ───────────────────────────────────────────────────────

/** Node types that get an implicit TEXT slot child when created. */
const COMPOUND_SLOT_TYPES = new Set<NodeType>([
  'SHAPE_WITH_TEXT', 'STICKY_NOTE',
])

const ATTACHMENT_RELEVANT_FIELDS = new Set([
  'x', 'y', 'width', 'height', 'rotation',
])

// ── SceneGraph class ────────────────────────────────────────────────

export class SceneGraph {
  private nodes = new Map<NodeId, SceneNode>()
  private dirtyNodes = new Set<NodeId>()
  private listeners: SceneGraphListener[] = []
  private attachmentsByAttachee = new Map<NodeId, Map<string, AttachmentRecord>>()
  private attachmentsByAnchor = new Map<NodeId, Map<string, { attacheeId: NodeId; attachment: AttachmentRecord }>>()
  private idGen: NodeIdGenerator
  private _isUndoingOrRedoing = false

  /** The document root node. */
  readonly documentId: NodeId

  constructor(sessionId: number = 0) {
    this.idGen = new NodeIdGenerator(sessionId)

    // Create the document root
    const docId = this.idGen.generate()
    const doc: DocumentNode = {
      id: docId,
      name: 'Document',
      type: 'DOCUMENT',
      parentId: null,
      children: [],
      visible: true,
      locked: false,
      compoundOwner: null,
    }
    this.nodes.set(docId, doc)
    this.documentId = docId
  }

  // ── Reads ───────────────────────────────────────────────────────

  /** Get a node by ID, or undefined if not found. */
  getNode(id: NodeId): SceneNode | undefined {
    return this.nodes.get(id)
  }

  /** Get a node by ID, throwing if not found. */
  getNodeOrThrow(id: NodeId): SceneNode {
    const node = this.nodes.get(id)
    if (!node) throw new Error(`Node ${id} not found`)
    return node
  }

  /** Get the document root node. */
  getDocument(): DocumentNode {
    return this.nodes.get(this.documentId) as DocumentNode
  }

  /** Get all canvas (page) nodes. */
  getCanvases(): CanvasNode[] {
    const doc = this.getDocument()
    return doc.children
      .map((id) => this.nodes.get(id))
      .filter((n): n is CanvasNode => n?.type === 'CANVAS')
  }

  /** Get all ancestors from a node up to (but not including) the root. */
  getAncestors(id: NodeId): SceneNode[] {
    const ancestors: SceneNode[] = []
    let current = this.nodes.get(id)
    while (current?.parentId != null) {
      const parent = this.nodes.get(current.parentId)
      if (!parent) break
      ancestors.push(parent)
      current = parent
    }
    return ancestors
  }

  /** Get all descendants depth-first. */
  getDescendants(id: NodeId): SceneNode[] {
    const result: SceneNode[] = []
    const collect = (nodeId: NodeId) => {
      const node = this.nodes.get(nodeId)
      if (!node) return
      for (const childId of node.children) {
        const child = this.nodes.get(childId)
        if (child) {
          result.push(child)
          collect(childId)
        }
      }
    }
    collect(id)
    return result
  }

  /** Walk the subtree rooted at a node depth-first (children in order). */
  walk(rootId: NodeId, callback: (node: SceneNode, depth: number) => void): void {
    const visit = (nodeId: NodeId, depth: number) => {
      const node = this.nodes.get(nodeId)
      if (!node) return
      callback(node, depth)
      for (const childId of node.children) {
        visit(childId, depth + 1)
      }
    }
    visit(rootId, 0)
  }

  /**
   * Walk the subtree in layers-panel order: last child first (top of stack),
   * depth-first. This matches Figma's layers panel where the topmost visual
   * node appears first.
   */
  walkLayersOrder(
    rootId: NodeId,
    callback: (node: SceneNode, depth: number) => boolean | void,
  ): void {
    const visit = (nodeId: NodeId, depth: number): boolean => {
      const node = this.nodes.get(nodeId)
      if (!node) return false
      if (callback(node, depth) === false) return false
      for (let i = node.children.length - 1; i >= 0; i--) {
        if (visit(node.children[i], depth + 1) === false) return false
      }
      return true
    }
    visit(rootId, 0)
  }

  /** Total number of nodes (including document). */
  get nodeCount(): number {
    return this.nodes.size
  }

  /** True while an undo or redo operation is being applied. */
  get isUndoingOrRedoing(): boolean {
    return this._isUndoingOrRedoing
  }

  /** Set the undo/redo flag. Only the UndoManager should call this. */
  setIsUndoingOrRedoing(value: boolean): void {
    this._isUndoingOrRedoing = value
  }

  // ── Mutations ─────────────────────────────────────────────────────

  /**
   * Change a single field on a node. Marks dirty, emits event.
   * Returns the old value for undo tracking.
   */
  setNodeField<K extends string>(
    nodeId: NodeId,
    field: K,
    value: unknown,
  ): unknown {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)

    const record = node as unknown as Record<string, unknown>
    const oldValue = record[field]
    if (oldValue === value) return oldValue

    // Create new node object (immutability)
    const updated = { ...node, [field]: value } as SceneNode
    this.nodes.set(nodeId, updated)
    this.markDirty(nodeId)
    this.emit({
      type: 'field-change',
      nodeId,
      field,
      oldValue,
      newValue: value,
    })
    if (ATTACHMENT_RELEVANT_FIELDS.has(field)) {
      this.invalidateAttachmentsForSubtree(nodeId, 'geometry-change')
    }

    return oldValue
  }

  /**
   * Update multiple fields on a node at once.
   * Emits a field-change event for each changed field.
   */
  updateNode(nodeId: NodeId, updates: Record<string, unknown>): void {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)

    const record = node as unknown as Record<string, unknown>
    let changed = false
    const events: FieldChangeEvent[] = []

    for (const [field, value] of Object.entries(updates)) {
      if (record[field] !== value) {
        events.push({
          type: 'field-change',
          nodeId,
          field,
          oldValue: record[field],
          newValue: value,
        })
        changed = true
      }
    }

    if (!changed) return

    const updated = { ...node, ...updates } as SceneNode
    this.nodes.set(nodeId, updated)
    this.markDirty(nodeId)
    for (const event of events) {
      this.emit(event)
    }
    if (Object.keys(updates).some((field) => ATTACHMENT_RELEVANT_FIELDS.has(field))) {
      this.invalidateAttachmentsForSubtree(nodeId, 'geometry-change')
    }
  }

  /**
   * Create a new node and add it to the tree.
   * If no id is provided, one is generated.
   * For compound node types (RECTANGLE, ELLIPSE, etc.), auto-creates the
   * implicit TEXT slot child.
   */
  createNode(
    type: NodeType,
    parentId: NodeId,
    props: Partial<BaseNode> & Record<string, unknown> = {},
  ): SceneNode {
    const parent = this.nodes.get(parentId)
    if (!parent) throw new Error(`Parent ${parentId} not found`)

    const id = props.id ?? this.idGen.generate()
    if (typeof props.id === 'number') {
      // Ensure future IDs don't collide
      this.idGen.advancePast(id)
    }

    const node = {
      name: `${displayName(type)} ${id}`,
      visible: true,
      locked: false,
      children: [],
      compoundOwner: null,
      ...props,
      id,
      type,
      parentId,
    } as SceneNode

    // Auto-create slot children for compound types
    if (COMPOUND_SLOT_TYPES.has(type) && !('slots' in props)) {
      const textNode = this.createSlotTextNode(id)
      ;(node as unknown as Record<string, unknown>).slots = { text: textNode.id }
    }

    this.nodes.set(id, node)

    // Add to parent's children
    const updatedParent = {
      ...parent,
      children: [...parent.children, id],
    } as SceneNode
    this.nodes.set(parentId, updatedParent)

    this.markDirty(id)
    this.markDirty(parentId)
    this.emit({ type: 'create', nodeId: id, node })

    return node
  }

  /**
   * Create a node at a specific index within its parent's children.
   * For compound node types, auto-creates the implicit TEXT slot child.
   */
  createNodeAt(
    type: NodeType,
    parentId: NodeId,
    index: number,
    props: Partial<BaseNode> & Record<string, unknown> = {},
  ): SceneNode {
    const parent = this.nodes.get(parentId)
    if (!parent) throw new Error(`Parent ${parentId} not found`)

    const id = props.id ?? this.idGen.generate()
    if (typeof props.id === 'number') {
      this.idGen.advancePast(id)
    }

    const node = {
      name: `${displayName(type)} ${id}`,
      visible: true,
      locked: false,
      children: [],
      compoundOwner: null,
      ...props,
      id,
      type,
      parentId,
    } as SceneNode

    // Auto-create slot children for compound types
    if (COMPOUND_SLOT_TYPES.has(type) && !('slots' in props)) {
      const textNode = this.createSlotTextNode(id)
      ;(node as unknown as Record<string, unknown>).slots = { text: textNode.id }
    }

    this.nodes.set(id, node)

    const newChildren = [...parent.children]
    newChildren.splice(index, 0, id)
    const updatedParent = { ...parent, children: newChildren } as SceneNode
    this.nodes.set(parentId, updatedParent)

    this.markDirty(id)
    this.markDirty(parentId)
    this.emit({ type: 'create', nodeId: id, node })

    return node
  }

  /**
   * Delete a node and all its descendants (including slot children).
   * Returns the deleted node for undo tracking.
   */
  deleteNode(nodeId: NodeId): SceneNode {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)

    // Prevent direct deletion of slot children — must delete the compound owner
    if (node.compoundOwner != null) {
      throw new Error(`Cannot delete slot child ${nodeId} directly — delete its compound owner ${node.compoundOwner} instead`)
    }

    this.deleteSubtree(nodeId)

    // Remove from parent's children array
    const parentId = node.parentId
    if (parentId != null) {
      const parent = this.nodes.get(parentId)
      if (parent) {
        const index = parent.children.indexOf(nodeId)
        const newChildren = parent.children.filter((id) => id !== nodeId)
        const updatedParent = { ...parent, children: newChildren } as SceneNode
        this.nodes.set(parentId, updatedParent)
        this.markDirty(parentId)

        this.emit({
          type: 'delete',
          nodeId,
          node,
          parentId,
          index,
        })
      }
    }

    return node
  }

  /**
   * Recursively remove a node and everything under it from the map.
   * Handles both user children and slot children.
   */
  private deleteSubtree(nodeId: NodeId): void {
    const node = this.nodes.get(nodeId)
    if (!node) return

    this.invalidateAttachmentsForSubtree(nodeId, 'delete')
    this.detachAllForNode(nodeId)

    // Delete slot children (compound nodes)
    const record = node as unknown as Record<string, unknown>
    if (record.slots && typeof record.slots === 'object') {
      for (const slotNodeId of Object.values(record.slots as Record<string, NodeId>)) {
        this.deleteSubtree(slotNodeId)
      }
    }

    // Recursively delete user children
    for (const childId of [...node.children]) {
      this.deleteSubtree(childId)
    }

    this.nodes.delete(nodeId)
  }

  /**
   * Move a node to a new parent at a specific index.
   * Preserves the node's local coordinates (does NOT adjust for world position).
   */
  reparentNode(nodeId: NodeId, newParentId: NodeId, index: number): void {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)
    if (node.parentId == null) throw new Error('Cannot reparent the document root')

    const oldParentId = node.parentId
    const oldParent = this.nodes.get(oldParentId)
    if (!oldParent) throw new Error(`Old parent ${oldParentId} not found`)

    const newParent = this.nodes.get(newParentId)
    if (!newParent) throw new Error(`New parent ${newParentId} not found`)

    const oldIndex = oldParent.children.indexOf(nodeId)

    // Remove from old parent
    const oldChildren = oldParent.children.filter((id) => id !== nodeId)
    this.nodes.set(oldParentId, { ...oldParent, children: oldChildren } as SceneNode)

    // Adjust index if moving within the same parent and the node was before the target
    let adjustedIndex = index
    if (oldParentId === newParentId && oldIndex < index) {
      adjustedIndex--
    }

    // Add to new parent
    const freshNewParent = this.nodes.get(newParentId)!
    const newChildren = [...freshNewParent.children]
    newChildren.splice(adjustedIndex, 0, nodeId)
    this.nodes.set(newParentId, { ...freshNewParent, children: newChildren } as SceneNode)

    // Update node's parentId
    this.nodes.set(nodeId, { ...this.nodes.get(nodeId)!, parentId: newParentId } as SceneNode)

    this.markDirty(nodeId)
    this.markDirty(oldParentId)
    if (newParentId !== oldParentId) this.markDirty(newParentId)
    this.invalidateAttachmentsForSubtree(nodeId, 'reparent')

    this.emit({
      type: 'reparent',
      nodeId,
      oldParentId,
      newParentId,
      oldIndex,
      newIndex: adjustedIndex,
    })
  }

  /** Reorder a node within its current parent. */
  reorderNode(nodeId: NodeId, newIndex: number): void {
    const node = this.nodes.get(nodeId)
    if (!node || node.parentId == null) return

    this.reparentNode(nodeId, node.parentId, newIndex)
  }

  // ── Dirty tracking ────────────────────────────────────────────────

  /**
   * Flush the dirty set. Returns the set of node IDs that have changed since
   * the last flush, and resets internally to empty.
   */
  flushDirty(): Set<NodeId> {
    const dirty = this.dirtyNodes
    this.dirtyNodes = new Set()
    return dirty
  }

  /** Check if any nodes are dirty without flushing. */
  get hasDirty(): boolean {
    return this.dirtyNodes.size > 0
  }

  // ── Attachments ───────────────────────────────────────────────────

  attachNode(attacheeId: NodeId, attachment: AttachmentRecord): void {
    if (!this.nodes.has(attacheeId)) throw new Error(`Attachee ${attacheeId} not found`)
    if (!this.nodes.has(attachment.anchorNodeId)) throw new Error(`Anchor ${attachment.anchorNodeId} not found`)

    const existing = this.attachmentsByAttachee.get(attacheeId)?.get(attachment.key)
    if (
      existing
      && existing.kind === attachment.kind
      && existing.anchorNodeId === attachment.anchorNodeId
      && existing.payload === attachment.payload
    ) {
      return
    }
    if (existing) this.detachNode(attacheeId, attachment.key)

    let byKey = this.attachmentsByAttachee.get(attacheeId)
    if (!byKey) {
      byKey = new Map()
      this.attachmentsByAttachee.set(attacheeId, byKey)
    }
    byKey.set(attachment.key, attachment)

    let byAttachee = this.attachmentsByAnchor.get(attachment.anchorNodeId)
    if (!byAttachee) {
      byAttachee = new Map()
      this.attachmentsByAnchor.set(attachment.anchorNodeId, byAttachee)
    }
    byAttachee.set(this.anchorAttachmentKey(attacheeId, attachment.key), { attacheeId, attachment })

    this.emit({
      type: 'attachment-change',
      action: 'attach',
      attacheeId,
      attachment,
    })
  }

  updateAttachment(attacheeId: NodeId, key: string, nextAttachment: AttachmentRecord): void {
    this.detachNode(attacheeId, key)
    this.attachNode(attacheeId, nextAttachment)
  }

  detachNode(attacheeId: NodeId, key: string): void {
    const byKey = this.attachmentsByAttachee.get(attacheeId)
    const attachment = byKey?.get(key)
    if (!attachment) return

    byKey!.delete(key)
    if (byKey!.size === 0) this.attachmentsByAttachee.delete(attacheeId)

    const byAttachee = this.attachmentsByAnchor.get(attachment.anchorNodeId)
    byAttachee?.delete(this.anchorAttachmentKey(attacheeId, key))
    if (byAttachee?.size === 0) this.attachmentsByAnchor.delete(attachment.anchorNodeId)

    this.emit({
      type: 'attachment-change',
      action: 'detach',
      attacheeId,
      attachment,
    })
  }

  getAttachmentsForAnchor(anchorNodeId: NodeId): Array<{ attacheeId: NodeId; attachment: AttachmentRecord }> {
    return [...(this.attachmentsByAnchor.get(anchorNodeId)?.values() ?? [])]
  }

  getAttachmentsForAttachee(attacheeId: NodeId): AttachmentRecord[] {
    return [...(this.attachmentsByAttachee.get(attacheeId)?.values() ?? [])]
  }

  private markDirty(nodeId: NodeId): void {
    this.dirtyNodes.add(nodeId)
  }

  private detachAllForNode(nodeId: NodeId): void {
    for (const attachment of this.getAttachmentsForAttachee(nodeId)) {
      this.detachNode(nodeId, attachment.key)
    }

    const anchored = this.getAttachmentsForAnchor(nodeId)
    for (const { attacheeId, attachment } of anchored) {
      this.detachNode(attacheeId, attachment.key)
    }
  }

  private invalidateAttachmentsForSubtree(nodeId: NodeId, reason: AttachmentInvalidateEvent['reason']): void {
    const anchors: NodeId[] = [nodeId, ...this.getDescendantIds(nodeId)]
    for (const anchorId of anchors) {
      const attached = this.getAttachmentsForAnchor(anchorId)
      if (attached.length === 0) continue
      this.emit({
        type: 'attachment-invalidate',
        reason,
        anchorNodeId: anchorId,
        attacheeIds: attached.map(({ attacheeId }) => attacheeId),
      })
    }
  }

  private getDescendantIds(nodeId: NodeId): NodeId[] {
    return this.getDescendants(nodeId).map((node) => node.id)
  }

  private anchorAttachmentKey(attacheeId: NodeId, key: string): string {
    return `${attacheeId}:${key}`
  }

  // ── Event system ──────────────────────────────────────────────────

  /** Add a listener for scene graph events. Returns an unsubscribe function. */
  addListener(listener: SceneGraphListener): () => void {
    this.listeners.push(listener)
    return () => {
      const idx = this.listeners.indexOf(listener)
      if (idx >= 0) this.listeners.splice(idx, 1)
    }
  }

  private emit(event: SceneGraphEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  // ── Slot / compound helpers ────────────────────────────────────────

  /** Check if a node is part of a compound node's implicit structure. */
  isSlotChild(nodeId: NodeId): boolean {
    const node = this.nodes.get(nodeId)
    return node?.compoundOwner != null
  }

  /** Get the compound owner of a slot child, or null if it's a regular node. */
  getCompoundOwner(nodeId: NodeId): NodeId | null {
    return this.nodes.get(nodeId)?.compoundOwner ?? null
  }

  /**
   * Create an implicit TEXT node for a compound node's slot.
   * The text node is added to the nodes map but NOT to any children array —
   * it's referenced only through the parent's `slots` field.
   */
  private createSlotTextNode(compoundOwnerId: NodeId): TextNode {
    const textId = this.idGen.generate()
    const textNode: TextNode = {
      id: textId,
      name: 'Text',
      type: 'TEXT',
      parentId: compoundOwnerId,
      children: [],
      visible: true,
      locked: false,
      compoundOwner: compoundOwnerId,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      opacity: 1,
      cornerRadius: 0,
      fills: [createPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true })],
      strokes: [],
      strokeWeight: 1,
      strokeAlign: 'CENTER',
      effects: [],
      characters: '',
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 20,
      letterSpacing: 0,
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'CENTER',
      textAutoResize: 'WIDTH_AND_HEIGHT',
    }
    this.nodes.set(textId, textNode)
    this.markDirty(textId)
    return textNode
  }

  // ── Convenience ───────────────────────────────────────────────────

  /** Create a canvas (page) node as a child of the document. */
  createCanvas(name: string, backgroundColor = { r: 245, g: 244, b: 243 }): CanvasNode {
    return this.createNode('CANVAS', this.documentId, {
      name,
      backgroundColor,
      backgroundVisible: true,
      selection: Selection.EMPTY,
    }) as CanvasNode
  }

  /** Get the ID generator (for tests or specialized ID management). */
  getIdGenerator(): NodeIdGenerator {
    return this.idGen
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Convert a NODE_TYPE string to a display name: "SHAPE_WITH_TEXT" → "Shape with text" */
function displayName(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ')
}
