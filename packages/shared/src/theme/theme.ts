import { useState, useEffect, useCallback } from 'react';
import { addListener } from '@figma/fpl-components';

export type ThemeSetting = 'light' | 'dark' | 'system';

interface UseAppThemeOptions {
  /** localStorage key (default: 'app-theme') */
  storageKey?: string;
  /** data-editor-theme value (default: undefined, won't set attribute) */
  brand?: string;
  /** Fallback if nothing stored (default: 'light') */
  initial?: ThemeSetting;
}

/**
 * Hook that manages the app's color theme. Persists to localStorage,
 * applies DOM attributes, and listens for OS-level theme changes.
 */
export function useAppTheme({
  storageKey = 'app-theme',
  brand,
  initial = 'light',
}: UseAppThemeOptions = {}): [ThemeSetting, (next: ThemeSetting) => void] {

  const [theme, setThemeState] = useState<ThemeSetting>(() =>
    readStoredTheme(storageKey, initial),
  );

  const setTheme = useCallback(
    (next: ThemeSetting) => {
      setThemeState(next);
      persistTheme(storageKey, next);
    },
    [storageKey],
  );

  useEffect(() => {
    applyTheme(theme, brand);

    if (theme !== 'system') return undefined;

    return addListener(DARK_MODE_QUERY, 'change', () => applyTheme('system', brand));
  }, [theme, brand]);

  return [theme, setTheme];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DARK_MODE_QUERY = window.matchMedia('(prefers-color-scheme: dark)');

/** Read the persisted color theme from localStorage. */
function readStoredTheme(
  storageKey: string,
  fallback: ThemeSetting,
): ThemeSetting {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (e.g. in sandboxed iframes)
  }
  return fallback;
}

/** Resolve a theme setting to a concrete 'light' | 'dark' value. */
function resolveTheme(setting: ThemeSetting): 'light' | 'dark' {
  if (setting === 'dark') return 'dark';
  if (setting === 'system') {
    return DARK_MODE_QUERY.matches ? 'dark' : 'light';
  }
  return 'light';
}

/** Apply theme attributes to document.body. */
function applyTheme(setting: ThemeSetting, brand?: string): void {
  document.body.setAttribute('data-preferred-theme', resolveTheme(setting));
  if (brand !== undefined) {
    document.body.setAttribute('data-editor-theme', brand);
  }
}

/** Persist the user's color theme choice to localStorage. */
function persistTheme(storageKey: string, setting: ThemeSetting): void {
  try {
    localStorage.setItem(storageKey, setting);
  } catch {
    // ignore write failures
  }
}
