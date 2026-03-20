import { describe, expect, it } from 'vitest'
import { Viewport } from './viewport'

describe('Viewport', () => {
  it('starts at identity (scale 1, origin 0,0)', () => {
    const vp = new Viewport()
    expect(vp.scale).toBe(1)
    expect(vp.originX).toBe(0)
    expect(vp.originY).toBe(0)
    expect(vp.zoomPercent).toBe(100)
  })

  describe('pan', () => {
    it('offsets origin by delta', () => {
      const vp = new Viewport()
      vp.pan(100, -50)
      expect(vp.originX).toBe(100)
      expect(vp.originY).toBe(-50)
    })

    it('accumulates multiple pans', () => {
      const vp = new Viewport()
      vp.pan(10, 20)
      vp.pan(30, 40)
      expect(vp.originX).toBe(40)
      expect(vp.originY).toBe(60)
    })
  })

  describe('zoomTo', () => {
    it('zooms to a new scale keeping the anchor fixed', () => {
      const vp = new Viewport()
      // Zoom to 2x around the origin (0,0 screen)
      vp.zoomTo(2, 0, 0)
      expect(vp.scale).toBe(2)
      expect(vp.originX).toBe(0)
      expect(vp.originY).toBe(0)
    })

    it('zooms around a non-origin point', () => {
      const vp = new Viewport()
      // At 1x with origin 0,0: screen(100,100) = world(100,100)
      // Zoom to 2x around screen(100,100)
      vp.zoomTo(2, 100, 100)
      expect(vp.scale).toBe(2)
      // origin should shift so world(100,100) is still at screen(100,100)
      expect(vp.originX).toBe(-100)
      expect(vp.originY).toBe(-100)
    })

    it('clamps to minimum scale', () => {
      const vp = new Viewport()
      vp.zoomTo(0.001, 0, 0)
      expect(vp.scale).toBe(0.02)
    })

    it('clamps to maximum scale', () => {
      const vp = new Viewport()
      vp.zoomTo(1000, 0, 0)
      expect(vp.scale).toBe(256)
    })
  })

  describe('set', () => {
    it('sets all values directly', () => {
      const vp = new Viewport()
      vp.set(200, 300, 0.5)
      expect(vp.originX).toBe(200)
      expect(vp.originY).toBe(300)
      expect(vp.scale).toBe(0.5)
    })

    it('clamps scale', () => {
      const vp = new Viewport()
      vp.set(0, 0, 500)
      expect(vp.scale).toBe(256)
    })
  })

  describe('worldToScreen / screenToWorld', () => {
    it('identity transform is passthrough', () => {
      const vp = new Viewport()
      expect(vp.worldToScreen(50, 75)).toEqual({ x: 50, y: 75 })
      expect(vp.screenToWorld(50, 75)).toEqual({ x: 50, y: 75 })
    })

    it('round-trips through world→screen→world', () => {
      const vp = new Viewport()
      vp.set(100, -50, 2)
      const screen = vp.worldToScreen(30, 40)
      const world = vp.screenToWorld(screen.x, screen.y)
      expect(world.x).toBeCloseTo(30)
      expect(world.y).toBeCloseTo(40)
    })

    it('applies scale and offset correctly', () => {
      const vp = new Viewport()
      vp.set(100, 200, 2)
      // world(0,0) → screen(100, 200)
      expect(vp.worldToScreen(0, 0)).toEqual({ x: 100, y: 200 })
      // world(50, 50) → screen(100 + 50*2, 200 + 50*2) = screen(200, 300)
      expect(vp.worldToScreen(50, 50)).toEqual({ x: 200, y: 300 })
    })
  })

  describe('cssTransform', () => {
    it('returns a valid matrix string', () => {
      const vp = new Viewport()
      vp.set(10, 20, 3)
      expect(vp.cssTransform).toContain('matrix')
    })
  })

  describe('flushDirty', () => {
    it('returns false when nothing changed', () => {
      const vp = new Viewport()
      expect(vp.flushDirty()).toBe(false)
    })

    it('returns true after pan', () => {
      const vp = new Viewport()
      vp.pan(10, 0)
      expect(vp.flushDirty()).toBe(true)
    })

    it('resets after flush', () => {
      const vp = new Viewport()
      vp.pan(10, 0)
      vp.flushDirty()
      expect(vp.flushDirty()).toBe(false)
    })

    it('returns true after zoomTo', () => {
      const vp = new Viewport()
      vp.zoomTo(2, 0, 0)
      expect(vp.flushDirty()).toBe(true)
    })

    it('returns true after set', () => {
      const vp = new Viewport()
      vp.set(0, 0, 0.5)
      expect(vp.flushDirty()).toBe(true)
    })

    it('coalesces multiple mutations', () => {
      const vp = new Viewport()
      vp.pan(10, 20)
      vp.zoomTo(2, 0, 0)
      vp.pan(5, 5)
      expect(vp.flushDirty()).toBe(true)
      expect(vp.flushDirty()).toBe(false)
    })
  })
})
