import type { Mode } from '../components/menuTypes';

// ---------------------------------------------------------------------------
// Default mode — change this single value to reconfigure the app's starting
// mode for template reuse.
// ---------------------------------------------------------------------------

export const DEFAULT_MODE: Mode = 'slide';

// ---------------------------------------------------------------------------
// Mode → FPL brand mapping
// ---------------------------------------------------------------------------

/**
 * Maps each editor mode to the FPL `data-editor-theme` brand value.
 * @see fpl/packages/tokens/src/constants.ts — BRAND_TO_COLLECTION_MAP
 */
export const MODE_TO_BRAND: Record<Mode, string> = {
  slide: 'piper',
  design: 'design',
};

// ---------------------------------------------------------------------------
// Color theme helpers
// ---------------------------------------------------------------------------

export type ThemeSetting = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'editor-shell-theme';

/** Read the persisted color theme from localStorage, falling back to `fallback`. */
export function readStoredTheme(fallback: ThemeSetting = 'light'): ThemeSetting {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (e.g. in sandboxed iframes)
  }
  return fallback;
}

/** Persist the user's color theme choice to localStorage. */
export function persistTheme(setting: ThemeSetting): void {
  try {
    localStorage.setItem(STORAGE_KEY, setting);
  } catch {
    // ignore write failures
  }
}

/**
 * Apply the color theme and editor brand to `document.body` so FPL CSS
 * custom properties resolve to the correct palette.
 */
export function applyTheme(setting: ThemeSetting, brand: string): void {
  let resolved: 'light' | 'dark' = 'light';
  if (setting === 'dark') {
    resolved = 'dark';
  } else if (setting === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  document.body.setAttribute('data-preferred-theme', resolved);
  document.body.setAttribute('data-editor-theme', brand);
}
