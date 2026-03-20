import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore,
} from 'react';
import type { SetStateAction } from 'react';
import { addListener } from '@figma/fpl-components';
import { Viewport } from './viewport';

// ── Zoom constants (from Figma's FGViewport.cpp) ─────────────────────

/** Exponential zoom base — each unit of delta multiplies scale by this. */
const ZOOM_BASE = 0.995

/** Max zoom factor per wheel event (prevents extreme zoom-in). */
const ZOOM_FACTOR_MAX = 10.0

/** Min zoom factor per wheel event (prevents extreme zoom-out). */
const ZOOM_FACTOR_MIN = 0.1

/**
 * Knee point for delta remapping. Deltas below this pass through linearly;
 * above this they're compressed via cube root to tame OS scroll acceleration.
 */
const DOMAIN_KNEE = 30

/** Scale factor for the cube root branch: DOMAIN_KNEE / cbrt(DOMAIN_KNEE). */
const KNEE_K = DOMAIN_KNEE / Math.cbrt(DOMAIN_KNEE)

/**
 * Remap a wheel deltaY value using Figma's knee curve.
 * Small deltas (trackpad pinch) pass through unchanged. Large deltas
 * (mouse wheel with OS acceleration) are compressed via cube root.
 */
function zoomRemapDelta(delta: number): number {
  const abs = Math.abs(delta)
  const remapped = Math.min(abs, KNEE_K * Math.cbrt(abs))
  return Math.sign(delta) * remapped
}

/** Viewport state snapshot: origin (pan offset) and scale (zoom level). */
export interface ViewportState {
  origin: { x: number; y: number }
  scale: number
}

export interface ViewportAPI {
  /**
   * Set viewport state directly (for zoom-to-fit, etc.).
   * Supports both direct values and functional updaters.
   */
  setState: (action: SetStateAction<ViewportState>) => void
  /** Convert world coordinates to screen coordinates. */
  worldToScreen(wx: number, wy: number): { x: number; y: number }
  /** Convert screen coordinates to world coordinates. */
  screenToWorld(sx: number, sy: number): { x: number; y: number }
  /** The ref to attach to the canvas container element. */
  containerRef: React.RefObject<HTMLDivElement>
  /** The underlying Viewport instance for direct access (RAF loop, CanvasLayers). */
  instance: Viewport
}

const ViewportContext = createContext<ViewportAPI | null>(null);

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable Viewport instance — single source of truth for all viewport state.
  // React components subscribe to changes via useViewportState().
  const vpRef = useRef<Viewport | null>(null);
  if (!vpRef.current) vpRef.current = new Viewport();
  const vp = vpRef.current;

  // Compat setState that delegates to the Viewport class.
  // Supports both direct values and functional updaters.
  const setState = useCallback(
    (action: SetStateAction<ViewportState>) => {
      const current: ViewportState = {
        origin: { x: vp.originX, y: vp.originY },
        scale: vp.scale,
      };
      const next = typeof action === 'function' ? action(current) : action;
      vp.set(next.origin.x, next.origin.y, next.scale);
    },
    [vp],
  );

  // Expose for integration tests and debugging (Vite replaces at build time)
  if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
    (window as unknown as Record<string, unknown>).__viewport = {
      get originX() { return vp.originX },
      get originY() { return vp.originY },
      get scale() { return vp.scale },
      set: (ox: number, oy: number, s: number) => {
        vp.set(ox, oy, s);
      },
    }
  }

  // Wheel handler: pan on scroll, zoom on ctrl+wheel / pinch.
  // Calls vp.pan() / vp.zoomTo() directly — no React state in the loop.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();

      const rect = el!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Zoom toward cursor. Two paths match Figma's FGViewport.cpp:
        // 1. Trackpad pinch: ctrlKey is synthesized by macOS, deltaY is tiny
        //    (~1-10). Use pow(4, -delta/100) for aggressive, perceptually
        //    uniform zoom (Figma uses pow(4, gestureValue)).
        // 2. Mouse wheel + Ctrl/Cmd: deltaY is large (50-300). Use
        //    exponential curve with knee remapping to tame OS acceleration.
        const isPinch = !e.deltaX && Math.abs(e.deltaY) < DOMAIN_KNEE;
        let zoomFactor: number;
        if (isPinch) {
          zoomFactor = Math.pow(4, -e.deltaY / 100);
        } else {
          const remapped = zoomRemapDelta(e.deltaY);
          zoomFactor = Math.pow(ZOOM_BASE, remapped);
        }
        const clamped = Math.min(ZOOM_FACTOR_MAX, Math.max(ZOOM_FACTOR_MIN, zoomFactor));
        vp.zoomTo(vp.scale * clamped, mouseX, mouseY);
      } else {
        vp.pan(-e.deltaX, -e.deltaY);
      }
    }

    return addListener(el, 'wheel', onWheel, { passive: false });
  }, [vp]);

  const worldToScreen = useCallback(
    (wx: number, wy: number) => vp.worldToScreen(wx, wy),
    [vp],
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number) => vp.screenToWorld(sx, sy),
    [vp],
  );

  // Stable API — never changes after mount.
  const api = useMemo<ViewportAPI>(
    () => ({ setState, worldToScreen, screenToWorld, containerRef, instance: vp }),
    [setState, worldToScreen, screenToWorld, vp],
  );

  return <ViewportContext.Provider value={api}>{children}</ViewportContext.Provider>;
}

/**
 * Access the stable viewport API (setState, coordinate transforms, instance).
 * Does NOT trigger re-renders on viewport changes — use useViewportState() for that.
 */
export function useViewport(): ViewportAPI {
  const ctx = useContext(ViewportContext);
  if (!ctx) throw new Error('useViewport must be used within a ViewportProvider');
  return ctx;
}

/**
 * Subscribe to reactive viewport state (origin, scale, transform, zoomPercent).
 * Re-renders the component when the viewport changes.
 */
export function useViewportState() {
  const { instance: vp } = useViewport();

  const subscribe = useCallback(
    (cb: () => void) => vp.subscribe(cb),
    [vp],
  );

  const snapshotRef = useRef<ViewportState>({ origin: { x: 0, y: 0 }, scale: 1 });

  const getSnapshot = useCallback((): ViewportState => {
    const cached = snapshotRef.current;
    if (
      cached.origin.x === vp.originX &&
      cached.origin.y === vp.originY &&
      cached.scale === vp.scale
    ) {
      return cached;
    }
    const next: ViewportState = {
      origin: { x: vp.originX, y: vp.originY },
      scale: vp.scale,
    };
    snapshotRef.current = next;
    return next;
  }, [vp]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  return {
    state,
    /** CSS transform string for the world container. */
    transform: vp.cssTransform,
    /** Zoom as a percentage (e.g. 100 for 1x). */
    zoomPercent: vp.zoomPercent,
  };
}
