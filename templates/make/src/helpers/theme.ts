// This file uses .ts (not .tsx) and createElement instead of JSX intentionally.
// During scaffolding, cpSync merges the template into apps/prototype/ which may
// already have a helpers/theme.ts. If this were .tsx, it wouldn't overwrite the
// existing .ts file, and the bundler would resolve imports to the old one.
import { useContext, useMemo, createContext, createElement } from 'react';
import type { ReactNode } from 'react';
import { useAppTheme, type ThemeSetting } from '@prototype/shared';

export type { ThemeSetting };

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
  const [theme, setTheme] = useAppTheme({
    storageKey: 'make-theme',
    brand: 'seascape',
    initial,
  });

  return createElement(
    ThemeContext.Provider,
    { value: useMemo(() => ({ theme, setTheme }), [theme, setTheme]) },
    children,
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
