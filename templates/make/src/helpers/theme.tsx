import { useContext, useMemo, createContext } from 'react';
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
