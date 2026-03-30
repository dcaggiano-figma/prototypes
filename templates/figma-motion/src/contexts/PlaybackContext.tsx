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

export const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2] as const;
export type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

interface PlaybackValue {
  currentMs: number;
  isPlaying: boolean;
  loop: boolean;
  speed: PlaybackSpeed;
  endMs: number;
  setCurrentMs: (ms: number) => void;
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  setLoop: (loop: boolean | ((prev: boolean) => boolean)) => void;
  cycleSpeed: () => void;
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
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

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
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const currentMsRef = useRef(currentMs);
  currentMsRef.current = currentMs;

  useEffect(() => {
    if (!isPlaying) return;
    let startTime = performance.now();
    let baseMs = currentMsRef.current;
    const tick = (now: number) => {
      const effectiveEnd = endMsRef.current;
      const elapsed = (now - startTime) * speedRef.current;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, loop]);

  const stableSetCurrentMs = useCallback((ms: number) => setCurrentMs(ms), []);
  const stableSetIsPlaying = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => setIsPlaying(v),
    [],
  );
  const stableSetLoop = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => setLoop(v),
    [],
  );
  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  }, []);

  const value = useMemo<PlaybackValue>(
    () => ({
      currentMs,
      isPlaying,
      loop,
      speed,
      endMs,
      setCurrentMs: stableSetCurrentMs,
      setIsPlaying: stableSetIsPlaying,
      setLoop: stableSetLoop,
      cycleSpeed,
    }),
    [currentMs, isPlaying, loop, speed, endMs, stableSetCurrentMs, stableSetIsPlaying, stableSetLoop, cycleSpeed],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}
