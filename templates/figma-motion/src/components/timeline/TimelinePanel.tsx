import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, IconButton, InputPrimitive, ToggleButton } from '@figma/fpl-components';
import { Icon24Play, Icon24Pause, Icon24ChevronDownLarge, Icon24Loop, Icon24LoopOff } from '@figma/fpl-icons';

import { useAnimationStore } from '../../contexts/AnimationStoreContext';
import { usePlayback } from '../../contexts/PlaybackContext';
import { useKeyframeStore } from '../../contexts/KeyframeStoreContext';
import type { KeyframeableProperty, Keyframe as KfEntry } from '../../contexts/KeyframeStoreContext';
import { useAction } from '../../actions/provider';
import { useSceneGraph, useSelection } from '../../canvas';
import type { SceneNode, VideoNode, AudioNode } from '../../canvas';
import type { AnimationType, TimelineAnimation } from '../../contexts/AnimationStoreContext';
import { useVideoFrames } from '../../canvas/video-frames';
import { useAudioWaveform } from '../../canvas/audio-waveform';
import { Avatar, CURSORS, Text, useComments } from '@prototype/shared';
import type { CommentThread } from '@prototype/shared';


// NodeTypeIcon is shared with the layers panel to keep icons consistent
import { NodeTypeIcon } from '../panels/FilePanel';

/** Fixed height of the timeline panel (matches Figma: header 80px + body). */
export const TIMELINE_PANEL_HEIGHT_PX = 302;
/** Height when collapsed to control row only (play + time + expand button). */
export const TIMELINE_COLLAPSED_HEIGHT_PX = 48;

const TREE_WIDTH_PX = 240;
const ROW_HEIGHT_PX = 24;
const HEADER_TOP_HEIGHT = 48;
const HEADER_BOTTOM_HEIGHT = 32;
const BAR_HEIGHT_PX = 18;
const MIN_CLIP_DURATION_MS = 50;
const SCROLLBAR_HEIGHT_PX = 8;

const MIN_TIMELINE_ZOOM = 1;
const MAX_TIMELINE_ZOOM = 40;
const TIMELINE_ZOOM_FACTOR = 0.01;
const SNAP_THRESHOLD_PX = 6;
const TIMELINE_PAD_FRAC = 0.015;
const PLAYHEAD_HIT_PX = 12;
/** Group comment pins within this many ms (same position = one marker). */
const COMMENT_PIN_BUCKET_MS = 1;

const KEYFRAMEABLE_PROP_LABELS: Record<KeyframeableProperty, string> = {
  x: 'X',
  y: 'Y',
  rotation: 'Rotation',
  opacity: 'Opacity',
  width: 'Width',
  height: 'Height',
};

/** Reusable dot-grid background style for empty timeline areas. */
const DOT_GRID_STYLE: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0)',
  backgroundSize: '8px 8px',
};

/** Style for the time input container (custom dimensions and subtle bg). */
const TIME_INPUT_STYLE: React.CSSProperties = {
  borderRadius: 9,
  height: 34,
  width: 160,
  backgroundColor: 'rgba(0,0,0,0.05)',
};

/** Width for the editable time input field. */
const TIME_FIELD_STYLE: React.CSSProperties = { width: 48 };

/** z-index base layer style (no numeric z-index tokens in tailwind config). */
const Z_BASE_STYLE: React.CSSProperties = { zIndex: 0 };

/** Ruler notch label padding. */
const RULER_NOTCH_LABEL_STYLE: React.CSSProperties = { padding: '0 2px' };

/** Ruler notch tick mark style. */
const RULER_NOTCH_TICK_STYLE: React.CSSProperties = { height: 6, transform: 'translateX(-0.5px)' };

/** Comment pin button height. */
const COMMENT_PIN_HEIGHT = 20;

/** Comment pin style for single comment. */
const COMMENT_PIN_STYLE_SINGLE: React.CSSProperties = {
  width: 'fit-content',
  height: COMMENT_PIN_HEIGHT,
  paddingLeft: 1,
  paddingRight: 1,
};

/** Comment pin style for multi-comment groups. */
const COMMENT_PIN_STYLE_MULTI: React.CSSProperties = {
  width: 'fit-content',
  height: COMMENT_PIN_HEIGHT,
  paddingLeft: 2,
  paddingRight: 2,
};

/** Ruler guide label style (includes red color). */
const RULER_GUIDE_LABEL_STYLE: React.CSSProperties = { color: '#F24822', padding: '0 2px' };

/** Keyframe diamond marker for the timeline. */
function TimelineKeyframeDiamond({ filled }: { filled?: boolean }) {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4.23218 0.646484C4.42743 0.451336 4.74397 0.451311 4.93921 0.646484L8.52515 4.23242C8.7203 4.42766 8.7203 4.74421 8.52515 4.93945L4.93921 8.52539C4.74397 8.72057 4.42743 8.72054 4.23218 8.52539L0.64624 4.93945C0.451075 4.74421 0.451075 4.42767 0.64624 4.23242L4.23218 0.646484Z"
        fill={filled ? 'var(--color-icon-selected)' : 'none'}
        stroke={filled ? 'var(--color-icon-selected)' : 'var(--color-icon-secondary)'}
      />
    </svg>
  );
}

/** Row content type for marquee selection hit testing. */
type RowContent =
  | { type: 'layer-header'; nodeId: string; anims: TimelineAnimation[] }
  | { type: 'clip'; nodeId: string; anim: TimelineAnimation }
  | { type: 'keyframe-prop'; nodeId: string; prop: KeyframeableProperty; kfs: KfEntry[] };

/** Chevron down for layer collapse -- 16x16, tertiary color. */
function LayerChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M11.1817 6.23238C11.3769 6.42765 11.3769 6.74415 11.1817 6.93942L8.35355 9.76754C8.15829 9.9628 7.84178 9.9628 7.64652 9.76754L4.81742 6.93942C4.62248 6.74421 4.62248 6.42759 4.81742 6.23238C5.01268 6.03712 5.33017 6.03712 5.52543 6.23238L8.00004 8.70699L10.4746 6.23238C10.6699 6.03714 10.9864 6.03718 11.1817 6.23238Z"
        fill="var(--fpl-icon-color, var(--color-icon))"
      />
    </svg>
  );
}

/** Record icon: rounded square outline + red center dot (24px). */
/** Auto-keyframe icon: diamond outline + filled red center when active. */
function Icon24AutoKeyframe({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M10.5862 5.58567C11.3672 4.80482 12.6333 4.80473 13.4143 5.58567L18.4143 10.5857C19.1945 11.3667 19.1949 12.633 18.4143 13.4138L13.4143 18.4138C12.6335 19.1944 11.3672 19.1941 10.5862 18.4138L5.58616 13.4138C4.80522 12.6328 4.80531 11.3667 5.58616 10.5857L10.5862 5.58567ZM12.7073 6.2927C12.3168 5.90228 11.6837 5.90238 11.2932 6.2927L6.29319 11.2927C5.90287 11.6832 5.90277 12.3163 6.29319 12.7068L11.2932 17.7068C11.6837 18.0965 12.317 18.0969 12.7073 17.7068L17.7073 12.7068C18.0974 12.3165 18.097 11.6832 17.7073 11.2927L12.7073 6.2927Z"
        fill="var(--fpl-icon-color, var(--color-icon))"
      />
      {active && (
        <path d="M12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z" fill="var(--color-icon-danger)" />
      )}
    </svg>
  );
}

function formatTime(ms: number): string {
  return String(Math.round(ms)).padStart(4, '0');
}

