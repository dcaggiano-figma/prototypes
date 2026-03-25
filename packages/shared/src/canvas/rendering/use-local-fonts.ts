/**
 * useLocalFonts — provides access to locally installed fonts via the Local Font Access API.
 *
 * The Local Font Access API (`window.queryLocalFonts()`) is Chrome/Edge only.
 * This hook is safe to call in any browser — feature detection gates everything.
 * Font data is cached at module level so the permission prompt only fires once.
 */

import { useCallback, useState } from 'react'

/** Map common font style names to CSS font-weight values. */
const STYLE_TO_WEIGHT: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  'extra light': 200,
  'ultra light': 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  '': 400,
  medium: 500,
  semibold: 600,
  'semi bold': 600,
  'demi bold': 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  'extra bold': 800,
  'ultra bold': 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
}

function parseWeight(style: string): number {
  // Strip "Italic" suffix and normalize
  const normalized = style.replace(/\s*italic\s*/i, '').trim().toLowerCase()
  return STYLE_TO_WEIGHT[normalized] ?? 400
}

interface FontInfo {
  family: string
  weights: number[]
}

// Module-level cache so we only query once across all component instances
let cachedFonts: FontInfo[] | null = null
let cachedWeightMap: Map<string, number[]> | null = null

const supported =
  typeof window !== 'undefined' && 'queryLocalFonts' in window

interface QueryLocalFontsWindow {
  queryLocalFonts: () => Promise<
    Array<{ postscriptName: string; fullName: string; family: string; style: string }>
  >
}

export interface UseLocalFontsResult {
  /** Whether the Local Font Access API is available in this browser. */
  supported: boolean
  /** List of unique font family names. Empty until requestAccess() is called. */
  fonts: string[]
  /** Get available weights for a font family. Returns null if not available. */
  getWeights: (family: string) => number[] | null
  /** Trigger the browser permission prompt and load fonts. No-op if not supported. */
  requestAccess: () => Promise<void>
}

export function useLocalFonts(): UseLocalFontsResult {
  const [fonts, setFonts] = useState<string[]>(
    () => cachedFonts?.map((f) => f.family) ?? [],
  )

  const getWeights = useCallback((family: string): number[] | null => {
    return cachedWeightMap?.get(family) ?? null
  }, [])

  const requestAccess = useCallback(async () => {
    if (!supported || cachedFonts) return

    try {
      // queryLocalFonts is not in standard TS lib types
      const fontDataList = await (
        window as unknown as QueryLocalFontsWindow
      ).queryLocalFonts()

      // Group by family, collect unique weights
      const familyMap = new Map<string, Set<number>>()
      for (const fd of fontDataList) {
        const { family } = fd
        if (!familyMap.has(family)) {
          familyMap.set(family, new Set())
        }
        familyMap.get(family)!.add(parseWeight(fd.style))
      }

      // Sort families alphabetically, sort weights numerically
      const sortedFamilies = [...familyMap.keys()].sort((a, b) =>
        a.localeCompare(b),
      )
      const result: FontInfo[] = sortedFamilies.map((family) => ({
        family,
        weights: [...familyMap.get(family)!].sort((a, b) => a - b),
      }))

      cachedFonts = result
      cachedWeightMap = new Map(result.map((f) => [f.family, f.weights]))
      setFonts(sortedFamilies)
    } catch {
      // User denied permission or API error — silently fall back
    }
  }, [])

  return { supported, fonts, getWeights, requestAccess }
}
