# General Review Checklist

After checking architectural fit, use this list for normal code-review risks.

## Correctness

Look for:
- wrong coordinate-space math between world and screen
- stale node IDs, parent IDs, or child ordering bugs
- incorrect hit-testing or drag-threshold handling
- box-select, hover, resize, or text-edit interactions that regress existing tool behavior
- code paths that work for single selection but fail for multi-selection

## Undo / Redo

Look for:
- missing `commit()` boundaries after user-visible mutations
- over-committing during scrubs or drags
- tainted and untainted changes getting merged incorrectly
- direct mutation patterns that bypass undo recording

## React / Subscription Hazards

Look for:
- effects whose cleanup breaks Strict Mode remounts
- callback refs paired with effect cleanup in a way that unregisters live objects
- behavior arrays or managers recreated during an active interaction
- stale closures in event handlers, subscriptions, or behavior factories
- imperative objects that should expose subscribe/getSnapshot patterns but instead mirror state into React unnecessarily

## Rendering / Sync

Look for:
- overlay and node visuals updating in different frames
- dirty nodes not being marked on every relevant mutation
- viewport changes not triggering repaint work
- layout thrash from DOM measurement or style writes in hot paths
- regressions to blurry or detached visuals during drag

## Scene Graph Integrity

Look for:
- parent/child links getting out of sync
- slot-child or compound-node ownership bugs
- deletion paths that skip subtree cleanup
- connector/attachment cleanup gaps when anchors are deleted or moved
- mutations that violate node-type invariants

## Behavior System

Look for:
- monolithic pointer logic creeping back into canvas components
- wrong behavior ordering in a tool chain
- passive behaviors incorrectly accepting pointerdown
- drag logic split across multiple abstractions without a single owner
- shared behavior code growing product-specific branches

## Performance

Look for:
- full-tree rerenders when only dirty nodes should update
- expensive scans on every pointermove
- heavy object allocation inside drag/paint loops
- DOM reads and writes interleaved in the same hot path
- duplicated subscriptions that multiply work across templates

## API / Abstraction Quality

Look for:
- new abstractions with only one caller that duplicate an existing pattern
- helpers named too generically while actually encoding template-specific behavior
- interfaces that leak template decisions into shared layers
- extension points that are too weak, forcing callers to fork later

## Testing Gaps

Look for missing tests around:
- drag interactions and threshold transitions
- undo/redo after create, move, resize, delete, and property edits
- copy/paste across templates
- selection invariants
- viewport zoom/pan edge cases
- Strict Mode lifecycle hazards
- rendering-sync regressions that only appear during interactive flows

## Preferred Finding Style

State findings in this shape:
1. The risky pattern
2. Why it can fail here
3. The concrete fix or better pattern

Example:
- "This adds a `productType` branch inside shared selection behavior. That pushes template policy into shared code and will accumulate one-off switches over time. Keep the shared pointer logic generic and inject a template-specific outline renderer or separate selection behavior instead."