function TimelineTimeInput({
  currentMs,
  endMs,
  onCurrentMsChange,
  loop,
  onLoopClick,
}: {
  currentMs: number;
  endMs: number;
  onCurrentMsChange: (ms: number) => void;
  loop: boolean;
  onLoopClick: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayCurrent = formatTime(currentMs);
  const leadingZeros = displayCurrent.match(/^0+/)?.[0] ?? '';
  const mainDigits = displayCurrent.slice(leadingZeros.length) || '0';
  const displayDuration = formatTime(endMs);

  const commitValue = useCallback(() => {
    const raw = inputValue.trim();
    if (raw === '') {
      setInputValue(displayCurrent);
      setIsEditing(false);
      return;
    }
    const parsed = Math.round(Number(raw));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setInputValue(displayCurrent);
      setIsEditing(false);
      return;
    }
    const clamped = Math.min(parsed, endMs);
    onCurrentMsChange(clamped);
    setInputValue(formatTime(clamped));
    setIsEditing(false);
  }, [inputValue, endMs, onCurrentMsChange, displayCurrent]);

  const handleBlur = useCallback(() => {
    commitValue();
  }, [commitValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitValue();
        inputRef.current?.blur();
      }
    },
    [commitValue],
  );

  useEffect(() => {
    if (!isEditing) setInputValue(displayCurrent);
  }, [displayCurrent, isEditing]);

  useEffect(() => {
    if (isEditing) {
      setInputValue(displayCurrent.replace(/^0+/, '') || '0');
      inputRef.current?.focus();
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps -- only run when entering edit mode

  return (
    <div
      className="flex shrink-0 items-center gap-1 border border-bordertranslucent pl-3 pr-0 min-w-0 overflow-hidden"
      style={TIME_INPUT_STYLE}
      aria-label="Current time / duration"
    >
      {!isEditing ? (
        <ButtonPrimitive
          type="button"
          onClick={() => setIsEditing(true)}
          className="min-w-0 shrink overflow-hidden text-left border-none p-0 cursor-text text-bodyMd tabular-nums text-text"
        >
          <span className="block truncate">
            <Text mono color='tertiary'>{leadingZeros}</Text>
            <Text mono>{mainDigits}</Text>
          </span>
        </ButtonPrimitive>
      ) : (
        <InputPrimitive
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className="min-w-0 shrink bg-transparent border-none p-0 text-bodyMd tabular-nums text-text outline-none font-mono"
          style={TIME_FIELD_STYLE}
          value={inputValue}
          onChange={(v) => setInputValue(v.replace(/\D/g, '').slice(0, 6))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label="Current time (ms)"
        />
      )}
      <Text mono color='tertiary' className="shrink-0 tabular-nums"> / </Text>
      <Text mono truncate color="secondary" className="min-w-0 tabular-nums">{displayDuration}ms</Text>
      <div className="ml-auto shrink-0 flex items-center justify-center w-6 h-6">
        <ToggleButton
          checked={loop}
          onChange={onLoopClick}
          onIcon={<Icon24Loop />}
          offIcon={<Icon24LoopOff />}
          aria-label={loop ? 'Loop on' : 'Loop off'}
        />
      </div>
    </div>
  );
}

// -- Ruler helpers --

const NICE_STEPS_MS = [
  20000, 10000, 5000, 2000, 1000,
  500, 200, 100, 50, 20, 10,
];

function computeRulerMarks(
  visibleStartMs: number,
  visibleEndMs: number,
  visibleDurationMs: number,
  endMs: number,
): { marks: { ms: number; label: string }[]; ticks: number[] } {
  if (visibleDurationMs <= 0) return { marks: [], ticks: [] };

  const targetMarks = 8;
  const rawStep = visibleDurationMs / targetMarks;
  let stepMs = NICE_STEPS_MS[NICE_STEPS_MS.length - 1];
  for (const s of NICE_STEPS_MS) {
    if (s <= rawStep * 1.5) { stepMs = s; break; }
  }

  const first = Math.ceil(visibleStartMs / stepMs) * stepMs;
  const marks: { ms: number; label: string }[] = [];
  const cap = Math.min(visibleEndMs, endMs);
  for (let t = first; t <= cap && marks.length < 20; t += stepMs) {
    marks.push({ ms: Math.round(t), label: formatRulerMs(Math.round(t), stepMs) });
  }

  const SUB_TICKS = 2;
  const subStep = stepMs / SUB_TICKS;
  const tickFirst = Math.ceil(visibleStartMs / subStep) * subStep;
  const markSet = new Set(marks.map((m) => m.ms));
  const ticks: number[] = [];
  for (let t = tickFirst; t <= cap && ticks.length < 100; t += subStep) {
    const rounded = Math.round(t);
    if (!markSet.has(rounded)) ticks.push(rounded);
  }

  return { marks, ticks };
}

function formatRulerMs(ms: number, stepMs: number): string {
  if (stepMs >= 1000) {
    const s = ms / 1000;
    return Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`;
  }
  if (stepMs >= 100) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

function findSnapTarget(edgeMs: number, targets: number[], thresholdMs: number): number | null {
  let closest: number | null = null;
  let closestDist = Infinity;
  for (const t of targets) {
    const dist = Math.abs(edgeMs - t);
    if (dist <= thresholdMs && dist < closestDist) {
      closest = t;
      closestDist = dist;
    }
  }
  return closest;
}

function layerDisplayName(node: SceneNode | undefined): string {
  if (!node) return 'Layer';
  return node.name?.trim() || nodeLabel(node);
}

function nodeLabel(node: SceneNode | undefined): string {
  if (!node) return 'Layer';
  switch (node.type) {
    case 'RECTANGLE': return 'Rectangle';
    case 'ELLIPSE': return 'Ellipse';
    case 'FRAME': return 'Frame';
    case 'SECTION': return 'Section';
    case 'TEXT': return 'Text';
    case 'LINE': return 'Line';
    case 'GROUP': return 'Group';
    case 'VECTOR': return 'Vector path';
    case 'POLYGON': return 'Polygon';
    case 'STAR': return 'Star';
    default: return 'Layer';
  }
}

function animationTypeLabel(type: AnimationType): string {
  switch (type) {
    case 'fade-in': return 'Fade in';
    case 'fade-out': return 'Fade out';
    case 'slide-in': return 'Slide in';
    case 'slide-out': return 'Slide out';
    case 'spin': return 'Spin';
    case 'translate-x': return 'Translate X';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'color': return 'Color';
    default: return type;
  }
}

const PLAYHEAD_COLOR = '#007BE5';

function PlayheadThumb() {
  return (
    <svg width={11} height={14} viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden>
      <path
        d="M5.5 0.5C8.2836 0.5 10.5 2.64831 10.5 5.25C10.5 5.86109 10.2728 6.67897 9.87305 7.59766C9.47811 8.50518 8.93474 9.46717 8.34766 10.3525C7.76031 11.2383 7.13776 12.0345 6.59082 12.6143C6.31668 12.9048 6.06917 13.1324 5.8623 13.2881C5.65778 13.4419 5.53976 13.4874 5.5 13.4971C5.46024 13.4874 5.34222 13.4419 5.1377 13.2881C4.93083 13.1324 4.68332 12.9048 4.40918 12.6143C3.86224 12.0345 3.23969 11.2383 2.65234 10.3525C2.06526 9.46717 1.52189 8.50518 1.12695 7.59766C0.727196 6.67897 0.5 5.86109 0.5 5.25C0.5 2.64831 2.7164 0.5 5.5 0.5Z"
        fill="white"
        stroke={PLAYHEAD_COLOR}
      />
    </svg>
  );
}

function PlayheadLine() {
  return (
    <div
      className="w-px flex-1 min-h-0 self-center"
      style={{ backgroundColor: PLAYHEAD_COLOR }}
      aria-hidden
    />
  );
}

// -- Clip bar --

function TimelineClipBar({
  anim,
  isSelected,
  isClipSelected,
  onSelect,
  clientXToMs,
  moveClipAndPush,
  updateAnimation: _updateAnimation,
  trackEndMs,
  visibleStartMs,
  visibleDurationMs,
  videoSrc,
  audioSrc,
  onDragStart,
  onDragEnd,
  allAnimations,
  trackAnimations,
  onSnapGuide,
  rulerGuidesMs,
}: {
  anim: import('../../contexts/AnimationStoreContext').TimelineAnimation;
  isSelected: boolean;
  isClipSelected: boolean;
  onSelect: () => void;
  clientXToMs: (clientX: number) => number;
  moveClipAndPush: (id: string, newStartMs: number, newDurationMs?: number) => void;
  updateAnimation: (id: string, patch: Partial<Pick<import('../../contexts/AnimationStoreContext').TimelineAnimation, 'startMs' | 'durationMs' | 'type' | 'easing'>>) => void;
  trackEndMs: number;
  visibleStartMs: number;
  visibleDurationMs: number;
  videoSrc?: string;
  audioSrc?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  allAnimations: import('../../contexts/AnimationStoreContext').TimelineAnimation[];
  trackAnimations: import('../../contexts/AnimationStoreContext').TimelineAnimation[];
  onSnapGuide: (ms: number | null) => void;
  rulerGuidesMs?: number[];
}) {
  const startMsRef = useRef(anim.startMs);
  const durationMsRef = useRef(anim.durationMs);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, kind: 'bar' | 'left' | 'right') => {
      e.stopPropagation();
      if (e.button !== 0) return;
      startMsRef.current = anim.startMs;
      durationMsRef.current = anim.durationMs;
      onDragStart?.();

      const dragCursor = kind === 'left' ? CURSORS.trimLeft : kind === 'right' ? CURSORS.trimRight : CURSORS.grabbing;
      const cursorOverride = document.createElement('style');
      cursorOverride.textContent = `* { cursor: ${dragCursor} !important; }`;
      document.head.appendChild(cursorOverride);

      const snapTargets: number[] = [0];
      for (const a of allAnimations) {
        if (a.id === anim.id) continue;
        snapTargets.push(a.startMs, a.startMs + a.durationMs);
      }
      if (rulerGuidesMs) snapTargets.push(...rulerGuidesMs);
      const barRef_el = barRef.current;
      const parentW = barRef_el?.parentElement?.clientWidth ?? 800;
      const thresholdMs = parentW > 0 ? (SNAP_THRESHOLD_PX / parentW) * visibleDurationMs : 0;

      const onMove = (e2: PointerEvent) => {
        const ms = clientXToMs(e2.clientX);
        let guideMs: number | null = null;

        if (kind === 'bar') {
          const dur = durationMsRef.current;
          let newStart = Math.max(0, Math.min(trackEndMs - dur, ms - dur / 2));
          const snapS = findSnapTarget(newStart, snapTargets, thresholdMs);
          const snapE = findSnapTarget(newStart + dur, snapTargets, thresholdMs);
          if (snapS !== null && (snapE === null || Math.abs(newStart - snapS) <= Math.abs(newStart + dur - (snapE ?? 0)))) {
            newStart = Math.max(0, Math.min(trackEndMs - dur, snapS));
            guideMs = snapS;
          } else if (snapE !== null) {
            newStart = Math.max(0, Math.min(trackEndMs - dur, snapE - dur));
            guideMs = snapE;
          }
          moveClipAndPush(anim.id, newStart);
        } else if (kind === 'left') {
          const clipEnd = startMsRef.current + durationMsRef.current;
          let newStart = Math.max(0, Math.min(clipEnd - MIN_CLIP_DURATION_MS, ms));
          const snap = findSnapTarget(newStart, snapTargets, thresholdMs);
          if (snap !== null) {
            newStart = Math.max(0, Math.min(clipEnd - MIN_CLIP_DURATION_MS, snap));
            guideMs = snap;
          }
          moveClipAndPush(anim.id, newStart, clipEnd - newStart);
        } else {
          let newEnd = Math.max(startMsRef.current + MIN_CLIP_DURATION_MS, Math.min(trackEndMs, ms));
          const snap = findSnapTarget(newEnd, snapTargets, thresholdMs);
          if (snap !== null) {
            newEnd = Math.max(startMsRef.current + MIN_CLIP_DURATION_MS, Math.min(trackEndMs, snap));
            guideMs = snap;
          }
          moveClipAndPush(anim.id, startMsRef.current, newEnd - startMsRef.current);
        }

        onSnapGuide(guideMs);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        cursorOverride.remove();
        onSnapGuide(null);
        onDragEnd?.();
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [anim.id, anim.startMs, anim.durationMs, clientXToMs, moveClipAndPush, trackEndMs, onDragStart, onDragEnd, allAnimations, visibleDurationMs, onSnapGuide, rulerGuidesMs],
  );

  const leftPercent = visibleDurationMs > 0 ? ((anim.startMs - visibleStartMs) / visibleDurationMs) * 100 : 0;
  const widthPercent = visibleDurationMs > 0 ? Math.max(2, (anim.durationMs / visibleDurationMs) * 100) : 2;
  const isColor = anim.type === 'color';
  const isVideo = anim.type === 'video';
  const isAudio = anim.type === 'audio';
  const MEDIA_INSET = 9;
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidthPx, setBarWidthPx] = useState(0);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBarWidthPx(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Video filmstrip
  const contentWidthPx_film = Math.max(0, barWidthPx - 2 * MEDIA_INSET);
  const maxDur = anim.maxDurationMs ?? anim.durationMs;
  const fullStripRatio = maxDur > 0 && anim.durationMs > 0 ? maxDur / anim.durationMs : 1;
  const fullStripWidthPx = contentWidthPx_film * fullStripRatio;
  const fullFrameCount = Math.max(6, Math.round(fullStripWidthPx / 30));
  const frames = useVideoFrames(
    isVideo ? videoSrc : undefined,
    fullFrameCount,
    0,
    undefined,
    undefined,
  );
  const stripOffsetPx = maxDur > 0 ? -(anim.offsetMs / maxDur) * fullStripWidthPx : 0;
  const framePxWidth = frames.length > 0 ? fullStripWidthPx / frames.length : 30;

  // Audio waveform
  const WAVEFORM_BAR_W = 1.5;
  const WAVEFORM_GAP = 1;
  const WAVEFORM_STEP = WAVEFORM_BAR_W + WAVEFORM_GAP;
  const fullWaveformWidthPx = fullStripWidthPx;
  const fullWaveformCount = fullWaveformWidthPx > 0 ? Math.max(10, Math.floor(fullWaveformWidthPx / WAVEFORM_STEP)) : 10;
  const waveform = useAudioWaveform(
    isAudio ? audioSrc : undefined,
    fullWaveformCount,
    0,
    undefined,
    undefined,
  );
  const hasFilmstrip = isVideo && frames.length > 0;
  const hasWaveform = isAudio && waveform.length > 0;
  const hasMedia = hasFilmstrip || hasWaveform || isColor;

  const hasOverlap = trackAnimations.some(
    (a) =>
      a.id !== anim.id &&
      anim.startMs < a.startMs + a.durationMs &&
      a.startMs < anim.startMs + anim.durationMs,
  );

  const barBg = isClipSelected
    ? '#0D99FF'
    : isSelected
      ? '#B9E1FF'
      : 'rgba(128, 128, 128, 0.2)';

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- nested interactive regions inside a <button> block pointer events; plain div with role="button" is required here
    <div
      ref={barRef}
      role="button"
      tabIndex={-1}
      className="absolute top-1/2 -translate-y-1/2 flex items-stretch rounded-md overflow-hidden outline-none"
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        minWidth: 40,
        height: BAR_HEIGHT_PX,
        backgroundColor: barBg,
        ...(hasOverlap ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)' } : {}),
      }}
      title={`${animationTypeLabel(anim.type)} (${anim.durationMs}ms). Press Delete to remove.`}
      onClick={(e) => { // eslint-disable-line react/forbid-dom-props -- see above
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Video filmstrip */}
      {hasFilmstrip && (
        <div
          className="absolute pointer-events-none overflow-hidden"
          style={{ zIndex: 0, left: MEDIA_INSET, right: MEDIA_INSET, top: 2, bottom: 2, borderRadius: 2 }}
        >
          <div
            className="absolute flex h-full"
            style={{ left: stripOffsetPx, width: fullStripWidthPx }}
          >
            {frames.map((dataUrl, i) => (
              <img
                key={i}
                src={dataUrl}
                alt=""
                className="h-full shrink-0 block"
                style={{ width: framePxWidth, objectFit: 'cover' }}
              />
            ))}
          </div>
        </div>
      )}
      {/* Audio waveform */}
      {hasWaveform && waveform.length > 0 && (
        <div
          className="absolute pointer-events-none overflow-hidden"
          style={{ zIndex: 0, left: MEDIA_INSET, right: MEDIA_INSET, top: 2, bottom: 2, borderRadius: 2 }}
        >
          <div
            className="absolute flex items-center justify-center h-full"
            style={{ left: stripOffsetPx, width: fullWaveformWidthPx, gap: WAVEFORM_GAP }}
          >
            {waveform.map((peak, i) => (
              <div
                key={i}
                style={{
                  width: WAVEFORM_BAR_W,
                  height: Math.max(2, peak * (BAR_HEIGHT_PX - 2)),
                  flexShrink: 0,
                  borderRadius: WAVEFORM_BAR_W,
                  backgroundColor: isClipSelected ? 'rgba(255,255,255,0.7)' : isSelected ? 'rgba(13,153,255,0.6)' : 'rgba(128,128,128,0.5)',
                }}
              />
            ))}
          </div>
        </div>
      )}
      {/* Color gradient */}
      {isColor && anim.colorFrom && anim.colorTo && (
        <div
          className="absolute pointer-events-none overflow-hidden"
          style={{ zIndex: 0, left: MEDIA_INSET, right: MEDIA_INSET, top: 2, bottom: 2, borderRadius: 2 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, rgb(${anim.colorFrom.r},${anim.colorFrom.g},${anim.colorFrom.b}), rgb(${anim.colorTo.r},${anim.colorTo.g},${anim.colorTo.b}))`,
            }}
          />
          {isClipSelected && (
            <div className="absolute inset-0 bg-border-selected/30" />
          )}
        </div>
      )}
      {/* Left resize handle */}
      <div
        role="button"
        tabIndex={0}
        className="relative flex-shrink-0 flex items-center justify-center rounded-l-md"
        style={{ zIndex: 1, width: hasMedia ? MEDIA_INSET : undefined, paddingLeft: hasMedia ? 0 : 4, paddingRight: hasMedia ? 0 : 8, cursor: CURSORS.trimLeft }}
        onPointerDown={(e) => handlePointerDown(e, 'left')}
      >
        <div
          className="shrink-0 rounded-sm"
          style={{
            width: 1,
            height: 8,
            backgroundColor: isClipSelected ? 'rgba(255,255,255,0.8)' : isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)',
          }}
          aria-hidden
        />
      </div>
      {/* Bar drag area */}
      <div
        role="button"
        tabIndex={-1}
        className="relative flex-1 min-w-0 rounded-md"
        style={{ zIndex: 1, cursor: CURSORS.grab }}
        onPointerDown={(e) => handlePointerDown(e, 'bar')}
      />
      {/* Right resize handle */}
      <div
        role="button"
        tabIndex={0}
        className="relative flex-shrink-0 flex items-center justify-center rounded-r-md"
        style={{ zIndex: 1, width: hasMedia ? MEDIA_INSET : undefined, paddingLeft: hasMedia ? 0 : 8, paddingRight: hasMedia ? 0 : 4, cursor: CURSORS.trimRight }}
        onPointerDown={(e) => handlePointerDown(e, 'right')}
      >
        <div
          className="shrink-0 rounded-sm"
          style={{
            width: 1,
            height: 8,
            backgroundColor: isClipSelected ? 'rgba(255,255,255,0.8)' : isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)',
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}

