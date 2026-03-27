import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AnimationType =
  | 'fade-in' | 'fade-out'
  | 'slide-in' | 'slide-out'
  | 'spin'
  | 'translate-x'
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
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  addAnimation: (nodeId: string, type: AnimationType, durationMs?: number, colorFrom?: AnimationColor, colorTo?: AnimationColor) => void;
  removeAnimation: (id: string) => void;
  updateAnimation: (id: string, patch: Partial<Pick<TimelineAnimation, 'startMs' | 'durationMs' | 'type' | 'easing' | 'colorFrom' | 'colorTo'>>) => void;
  /** Move/resize a clip and push overlapping clips on the same layer so they don't overlap. */
  moveClipAndPush: (id: string, newStartMs: number, newDurationMs?: number) => void;
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

export function AnimationStoreProvider({ children }: AnimationStoreProviderProps) {
  const [animations, setAnimations] = useState<TimelineAnimation[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const addAnimation = useCallback((nodeId: string, type: AnimationType, durationMs?: number, colorFrom?: AnimationColor, colorTo?: AnimationColor) => {
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

  const updateAnimation = useCallback((id: string, patch: Partial<Pick<TimelineAnimation, 'startMs' | 'durationMs' | 'type' | 'easing' | 'colorFrom' | 'colorTo'>>) => {
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

  const value = useMemo<AnimationStoreValue>(
    () => ({ animations, selectedClipId, setSelectedClipId, addAnimation, removeAnimation, updateAnimation, moveClipAndPush }),
    [animations, selectedClipId, addAnimation, removeAnimation, updateAnimation, moveClipAndPush],
  );

  return (
    <AnimationStoreContext.Provider value={value}>
      {children}
    </AnimationStoreContext.Provider>
  );
}
