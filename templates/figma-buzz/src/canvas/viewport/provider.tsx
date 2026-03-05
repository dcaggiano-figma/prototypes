import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { addListener } from '@figma/fpl-components';

/** Viewport state: origin (pan offset) and scale (zoom level) */
export interface ViewportState {
  origin: { x: number; y: number }
  scale: number
}

export interface ViewportAPI {
  /** Current viewport state */
  state: ViewportState
  /** Set viewport state directly (for zoom-to-fit, etc.) */
  setState: React.Dispatch<React.SetStateAction<ViewportState>>
  /** Convert world coordinates to screen coordinates */
  worldToScreen(wx: number, wy: number): { x: number; y: number }
  /** Convert screen coordinates to world coordinates */
  screenToWorld(sx: number, sy: number): { x: number; y: number }
  /** The ref to attach to the canvas container element */
  containerRef: React.RefObject<HTMLDivElement>
  /** CSS transform string for the world container */
  transform: string
  /** Current zoom percentage */
  zoomPercent: number
  /** Set the maximum zoom scale (default: 256) */
  setMaxScale: (scale: number) => void
  /** Set the minimum zoom scale (default: 0.02) */
  setMinScale: (scale: number) => void
  /** Enable or disable scroll-based panning (default: true) */
  setPanEnabled: (enabled: boolean) => void
  /** Set a fixed zoom anchor point (visible center); null = zoom toward cursor */
  setZoomAnchor: (anchor: { x: number; y: number } | null) => void
}

const ViewportContext = createContext<ViewportAPI | null>(null);

const MIN_SCALE = 0.02;
const DEFAULT_MAX_SCALE = 256;

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ViewportState>({
    origin: { x: 0, y: 0 },
    scale: 1,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const maxScaleRef = useRef(DEFAULT_MAX_SCALE);
  const setMaxScale = useCallback((scale: number) => { maxScaleRef.current = scale; }, []);
  const minScaleRef = useRef(MIN_SCALE);
  const setMinScale = useCallback((scale: number) => { minScaleRef.current = scale; }, []);
  const panEnabledRef = useRef(true);
  const setPanEnabled = useCallback((enabled: boolean) => { panEnabledRef.current = enabled; }, []);
  const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const setZoomAnchor = useCallback((anchor: { x: number; y: number } | null) => { zoomAnchorRef.current = anchor; }, []);

  // Wheel handler: pan on scroll, zoom on ctrl+wheel / pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();

      const rect = el!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const { origin, scale } = stateRef.current;

      if (e.ctrlKey || e.metaKey) {
        // Zoom toward anchor (fixed center) or cursor
        const anchor = zoomAnchorRef.current;
        const zx = anchor ? anchor.x - rect.left : mouseX;
        const zy = anchor ? anchor.y - rect.top : mouseY;
        const scaleBy = 1 - e.deltaY / 100;
        const newScale = Math.min(maxScaleRef.current, Math.max(minScaleRef.current, scale * scaleBy));
        const ratio = newScale / scale;

        setState({
          origin: {
            x: zx - (zx - origin.x) * ratio,
            y: zy - (zy - origin.y) * ratio,
          },
          scale: newScale,
        });
      } else if (panEnabledRef.current) {
        // Pan (only when enabled)
        setState({
          origin: {
            x: origin.x - e.deltaX,
            y: origin.y - e.deltaY,
          },
          scale,
        });
      }
    }

    return addListener(el, 'wheel', onWheel, { passive: false });
  }, []);

  const worldToScreen = useCallback(
    (wx: number, wy: number) => ({
      x: wx * state.scale + state.origin.x,
      y: wy * state.scale + state.origin.y,
    }),
    [state],
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - state.origin.x) / state.scale,
      y: (sy - state.origin.y) / state.scale,
    }),
    [state],
  );

  const transform = `matrix(${state.scale}, 0, 0, ${state.scale}, ${state.origin.x}, ${state.origin.y})`;
  const zoomPercent = Math.round(state.scale * 100);

  const api = useMemo<ViewportAPI>(
    () => ({
      state,
      setState,
      worldToScreen,
      screenToWorld,
      containerRef,
      transform,
      zoomPercent,
      setMaxScale,
      setMinScale,
      setPanEnabled,
      setZoomAnchor,
    }),
    [state, setState, worldToScreen, screenToWorld, transform, zoomPercent, setMaxScale, setMinScale, setPanEnabled, setZoomAnchor],
  );

  return <ViewportContext.Provider value={api}>{children}</ViewportContext.Provider>;
}

export function useViewport(): ViewportAPI {
  const ctx = useContext(ViewportContext);
  if (!ctx) throw new Error('useViewport must be used within a ViewportProvider');
  return ctx;
}
