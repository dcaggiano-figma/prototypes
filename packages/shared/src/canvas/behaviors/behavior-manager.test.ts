import { describe, it, expect, vi } from 'vitest'
import { BehaviorManager } from './behavior-manager'
import type { Behavior, CanvasPointerEvent } from './types'

// ── Helpers ─────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<CanvasPointerEvent> = {}): CanvasPointerEvent {
  return {
    raw: new PointerEvent('pointermove'),
    world: { x: 0, y: 0 },
    screen: { x: 0, y: 0 },
    hitNodeId: null,
    shift: false,
    meta: false,
    alt: false,
    dragDistance: 0,
    dragOrigin: null,
    dragScreenOrigin: null,
    ...overrides,
  }
}

function makeBehavior(overrides: Partial<Behavior> = {}): Behavior {
  return {
    name: 'test',
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────

describe('BehaviorManager', () => {
  describe('pointerdown dispatch', () => {
    it('activates the first behavior that accepts', () => {
      const bm = new BehaviorManager()
      const rejectBehavior = makeBehavior({
        name: 'reject',
        onPointerDown: () => false,
      })
      const acceptBehavior = makeBehavior({
        name: 'accept',
        onPointerDown: () => true,
        onActivate: vi.fn(),
      })

      bm.setBehaviors([rejectBehavior, acceptBehavior])
      bm.handlePointerDown(makeEvent())

      expect(bm.active).toBe(acceptBehavior)
      expect(acceptBehavior.onActivate).toHaveBeenCalledOnce()
    })

    it('first-accept-wins — skips behaviors after the first accept', () => {
      const bm = new BehaviorManager()
      const second = vi.fn(() => true)
      bm.setBehaviors([
        makeBehavior({ name: 'first', onPointerDown: () => true }),
        makeBehavior({ name: 'second', onPointerDown: second }),
      ])

      bm.handlePointerDown(makeEvent())

      expect(second).not.toHaveBeenCalled()
    })

    it('no active behavior when all reject', () => {
      const bm = new BehaviorManager()
      bm.setBehaviors([
        makeBehavior({ name: 'a', onPointerDown: () => false }),
        makeBehavior({ name: 'b', onPointerDown: () => false }),
      ])

      bm.handlePointerDown(makeEvent())

      expect(bm.active).toBeNull()
    })

    it('skips behaviors with no onPointerDown', () => {
      const bm = new BehaviorManager()
      const accept = makeBehavior({ name: 'accept', onPointerDown: () => true })
      bm.setBehaviors([
        makeBehavior({ name: 'passive' }),
        accept,
      ])

      bm.handlePointerDown(makeEvent())

      expect(bm.active).toBe(accept)
    })
  })

  describe('drag threshold', () => {
    it('does not call onPointerDrag below threshold', () => {
      const bm = new BehaviorManager()
      const onDrag = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'drag', onPointerDown: () => true, onPointerDrag: onDrag }),
      ])

      bm.handlePointerDown(makeEvent({ screen: { x: 100, y: 100 } }))
      // Move 2px — below the 3px threshold
      bm.handlePointerMove(makeEvent({ screen: { x: 102, y: 100 } }))

      expect(onDrag).not.toHaveBeenCalled()
      expect(bm.isDragging).toBe(false)
    })

    it('calls onPointerDrag once threshold is exceeded', () => {
      const bm = new BehaviorManager()
      const onDrag = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'drag', onPointerDown: () => true, onPointerDrag: onDrag }),
      ])

      bm.handlePointerDown(makeEvent({ screen: { x: 100, y: 100 } }))
      // Move 4px — above the 3px threshold
      bm.handlePointerMove(makeEvent({ screen: { x: 104, y: 100 } }))

      expect(onDrag).toHaveBeenCalledOnce()
      expect(bm.isDragging).toBe(true)
    })

    it('enriches drag events with origin and distance', () => {
      const bm = new BehaviorManager()
      let capturedEvent: CanvasPointerEvent | null = null
      bm.setBehaviors([
        makeBehavior({
          name: 'drag',
          onPointerDown: () => true,
          onPointerDrag: (e) => { capturedEvent = e },
        }),
      ])

      bm.handlePointerDown(makeEvent({
        screen: { x: 100, y: 100 },
        world: { x: 50, y: 50 },
      }))
      bm.handlePointerMove(makeEvent({
        screen: { x: 104, y: 103 },
        world: { x: 52, y: 51.5 },
      }))

      expect(capturedEvent).not.toBeNull()
      expect(capturedEvent!.dragOrigin).toEqual({ x: 50, y: 50 })
      expect(capturedEvent!.dragScreenOrigin).toEqual({ x: 100, y: 100 })
      expect(capturedEvent!.dragDistance).toBe(5)
    })
  })

  describe('pointermove without active behavior', () => {
    it('broadcasts onPointerMove to all behaviors', () => {
      const bm = new BehaviorManager()
      const moveA = vi.fn()
      const moveB = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'a', onPointerMove: moveA }),
        makeBehavior({ name: 'b', onPointerMove: moveB }),
      ])

      bm.handlePointerMove(makeEvent())

      expect(moveA).toHaveBeenCalledOnce()
      expect(moveB).toHaveBeenCalledOnce()
    })

    it('does not broadcast onPointerMove when a behavior is active', () => {
      const bm = new BehaviorManager()
      const moveA = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'active', onPointerDown: () => true }),
        makeBehavior({ name: 'passive', onPointerMove: moveA }),
      ])

      bm.handlePointerDown(makeEvent())
      bm.handlePointerMove(makeEvent())

      expect(moveA).not.toHaveBeenCalled()
    })
  })

  describe('pointerup', () => {
    it('calls onPointerUp on the active behavior', () => {
      const bm = new BehaviorManager()
      const onUp = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'test', onPointerDown: () => true, onPointerUp: onUp }),
      ])

      bm.handlePointerDown(makeEvent())
      bm.handlePointerUp(makeEvent())

      expect(onUp).toHaveBeenCalledOnce()
    })

    it('deactivates the behavior on pointerup', () => {
      const bm = new BehaviorManager()
      const onDeactivate = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'test', onPointerDown: () => true, onDeactivate }),
      ])

      bm.handlePointerDown(makeEvent())
      expect(bm.active).not.toBeNull()

      bm.handlePointerUp(makeEvent())
      expect(bm.active).toBeNull()
      expect(onDeactivate).toHaveBeenCalledOnce()
    })

    it('resets drag state on pointerup', () => {
      const bm = new BehaviorManager()
      bm.setBehaviors([
        makeBehavior({ name: 'test', onPointerDown: () => true }),
      ])

      bm.handlePointerDown(makeEvent({ screen: { x: 0, y: 0 } }))
      bm.handlePointerMove(makeEvent({ screen: { x: 10, y: 10 } }))
      expect(bm.isDragging).toBe(true)

      bm.handlePointerUp(makeEvent())
      expect(bm.isDragging).toBe(false)
    })

    it('is a no-op when no behavior is active', () => {
      const bm = new BehaviorManager()
      bm.setBehaviors([
        makeBehavior({ name: 'test', onPointerDown: () => false }),
      ])

      bm.handlePointerDown(makeEvent())
      // Should not throw
      bm.handlePointerUp(makeEvent())
      expect(bm.active).toBeNull()
    })
  })

  describe('cancel', () => {
    it('deactivates the current behavior without calling onPointerUp', () => {
      const bm = new BehaviorManager()
      const onUp = vi.fn()
      const onDeactivate = vi.fn()
      bm.setBehaviors([
        makeBehavior({
          name: 'test',
          onPointerDown: () => true,
          onPointerUp: onUp,
          onDeactivate,
        }),
      ])

      bm.handlePointerDown(makeEvent())
      bm.cancel()

      expect(onUp).not.toHaveBeenCalled()
      expect(onDeactivate).toHaveBeenCalledOnce()
      expect(bm.active).toBeNull()
      expect(bm.isDragging).toBe(false)
    })
  })

  describe('setBehaviors', () => {
    it('deactivates the current behavior when swapping chains', () => {
      const bm = new BehaviorManager()
      const onDeactivate = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'test', onPointerDown: () => true, onDeactivate }),
      ])

      bm.handlePointerDown(makeEvent())
      expect(bm.active).not.toBeNull()

      bm.setBehaviors([])
      expect(bm.active).toBeNull()
      expect(onDeactivate).toHaveBeenCalledOnce()
    })
  })

  describe('drawOverlays', () => {
    it('calls drawOverlay on all behaviors', () => {
      const bm = new BehaviorManager()
      const drawA = vi.fn()
      const drawB = vi.fn()
      bm.setBehaviors([
        makeBehavior({ name: 'a', drawOverlay: drawA }),
        makeBehavior({ name: 'b', drawOverlay: drawB }),
      ])

      const ctx = {} as CanvasRenderingContext2D
      const viewport = {} as import('../viewport/viewport').Viewport
      bm.drawOverlays(ctx, viewport)

      expect(drawA).toHaveBeenCalledWith(ctx, viewport)
      expect(drawB).toHaveBeenCalledWith(ctx, viewport)
    })
  })

  describe('full interaction lifecycle', () => {
    it('handles pointerdown → drag → pointerup correctly', () => {
      const bm = new BehaviorManager()
      const calls: string[] = []

      bm.setBehaviors([
        makeBehavior({
          name: 'lifecycle',
          onPointerDown: () => { calls.push('down'); return true },
          onPointerDrag: () => { calls.push('drag') },
          onPointerUp: () => { calls.push('up') },
          onActivate: () => { calls.push('activate') },
          onDeactivate: () => { calls.push('deactivate') },
        }),
      ])

      bm.handlePointerDown(makeEvent({ screen: { x: 0, y: 0 } }))
      bm.handlePointerMove(makeEvent({ screen: { x: 10, y: 10 } }))
      bm.handlePointerMove(makeEvent({ screen: { x: 20, y: 20 } }))
      bm.handlePointerUp(makeEvent({ screen: { x: 20, y: 20 } }))

      expect(calls).toEqual(['down', 'activate', 'drag', 'drag', 'up', 'deactivate'])
    })

    it('handles pointerdown → pointerup (click, no drag)', () => {
      const bm = new BehaviorManager()
      const onDrag = vi.fn()
      const onUp = vi.fn()

      bm.setBehaviors([
        makeBehavior({
          name: 'click',
          onPointerDown: () => true,
          onPointerDrag: onDrag,
          onPointerUp: onUp,
        }),
      ])

      bm.handlePointerDown(makeEvent({ screen: { x: 100, y: 100 } }))
      bm.handlePointerUp(makeEvent({ screen: { x: 101, y: 100 } }))

      expect(onDrag).not.toHaveBeenCalled()
      expect(onUp).toHaveBeenCalledOnce()
    })
  })
})
