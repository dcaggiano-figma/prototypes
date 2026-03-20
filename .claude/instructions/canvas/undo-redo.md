# Undo/redo

The undo/redo system records scene graph mutations and replays them in reverse
(undo) or forward (redo). It uses a buffer → commit pattern and a dual-stack
architecture that preserves redo history across selection changes.

All imports come from `@prototype/shared/canvas`.

## Quick start

```tsx
import { UndoManagerProvider, useUndoManager, useUndoActions } from '@prototype/shared/canvas'

// 1. Add provider inside SceneGraphProvider
<SceneGraphProvider>
  <UndoManagerProvider>
    {children}
  </UndoManagerProvider>
</SceneGraphProvider>

// 2. Wire up keyboard shortcuts via the action system
const { undo, redo } = useUndoActions()
useAction('undo', undo)
useAction('redo', redo)

// 3. Commit after discrete mutations
const um = useUndoManager()
sg.deleteNode(id)
um.commit()
```

## Core concepts

### Buffer → commit

Changes accumulate in an internal buffer as the user interacts. Nothing goes on
the undo stack until `commit()` is called. This allows:

- **Debounced commits**: While dragging a slider, each intermediate value goes in
  the buffer. On pointerup, commit once. The undo stack gets one entry, not 50.
- **Batched commits**: A single operation might update multiple nodes. All changes
  go in the buffer, then a single commit captures them all.

```typescript
// Drag interaction
sg.setNodeField(id, 'x', 10)   // buffered
sg.setNodeField(id, 'x', 20)   // buffered
sg.setNodeField(id, 'x', 30)   // buffered
um.commit()                      // one undo step: x changed from 0 to 30
```

Empty commits (no changes in buffer) are no-ops.

### Dual-stack system

Two parallel stacks — **tainted** and **untainted** — enable a critical UX
pattern: undo several steps, change selection to copy something, then redo back.

**Non-tainting fields** (go to the untainted stack):
- `selection`
- `currentPage`

**All other fields are tainting** (go to the tainted stack).

When a **tainting** change is committed:
1. Untainted history merges into tainted stacks
2. Both redo stacks are cleared (you've branched)

When a **non-tainting** change is committed:
1. Goes to the untainted undo stack only
2. Neither redo stack is affected

This means selection changes never destroy your redo history.

### Batch merging

Adjacent batches of the same `MergeType` committed within the merge window
(default 500ms) are merged into one undo step. This collapses:

- Consecutive nudges → one undo step
- Rapid opacity/color slider adjustments → one undo step
- Sequential character insertions → one undo step

```typescript
sg.setNodeField(id, 'x', 10)
um.commit(MergeType.NUDGE)

sg.setNodeField(id, 'x', 20)
um.commit(MergeType.NUDGE)  // merges with previous

um.undo()  // undoes both nudges at once
```

Merging does **not** apply when:
- Batches have different MergeTypes
- Batches involve node creation or deletion
- The time gap exceeds the merge window

Available merge types: `NUDGE`, `TEXT_EDIT`, `OPACITY`, `COLOR`.

## Change types

The UndoManager records four types of changes:

| Type | Description | Undo action |
|---|---|---|
| `field` | A node field changed | Restore old value |
| `reparent` | A node moved to a new parent | Move back to old parent + index |
| `create` | A node was created | Delete the node |
| `delete` | A node was deleted | Recreate from snapshot at original position |

All change recording happens automatically via scene graph event listeners. You
don't need to create change objects manually.

## API reference

### UndoManager

```typescript
class UndoManager {
  /** Commit buffered changes as one undo step. */
  commit(mergeType?: MergeType | null): void

  /** Undo the most recent batch. Auto-commits pending buffer first. */
  undo(): void

  /** Redo the most recently undone batch. Auto-commits pending buffer first. */
  redo(): void

  /** Whether an undo operation is available. */
  get canUndo(): boolean

  /** Whether a redo operation is available. */
  get canRedo(): boolean

  /** Number of uncommitted changes in the buffer. */
  get bufferSize(): number

  /** Clear all undo/redo history and the buffer. */
  clear(): void

  /** Stop listening to scene graph events. */
  dispose(): void
}
```

### React hooks

```typescript
/** Access the UndoManager instance. */
function useUndoManager(): UndoManager

/** Reactive undo/redo state with action callbacks. */
function useUndoActions(): {
  undo(): void
  redo(): void
  canUndo: boolean   // reactive — updates on scene graph changes
  canRedo: boolean   // reactive — updates on scene graph changes
}
```

### MergeType enum

```typescript
enum MergeType {
  NUDGE = 'NUDGE',
  TEXT_EDIT = 'TEXT_EDIT',
  OPACITY = 'OPACITY',
  COLOR = 'COLOR',
}
```

## When to commit

**Discrete actions** — commit immediately after:
- Delete, cut, paste, duplicate
- Shape creation (on pointerup)
- Text node creation (on click)
- Pencil/pen drawing (on pointerup)
- Drag-move finalization (on pointerup)

**Continuous interactions** — do NOT commit on each change, only on completion:
- Dragging a slider → commit on pointerup
- Scrubbing a number input → commit on pointerup
- Dragging to resize → commit on pointerup
- Nudging with arrow keys → commit with `MergeType.NUDGE`

**Selection changes** — commit normally. They go to the untainted stack
automatically based on the field name.

## The isUndoingOrRedoing flag

During undo/redo, the scene graph's `isUndoingOrRedoing` flag is `true`. The
UndoManager checks this flag to avoid recording its own mutations back into the
buffer. Other systems can also check it to suppress side effects during undo/redo
(e.g., skip auto-layout recalculation that would produce additional changes).

```typescript
if (sg.isUndoingOrRedoing) {
  // Skip side effects — this mutation is from undo/redo
  return
}
```

## Provider setup

`UndoManagerProvider` goes inside `SceneGraphProvider` but outside everything
else. It creates the UndoManager on mount and disposes it on unmount.

```tsx
<SceneGraphProvider>
  <UndoManagerProvider>
    <ViewportProvider>
      <SelectionProvider>
        {/* ... */}
      </SelectionProvider>
    </ViewportProvider>
  </UndoManagerProvider>
</SceneGraphProvider>
```

Optional: pass `mergeWindow` to customize the batch merge time window (default
500ms).

```tsx
<UndoManagerProvider mergeWindow={300}>
```
