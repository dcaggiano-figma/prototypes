import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAnimationStore } from './AnimationStoreContext';
import { useDesignTabOptional } from './DesignTabContext';

export const DURATION_MS = 2400;

/** End of last clip, or DURATION_MS if no clips. Used so playback stops at last bar and loop restarts from 0. */
export function getEffectiveEndMs(animations: { startMs: number; durationMs: number }[]): number {
  if (animations.length === 0) return DURATION_MS;
  return Math.max(
    DURATION_MS,
    ...animations.map((a) => a.startMs + a.durationMs),
  );
}

interface PlaybackValue {
  currentMs: number;
  isPlaying: boolean;
  loop: boolean;
  endMs: number;
  setCurrentMs: (ms: number) => void;
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  setLoop: (loop: boolean | ((prev: boolean) => boolean)) => void;
}

const PlaybackContext = createContext<PlaybackValue | null>(null);

export function usePlayback(): PlaybackValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within PlaybackProvider');
  return ctx;
}

export function usePlaybackOptional(): PlaybackValue | null {
  return useContext(PlaybackContext);
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { animations } = useAnimationStore();
  const designTab = useDesignTabOptional();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    if (designTab?.activeTab !== 'animation') {
      setIsPlaying(false);
    }
  }, [designTab?.activeTab]);

  const endMs = useMemo(() => getEffectiveEndMs(animations), [animations]);
  const rafRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const endMsRef = useRef(endMs);
  endMsRef.current = endMs;

  useEffect(() => {
    if (!isPlaying) return;
    let startTime = performance.now();
    let baseMs = currentMs;
    const tick = (now: number) => {
      const effectiveEnd = endMsRef.current;
      const elapsed = now - startTime;
      let next = baseMs + elapsed;
      if (next >= effectiveEnd) {
        if (loop) {
          next = 0;
          startTime = now;
          baseMs = 0;
        } else {
          next = effectiveEnd;
          setIsPlaying(false);
        }
      }
      setCurrentMs(Math.min(next, effectiveEnd));
      if (isPlayingRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, loop, currentMs]);

  const stableSetCurrentMs = useCallback((ms: number) => setCurrentMs(ms), []);
  const stableSetIsPlaying = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => setIsPlaying(v),
    [],
  );
  const stableSetLoop = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => setLoop(v),
    [],
  );

  const value = useMemo<PlaybackValue>(
    () => ({
      currentMs,
      isPlaying,
      loop,
      endMs,
      setCurrentMs: stableSetCurrentMs,
      setIsPlaying: stableSetIsPlaying,
      setLoop: stableSetLoop,
    }),
    [currentMs, isPlaying, loop, endMs, stableSetCurrentMs, stableSetIsPlaying, stableSetLoop],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}
