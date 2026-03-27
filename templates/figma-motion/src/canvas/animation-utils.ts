import type { CSSProperties } from 'react';
import type { TimelineAnimation, AnimationType, EasingType } from '../contexts/AnimationStoreContext';
import { usePlaybackOptional } from '../contexts/PlaybackContext';
import { useAnimationStoreOptional } from '../contexts/AnimationStoreContext';
import { useKeyframeStoreOptional, type Keyframe, type KeyframeableProperty } from '../contexts/KeyframeStoreContext';
import { useMemo } from 'react';

// -- Easing functions --

export const EASING_FNS: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  'ease-in-back': (t) => {
    const c = 1.70158;
    return (c + 1) * t * t * t - c * t * t;
  },
  'ease-out-back': (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  'ease-in-out-back': (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },
  gentle: (t) => 1 - Math.pow(1 - t, 3),
  quick: (t) => t * t * t,
  bouncy: (t) => {
    const c = 2.5;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  slow: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

// -- Per-type animation definitions --

interface AnimDef {
  property: 'opacity' | 'transform';
  from: number;
  to: number;
  unit: string;
  transformFn?: string;
}

const ANIM_DEFS: Record<AnimationType, AnimDef> = {
  'fade-in': { property: 'opacity', from: 0, to: 1, unit: '' },
  'fade-out': { property: 'opacity', from: 1, to: 0, unit: '' },
  'slide-in': { property: 'transform', from: 30, to: 0, unit: 'px', transformFn: 'translateY' },
  'slide-out': { property: 'transform', from: 0, to: 30, unit: 'px', transformFn: 'translateY' },
  'spin': { property: 'transform', from: 0, to: 360, unit: 'deg', transformFn: 'rotate' },
  'translate-x': { property: 'transform', from: -40, to: 0, unit: 'px', transformFn: 'translateX' },
  'video': { property: 'opacity', from: 1, to: 1, unit: '' },
  'audio': { property: 'opacity', from: 1, to: 1, unit: '' },
  'color': { property: 'opacity', from: 1, to: 1, unit: '' },
};

function animProgress(anim: TimelineAnimation, currentMs: number): number {
  const end = anim.startMs + anim.durationMs;
  if (currentMs < anim.startMs) return -1;
  if (currentMs >= end) return 2;
  if (anim.durationMs <= 0) return 2;
  return (currentMs - anim.startMs) / anim.durationMs;
}

export function computeAnimatedStyle(
  nodeAnims: TimelineAnimation[],
  currentMs: number,
): CSSProperties {
  if (nodeAnims.length === 0) return {};

  let opacity: number | undefined;
  const transforms: string[] = [];
  let bgColor: string | undefined;

  for (const anim of nodeAnims) {
    if (anim.type === 'color' && anim.colorFrom && anim.colorTo) {
      const easingFn = EASING_FNS[anim.easing] ?? EASING_FNS['ease-out'];
      const raw = animProgress(anim, currentMs);
      const t = raw < 0 ? 0 : raw > 1 ? 1 : easingFn(raw);
      const r = Math.round(anim.colorFrom.r + (anim.colorTo.r - anim.colorFrom.r) * t);
      const g = Math.round(anim.colorFrom.g + (anim.colorTo.g - anim.colorFrom.g) * t);
      const b = Math.round(anim.colorFrom.b + (anim.colorTo.b - anim.colorFrom.b) * t);
      bgColor = `rgb(${r}, ${g}, ${b})`;
      continue;
    }

    const def = ANIM_DEFS[anim.type];
    if (!def) continue;

    const easingFn = EASING_FNS[anim.easing] ?? EASING_FNS['ease-out'];
    const raw = animProgress(anim, currentMs);
    const t = raw < 0 ? 0 : raw > 1 ? 1 : easingFn(raw);
    const value = def.from + (def.to - def.from) * t;

    if (def.property === 'opacity') {
      opacity = opacity !== undefined ? opacity * value : value;
    } else if (def.transformFn) {
      transforms.push(`${def.transformFn}(${value}${def.unit})`);
    }
  }

  const style: CSSProperties = {};
  if (opacity !== undefined) style.opacity = opacity;
  if (transforms.length > 0) style.transform = transforms.join(' ');
  if (bgColor) style.backgroundColor = bgColor;
  return style;
}

// -- Keyframe interpolation --

export function interpolateKeyframes(kfs: Keyframe[], currentMs: number): number | undefined {
  if (kfs.length === 0) return undefined;
  if (kfs.length === 1) return kfs[0].value;
  if (currentMs <= kfs[0].timeMs) return kfs[0].value;
  if (currentMs >= kfs[kfs.length - 1].timeMs) return kfs[kfs.length - 1].value;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (currentMs >= a.timeMs && currentMs <= b.timeMs) {
      const span = b.timeMs - a.timeMs;
      if (span <= 0) return a.value;
      const t = (currentMs - a.timeMs) / span;
      return a.value + (b.value - a.value) * t;
    }
  }
  return kfs[kfs.length - 1].value;
}


export function computeKeyframeStyle(
  nodeKeyframes: Map<KeyframeableProperty, Keyframe[]>,
  currentMs: number,
  baseNode?: { x: number; y: number; rotation: number; opacity: number; width: number; height: number },
): CSSProperties {
  const style: CSSProperties = {};
  const transforms: string[] = [];

  // First pass: collect all interpolated values
  const values = new Map<KeyframeableProperty, number>();
  for (const [prop, kfs] of nodeKeyframes) {
    if (kfs.length < 2) continue;
    const val = interpolateKeyframes(kfs, currentMs);
    if (val !== undefined) values.set(prop, val);
  }

  // Size deltas for center-point compensation
  const widthDelta = values.has('width') ? values.get('width')! - (baseNode?.width ?? 0) : 0;
  const heightDelta = values.has('height') ? values.get('height')! - (baseNode?.height ?? 0) : 0;

  for (const [prop, val] of values) {
    if (prop === 'opacity') {
      style.opacity = val;
    } else if (prop === 'width') {
      style.width = val;
    } else if (prop === 'height') {
      style.height = val;
    } else if (prop === 'x') {
      // Fold center compensation into x translate
      const baseVal = baseNode?.x ?? 0;
      const delta = val - baseVal - widthDelta / 2;
      if (Math.abs(delta) > 0.001) {
        transforms.push(`translateX(${delta}px)`);
      }
    } else if (prop === 'y') {
      // Fold center compensation into y translate
      const baseVal = baseNode?.y ?? 0;
      const delta = val - baseVal - heightDelta / 2;
      if (Math.abs(delta) > 0.001) {
        transforms.push(`translateY(${delta}px)`);
      }
    } else if (prop === 'rotation') {
      const baseVal = baseNode?.rotation ?? 0;
      const delta = val - baseVal;
      if (Math.abs(delta) > 0.001) {
        transforms.push(`rotate(${delta}deg)`);
      }
    }
  }

  // If size changed but no x/y keyframes exist, still compensate position
  if (!values.has('x') && Math.abs(widthDelta) > 0.001) {
    transforms.push(`translateX(${-widthDelta / 2}px)`);
  }
  if (!values.has('y') && Math.abs(heightDelta) > 0.001) {
    transforms.push(`translateY(${-heightDelta / 2}px)`);
  }

  if (transforms.length > 0) {
    style.transform = [style.transform, ...transforms].filter(Boolean).join(' ');
  }
  return style;
}

export interface BaseNodeForKf {
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  width: number;
  height: number;
}

export function useAnimatedStyle(nodeId: string | number, baseNode?: BaseNodeForKf): CSSProperties {
  const nodeIdStr = String(nodeId);
  const playback = usePlaybackOptional();
  const animStore = useAnimationStoreOptional();
  const kfStore = useKeyframeStoreOptional();

  const nodeAnims = useMemo(
    () => animStore?.animations.filter((a) => a.nodeId === nodeIdStr) ?? [],
    [animStore?.animations, nodeIdStr],
  );

  const nodeKeyframes = useMemo(
    () => kfStore?.getNodeKeyframes(nodeIdStr) ?? new Map<KeyframeableProperty, Keyframe[]>(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kfStore, nodeIdStr, kfStore?.keyframes],
  );

  return useMemo(() => {
    if (!playback) return {};
    const { currentMs, isPlaying } = playback;

    const hasAnims = nodeAnims.length > 0;
    const hasKfs = nodeKeyframes.size > 0;

    if (!hasAnims && !hasKfs) return {};
    if (!isPlaying && currentMs === 0 && !hasKfs) return {};

    const clipStyle = hasAnims ? computeAnimatedStyle(nodeAnims, currentMs) : {};
    const kfStyle = hasKfs ? computeKeyframeStyle(nodeKeyframes, currentMs, baseNode) : {};

    if (!hasKfs) return clipStyle;
    if (!hasAnims) return kfStyle;

    // Merge clip-based and keyframe-based styles (keyframe wins)
    const merged = { ...clipStyle, ...kfStyle };
    // Concatenate transforms from both sources
    if (clipStyle.transform && kfStyle.transform) {
      merged.transform = [clipStyle.transform, kfStyle.transform].filter(Boolean).join(' ');
    }
    return merged;
  }, [playback?.currentMs, playback?.isPlaying, nodeAnims, nodeKeyframes, baseNode?.x, baseNode?.y, baseNode?.rotation, baseNode?.opacity, baseNode?.width, baseNode?.height]);
}
