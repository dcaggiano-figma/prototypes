/** Sentinel value indicating that selected nodes have different values for a field. */
export const MIXED: unique symbol = Symbol.for('mixed')

export type Mixed = typeof MIXED

/** Check if a value is the Mixed sentinel. */
export function isMixed(value: unknown): value is Mixed {
  return value === MIXED
}

/** Narrow a value to its concrete type (not Mixed). */
export function notMixed<T>(value: T | Mixed): value is T {
  return value !== MIXED
}
