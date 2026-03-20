import { describe, expect, it } from 'vitest'
import { ErrorType, evaluateExpression } from './math-parser'

describe('evaluateExpression', () => {
  // ── Basic arithmetic ──────────────────────────────────────────────

  it('evaluates simple numbers', () => {
    expect(evaluateExpression('42')).toEqual({ value: 42, error: null })
  })

  it('evaluates addition', () => {
    expect(evaluateExpression('10 + 5')).toEqual({ value: 15, error: null })
  })

  it('evaluates subtraction', () => {
    expect(evaluateExpression('10 - 3')).toEqual({ value: 7, error: null })
  })

  it('evaluates multiplication', () => {
    expect(evaluateExpression('4 * 3')).toEqual({ value: 12, error: null })
  })

  it('evaluates division', () => {
    expect(evaluateExpression('20 / 4')).toEqual({ value: 5, error: null })
  })

  it('evaluates exponentiation', () => {
    expect(evaluateExpression('2 ^ 3')).toEqual({ value: 8, error: null })
  })

  it('respects operator precedence', () => {
    expect(evaluateExpression('2 + 3 * 4')).toEqual({ value: 14, error: null })
  })

  it('respects parentheses', () => {
    expect(evaluateExpression('(2 + 3) * 4')).toEqual({ value: 20, error: null })
  })

  // ── Unary operators ───────────────────────────────────────────────

  it('handles unary minus', () => {
    expect(evaluateExpression('-5')).toEqual({ value: -5, error: null })
  })

  it('handles unary minus in expression', () => {
    expect(evaluateExpression('10 + -3')).toEqual({ value: 7, error: null })
  })

  // ── Number formats ────────────────────────────────────────────────

  it('handles decimals', () => {
    expect(evaluateExpression('3.14')).toEqual({ value: 3.14, error: null })
  })

  it('handles European comma decimals', () => {
    expect(evaluateExpression('3,14')).toEqual({ value: 3.14, error: null })
  })

  it('handles scientific notation', () => {
    expect(evaluateExpression('1e2')).toEqual({ value: 100, error: null })
  })

  // ── Unit suffixes ─────────────────────────────────────────────────

  it('px suffix is a no-op', () => {
    expect(evaluateExpression('100px')).toEqual({ value: 100, error: null })
  })

  it('% suffix computes percentage of currentValue', () => {
    expect(evaluateExpression('50%', 200)).toEqual({ value: 100, error: null })
  })

  it('x suffix multiplies by currentValue', () => {
    expect(evaluateExpression('2x', 50)).toEqual({ value: 100, error: null })
  })

  it('% without currentValue returns error', () => {
    const result = evaluateExpression('50%')
    expect(result.error?.type).toBe(ErrorType.EVAL_NO_CURRENT_VALUE)
  })

  // ── Mixed variable ────────────────────────────────────────────────

  it('Mixed substitutes currentValue', () => {
    expect(evaluateExpression('Mixed + 10', 50)).toEqual({ value: 60, error: null })
  })

  it('mixed is case-insensitive', () => {
    expect(evaluateExpression('mixed + 10', 50)).toEqual({ value: 60, error: null })
    expect(evaluateExpression('MIXED + 10', 50)).toEqual({ value: 60, error: null })
  })

  it('Mixed without currentValue returns EVAL_NO_CURRENT_VALUE', () => {
    const result = evaluateExpression('Mixed + 10')
    expect(result.error?.type).toBe(ErrorType.EVAL_NO_CURRENT_VALUE)
  })

  it('Mixed * 2 works', () => {
    expect(evaluateExpression('Mixed * 2', 25)).toEqual({ value: 50, error: null })
  })

  it('Mixed with currentValue 0 works', () => {
    expect(evaluateExpression('Mixed + 5', 0)).toEqual({ value: 5, error: null })
  })

  // ── Error cases ───────────────────────────────────────────────────

  it('empty expression returns SYNTAX_EMPTY', () => {
    const result = evaluateExpression('')
    expect(result.error?.type).toBe(ErrorType.SYNTAX_EMPTY)
  })

  it('mismatched parens returns error', () => {
    const result = evaluateExpression('(10 + 5')
    expect(result.error?.type).toBe(ErrorType.SYNTAX_MISMATCHED_PARENS)
  })

  it('division by zero returns infinite', () => {
    const result = evaluateExpression('1 / 0')
    expect(result.error?.type).toBe(ErrorType.EVAL_INFINITE)
  })
})
