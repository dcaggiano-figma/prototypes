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
}

const ViewportContext = createContext<ViewportAPI | null>(null);

const MIN_SCALE = 0.02;
const MAX_SCALE = 256;

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ViewportState>({
    origin: { x: 0, y: 0 },
    scale: 1,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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
        // Zoom toward cursor
        const scaleBy = 1 - e.deltaY / 100;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * scaleBy));
        const ratio = newScale / scale;

        setState({
          origin: {
            x: mouseX - (mouseX - origin.x) * ratio,
            y: mouseY - (mouseY - origin.y) * ratio,
          },
          scale: newScale,
        });
      } else {
        // Pan
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
    }),
    [state, setState, worldToScreen, screenToWorld, transform, zoomPercent],
  );

  return <ViewportContext.Provider value={api}>{children}</ViewportContext.Provider>;
}

export function useViewport(): ViewportAPI {
  const ctx = useContext(ViewportContext);
  if (!ctx) throw new Error('useViewport must be used within a ViewportProvider');
  return ctx;
}
