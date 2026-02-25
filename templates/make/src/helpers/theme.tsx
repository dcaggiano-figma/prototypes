import {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  createContext,
} from 'react';
import type { ReactNode } from 'react';

export type ThemeSetting = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'make-theme';

function readStoredTheme(fallback: ThemeSetting): ThemeSetting {
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

export function applyTheme(setting: ThemeSetting) {
  let resolved: 'light' | 'dark' = 'light';
  if (setting === 'dark') {
    resolved = 'dark';
  } else if (setting === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  document.body.setAttribute('data-preferred-theme', resolved);
  document.body.setAttribute('data-editor-theme', 'seascape');
}

/* ------------------------------------------------------------------ */
/*  Theme context – single source of truth across all pages            */
/* ------------------------------------------------------------------ */

type ThemeContextValue = {
  theme: ThemeSetting;
  setTheme: (next: ThemeSetting) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({
  initial = 'light',
  children,
}: {
  initial?: ThemeSetting;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeSetting>(
    () => readStoredTheme(initial),
  );

  const setTheme = useCallback((next: ThemeSetting) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);

    if (theme !== 'system') return undefined;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={useMemo(() => ({ theme, setTheme }), [theme, setTheme])}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook that reads theme state from the nearest AppThemeProvider.
 * Must be used inside an <AppThemeProvider>.
 */
export function useTheme(): [ThemeSetting, (next: ThemeSetting) => void] {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within an <AppThemeProvider>');
  }
  return [ctx.theme, ctx.setTheme];
}
