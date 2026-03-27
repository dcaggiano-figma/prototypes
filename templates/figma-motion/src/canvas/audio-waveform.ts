import { useEffect, useMemo, useState } from 'react';

const MAX_PEAKS = 500;
const peakCache = new Map<string, number[]>();

export async function extractWaveform(src: string): Promise<number[]> {
  const cached = peakCache.get(src);
  if (cached) return cached;

  try {
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / MAX_PEAKS);
    const peaks: number[] = [];

    for (let i = 0; i < MAX_PEAKS; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize && start + j < channelData.length; j++) {
        const abs = Math.abs(channelData[start + j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }

    const globalMax = Math.max(...peaks) || 1;
    const normalized = peaks.map((p) => p / globalMax);
    peakCache.set(src, normalized);
    await audioCtx.close();
    return normalized;
  } catch {
    return [];
  }
}

/**
 * Returns evenly-sampled peaks for the visible trim window.
 * `count` controls how many bars are rendered.
 * `offsetMs`, `clipDurationMs`, `maxDurationMs` define the trim window.
 */
export function useAudioWaveform(
  src: string | undefined,
  count = 80,
  offsetMs = 0,
  clipDurationMs?: number,
  maxDurationMs?: number,
): number[] {
  const [allPeaks, setAllPeaks] = useState<number[]>(() => (src ? peakCache.get(src) ?? [] : []));

  useEffect(() => {
    if (!src) return;
    const cached = peakCache.get(src);
    if (cached) {
      setAllPeaks(cached);
      return;
    }
    let cancelled = false;
    extractWaveform(src).then((p) => {
      if (!cancelled) setAllPeaks(p);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return useMemo(() => {
    if (allPeaks.length === 0) return allPeaks;
    const total = allPeaks.length;
    const fullDur = maxDurationMs || 1;
    const trimStart = offsetMs / fullDur;
    const trimEnd = clipDurationMs ? Math.min(1, (offsetMs + clipDurationMs) / fullDur) : 1;
    const startIdx = Math.floor(trimStart * total);
    const endIdx = Math.min(total, Math.ceil(trimEnd * total));
    const windowPeaks = allPeaks.slice(startIdx, endIdx);
    if (windowPeaks.length === 0) return allPeaks.slice(0, 1);

    const wanted = Math.max(1, count);
    if (wanted === windowPeaks.length) return windowPeaks;
    const step = windowPeaks.length / wanted;
    const result: number[] = [];
    for (let i = 0; i < wanted; i++) {
      result.push(windowPeaks[Math.min(Math.floor(i * step), windowPeaks.length - 1)]);
    }
    return result;
  }, [allPeaks, count, offsetMs, clipDurationMs, maxDurationMs]);
}