// -- Main TimelinePanel --

export interface TimelinePanelProps {
  expanded: boolean;
  onExpandCollapse: () => void;
}

const EXPAND_TRANSITION_MS = 300;

export function TimelinePanel({ expanded, onExpandCollapse }: TimelinePanelProps) {
  const { animations, selectedClipIds, setSelectedClipIds, updateAnimation, removeAnimation, moveClipAndPush, splitClipAt } = useAnimationStore();
  const kfStore = useKeyframeStore();
  const { currentMs, isPlaying, loop, speed, endMs, setCurrentMs, setIsPlaying, setLoop, cycleSpeed } = usePlayback();
  const [showBody, setShowBody] = useState(expanded);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | number>(0);
  useEffect(() => {
    clearTimeout(expandTimerRef.current);
    if (expanded) {
      setShowBody(true);
    } else {
      expandTimerRef.current = window.setTimeout(() => setShowBody(false), EXPAND_TRANSITION_MS);
    }
    return () => clearTimeout(expandTimerRef.current);
  }, [expanded]);
  const { store: commentsStore, threads: commentThreads, setSelectedThreadId, setInteraction } = useComments();
  const store = useSceneGraph();
  // Force re-render on structural scene graph changes so memos recompute
  const [sgRevision, setSgRevision] = useState(0);
  useEffect(() => {
    return store.addListener((event) => {
      if (event.type === 'create' || event.type === 'delete' || event.type === 'reparent') {
        setSgRevision((n) => n + 1);
      }
    });
  }, [store]);
  const { selectedIds, select: selectLayer } = useSelection();
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedKeyframes, setSelectedKeyframes] = useState<{ nodeId: string; prop: string; timeMs: number }[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [isNearPlayhead, setIsNearPlayhead] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [visibleMs, setVisibleMs] = useState<number | null>(null);
  const [scrollFraction, setScrollFraction] = useState(0);
  const [frozenEndMs, setFrozenEndMs] = useState<number | null>(null);
  const [snapGuideMs, setSnapGuideMs] = useState<number | null>(null);
  /** Ruler guide lines — vertical guides added by Shift+click on the ruler. */
  const [rulerGuidesMs, setRulerGuidesMs] = useState<number[]>([]);
  const [isRulerHovered, setIsRulerHovered] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const [isOverExistingGuide, setIsOverExistingGuide] = useState(false);
  const [draggingGuideIdx, setDraggingGuideIdx] = useState<number | null>(null);
  const [rulerCursorMs, setRulerCursorMs] = useState<number | null>(null);
  const [trackCursorMs, setTrackCursorMs] = useState<number | null>(null);
  /** Marquee selection rectangle (local coords relative to track strip). */
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const marqueeActiveRef = useRef(false);
  const rulerStripRef = useRef<HTMLDivElement>(null);
  /** Track last pointer-down time for manual double-click detection on the ruler. */
  const rulerLastClickRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setIsShiftHeld(e.shiftKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  const layoutEndMs = frozenEndMs ?? endMs;
  const rawVisibleDurationMs = visibleMs !== null ? visibleMs : (layoutEndMs > 0 ? layoutEndMs : 0);
  const timelineZoom = rawVisibleDurationMs > 0 ? layoutEndMs / rawVisibleDurationMs : 1;
  const maxScrollMs = Math.max(0, layoutEndMs - rawVisibleDurationMs);
  const rawVisibleStartMs = scrollFraction * maxScrollMs;
  const padMs = rawVisibleDurationMs * TIMELINE_PAD_FRAC;
  const visibleStartMs = rawVisibleStartMs - padMs;
  const visibleDurationMs = rawVisibleDurationMs + 2 * padMs;
  const visibleEndMs = visibleStartMs + visibleDurationMs;

  const { marks: rulerMarks, ticks: rulerTicks } = useMemo(
    () => computeRulerMarks(visibleStartMs, visibleEndMs, visibleDurationMs, layoutEndMs),
    [visibleStartMs, visibleEndMs, visibleDurationMs, layoutEndMs],
  );

  /** Comment threads with a timestamp in the visible range -- show mini pins on the ruler */
  const visibleCommentPins = useMemo(() => {
    if (visibleDurationMs <= 0) return [];
    return commentThreads.filter(
      (t) =>
        t.anchor.timestampMs != null &&
        t.anchor.timestampMs >= visibleStartMs &&
        t.anchor.timestampMs <= visibleEndMs,
    );
  }, [commentThreads, visibleStartMs, visibleEndMs, visibleDurationMs]);

  /** Comment pins for collapsed strip: all threads with timestamp in [0, layoutEndMs] */
  const collapsedCommentPins = useMemo(() => {
    if (layoutEndMs <= 0) return [];
    return commentThreads.filter(
      (t) =>
        t.anchor.timestampMs != null &&
        t.anchor.timestampMs >= 0 &&
        t.anchor.timestampMs <= layoutEndMs,
    );
  }, [commentThreads, layoutEndMs]);

  /** Group threads by time bucket for combined pins (avatar + count) */
  const groupCommentThreads = useCallback((threads: CommentThread[]): { timestampMs: number; threads: CommentThread[] }[] => {
    if (threads.length === 0) return [];
    const sorted = [...threads].sort((a, b) => (a.anchor.timestampMs ?? 0) - (b.anchor.timestampMs ?? 0));
    const groups: { timestampMs: number; threads: CommentThread[] }[] = [];
    let current: CommentThread[] = [sorted[0]];
    let bucket = Math.floor((sorted[0].anchor.timestampMs ?? 0) / COMMENT_PIN_BUCKET_MS) * COMMENT_PIN_BUCKET_MS;
    for (let i = 1; i < sorted.length; i++) {
      const t = sorted[i];
      const ts = t.anchor.timestampMs ?? 0;
      const b = Math.floor(ts / COMMENT_PIN_BUCKET_MS) * COMMENT_PIN_BUCKET_MS;
      if (b === bucket) {
        current.push(t);
      } else {
        groups.push({ timestampMs: current[0].anchor.timestampMs!, threads: current });
        current = [t];
        bucket = b;
      }
    }
    groups.push({ timestampMs: current[0].anchor.timestampMs!, threads: current });
    return groups;
  }, []);

  const groupedVisibleCommentPins = useMemo(
    () => groupCommentThreads(visibleCommentPins),
    [groupCommentThreads, visibleCommentPins],
  );
  const groupedCollapsedCommentPins = useMemo(
    () => groupCommentThreads(collapsedCommentPins),
    [groupCommentThreads, collapsedCommentPins],
  );

  const activeFrameId = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const id = selectedIds.values().next().value as number;
    const node = store.getNode(id);
    if (!node) return null;
    if (node.type === 'FRAME' && node.parentId === null) return node.id;
    const ancestors = store.getAncestors(id);
    for (const a of ancestors) {
      if (a.type === 'FRAME' && a.parentId === null) return a.id;
    }
    if (node.type === 'FRAME') return node.id;
    for (const a of ancestors) {
      if (a.type === 'FRAME') return a.id;
    }
    return null;
  }, [selectedIds, store]);

  const [stickyFrameId, setStickyFrameId] = useState<number | null>(null);
  useEffect(() => {
    if (activeFrameId != null) setStickyFrameId(activeFrameId);
  }, [activeFrameId]);

  const effectiveFrameId = activeFrameId ?? stickyFrameId;

  const frameDescendantIds = useMemo(() => {
    if (effectiveFrameId == null) return null;
    const descendants = store.getDescendants(effectiveFrameId);
    const ids = new Set(descendants.map((d) => String(d.id)));
    ids.add(String(effectiveFrameId));
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sgRevision forces recompute on create/delete/reparent
  }, [effectiveFrameId, store, sgRevision]);

  const frameAnimations = useMemo(() => {
    if (!frameDescendantIds) return animations;
    return animations.filter((a) => frameDescendantIds.has(a.nodeId));
  }, [animations, frameDescendantIds]);

  const layers = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const a of frameAnimations) {
      if (!seen.has(a.nodeId)) {
        seen.add(a.nodeId);
        order.push(a.nodeId);
      }
    }
    // Include nodes that have keyframes but no animation clips
    for (const [nodeId] of kfStore.keyframes) {
      if (!seen.has(nodeId) && (!frameDescendantIds || frameDescendantIds.has(nodeId))) {
        const nodeKfMap = kfStore.getNodeKeyframes(nodeId);
        for (const kfs of nodeKfMap.values()) {
          if (kfs.length > 0) {
            seen.add(nodeId);
            order.push(nodeId);
            break;
          }
        }
      }
    }
    return order;
  }, [frameAnimations, kfStore, frameDescendantIds]);

  /** Row content map for marquee selection hit testing. */
  const rowContentMap = useMemo((): RowContent[] => {
    const list: RowContent[] = [];
    for (const nodeId of layers) {
      const nodeAnims = frameAnimations.filter((a) => a.nodeId === nodeId);
      const isCollapsed = collapsedNodes.has(nodeId);
      list.push({ type: 'layer-header', nodeId, anims: nodeAnims });
      if (!isCollapsed) {
        for (const anim of nodeAnims) {
          list.push({ type: 'clip', nodeId, anim });
        }
        const nodeKfMap = kfStore.getNodeKeyframes(nodeId);
        for (const [prop, kfs] of nodeKfMap.entries()) {
          if (kfs.length > 0) {
            list.push({ type: 'keyframe-prop', nodeId, prop, kfs });
          }
        }
      }
    }
    return list;
  }, [layers, frameAnimations, collapsedNodes, kfStore]);

  const timelineFrameName = useMemo(() => {
    if (effectiveFrameId == null) return 'Timeline';
    const frame = store.getNode(effectiveFrameId);
    return frame?.name || 'Frame';
  }, [effectiveFrameId, store]);

  useEffect(() => {
    if (selectedIds.size === 1) {
      const id = String(selectedIds.values().next().value);
      if (layers.includes(id)) setSelectedLayerId(id);
    }
  }, [selectedIds, layers]);

  const zoomAroundMs = useCallback((newZoom: number, anchorMs: number) => {
    const clamped = Math.min(MAX_TIMELINE_ZOOM, Math.max(MIN_TIMELINE_ZOOM, newZoom));
    const base = frozenEndMs ?? endMs;
    const nextVisDur = base / clamped;
    if (clamped <= MIN_TIMELINE_ZOOM) {
      setVisibleMs(null);
      setScrollFraction(0);
      return;
    }
    setVisibleMs(nextVisDur);
    const nextMaxScroll = Math.max(0, base - nextVisDur);
    if (nextMaxScroll <= 0) { setScrollFraction(0); return; }
    const desiredStart = anchorMs - nextVisDur / 2;
    setScrollFraction(Math.max(0, Math.min(1, desiredStart / nextMaxScroll)));
  }, [endMs, frozenEndMs]);

  const zoomIn = useCallback(() => zoomAroundMs(timelineZoom * 1.5, currentMs), [timelineZoom, currentMs, zoomAroundMs]);
  const zoomOut = useCallback(() => zoomAroundMs(timelineZoom / 1.5, currentMs), [timelineZoom, currentMs, zoomAroundMs]);

  const handleClipDragStart = useCallback(() => {
    setFrozenEndMs(endMs);
    setVisibleMs(prev => prev ?? endMs);
  }, [endMs]);
  const handleClipDragEnd = useCallback(() => setFrozenEndMs(null), []);

  /** When dragging a comment pin group: thread ids and current drag position (ms) */
  const [draggingCommentGroup, setDraggingCommentGroup] = useState<{ threadIds: string[]; dragMs: number } | null>(null);
  const commentPinDidDragRef = useRef(false);

  const handleTimelineCommentPinClick = useCallback(
    (threadId: string, timestampMs: number) => {
      setCurrentMs(timestampMs);
      setSelectedThreadId(threadId);
      setInteraction({ type: 'viewing', threadId });
    },
    [setCurrentMs, setSelectedThreadId, setInteraction],
  );

  const handleCommentPinPointerDown = useCallback(
    (e: React.PointerEvent, threadIds: string[], pinMs: number, clientXToMsFn: (x: number) => number) => {
      if (e.button !== 0) return;
      e.preventDefault();
      commentPinDidDragRef.current = false;
      setDraggingCommentGroup({ threadIds, dragMs: pinMs });
      const onMove = (e2: PointerEvent) => {
        commentPinDidDragRef.current = true;
        setDraggingCommentGroup((prev) => (prev ? { ...prev, dragMs: clientXToMsFn(e2.clientX) } : null));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setDraggingCommentGroup((prev) => {
          if (!prev) return null;
          const clamped = Math.max(0, Math.min(layoutEndMs, prev.dragMs));
          prev.threadIds.forEach((id) => commentsStore.updateAnchor(id, { timestampMs: clamped }));
          return null;
        });
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [layoutEndMs, commentsStore],
  );

  const handleCommentPinClick = useCallback(
    (threadId: string, ts: number) => {
      if (commentPinDidDragRef.current) return;
      handleTimelineCommentPinClick(threadId, ts);
    },
    [handleTimelineCommentPinClick],
  );

  const trackStripRef = useRef<HTMLDivElement | null>(null);
  const collapsedStripRef = useRef<HTMLDivElement>(null);
  const wheelCleanupRef = useRef<(() => void) | null>(null);
  const playheadPercent = visibleDurationMs > 0 ? ((currentMs - visibleStartMs) / visibleDurationMs) * 100 : 0;

  const clientXToMsCollapsed = useCallback(
    (clientX: number) => {
      const el = collapsedStripRef.current;
      if (!el || layoutEndMs <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const cPad = layoutEndMs * TIMELINE_PAD_FRAC;
      const cTotal = layoutEndMs + 2 * cPad;
      const fraction = (clientX - rect.left) / rect.width;
      const ms = fraction * cTotal - cPad;
      return Math.max(0, Math.min(layoutEndMs, ms));
    },
    [layoutEndMs],
  );

  const handleCollapsedStripPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (layoutEndMs <= 0) return;
      e.preventDefault();
      setCurrentMs(clientXToMsCollapsed(e.clientX));
      const onMove = (e2: PointerEvent) => setCurrentMs(clientXToMsCollapsed(e2.clientX));
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [layoutEndMs, setCurrentMs, clientXToMsCollapsed],
  );

  const wheelStateRef = useRef({ rawVisibleStartMs, rawVisibleDurationMs, padMs, timelineZoom, maxScrollMs });
  wheelStateRef.current = { rawVisibleStartMs, rawVisibleDurationMs, padMs, timelineZoom, maxScrollMs };
  const zoomAroundMsRef = useRef(zoomAroundMs);
  zoomAroundMsRef.current = zoomAroundMs;
  const keydownStateRef = useRef({ currentMs, endMs, setCurrentMs });
  keydownStateRef.current = { currentMs, endMs, setCurrentMs };

  const attachWheelListener = useCallback((el: HTMLDivElement | null) => {
    if (wheelCleanupRef.current) {
      wheelCleanupRef.current();
      wheelCleanupRef.current = null;
    }
    trackStripRef.current = el;
    if (!el) return;

    const wheelHandler = (e: WheelEvent) => {
      const { rawVisibleStartMs: rawVs, rawVisibleDurationMs: rawVd, padMs: pm, timelineZoom: z, maxScrollMs: ms } = wheelStateRef.current;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const pointerFrac = (e.clientX - rect.left) / rect.width;
        const anchorMs = (rawVs - pm) + pointerFrac * (rawVd + pm);
        const delta = -e.deltaY * TIMELINE_ZOOM_FACTOR;
        zoomAroundMsRef.current(z * Math.exp(delta), anchorMs);
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal scroll: pan the timeline
        e.preventDefault();
        if (ms <= 0) return;
        const rect = el.getBoundingClientRect();
        const deltaMs = (e.deltaX / rect.width) * rawVd;
        const newStart = rawVs + deltaMs;
        setScrollFraction(Math.max(0, Math.min(1, newStart / ms)));
      } else {
        // Vertical scroll: forward to the parent scroll container
        const scrollParent = el.closest('[data-timeline-scroll]');
        if (scrollParent) {
          scrollParent.scrollTop += e.deltaY;
          e.preventDefault();
        }
      }
    };

    const keydownHandler = (e: KeyboardEvent) => {
      const { currentMs: cur, endMs: end, setCurrentMs: setCur } = keydownStateRef.current;
      const step = e.shiftKey ? 200 : 50;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCur(Math.max(0, cur - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCur(Math.min(end, cur + step));
      }
    };

    el.addEventListener('wheel', wheelHandler, { passive: false });
    el.addEventListener('keydown', keydownHandler);
    wheelCleanupRef.current = () => {
      el.removeEventListener('wheel', wheelHandler);
      el.removeEventListener('keydown', keydownHandler);
    };
  }, []);

  const emptySegments = useMemo((): { startMs: number; endMs: number }[] => {
    if (visibleDurationMs <= 0 || visibleEndMs <= layoutEndMs) return [];
    const segStart = Math.max(layoutEndMs, visibleStartMs);
    const segEnd = visibleEndMs;
    if (segStart >= segEnd) return [];
    return [{ startMs: segStart, endMs: segEnd }];
  }, [layoutEndMs, visibleStartMs, visibleEndMs, visibleDurationMs]);

  const clientXToMs = useCallback((clientX: number): number => {
    const el = trackStripRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const t = visibleStartMs + (x / rect.width) * visibleDurationMs;
    return Math.max(0, Math.min(layoutEndMs, t));
  }, [visibleStartMs, visibleDurationMs, layoutEndMs]);

  /** Convert client X to ms using the header ruler strip. */
  const clientXToMsRuler = useCallback(
    (clientX: number): number => {
      const el = rulerStripRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const t = visibleStartMs + (x / rect.width) * visibleDurationMs;
      return Math.max(0, Math.min(layoutEndMs, t));
    },
    [visibleStartMs, visibleDurationMs, layoutEndMs],
  );

  /** Snap targets for ruler guides: ruler marks, ticks, other guides, clip edges, keyframes. */
  const rulerGuideSnapTargets = useMemo(() => {
    const targets = [...rulerMarks.map((m) => m.ms), ...rulerTicks, ...rulerGuidesMs];
    for (const a of frameAnimations) {
      targets.push(a.startMs, a.startMs + a.durationMs);
    }
    for (const nodeId of layers) {
      const nodeKfMap = kfStore.getNodeKeyframes(nodeId);
      for (const [, kfs] of nodeKfMap.entries()) {
        for (const kf of kfs) targets.push(kf.timeMs);
      }
    }
    return targets;
  }, [rulerMarks, rulerTicks, rulerGuidesMs, frameAnimations, layers, kfStore]);

  const snapToRulerTick = useCallback(
    (ms: number): number => {
      const el = rulerStripRef.current;
      if (!el) return ms;
      const w = el.clientWidth;
      const thresholdMs = w > 0 ? (SNAP_THRESHOLD_PX / w) * visibleDurationMs : 0;
      return findSnapTarget(ms, rulerGuideSnapTargets, thresholdMs) ?? ms;
    },
    [visibleDurationMs, rulerGuideSnapTargets],
  );

  const findNearestGuideIdx = useCallback(
    (clientX: number): number | null => {
      if (rulerGuidesMs.length === 0) return null;
      const el = rulerStripRef.current;
      if (!el) return null;
      const w = el.clientWidth;
      const thresholdMs = w > 0 ? (SNAP_THRESHOLD_PX * 2 / w) * visibleDurationMs : 0;
      const ms = clientXToMsRuler(clientX);
      let bestIdx: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < rulerGuidesMs.length; i++) {
        const d = Math.abs(rulerGuidesMs[i] - ms);
        if (d < thresholdMs && d < bestDist) { bestIdx = i; bestDist = d; }
      }
      return bestIdx;
    },
    [rulerGuidesMs, visibleDurationMs, clientXToMsRuler],
  );

  /** Handle pointer down on the ruler to create/drag guides. Double-click removes the nearest guide. */
  const handleRulerGuidePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      e.stopPropagation();
      const rawMs = clientXToMsRuler(e.clientX);

      // Manual double-click detection (removes nearest guide)
      const now = Date.now();
      const last = rulerLastClickRef.current;
      if (now - last.time < 400 && Math.abs(e.clientX - last.x) < 10) {
        rulerLastClickRef.current = { time: 0, x: 0 };
        const clickMs = rawMs;
        setRulerGuidesMs((prev) => {
          if (prev.length === 0) return prev;
          let closestIdx = 0;
          let closestDist = Math.abs(prev[0] - clickMs);
          for (let i = 1; i < prev.length; i++) {
            const d = Math.abs(prev[i] - clickMs);
            if (d < closestDist) { closestIdx = i; closestDist = d; }
          }
          return prev.filter((_, i) => i !== closestIdx);
        });
        return;
      }
      rulerLastClickRef.current = { time: now, x: e.clientX };

      const existingIdx = findNearestGuideIdx(e.clientX);
      const isMoving = existingIdx !== null;
      if (!isMoving && !e.shiftKey) return;
      const idx = isMoving ? existingIdx : rulerGuidesMs.length;
      if (!isMoving) {
        const ms = snapToRulerTick(rawMs);
        if (ms <= 0) return;
        setRulerGuidesMs((prev) => [...prev, ms]);
      }

      const cursorOverride = document.createElement('style');
      const deletionZone = visibleDurationMs * 0.02;
      const updateCursor = (ms: number) => {
        const inDeleteZone = isMoving && (ms <= deletionZone || ms >= visibleEndMs - deletionZone);
        cursorOverride.textContent = `* { cursor: ${inDeleteZone ? 'not-allowed' : CURSORS.resizeH} !important; }`;
      };
      const guideMs = isMoving ? rulerGuidesMs[idx] : snapToRulerTick(rawMs);
      updateCursor(guideMs);
      document.head.appendChild(cursorOverride);
      setDraggingGuideIdx(idx);
      const onMove = (e2: PointerEvent) => {
        const snapped = snapToRulerTick(clientXToMsRuler(e2.clientX));
        setRulerGuidesMs((prev) => prev.map((g, i) => (i === idx ? snapped : g)));
        updateCursor(snapped);
      };
      const onUp = (e2: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        cursorOverride.remove();
        setDraggingGuideIdx(null);
        const finalMs = snapToRulerTick(clientXToMsRuler(e2.clientX));
        if (isMoving && (finalMs <= deletionZone || finalMs >= visibleEndMs - deletionZone)) {
          setRulerGuidesMs((prev) => prev.filter((_, i) => i !== idx));
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [clientXToMsRuler, snapToRulerTick, findNearestGuideIdx, rulerGuidesMs, visibleEndMs, visibleDurationMs],
  );

  const handleRulerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      setIsOverExistingGuide(findNearestGuideIdx(e.clientX) !== null);
      setRulerCursorMs(clientXToMsRuler(e.clientX));
    },
    [findNearestGuideIdx, clientXToMsRuler],
  );

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      // Alt+click clip splitting: if Alt is held, try to split the clip under the playhead
      if (e.altKey) {
        const cutMs = clientXToMs(e.clientX);
        for (const a of frameAnimations) {
          if ((a.type === 'video' || a.type === 'audio') && cutMs > a.startMs && cutMs < a.startMs + a.durationMs) {
            splitClipAt(a.id, cutMs);
            setSelectedClipIds(new Set());
            return;
          }
        }
      }

      setSelectedClipIds(new Set());

      // Shift+click on empty area adds a ruler guide
      if (e.shiftKey && !isNearPlayhead) {
        const ms = snapToRulerTick(clientXToMs(e.clientX));
        if (ms > 0) {
          setRulerGuidesMs((prev) => [...prev, ms]);
        }
        return;
      }

      const el = trackStripRef.current;
      if (el && isNearPlayhead) {
        // Drag playhead
        setSelectedKeyframes([]);
        setIsDragging(true);
        setIsPlaying(false);
        setCurrentMs(snapToRulerTick(clientXToMs(e.clientX)));
        const playheadCursorOverride = document.createElement('style');
        playheadCursorOverride.textContent = `* { cursor: ${CURSORS.resizeH} !important; }`;
        document.head.appendChild(playheadCursorOverride);
        const onMove = (e2: PointerEvent) => setCurrentMs(snapToRulerTick(clientXToMs(e2.clientX)));
        const onUp = () => {
          setIsDragging(false);
          playheadCursorOverride.remove();
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      } else {
        // Marquee selection: start drag rect
        if (!e.shiftKey) {
          setSelectedKeyframes([]);
        }
        const rect = el?.getBoundingClientRect();
        if (rect) {
          const localX = e.clientX - rect.left;
          const localY = e.clientY - rect.top;
          setMarquee({ startX: localX, startY: localY, currentX: localX, currentY: localY });
          marqueeActiveRef.current = true;
          (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
        }
      }
    },
    [clientXToMs, setSelectedClipIds, setIsPlaying, setCurrentMs, isNearPlayhead, snapToRulerTick, frameAnimations, splitClipAt],
  );

  const handleTrackPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = trackStripRef.current;
      if (!el) return;

      // During marquee drag, update the rectangle
      if (marqueeActiveRef.current) {
        const rect = el.getBoundingClientRect();
        setMarquee((prev) => prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : prev);
        return;
      }

      const rect = el.getBoundingClientRect();
      setTrackCursorMs(clientXToMs(e.clientX));
      const playheadX = rect.left + (playheadPercent / 100) * rect.width;
      const near = Math.abs(e.clientX - playheadX) <= PLAYHEAD_HIT_PX;
      setIsNearPlayhead(near);
    },
    [clientXToMs, playheadPercent],
  );

  /** Handle pointer up to finalize marquee selection. */
  const handleTrackPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!marqueeActiveRef.current) return;
      marqueeActiveRef.current = false;
      const el = trackStripRef.current;
      const m = marquee;
      setMarquee(null);
      if (!el || !m) return;

      const dx = Math.abs(m.currentX - m.startX);
      const dy = Math.abs(m.currentY - m.startY);
      // If the drag was tiny, treat it as a click to scrub the playhead
      if (dx < 3 && dy < 3) {
        setCurrentMs(snapToRulerTick(clientXToMs(e.clientX)));
        return;
      }

      const rect = el.getBoundingClientRect();
      const minX = Math.min(m.startX, m.currentX);
      const maxX = Math.max(m.startX, m.currentX);
      const minY = Math.min(m.startY, m.currentY);
      const maxY = Math.max(m.startY, m.currentY);

      const minMs = visibleStartMs + (minX / rect.width) * visibleDurationMs;
      const maxMs = visibleStartMs + (maxX / rect.width) * visibleDurationMs;

      const minRow = Math.floor(minY / ROW_HEIGHT_PX);
      const maxRow = Math.floor(maxY / ROW_HEIGHT_PX);

      const newKeyframes: { nodeId: string; prop: string; timeMs: number }[] = [];
      const newClipIds: string[] = [];

      for (let r = Math.max(0, minRow); r <= Math.min(maxRow, rowContentMap.length - 1); r++) {
        const row = rowContentMap[r];
        if (row.type === 'layer-header') {
          for (const anim of row.anims) {
            if (anim.startMs + anim.durationMs >= minMs && anim.startMs <= maxMs) {
              newClipIds.push(anim.id);
            }
          }
        } else if (row.type === 'clip') {
          if (row.anim.startMs + row.anim.durationMs >= minMs && row.anim.startMs <= maxMs) {
            newClipIds.push(row.anim.id);
          }
        } else if (row.type === 'keyframe-prop') {
          for (const kf of row.kfs) {
            if (kf.timeMs >= minMs && kf.timeMs <= maxMs) {
              newKeyframes.push({ nodeId: row.nodeId, prop: row.prop, timeMs: kf.timeMs });
            }
          }
        }
      }

      if (e.shiftKey) {
        setSelectedKeyframes((prev) => {
          const merged = [...prev];
          for (const nk of newKeyframes) {
            if (!merged.some((sk) => sk.nodeId === nk.nodeId && sk.prop === nk.prop && sk.timeMs === nk.timeMs)) {
              merged.push(nk);
            }
          }
          return merged;
        });
        const mergedClips = new Set(selectedClipIds);
        for (const id of newClipIds) mergedClips.add(id);
        setSelectedClipIds(mergedClips);
      } else {
        setSelectedKeyframes(newKeyframes);
        setSelectedClipIds(new Set(newClipIds));
      }
    },
    [marquee, visibleStartMs, visibleDurationMs, rowContentMap, setSelectedClipIds, clientXToMs, setCurrentMs, snapToRulerTick, selectedClipIds],
  );

  const handleTrackPointerLeave = useCallback(() => {
    setIsNearPlayhead(false);
    setTrackCursorMs(null);
  }, []);

  const handlePlay = useCallback(() => {
    if (currentMs >= endMs) setCurrentMs(0);
    setIsPlaying((p: boolean) => !p);
  }, [currentMs, endMs, setCurrentMs, setIsPlaying]);

  const handleLoop = useCallback(() => setLoop((l: boolean) => !l), [setLoop]);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  useAction('timeline.toggle-play', handlePlay);
  useAction('timeline.zoom-in', zoomIn);
  useAction('timeline.zoom-out', zoomOut);

  const handleDeleteClip = useCallback(() => {
    if (selectedClipIds.size === 0) return;
    for (const id of selectedClipIds) {
      removeAnimation(id);
    }
    setSelectedClipIds(new Set());
  }, [selectedClipIds, removeAnimation, setSelectedClipIds]);

  useAction('delete', handleDeleteClip);

  return (
    <div
      className="w-full h-full flex flex-col shrink-0 bg-bg border-t border-border pointer-events-auto overflow-hidden select-none"
    >
      {/* Timeline header */}
      <header className={clsx('shrink-0 border-b border-border', !expanded && 'border-b-0')}>
        {/* Top row: play, record, time; collapsed mini playhead strip; expand/collapse */}
        <div className="flex items-center" style={{ height: HEADER_TOP_HEIGHT, paddingLeft: 10, paddingRight: 10 }}>
          <div className="flex items-center gap-2 shrink-0">
            <IconButton aria-label={isPlaying ? 'Pause' : 'Play'} size="md" onClick={handlePlay}>
              {isPlaying ? <Icon24Pause /> : <Icon24Play />}
            </IconButton>
            <IconButton
              aria-label="Toggle auto-keyframe"
              aria-pressed={kfStore.autoKeyframeActive}
              size="md"
              onClick={() => kfStore.setAutoKeyframeActive((prev: boolean) => !prev)}
            >
              <span style={kfStore.autoKeyframeActive ? { color: '#DC3412' } : undefined}>
                <Icon24AutoKeyframe active={kfStore.autoKeyframeActive} />
              </span>
            </IconButton>
            <TimelineTimeInput
              currentMs={currentMs}
              endMs={endMs}
              onCurrentMsChange={setCurrentMs}
              loop={loop}
              onLoopClick={handleLoop}
            />
            <ButtonPrimitive
              type="button"
              className="-ml-1 h-6 rounded flex items-center justify-center cursor-pointer border-0 text-bodyMd tabular-nums"
              style={{
                fontWeight: 500,
                color: speed === 1 ? 'var(--color-text-tertiary, rgba(0,0,0,0.4))' : 'var(--color-text-brand, #0d99ff)',
                minWidth: 32,
                paddingLeft: 6,
                paddingRight: 6,
              }}
              onClick={cycleSpeed}
              aria-label={`Playback speed: ${speed}x`}
              data-tooltip={`Playback speed: ${speed}x`}
              data-tooltip-type="text"
            >
              {speed}x
            </ButtonPrimitive>
          </div>
          {layoutEndMs > 0 && (() => {
            const cPad = layoutEndMs * TIMELINE_PAD_FRAC;
            const cTotal = layoutEndMs + 2 * cPad;
            const cLeft = (ms: number) => ((ms + cPad) / cTotal) * 100;
            return (
              <div
                ref={collapsedStripRef}
                className="flex-1 min-w-0 mx-2 relative flex items-center self-stretch cursor-default"
                style={{
                  opacity: expanded ? 0 : 1,
                  pointerEvents: expanded ? 'none' : 'auto',
                }}
                onPointerDown={handleCollapsedStripPointerDown}
                role="slider"
                aria-label="Scrub playhead"
                aria-valuemin={0}
                aria-valuemax={layoutEndMs}
                aria-valuenow={Math.round(currentMs)}
              >
                <div
                  className="absolute inset-y-0 left-1 right-1 rounded-sm bg-bg"
                  aria-hidden
                />
                <div
                  className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center"
                  style={{
                    left: `${cLeft(currentMs)}%`,
                    transform: 'translateX(-5.5px)',
                    width: 11,
                    zIndex: 10,
                  }}
                  aria-hidden
                >
                  <div className="sticky top-0"><PlayheadThumb /></div>
                  <PlayheadLine />
                </div>
                {groupedCollapsedCommentPins.map((group) => {
                  const ts = group.timestampMs;
                  const isDraggingPin = draggingCommentGroup?.threadIds.includes(group.threads[0].id);
                  const displayMs = isDraggingPin && draggingCommentGroup ? draggingCommentGroup.dragMs : ts;
                  const leftPercent = cLeft(displayMs);
                  const threadIds = group.threads.map((t) => t.id);
                  const first = group.threads[0];
                  const firstComment = first?.comments[0];
                  const isMultiComment = group.threads.length >= 2 || (first && first.comments.length > 1);
                  return (
                    <ButtonPrimitive
                      key={group.threads.map((t) => t.id).join(',')}
                      type="button"
                      className="absolute top-1/2 flex -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing items-center justify-center gap-1 rounded-full border border-border bg-bg shadow-100 hover:scale-110"
                      style={{
                        left: `${leftPercent}%`,
                        zIndex: 20,
                        ...(isMultiComment ? COMMENT_PIN_STYLE_MULTI : COMMENT_PIN_STYLE_SINGLE),
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handleCommentPinPointerDown(e, threadIds, ts, clientXToMsCollapsed);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCommentPinClick(first.id, ts);
                      }}
                      aria-label={
                        group.threads.length === 1
                          ? `Comment at ${Math.round(ts / 1000)}s`
                          : `${group.threads.length} comments at ${Math.round(ts / 1000)}s`
                      }
                    >
                      {firstComment && (
                        <>
                          <Avatar
                            size="sm"
                            initial={firstComment.authorInitial}
                            src={firstComment.avatarUrl}
                            color={firstComment.color}
                            alt={firstComment.authorName}
                          />
                          {group.threads.length === 1 && first.comments.length > 1 && (
                            <span className="text-bodySm text-text-secondary leading-none">+{first.comments.length - 1}</span>
                          )}
                          {group.threads.length >= 2 && (
                            <>
                              {group.threads[1]?.comments[0] && (
                                <Avatar
                                  size="sm"
                                  initial={group.threads[1].comments[0].authorInitial}
                                  src={group.threads[1].comments[0].avatarUrl}
                                  color={group.threads[1].comments[0].color}
                                  alt={group.threads[1].comments[0].authorName}
                                />
                              )}
                              {group.threads.length > 2 && (
                                <span className="text-bodySm text-text-secondary leading-none -ml-1">+{group.threads.length - 2}</span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </ButtonPrimitive>
                  );
                })}
              </div>
            );
          })()}
          <div className="shrink-0 ml-auto">
            <IconButton
              aria-label={expanded ? 'Collapse timeline' : 'Expand timeline'}
              size="md"
              onClick={onExpandCollapse}
            >
              <Icon24ChevronDownLarge className={clsx(!expanded && 'rotate-180')} />
            </IconButton>
          </div>
        </div>
        {/* Bottom row: "Timeline" left, ruler numbers right (with guide support) */}
        {showBody && (
          <div className="flex items-center" style={{ height: HEADER_BOTTOM_HEIGHT }}>
            <div
              className="shrink-0 flex items-center pl-3 pr-2 border-r border-border text-bodyMd text-text-tertiary truncate"
              style={{ width: TREE_WIDTH_PX }}
            >
              {timelineFrameName}
            </div>
            <div
              ref={rulerStripRef}
              className="flex-1 relative min-w-0 overflow-hidden"
              style={{
                height: HEADER_BOTTOM_HEIGHT,
                cursor: isOverExistingGuide ? CURSORS.resizeH : isShiftHeld && !(rulerCursorMs !== null && rulerCursorMs <= 0) ? 'crosshair' : undefined,
              }}
              onPointerDown={handleRulerGuidePointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerEnter={() => setIsRulerHovered(true)}
              onPointerLeave={() => { setIsRulerHovered(false); setIsOverExistingGuide(false); setRulerCursorMs(null); }}
            >
              {rulerTicks.map((ms) => (
                <div
                  key={`t${ms}`}
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: visibleDurationMs > 0 ? `${((ms - visibleStartMs) / visibleDurationMs) * 100}%` : 0,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 3,
                    height: 3,
                    backgroundColor: 'var(--color-border)',
                  }}
                />
              ))}
              {rulerMarks.map(({ ms, label }) => (
                <span
                  key={ms}
                  className="absolute text-bodyMd text-text-tertiary tabular-nums whitespace-nowrap pointer-events-none"
                  style={{
                    left: visibleDurationMs > 0 ? `${((ms - visibleStartMs) / visibleDurationMs) * 100}%` : 0,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {label}
                </span>
              ))}
              {/* Comment pins on ruler */}
              {groupedVisibleCommentPins.map((group) => {
                const ts = group.timestampMs;
                const isDraggingPin = draggingCommentGroup?.threadIds.includes(group.threads[0].id);
                const displayMs = isDraggingPin && draggingCommentGroup ? draggingCommentGroup.dragMs : ts;
                const leftPercent = visibleDurationMs > 0 ? ((displayMs - visibleStartMs) / visibleDurationMs) * 100 : 0;
                const threadIds = group.threads.map((t) => t.id);
                const first = group.threads[0];
                const firstComment = first?.comments[0];
                const isMultiComment = group.threads.length >= 2 || (first && first.comments.length > 1);
                return (
                  <ButtonPrimitive
                    key={group.threads.map((t) => t.id).join(',')}
                    type="button"
                    className="absolute top-1/2 flex -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing items-center justify-center gap-1 rounded-full border border-border bg-bg shadow-100 hover:scale-110"
                    style={{
                      left: `${leftPercent}%`,
                      zIndex: 10,
                      ...(isMultiComment ? COMMENT_PIN_STYLE_MULTI : COMMENT_PIN_STYLE_SINGLE),
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleCommentPinPointerDown(e, threadIds, ts, clientXToMsRuler);
                    }}
                    onClick={() => handleCommentPinClick(first.id, ts)}
                    aria-label={
                      group.threads.length === 1
                        ? `Comment at ${Math.round(ts / 1000)}s`
                        : `${group.threads.length} comments at ${Math.round(ts / 1000)}s`
                    }
                  >
                    {firstComment && (
                      <>
                        <Avatar
                          size="sm"
                          initial={firstComment.authorInitial}
                          src={firstComment.avatarUrl}
                          color={firstComment.color}
                          alt={firstComment.authorName}
                        />
                        {group.threads.length === 1 && first.comments.length > 1 && (
                          <span className="text-bodySm text-text-secondary leading-none">+{first.comments.length - 1}</span>
                        )}
                        {group.threads.length >= 2 && (
                          <>
                            {group.threads[1]?.comments[0] && (
                              <Avatar
                                size="sm"
                                initial={group.threads[1].comments[0].authorInitial}
                                src={group.threads[1].comments[0].avatarUrl}
                                color={group.threads[1].comments[0].color}
                                alt={group.threads[1].comments[0].authorName}
                              />
                            )}
                            {group.threads.length > 2 && (
                              <span className="text-bodySm text-text-secondary leading-none -ml-1">+{group.threads.length - 2}</span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </ButtonPrimitive>
                );
              })}
              {/* Ruler cursor position notch */}
              {isRulerHovered && rulerCursorMs !== null && draggingGuideIdx === null && visibleDurationMs > 0 && (
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                  style={{ left: `${((rulerCursorMs - visibleStartMs) / visibleDurationMs) * 100}%` }}
                >
                  <span
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm text-bodyMd text-text-tertiary tabular-nums whitespace-nowrap pointer-events-none bg-bg"
                    style={RULER_NOTCH_LABEL_STYLE}
                  >
                    {`${(rulerCursorMs / 1000).toFixed(2)}s`}
                  </span>
                  <div
                    className="absolute bottom-0 w-px opacity-50 bg-text-tertiary"
                    style={RULER_NOTCH_TICK_STYLE}
                  />
                </div>
              )}
              {/* Track cursor notch in ruler */}
              {trackCursorMs !== null && !isRulerHovered && draggingGuideIdx === null && visibleDurationMs > 0 && (
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                  style={{ left: `${((trackCursorMs - visibleStartMs) / visibleDurationMs) * 100}%` }}
                >
                  <span
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm text-bodyMd text-text-tertiary tabular-nums whitespace-nowrap pointer-events-none bg-bg"
                    style={RULER_NOTCH_LABEL_STYLE}
                  >
                    {`${(trackCursorMs / 1000).toFixed(2)}s`}
                  </span>
                  <div
                    className="absolute bottom-0 w-px opacity-50 bg-text-tertiary"
                    style={RULER_NOTCH_TICK_STYLE}
                  />
                </div>
              )}
              {/* Ruler guide markers */}
              {visibleDurationMs > 0 && rulerGuidesMs.map((guideMs, idx) => {
                const leftPct = ((guideMs - visibleStartMs) / visibleDurationMs) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{ left: `${leftPct}%` }}
                  >
                    {(isRulerHovered || draggingGuideIdx === idx) && (
                      <span
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm text-bodyMd tabular-nums whitespace-nowrap pointer-events-none bg-bg"
                        style={RULER_GUIDE_LABEL_STYLE}
                      >
                        {`${(guideMs / 1000).toFixed(2)}s`}
                      </span>
                    )}
                    <div
                      className="absolute bottom-0"
                      style={{
                        width: 1,
                        height: 10,
                        transform: 'translateX(-0.5px)',
                        backgroundColor: '#F24822',
                        opacity: draggingGuideIdx === idx ? 1 : 0.7,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      {showBody && (
        <>
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-row" data-timeline-scroll style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
              {/* Left: Tree grid */}
              <div
                className="shrink-0 flex flex-col border-r border-border bg-bg"
                style={{ width: TREE_WIDTH_PX, height: 'fit-content' }}
              >
                {layers.length === 0 ? (
                  <div className="px-3 py-2 text-bodyMd text-text-tertiary">Add an animation from the panel.</div>
                ) : (
                  <div className="pb-2">
                    {layers.map((nodeId) => {
                      const isLayerSelected = selectedLayerId === nodeId;
                      const isCollapsed = collapsedNodes.has(nodeId);
                      const node = store.getNode(Number(nodeId));
                      const nodeAnims = frameAnimations.filter((a) => a.nodeId === nodeId);

                      return (
                        <div key={nodeId} className={clsx('border-b border-border', isLayerSelected && 'bg-bg-selected-secondary')}>
                          <ButtonPrimitive
                            type="button"
                            className="relative flex items-center cursor-pointer select-none group w-full text-text border-0 pl-0"
                            style={{ height: ROW_HEIGHT_PX }}
                            onClick={() => {
                              setSelectedLayerId(nodeId);
                              toggleCollapse(nodeId);
                              selectLayer(Number(nodeId));
                            }}
                          >
                            {!isLayerSelected && (
                              <div className="absolute inset-0 group-hover:bg-bg-hover" />
                            )}
                            <div className="relative flex items-center flex-1 min-w-0 pr-1" style={{ height: ROW_HEIGHT_PX }}>
                              <ButtonPrimitive
                                type="button"
                                className="flex-shrink-0 p-0 border-0 cursor-pointer flex items-center justify-center w-4 h-4 mr-1 text-icon-tertiary hover:opacity-80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCollapse(nodeId);
                                }}
                                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                              >
                                <LayerChevronIcon className={clsx('size-3', isCollapsed && '-rotate-90')} />
                              </ButtonPrimitive>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {node && (
                                  <span className="flex-shrink-0 text-icon-secondary">
                                    <NodeTypeIcon node={node} />
                                  </span>
                                )}
                                <span className="flex-1 min-w-0 truncate text-bodyMd">{layerDisplayName(node)}</span>
                              </div>
                            </div>
                          </ButtonPrimitive>
                          {!isCollapsed && (() => {
                            const nodeKfMap = kfStore.getNodeKeyframes(nodeId);
                            const kfProps = [...nodeKfMap.entries()].filter(([, kfs]) => kfs.length > 0);
                            const totalSubRows = nodeAnims.length + kfProps.length;
                            return [
                              ...nodeAnims.map((anim, animIdx) => {
                                const isLast = kfProps.length === 0 && animIdx === totalSubRows - 1;
                                const TREE_LINE_LEFT = 30;
                                return (
                                  <div
                                    key={anim.id}
                                    className="relative flex items-center select-none group w-full"
                                    style={{ height: ROW_HEIGHT_PX, paddingLeft: 48 }}
                                  >
                                    {!isLayerSelected && (
                                      <div className="absolute inset-0 group-hover:bg-bg-hover" />
                                    )}
                                    <div
                                      className="absolute pointer-events-none"
                                      style={{
                                        left: TREE_LINE_LEFT,
                                        top: 0,
                                        bottom: isLast ? '50%' : 0,
                                        width: 1,
                                        backgroundColor: 'var(--color-border)',
                                      }}
                                    />
                                    <div
                                      className="absolute pointer-events-none"
                                      style={{
                                        left: TREE_LINE_LEFT,
                                        top: '50%',
                                        width: 8,
                                        height: 1,
                                        backgroundColor: 'var(--color-border)',
                                      }}
                                    />
                                    <div className="relative flex items-center gap-2 flex-1 min-w-0 px-1" style={{ height: ROW_HEIGHT_PX }}>
                                      <span className="flex-1 min-w-0 truncate text-bodyMd text-text-secondary">{animationTypeLabel(anim.type)}</span>
                                    </div>
                                  </div>
                                );
                              }),
                              ...kfProps.map(([prop, kfs], kfIdx) => {
                                const isLast = nodeAnims.length + kfIdx === totalSubRows - 1;
                                const TREE_LINE_LEFT = 30;
                                return (
                                  <div
                                    key={`kf-${prop}`}
                                    className="relative flex items-center select-none group w-full"
                                    style={{ height: ROW_HEIGHT_PX, paddingLeft: 48 }}
                                  >
                                    {!isLayerSelected && (
                                      <div className="absolute inset-0 group-hover:bg-bg-hover" />
                                    )}
                                    <div
                                      className="absolute pointer-events-none"
                                      style={{
                                        left: TREE_LINE_LEFT,
                                        top: 0,
                                        bottom: isLast ? '50%' : 0,
                                        width: 1,
                                        backgroundColor: 'var(--color-border)',
                                      }}
                                    />
                                    <div
                                      className="absolute pointer-events-none"
                                      style={{
                                        left: TREE_LINE_LEFT,
                                        top: '50%',
                                        width: 8,
                                        height: 1,
                                        backgroundColor: 'var(--color-border)',
                                      }}
                                    />
                                    <div className="relative flex items-center gap-2 flex-1 min-w-0 px-1" style={{ height: ROW_HEIGHT_PX }}>
                                      <span className="flex-1 min-w-0 truncate text-bodyMd text-text-secondary">
                                        {KEYFRAMEABLE_PROP_LABELS[prop]} ({kfs.length})
                                      </span>
                                    </div>
                                  </div>
                                );
                              }),
                            ];
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Timeline track area */}
              {layers.length === 0 ? (
                <div
                  className="flex-1 min-w-0 flex flex-col items-center justify-center text-bodyMd text-text-tertiary text-center px-4"
                  style={DOT_GRID_STYLE}
                >
                  <p className="max-w-[320px]">
                    This is the animation timeline. Add an animation from the right panel to see it here.
                  </p>
                </div>
              ) : (
                <div
                  ref={attachWheelListener}
                  role="slider"
                  aria-label="Timeline position"
                  aria-valuemin={0}
                  aria-valuemax={endMs}
                  aria-valuenow={Math.round(currentMs)}
                  tabIndex={0}
                  className="relative flex flex-col flex-1 bg-bg h-fit"
                  style={{ overflowX: 'clip', cursor: isDragging ? CURSORS.resizeH : isNearPlayhead ? CURSORS.resizeH : isShiftHeld ? 'crosshair' : undefined, minWidth: 500, height: 'fit-content' }}
                  onPointerDown={handleTrackPointerDown}
                  onPointerMove={handleTrackPointerMove}
                  onPointerUp={handleTrackPointerUp}
                  onPointerLeave={handleTrackPointerLeave}
                >
                  {/* Inner wrapper: all content and overlays share this positioning context.
                      min-h-full ensures overlays cover the viewport; flex-col lets layer rows set the actual height. */}
                  <div className="relative flex flex-col min-h-full">
                  {/* Dotted bg in the left padding gap (before time 0) */}
                  {visibleStartMs < 0 && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none"
                      style={{
                        zIndex: 0,
                        left: 0,
                        width: `${((-visibleStartMs) / visibleDurationMs) * 100}%`,
                        ...DOT_GRID_STYLE,
                        backgroundRepeat: 'repeat',
                      }}
                    />
                  )}
                  {visibleStartMs < 0 && (
                    <div
                      className="absolute top-0 bottom-0 z-[1] pointer-events-none"
                      style={{
                        left: `${((-visibleStartMs) / visibleDurationMs) * 100}%`,
                        width: 1,
                        backgroundColor: 'var(--color-border)',
                      }}
                    />
                  )}
                  {visibleEndMs > layoutEndMs && (
                    <div
                      className="absolute top-0 bottom-0 z-[1] pointer-events-none"
                      style={{
                        left: `${((layoutEndMs - visibleStartMs) / visibleDurationMs) * 100}%`,
                        width: 1,
                        backgroundColor: 'var(--color-border)',
                      }}
                    />
                  )}
                  <div className="absolute inset-0 pointer-events-none" style={Z_BASE_STYLE}>
                    {emptySegments.map((seg, i) => (
                      <div
                        key={`empty-${i}`}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${((seg.startMs - visibleStartMs) / visibleDurationMs) * 100}%`,
                          width: `${((seg.endMs - seg.startMs) / visibleDurationMs) * 100}%`,
                          ...DOT_GRID_STYLE,
                          backgroundRepeat: 'repeat',
                        }}
                      />
                    ))}
                  </div>
                  <div className="relative flex flex-col" style={Z_BASE_STYLE}>
                    {layers.map((nodeId) => {
                      const isLayerSelected = selectedLayerId === nodeId;
                      const isCollapsed = collapsedNodes.has(nodeId);
                      const nodeAnims = frameAnimations.filter((a) => a.nodeId === nodeId);
                      const layerNode = store.getNode(Number(nodeId));
                      const videoSrc = layerNode?.type === 'VIDEO' ? (layerNode as VideoNode).src : undefined;
                      const audioSrc = layerNode?.type === 'AUDIO' ? (layerNode as AudioNode).src : undefined;

                      return (
                        <div key={`tg-${nodeId}`} className={clsx('border-b border-border', isLayerSelected && 'bg-bg-selected-secondary')}>
                          <div className="relative shrink-0 flex items-center px-1" style={{ height: ROW_HEIGHT_PX }}>
                            {isCollapsed && nodeAnims.map((anim) => (
                              <TimelineClipBar
                                key={anim.id}
                                anim={anim}
                                isSelected={isLayerSelected}
                                isClipSelected={selectedClipIds.has(anim.id)}
                                onSelect={() => {
                                  setSelectedClipIds(new Set([anim.id]));
                                  setSelectedLayerId(nodeId);
                                  selectLayer(Number(nodeId));
                                  trackStripRef.current?.focus();
                                }}
                                clientXToMs={clientXToMs}
                                moveClipAndPush={moveClipAndPush}
                                updateAnimation={updateAnimation}
                                trackEndMs={layoutEndMs}
                                visibleStartMs={visibleStartMs}
                                visibleDurationMs={visibleDurationMs}
                                videoSrc={videoSrc}
                                audioSrc={audioSrc}
                                onDragStart={handleClipDragStart}
                                onDragEnd={handleClipDragEnd}
                                allAnimations={frameAnimations}
                                trackAnimations={nodeAnims}
                                onSnapGuide={setSnapGuideMs}
                                rulerGuidesMs={rulerGuidesMs}
                              />
                            ))}
                          </div>
                          {!isCollapsed && nodeAnims.map((anim) => (
                            <div key={anim.id} className="relative shrink-0 flex items-center px-1" style={{ height: ROW_HEIGHT_PX }}>
                              <TimelineClipBar
                                anim={anim}
                                isSelected={isLayerSelected}
                                isClipSelected={selectedClipIds.has(anim.id)}
                                onSelect={() => {
                                  setSelectedClipIds(new Set([anim.id]));
                                  setSelectedLayerId(nodeId);
                                  selectLayer(Number(nodeId));
                                  trackStripRef.current?.focus();
                                }}
                                clientXToMs={clientXToMs}
                                moveClipAndPush={moveClipAndPush}
                                updateAnimation={updateAnimation}
                                trackEndMs={layoutEndMs}
                                visibleStartMs={visibleStartMs}
                                visibleDurationMs={visibleDurationMs}
                                videoSrc={videoSrc}
                                audioSrc={audioSrc}
                                onDragStart={handleClipDragStart}
                                onDragEnd={handleClipDragEnd}
                                allAnimations={frameAnimations}
                                trackAnimations={nodeAnims}
                                onSnapGuide={setSnapGuideMs}
                                rulerGuidesMs={rulerGuidesMs}
                              />
                            </div>
                          ))}
                          {/* Keyframe diamond sub-rows */}
                          {!isCollapsed && (() => {
                            const nodeKfMap = kfStore.getNodeKeyframes(nodeId);
                            const kfProps = [...nodeKfMap.entries()].filter(([, kfs]) => kfs.length > 0);
                            return kfProps.map(([prop, kfs]) => (
                              <div key={`kf-${prop}`} className="relative shrink-0 flex items-center" style={{ height: ROW_HEIGHT_PX }}>
                                {/* Lines between consecutive keyframes */}
                                {kfs.length >= 2 && kfs.slice(0, -1).map((kf, i) => {
                                  const nextKf = kfs[i + 1];
                                  const l = visibleDurationMs > 0 ? ((kf.timeMs - visibleStartMs) / visibleDurationMs) * 100 : 0;
                                  const r = visibleDurationMs > 0 ? ((nextKf.timeMs - visibleStartMs) / visibleDurationMs) * 100 : 0;
                                  const bothSelected = selectedKeyframes.some((sk) => sk.nodeId === nodeId && sk.prop === prop && sk.timeMs === kf.timeMs)
                                    && selectedKeyframes.some((sk) => sk.nodeId === nodeId && sk.prop === prop && sk.timeMs === nextKf.timeMs);
                                  return (
                                    <div
                                      key={`line-${kf.timeMs}-${nextKf.timeMs}`}
                                      className="absolute pointer-events-none"
                                      style={{ left: `calc(${l}% + 5px)`, width: `calc(${r - l}% - 10px)`, top: 'calc(50% - 0.5px)', height: 1, backgroundColor: bothSelected ? 'var(--color-border-selected, #0d99ff)' : 'var(--color-border, #e6e6e6)' }}
                                    />
                                  );
                                })}
                                {/* Draggable keyframe diamonds */}
                                {kfs.map((kf) => {
                                  const leftPct = visibleDurationMs > 0
                                    ? ((kf.timeMs - visibleStartMs) / visibleDurationMs) * 100
                                    : 0;
                                  const isKfSelected = selectedKeyframes.some((sk) => sk.nodeId === nodeId && sk.prop === prop && sk.timeMs === kf.timeMs);
                                  return (
                                    <div
                                      key={kf.timeMs}
                                      className="absolute flex items-center justify-center z-[1]"
                                      style={{ left: `${leftPct}%`, transform: 'translateX(-5px)', cursor: CURSORS.grab }}
                                      onPointerDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const entry = { nodeId, prop, timeMs: kf.timeMs };

                                        let nextSelection: typeof selectedKeyframes;
                                        if (e.shiftKey) {
                                          const already = selectedKeyframes.some((sk) => sk.nodeId === nodeId && sk.prop === prop && sk.timeMs === kf.timeMs);
                                          nextSelection = already
                                            ? selectedKeyframes.filter((sk) => !(sk.nodeId === nodeId && sk.prop === prop && sk.timeMs === kf.timeMs))
                                            : [...selectedKeyframes, entry];
                                        } else {
                                          const alreadySelected = selectedKeyframes.some((sk) => sk.nodeId === nodeId && sk.prop === prop && sk.timeMs === kf.timeMs);
                                          nextSelection = alreadySelected && selectedKeyframes.length > 1
                                            ? selectedKeyframes
                                            : [entry];
                                        }
                                        setSelectedKeyframes(nextSelection);

                                        let liveSelection = nextSelection;
                                        let currentTimeMs = kf.timeMs;
                                        const el = e.currentTarget;
                                        el.setPointerCapture(e.pointerId);
                                        document.body.style.cursor = CURSORS.grabbing;

                                        const kfSnapTargets = [0, ...rulerGuidesMs];
                                        for (const a of frameAnimations) {
                                          kfSnapTargets.push(a.startMs, a.startMs + a.durationMs);
                                        }
                                        const kfParentW = trackStripRef.current?.clientWidth ?? 800;
                                        const kfThresholdMs = kfParentW > 0 ? (SNAP_THRESHOLD_PX / kfParentW) * visibleDurationMs : 0;

                                        const onMove = (e2: PointerEvent) => {
                                          let newMs = clientXToMs(e2.clientX);
                                          const snapped = findSnapTarget(newMs, kfSnapTargets, kfThresholdMs);
                                          if (snapped !== null) {
                                            setSnapGuideMs(snapped);
                                            newMs = snapped;
                                          } else {
                                            setSnapGuideMs(null);
                                          }
                                          const deltaMs = newMs - currentTimeMs;
                                          if (Math.abs(deltaMs) < 0.01) return;

                                          const updated = liveSelection.map((sk) => {
                                            kfStore.moveKeyframe(sk.nodeId, sk.prop as KeyframeableProperty, sk.timeMs, sk.timeMs + deltaMs);
                                            return { ...sk, timeMs: Math.max(0, sk.timeMs + deltaMs) };
                                          });
                                          liveSelection = updated;
                                          setSelectedKeyframes(updated);
                                          currentTimeMs = Math.max(0, newMs);
                                        };
                                        const onUp = (e2: PointerEvent) => {
                                          document.body.style.cursor = '';
                                          el.releasePointerCapture(e2.pointerId);
                                          window.removeEventListener('pointermove', onMove);
                                          window.removeEventListener('pointerup', onUp);
                                          setSnapGuideMs(null);
                                        };
                                        window.addEventListener('pointermove', onMove);
                                        window.addEventListener('pointerup', onUp);
                                      }}
                                    >
                                      <TimelineKeyframeDiamond filled={isKfSelected} />
                                    </div>
                                  );
                                })}
                              </div>
                            ));
                          })()}
                        </div>
                      );
                    })}
                  </div>
                  {/* Track cursor position line */}
                  {trackCursorMs !== null && !isRulerHovered && draggingGuideIdx === null && visibleDurationMs > 0 && (
                    <div
                      className="absolute top-0 bottom-0 z-[88] pointer-events-none"
                      style={{
                        left: `${((trackCursorMs - visibleStartMs) / visibleDurationMs) * 100}%`,
                        width: 1,
                        transform: 'translateX(-0.5px)',
                        backgroundColor: 'black',
                        opacity: 0.1,
                      }}
                      aria-hidden
                    />
                  )}
                  {/* Ruler cursor position line */}
                  {isRulerHovered && rulerCursorMs !== null && draggingGuideIdx === null && visibleDurationMs > 0 && (
                    <div
                      className="absolute top-0 bottom-0 z-[88] pointer-events-none"
                      style={{
                        left: `${((rulerCursorMs - visibleStartMs) / visibleDurationMs) * 100}%`,
                        width: 1,
                        transform: 'translateX(-0.5px)',
                        backgroundColor: 'black',
                        opacity: 0.1,
                      }}
                      aria-hidden
                    />
                  )}
                  {/* Ruler guide lines */}
                  {visibleDurationMs > 0 && rulerGuidesMs.map((guideMs, idx) => {
                    const isSnapping = snapGuideMs !== null && Math.abs(guideMs - snapGuideMs) < 0.5;
                    return (
                      <div
                        key={`rg-${idx}`}
                        className="absolute top-0 bottom-0 z-[89] pointer-events-none"
                        style={{
                          left: `${((guideMs - visibleStartMs) / visibleDurationMs) * 100}%`,
                          width: 1,
                          transform: 'translateX(-0.5px)',
                          backgroundColor: '#F24822',
                          opacity: isSnapping ? 1 : 0.5,
                        }}
                        aria-hidden
                      />
                    );
                  })}
                  {/* Snap alignment guide (hidden when overlapping a ruler guide) */}
                  {snapGuideMs !== null && visibleDurationMs > 0 && !rulerGuidesMs.some((g) => Math.abs(g - snapGuideMs) < 0.5) && (
                    <div
                      className="absolute top-0 bottom-0 z-[90] pointer-events-none"
                      style={{
                        left: `${((snapGuideMs - visibleStartMs) / visibleDurationMs) * 100}%`,
                        width: 1,
                        backgroundColor: '#F24822',
                      }}
                      aria-hidden
                    />
                  )}
                  {/* Marquee selection rectangle */}
                  {marquee && (
                    <div
                      className="absolute z-[50] pointer-events-none"
                      style={{
                        left: Math.min(marquee.startX, marquee.currentX),
                        top: Math.min(marquee.startY, marquee.currentY),
                        width: Math.abs(marquee.currentX - marquee.startX),
                        height: Math.abs(marquee.currentY - marquee.startY),
                        backgroundColor: 'rgba(13, 153, 255, 0.1)',
                        border: '1px solid #0d99ff',
                      }}
                    />
                  )}
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 z-[100] pointer-events-none flex flex-col items-center"
                    style={{ left: `${playheadPercent}%`, transform: 'translateX(-5.5px)', width: 11 }}
                  >
                    <PlayheadThumb />
                    <PlayheadLine />
                  </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Custom horizontal scrollbar */}
          {timelineZoom > 1 && layers.length > 0 && (
            <TimelineScrollbar
              zoom={timelineZoom}
              scrollFraction={scrollFraction}
              onScrollChange={setScrollFraction}
            />
          )}
        </>
      )}
    </div>
  );
}

function TimelineScrollbar({
  zoom,
  scrollFraction,
  onScrollChange,
}: {
  zoom: number;
  scrollFraction: number;
  onScrollChange: (f: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbFraction = 1 / zoom;
  const thumbLeft = scrollFraction * (1 - thumbFraction);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const treeOffset = TREE_WIDTH_PX;
    const trackLeft = rect.left + treeOffset;
    const trackWidth = rect.width - treeOffset;
    const thumbWidthPx = thumbFraction * trackWidth;

    const update = (clientX: number) => {
      const x = clientX - trackLeft - thumbWidthPx / 2;
      const maxX = trackWidth - thumbWidthPx;
      onScrollChange(Math.max(0, Math.min(1, maxX > 0 ? x / maxX : 0)));
    };
    update(e.clientX);
    const onMove = (ev: PointerEvent) => update(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [thumbFraction, onScrollChange]);

  return (
    <div
      ref={trackRef}
      className="shrink-0 flex items-center border-t border-border cursor-pointer"
      style={{ height: SCROLLBAR_HEIGHT_PX, paddingLeft: TREE_WIDTH_PX }}
      onPointerDown={onPointerDown}
    >
      <div className="relative flex-1 h-full">
        <div
          className="absolute top-1 bottom-1 rounded-full bg-icon-tertiary/40 hover:bg-icon-tertiary/60 transition-colors"
          style={{
            left: `${thumbLeft * 100}%`,
            width: `${thumbFraction * 100}%`,
            minWidth: 24,
          }}
        />
      </div>
    </div>
  );
}
