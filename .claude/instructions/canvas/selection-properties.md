# Selection properties

Reading and writing properties across multi-node selections, including Mixed
value handling, math expressions, and React hooks.

## Core concepts

### MIXED sentinel

When multiple nodes are selected and their values differ for a field, the
system returns the `MIXED` symbol:

```ts
import { MIXED, isMixed, notMixed } from '@prototype/shared/scene-graph'

const value = getSelectionValue<number>(sg, selection, 'opacity')
if (isMixed(value)) {
  // Show "Mixed" in the UI
} else if (value !== undefined) {
  // All selected nodes have the same opacity
}
```

`MIXED` is `Symbol.for('mixed')` — identity comparison works across modules.

### collectValues / getSelectionValue

`collectValues(sg, selection, field, mode?)` walks selected nodes and builds
a `Set<T>` of unique values:

- **Size 0** → field doesn't apply to any selected node → `undefined`
- **Size 1** → all same → the single value
- **Size 2+** → mixed → `MIXED`

`getSelectionValue` is the convenience wrapper that returns `T | Mixed | undefined`.

**CollectMode:**
- `AT_MOST_2` (default): Stop after 2 unique values. Sufficient for "is it mixed?"
- `ALL`: Collect every distinct value (e.g., multi-value color picker)

**Group drill-down:** When a field doesn't apply to a container (GROUP), the
system recurses into children. This is how selecting a group shows its
children's properties.

### clobberValue

`clobberValue(sg, selection, field, value)` sets a field on all applicable
nodes, using the same traversal logic as `collectValues` (symmetry guarantee).
Goes through `sg.setNodeField` so changes are tracked by UndoManager.

## React hooks

All hooks are in `@prototype/shared/canvas`:

```ts
import {
  useSelectionProperty,
  useSelectionPropertyValue,
  useSelectionPropertyValues,
  useSelectionPropertySetter,
} from '@prototype/shared/canvas'
```

### useSelectionProperty

Primary hook — `useState`-like tuple:

```ts
const [opacity, setOpacity] = useSelectionProperty<number>('opacity')
// opacity: number | Mixed | undefined
// setOpacity: (value: number, opts?) => void
```

The setter commits to undo by default. Pass `{ commit: false }` during
continuous interactions (slider drags), then commit on pointerup:

```ts
// During drag:
setOpacity(0.5, { commit: false })
// On pointerup:
setOpacity(0.5, { commit: true, mergeType: MergeType.OPACITY })
```

### useSelectionPropertyValue

Read-only variant:

```ts
const opacity = useSelectionPropertyValue<number>('opacity')
```

### useSelectionPropertyValues

Multi-field read:

```ts
const props = useSelectionPropertyValues('x', 'y', 'width', 'height')
// props.x, props.y, etc. — each is T | Mixed | undefined
```

### useSelectionPropertySetter

Write-only batch setter for atomic multi-field updates:

```ts
const setProperties = useSelectionPropertySetter()
setProperties({ opacity: 0.5, cornerRadius: 8 }) // commits by default
setProperties({ x: 100, y: 200 }, { commit: false })
```

## Per-node operations (mixed math and scrubbing)

Mixed math (`Mixed + 2`) and scrubbing on mixed values need per-node access,
which is fundamentally different from the collect/clobber abstraction.

### MixedMathHandler

```ts
import { createMixedMathHandler } from '@prototype/shared/scene-graph'

const handler = createMixedMathHandler<number>(sg, selection, um, 'opacity')
const snapshot = handler.getValues() // Map<NodeId, number>

// Apply per-node transform (e.g., "Mixed + 10")
handler.onChange(snapshot, (v) => v + 10, true)

// Scrub workflow: commit: false during drag, true on pointerup
handler.onChange(snapshot, (v) => v + delta, false)
handler.onChange(snapshot, (v) => v + finalDelta, true, MergeType.OPACITY)
```

### Math parser

`evaluateExpression(expr, currentValue?)` supports:
- Arithmetic: `+`, `-`, `*`, `/`, `^`, parentheses
- Unit suffixes: `px` (no-op), `x` (multiply), `%` (percentage)
- `Mixed` variable: substituted with `currentValue` at eval time

When `Mixed` is referenced but no `currentValue` is provided, returns
`EVAL_NO_CURRENT_VALUE` — this signals that per-node evaluation is needed.

## Formatters

`MixedNumberFormatter` implements FPL's `Formatter.IncrementFormatter` for use
with ScrubbableInput. It handles MIXED display and math expression parsing:

```ts
import { PixelFormatter, OpacityFormatter } from '@prototype/shared/canvas'

const pixelFmt = new PixelFormatter()           // 0-2 decimals, no clamp
const opacityFmt = new OpacityFormatter()       // 0-100, integer
const positiveFmt = new PositivePixelFormatter() // min: 0, 0-2 decimals
```

Available formatters:
- `MixedNumberFormatter` — base, configurable
- `PixelFormatter` — 0-2 decimal places
- `PositivePixelFormatter` — min: 0, 0-2 decimals
- `AngleFormatter` — -360 to 360, 0-2 decimals
- `PercentageFormatter` — 0-100, integer
- `OpacityFormatter` — alias for PercentageFormatter

When `parse()` encounters an expression referencing "Mixed" (e.g., `Mixed + 10`),
it throws `MixedExpressionError` with a `transform` function for per-node eval:

```ts
try {
  const result = formatter.parse(input, currentValue)
  setProperty(result)
} catch (e) {
  if (e instanceof MixedExpressionError) {
    // Apply per-node: e.transform(nodeValue) → number | null
    handler.onChange(snapshot, (v) => e.transform(v) ?? v, true)
  }
}
```

## File locations

| File | Purpose |
|---|---|
| `packages/shared/src/scene-graph/mixed.ts` | MIXED symbol, isMixed, notMixed |
| `packages/shared/src/scene-graph/selection-properties.ts` | collectValues, clobberValue |
| `packages/shared/src/scene-graph/mixed-math.ts` | MixedMathHandler |
| `packages/shared/src/scene-graph/math-parser.ts` | evaluateExpression |
| `packages/shared/src/canvas/scene-graph/use-selection-property.ts` | React hooks |
| `packages/shared/src/canvas/formatters/mixed-number-formatter.ts` | Formatters |
