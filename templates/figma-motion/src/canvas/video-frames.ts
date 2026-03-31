import { useEffect, useMemo, useState } from 'react';

const MAX_FRAMES = 60;
const frameCache = new Map<string, string[]>();

export async function extractFrames(src: string): Promise<string[]> {
  const cached = frameCache.get(src);
  if (cached) return cached;

  return new Promise<string[]>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.src = src;

    video.onloadeddata = async () => {
      const canvas = document.createElement('canvas');
      const thumbH = 40;
      const thumbW = Math.round((video.videoWidth / video.videoHeight) * thumbH) || 60;
      canvas.width = thumbW;
      canvas.height = thumbH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve([]);
        return;
      }

      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        resolve([]);
        return;
      }

      const frames: string[] = [];
      const step = duration / MAX_FRAMES;

      for (let i = 0; i < MAX_FRAMES; i++) {
        const time = i * step;
        try {
          await seekTo(video, time);
          ctx.drawImage(video, 0, 0, thumbW, thumbH);
          frames.push(canvas.toDataURL('image/jpeg', 0.5));
        } catch {
          break;
        }
      }

      frameCache.set(src, frames);
      video.src = '';
      resolve(frames);
    };

    video.onerror = () => resolve([]);
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('error', onError);
      reject();
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

/**
 * Returns evenly-sampled frames for the visible trim window.
 * `count` controls how many are returned (adapts to zoom level).
 * `offsetMs` and `clipDurationMs` define the trim window within `maxDurationMs`.
 */
export function useVideoFrames(
  src: string | undefined,
  count = 12,
  offsetMs = 0,
  clipDurationMs?: number,
  maxDurationMs?: number,
): string[] {
  const [allFrames, setAllFrames] = useState<string[]>(() =>
    src ? frameCache.get(src) ?? [] : [],
  );

  useEffect(() => {
    if (!src) return;
    const cached = frameCache.get(src);
    if (cached) {
      setAllFrames(cached);
      return;
    }
    let cancelled = false;
    extractFrames(src).then((f) => {
      if (!cancelled) setAllFrames(f);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return useMemo(() => {
    if (allFrames.length === 0) return allFrames;
    const total = allFrames.length;
    const fullDur = maxDurationMs ?? 1;
    const trimStart = offsetMs / fullDur;
    const trimEnd =
      clipDurationMs != null ? Math.min(1, (offsetMs + clipDurationMs) / fullDur) : 1;
    const startIdx = Math.floor(trimStart * total);
    const endIdx = Math.min(total, Math.ceil(trimEnd * total));
    const windowFrames = allFrames.slice(startIdx, endIdx);
    if (windowFrames.length === 0) return allFrames.slice(0, 1);

    const wanted = Math.max(1, Math.min(windowFrames.length, count));
    if (wanted >= windowFrames.length) return windowFrames;
    const step = windowFrames.length / wanted;
    const result: string[] = [];
    for (let i = 0; i < wanted; i++) {
      result.push(windowFrames[Math.min(Math.floor(i * step), windowFrames.length - 1)]);
    }
    return result;
  }, [allFrames, count, offsetMs, clipDurationMs, maxDurationMs]);
}
