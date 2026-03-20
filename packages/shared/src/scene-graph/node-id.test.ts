import { describe, expect, it } from 'vitest'
import {
  NodeIdGenerator,
  getLocalId,
  getSessionId,
  makeNodeId,
} from './node-id'

describe('makeNodeId / getSessionId / getLocalId', () => {
  it('round-trips session 0', () => {
    const id = makeNodeId(0, 42)
    expect(getSessionId(id)).toBe(0)
    expect(getLocalId(id)).toBe(42)
  })

  it('round-trips positive session', () => {
    const id = makeNodeId(7, 999)
    expect(getSessionId(id)).toBe(7)
    expect(getLocalId(id)).toBe(999)
  })

  it('round-trips negative session (reserved for paste, etc.)', () => {
    const id = makeNodeId(-1, 5)
    expect(getSessionId(id)).toBe(-1)
    expect(getLocalId(id)).toBe(5)
  })

  it('handles max local ID (20 bits = 1048575)', () => {
    const id = makeNodeId(1, 1048575)
    expect(getSessionId(id)).toBe(1)
    expect(getLocalId(id)).toBe(1048575)
  })

  it('handles max positive session ID', () => {
    const id = makeNodeId(2047, 1)
    expect(getSessionId(id)).toBe(2047)
    expect(getLocalId(id)).toBe(1)
  })

  it('local ID wraps at 20 bits', () => {
    // 1048576 = 2^20, should wrap to 0
    const id = makeNodeId(0, 1048576)
    expect(getLocalId(id)).toBe(0)
  })
})

describe('NodeIdGenerator', () => {
  it('generates sequential IDs for session 0', () => {
    const gen = new NodeIdGenerator(0)
    expect(gen.generate()).toBe(1)
    expect(gen.generate()).toBe(2)
    expect(gen.generate()).toBe(3)
  })

  it('session 0 fast-path: IDs equal local IDs directly', () => {
    const gen = new NodeIdGenerator(0, 10)
    const id = gen.generate()
    expect(id).toBe(10)
    expect(getLocalId(id)).toBe(10)
    expect(getSessionId(id)).toBe(0)
  })

  it('non-zero session encodes session bits', () => {
    const gen = new NodeIdGenerator(3, 1)
    const id = gen.generate()
    expect(getSessionId(id)).toBe(3)
    expect(getLocalId(id)).toBe(1)
  })

  it('advancePast moves the counter forward', () => {
    const gen = new NodeIdGenerator(0)
    gen.advancePast(100)
    expect(gen.generate()).toBe(101)
  })

  it('advancePast is a no-op if already past', () => {
    const gen = new NodeIdGenerator(0, 200)
    gen.advancePast(50)
    expect(gen.generate()).toBe(200)
  })

  it('custom start local ID', () => {
    const gen = new NodeIdGenerator(0, 5)
    expect(gen.generate()).toBe(5)
    expect(gen.generate()).toBe(6)
  })
})
