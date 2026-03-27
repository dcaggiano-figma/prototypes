import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AnimationType =
  | 'fade-in' | 'fade-out'
  | 'slide-in' | 'slide-out'
  | 'spin'
  | 'translate-x'
  | 'video'
  | 'audio'
  | 'color';

export type EasingType =
  | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'ease-in-back' | 'ease-out-back' | 'ease-in-out-back'
  | 'gentle' | 'quick' | 'bouncy' | 'slow';

export interface AnimationColor { r: number; g: number; b: number }

export interface TimelineAnimation {
  id: string;
  nodeId: string;
  type: AnimationType;
  easing: EasingType;
  startMs: number;
  durationMs: number;
  /** For video clips: how far into the source to start playback (ms). 0 = beginning. */
  offsetMs: number;
  /** For video clips: the intrinsic video duration (ms). Limits how far the clip can expand. */
  maxDurationMs: number;
  /** For color animations: starting color. */
  colorFrom?: AnimationColor;
  /** For color animations: ending color. */
  colorTo?: AnimationColor;
}

const DEFAULT_DURATION_MS = 400;

function nextId(): string {
  return `anim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface AnimationStoreValue {
  animations: TimelineAnimation[];
  selectedClipIds: Set<string>;
  setSelectedClipIds: (ids: Set<string>) => void;
  addAnimation: (nodeId: string, type: AnimationType, durationMs?: number, maxDurationMs?: number, colorFrom?: AnimationColor, colorTo?: AnimationColor) => void;
  removeAnimation: (id: string) => void;
  updateAnimation: (id: string, patch: Partial<Pick<TimelineAnimation, 'startMs' | 'durationMs' | 'type' | 'easing' | 'offsetMs' | 'colorFrom' | 'colorTo'>>) => void;
  /** Move/resize a clip and push overlapping clips on the same layer so they don't overlap. */
  moveClipAndPush: (id: string, newStartMs: number, newDurationMs?: number) => void;
  /** Split a video or audio clip at a time (ms). Replaces the clip with two clips. */
  splitClipAt: (animId: string, cutTimeMs: number) => void;
}

const AnimationStoreContext = createContext<AnimationStoreValue | null>(null);

export function useAnimationStore(): AnimationStoreValue {
  const ctx = useContext(AnimationStoreContext);
  if (!ctx) throw new Error('useAnimationStore must be used within AnimationStoreProvider');
  return ctx;
}

export function useAnimationStoreOptional(): AnimationStoreValue | null {
  return useContext(AnimationStoreContext);
}

interface AnimationStoreProviderProps {
  children: ReactNode;
}

const EMPTY_SET = new Set<string>();

export function AnimationStoreProvider({ children }: AnimationStoreProviderProps) {
  const [animations, setAnimations] = useState<TimelineAnimation[]>([]);
  const [selectedClipIds, setSelectedClipIdsRaw] = useState<Set<string>>(EMPTY_SET);

  const setSelectedClipIds = useCallback((ids: Set<string>) => {
    setSelectedClipIdsRaw(ids.size === 0 ? EMPTY_SET : ids);
  }, []);

  const addAnimation = useCallback((nodeId: string, type: AnimationType, durationMs?: number, maxDurationMs?: number, colorFrom?: AnimationColor, colorTo?: AnimationColor) => {
    setAnimations((prev) => {
      const maxEnd = prev
        .filter((a) => a.nodeId === nodeId)
        .reduce((max, a) => Math.max(max, a.startMs + a.durationMs), 0);
      const dur = durationMs ?? (type === 'color' ? 1000 : DEFAULT_DURATION_MS);
      const anim: TimelineAnimation = {
        id: nextId(),
        nodeId,
        type,
        easing: 'ease-out' as EasingType,
        startMs: maxEnd,
        durationMs: dur,
        offsetMs: 0,
        maxDurationMs: maxDurationMs ?? dur,
      };
      if (type === 'color') {
        const fallback = { r: 200, g: 200, b: 200 };
        anim.colorFrom = colorFrom ?? fallback;
        anim.colorTo = colorTo ?? colorFrom ?? fallback;
      }
      return [...prev, anim];
    });
  }, []);

  const removeAnimation = useCallback((id: string) => {
    setAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAnimation = useCallback((id: string, patch: Partial<Pick<TimelineAnimation, 'startMs' | 'durationMs' | 'type' | 'easing' | 'offsetMs' | 'colorFrom' | 'colorTo'>>) => {
    setAnimations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  }, []);

  const moveClipAndPush = useCallback((id: string, newStartMs: number, newDurationMs?: number) => {
    setAnimations((prev) => {
      const anim = prev.find((a) => a.id === id);
      if (!anim) return prev;
      const duration = newDurationMs ?? anim.durationMs;
      return prev.map((a) => (a.id === id ? { ...a, startMs: newStartMs, durationMs: duration } : a));
    });
  }, []);

  const splitClipAt = useCallback((animId: string, cutTimeMs: number) => {
    setAnimations((prev) => {
      const anim = prev.find((a) => a.id === animId);
      if (!anim || (anim.type !== 'video' && anim.type !== 'audio')) return prev;
      const startMs = anim.startMs;
      const endMs = anim.startMs + anim.durationMs;
      if (cutTimeMs <= startMs || cutTimeMs >= endMs) return prev;

      const firstDurationMs = cutTimeMs - startMs;
      const secondDurationMs = endMs - cutTimeMs;
      const secondOffsetMs = anim.offsetMs + firstDurationMs;
      const secondMaxDurationMs = anim.maxDurationMs - firstDurationMs;

      const first: TimelineAnimation = { ...anim, durationMs: firstDurationMs };
      const second: TimelineAnimation = {
        ...anim,
        id: nextId(),
        startMs: cutTimeMs,
        durationMs: secondDurationMs,
        offsetMs: secondOffsetMs,
        maxDurationMs: secondMaxDurationMs,
      };

      return prev.map((a) => (a.id === animId ? first : a)).concat(second);
    });
  }, []);

  const value = useMemo<AnimationStoreValue>(
    () => ({ animations, selectedClipIds, setSelectedClipIds, addAnimation, removeAnimation, updateAnimation, moveClipAndPush, splitClipAt }),
    [animations, selectedClipIds, setSelectedClipIds, addAnimation, removeAnimation, updateAnimation, moveClipAndPush, splitClipAt],
  );

  return (
    <AnimationStoreContext.Provider value={value}>
      {children}
    </AnimationStoreContext.Provider>
  );
}
