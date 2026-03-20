import { describe, expect, it, vi } from 'vitest'

import { MIXED } from '../../scene-graph/mixed'
import {
  MixedNumberFormatter,
  MixedExpressionError,
  PixelFormatter,
  AngleFormatter,
  PercentageFormatter,
  OpacityFormatter,
  PositivePixelFormatter,
} from './mixed-number-formatter'

describe('MixedNumberFormatter', () => {
  const fmt = new MixedNumberFormatter({ maximumFractionDigits: 2 })

  // ── format ────────────────────────────────────────────────────────

  it('formats MIXED as "Mixed"', () => {
    expect(fmt.format(MIXED)).toBe('Mixed')
  })

  it('formats numbers normally', () => {
    expect(fmt.format(42)).toBe('42')
    expect(fmt.format(3.14)).toBe('3.14')
  })

  // ── parse ─────────────────────────────────────────────────────────

  it('parses simple numbers', () => {
    expect(fmt.parse('42')).toBe(42)
  })

  it('parses arithmetic expressions', () => {
    expect(fmt.parse('10 + 5')).toBe(15)
    expect(fmt.parse('(2 + 3) * 4')).toBe(20)
  })

  it('parses expressions with current value', () => {
    expect(fmt.parse('50%', 200)).toBe(100)
    expect(fmt.parse('2x', 50)).toBe(100)
  })

  it('throws MixedExpressionError for "Mixed + N" when current is MIXED', () => {
    expect(() => fmt.parse('Mixed + 10', MIXED)).toThrow(MixedExpressionError)
  })

  it('throws MixedExpressionError for % suffix when current is MIXED', () => {
    expect(() => fmt.parse('50%', MIXED)).toThrow(MixedExpressionError)
  })

  it('MixedExpressionError transform applies per-node', () => {
    try {
      fmt.parse('Mixed + 10', MIXED)
    } catch (e) {
      expect(e).toBeInstanceOf(MixedExpressionError)
      const err = e as MixedExpressionError
      expect(err.transform(5)).toBe(15)
      expect(err.transform(20)).toBe(30)
      expect(err.transform(0)).toBe(10)
    }
  })

  it('MixedExpressionError transform returns null for invalid per-node result', () => {
    try {
      fmt.parse('Mixed / 0', MIXED)
    } catch (e) {
      const err = e as MixedExpressionError
      // Division by zero produces Infinity → evaluateExpression returns error
      expect(err.transform(5)).toBeNull()
    }
  })

  it('throws generic error for invalid expressions', () => {
    expect(() => fmt.parse('')).toThrow()
    expect(() => fmt.parse('(10 + 5')).toThrow()
  })

  // ── canIncrement ──────────────────────────────────────────────────

  it('allows incrementing MIXED values', () => {
    expect(fmt.canIncrement(MIXED)).toBe('all')
  })

  it('allows incrementing numeric values', () => {
    expect(fmt.canIncrement(42)).toBe('all')
  })

  // ── incrementBy ───────────────────────────────────────────────────

  it('increments numbers normally', () => {
    expect(fmt.incrementBy(10, 5, null)).toBe(15)
  })

  it('returns delta when incrementing MIXED', () => {
    // When value is MIXED, returns just the amount (delta from zero)
    // Caller applies this delta per-node via MixedMathHandler
    expect(fmt.incrementBy(MIXED, 5, null)).toBe(5)
    expect(fmt.incrementBy(MIXED, -3, null)).toBe(-3)
  })

  // ── onParseThrow ────────────────────────────────────────────────

  it('onParseThrow returns callback for MixedExpressionError', () => {
    const handler = vi.fn()
    const f = new MixedNumberFormatter({ maximumFractionDigits: 2 })
    f.setMixedHandler(handler)

    const result = f.onParseThrow!('Mixed + 10', {
      error: new MixedExpressionError('Mixed + 10'),
      value: MIXED,
      source: 'change',
      event: null,
    })

    expect(typeof result).toBe('function')
  })

  it('onParseThrow callback calls mixed handler with transform', () => {
    const handler = vi.fn()
    const f = new MixedNumberFormatter({ maximumFractionDigits: 2 })
    f.setMixedHandler(handler)

    const result = f.onParseThrow!('Mixed + 10', {
      error: new MixedExpressionError('Mixed + 10'),
      value: MIXED,
      source: 'change',
      event: null,
    })

    // Simulate FPL calling the callback for a text change
    const callback = result as (update: (v: number) => number, opts: { commit: boolean }) => void
    const update = (v: number) => v + 10
    callback(update, { commit: true })

    expect(handler).toHaveBeenCalledWith(expect.any(Function), true)
    // The transform passed to handler should apply the update function
    const transform = handler.mock.calls[0][0]
    expect(transform(5)).toBe(15)
    expect(transform(20)).toBe(30)
  })

  it('onParseThrow returns undefined without mixed handler', () => {
    const f = new MixedNumberFormatter({ maximumFractionDigits: 2 })

    const result = f.onParseThrow!('Mixed + 10', {
      error: new MixedExpressionError('Mixed + 10'),
      value: MIXED,
      source: 'change',
      event: null,
    })

    expect(result).toBeUndefined()
  })

  it('onParseThrow returns undefined for non-MixedExpressionError', () => {
    const handler = vi.fn()
    const f = new MixedNumberFormatter({ maximumFractionDigits: 2 })
    f.setMixedHandler(handler)

    const result = f.onParseThrow!('bad input', {
      error: new Error('Invalid expression'),
      value: MIXED,
      source: 'change',
      event: null,
    })

    expect(result).toBeUndefined()
  })
})

// ── Derived formatters ──────────────────────────────────────────────

describe('PixelFormatter', () => {
  const fmt = new PixelFormatter()

  it('formats with up to 2 decimal places', () => {
    expect(fmt.format(3.14159)).toBe('3.14')
    expect(fmt.format(42)).toBe('42')
  })

  it('handles MIXED', () => {
    expect(fmt.format(MIXED)).toBe('Mixed')
  })
})

describe('AngleFormatter', () => {
  const fmt = new AngleFormatter()

  it('clamps to -360..360', () => {
    expect(fmt.min).toBe(-360)
    expect(fmt.max).toBe(360)
  })

  it('handles MIXED', () => {
    expect(fmt.format(MIXED)).toBe('Mixed')
  })
})

describe('PercentageFormatter', () => {
  const fmt = new PercentageFormatter()

  it('clamps to 0..100 with no decimals', () => {
    expect(fmt.min).toBe(0)
    expect(fmt.max).toBe(100)
    expect(fmt.format(50.7)).toBe('51')
  })

  it('handles MIXED', () => {
    expect(fmt.format(MIXED)).toBe('Mixed')
  })
})

describe('OpacityFormatter', () => {
  const fmt = new OpacityFormatter()

  it('inherits PercentageFormatter constraints', () => {
    expect(fmt.min).toBe(0)
    expect(fmt.max).toBe(100)
  })
})

describe('PositivePixelFormatter', () => {
  const fmt = new PositivePixelFormatter()

  it('has min 0', () => {
    expect(fmt.min).toBe(0)
  })

  it('formats with up to 2 decimal places', () => {
    expect(fmt.format(3.14159)).toBe('3.14')
  })
})
