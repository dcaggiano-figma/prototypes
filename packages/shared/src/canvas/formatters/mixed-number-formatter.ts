/**
 * Number formatter that handles mixed selection values.
 *
 * Implements FPL's IncrementFormatter interface directly (no runtime FPL
 * import) so it works in test environments without full DOM setup.
 * Displays "Mixed" when selected nodes have different values, and uses the
 * math parser to evaluate expressions like "Mixed + 2".
 */

import type { Formatter } from '@figma/fpl-components'

import { MIXED, type Mixed } from '../../scene-graph/mixed'
import { evaluateExpression, ErrorType } from '../../scene-graph/math-parser'

// ── Mixed handler type ──────────────────────────────────────────────

/**
 * Callback for per-node mixed operations (scrubbing and math expressions).
 * The transform is applied to each node's individual value.
 */
export type MixedChangeHandler = (
  transform: (value: number) => number,
  commit: boolean,
) => void

// ── Error types ─────────────────────────────────────────────────────

/**
 * Thrown by parse() when the expression references "Mixed" and needs
 * per-node evaluation. The `transform` field contains a function that
 * can be applied to each node's individual value.
 */
export class MixedExpressionError extends Error {
  readonly transform: (currentValue: number) => number | null

  constructor(expression: string) {
    super(`Expression "${expression}" requires per-node evaluation`)
    this.name = 'MixedExpressionError'

    this.transform = (currentValue: number) => {
      const result = evaluateExpression(expression, currentValue)
      if (result.error) return null
      return result.value
    }
  }
}

// ── Options ─────────────────────────────────────────────────────────

export interface MixedNumberFormatterOptions {
  min?: number
  max?: number
  nudge?: number
  bigNudge?: number
  maximumFractionDigits?: number
  minimumFractionDigits?: number
}

// ── Constants ───────────────────────────────────────────────────────

const DEFAULT_NUDGE = 1
const DEFAULT_BIG_NUDGE = 10

// ── MixedNumberFormatter ────────────────────────────────────────────

/**
 * Formatter for ScrubbableInput that supports mixed selection values.
 *
 * Implements FPL's `Formatter.IncrementFormatter<number | Mixed, number>`
 * interface so it can be passed directly to ScrubbableInput.Field.
 *
 * - `format(MIXED)` returns `"Mixed"`
 * - `parse("Mixed + 2")` throws `MixedExpressionError` with a per-node
 *   transform when the current value is MIXED
 * - `canIncrement(MIXED)` returns `'all'` to allow scrubbing mixed values
 * - `incrementBy(MIXED, amount)` returns `amount` (the delta from zero)
 */
export class MixedNumberFormatter
  implements Formatter.IncrementFormatter<number | Mixed, number>
{
  min: number | undefined
  max: number | undefined

  private readonly nudge: number
  private readonly bigNudge: number
  private readonly intlFormat: Intl.NumberFormat
  private _mixedHandler: MixedChangeHandler | null = null

  constructor(opts: MixedNumberFormatterOptions = {}) {
    this.min = opts.min
    this.max = opts.max
    this.nudge = opts.nudge ?? DEFAULT_NUDGE
    this.bigNudge = opts.bigNudge ?? DEFAULT_BIG_NUDGE
    this.intlFormat = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: opts.maximumFractionDigits ?? 4,
      minimumFractionDigits: opts.minimumFractionDigits,
      useGrouping: false,
    })
  }

  /**
   * Set the handler for per-node mixed operations. Called by NumericField
   * to wire up the MixedMathHandler for the specific field being edited.
   */
  setMixedHandler(handler: MixedChangeHandler | null): void {
    this._mixedHandler = handler
  }

  format(value: number | Mixed): string {
    if (value === MIXED) return 'Mixed'
    return this.intlFormat.format(value)
  }

  parse(str: string, currentValue?: number | Mixed): number {
    // When current value is MIXED, don't pass a numeric value — let the
    // parser signal EVAL_NO_CURRENT_VALUE so we can throw MixedExpressionError
    const numericCurrent = currentValue !== undefined && currentValue !== MIXED
      ? currentValue
      : undefined

    const result = evaluateExpression(str, numericCurrent)

    if (result.error) {
      if (result.error.type === ErrorType.EVAL_NO_CURRENT_VALUE) {
        // Expression references "Mixed" or uses %, x suffixes without a
        // current value. Throw so onParseThrow can handle per-node eval.
        throw new MixedExpressionError(str)
      }
      throw new Error(`Invalid expression: ${str}`)
    }

    return this.clamp(result.value, this.min, this.max)
  }

  canIncrement(_value: number | Mixed): Formatter.CanIncrement {
    return 'all'
  }

  getNudgeAmount(big: boolean): number {
    return big ? this.bigNudge : this.nudge
  }

  incrementBy(
    value: number | Mixed,
    amount: number,
    _incrementTargets: Formatter.IncrementTargets | null,
  ): number {
    // When mixed, return the delta — callers apply it per-node via MixedMathHandler
    if (value === MIXED) return amount
    return (value as number) + amount
  }

  /**
   * Handle parse errors from FPL's ScrubbableInput. When the error is a
   * MixedExpressionError, return a callback that applies the operation
   * per-node via the mixed handler.
   *
   * This enables both mixed math ("Mixed + 10") and mixed scrubbing —
   * FPL calls onParseThrow at scrub start when parsing "Mixed", and the
   * returned callback receives per-tick updates.
   */
  onParseThrow(
    _str: string,
    opts: Formatter.OnParseThrowOptions<number | Mixed>,
  ): Formatter.OnParseThrowCallback<number> | undefined {
    if (!(opts.error instanceof MixedExpressionError)) return undefined
    if (!this._mixedHandler) return undefined

    const handler = this._mixedHandler
    return (update: (v: number) => number, { commit }: { commit: boolean }) => {
      handler((v) => update(v), commit)
    }
  }

  clamp(value: number, min: number | undefined, max: number | undefined): number {
    if (min !== undefined && value < min) return min
    if (max !== undefined && value > max) return max
    return value
  }
}

// ── Derived formatters ──────────────────────────────────────────────

/** Pixel values: 0-2 decimal places, no min/max. */
export class PixelFormatter extends MixedNumberFormatter {
  constructor(opts: MixedNumberFormatterOptions = {}) {
    super({ maximumFractionDigits: 2, ...opts })
  }
}

/** Angle values: 0-2 decimal places, wraps at 360. */
export class AngleFormatter extends MixedNumberFormatter {
  constructor(opts: MixedNumberFormatterOptions = {}) {
    super({ min: -360, max: 360, maximumFractionDigits: 2, ...opts })
  }
}

/** Percentage values: 0-100, no decimal places by default. */
export class PercentageFormatter extends MixedNumberFormatter {
  constructor(opts: MixedNumberFormatterOptions = {}) {
    super({ min: 0, max: 100, maximumFractionDigits: 0, ...opts })
  }
}

/** Opacity values: 0-100%, displayed as integer percent. */
export class OpacityFormatter extends PercentageFormatter {}

/** Positive pixel values (width, height, border radius, etc.). */
export class PositivePixelFormatter extends PixelFormatter {
  constructor(opts: MixedNumberFormatterOptions = {}) {
    super({ min: 0, ...opts })
  }
}
