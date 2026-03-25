export type { ThemeSetting } from './theme/theme';

/**
 * Set `data-preferred-theme` on `document.body` based on the stored theme.
 * Call this before React mounts to avoid a flash of wrong theme.
 */
export function initTheme({
  storageKey = 'app-theme',
}: { storageKey?: string } = {}): void {
  let setting = 'system';
  try {
    setting = localStorage.getItem(storageKey) || 'system';
  } catch {
    // localStorage may be unavailable
  }

  const resolved =
    setting === 'dark' ? 'dark'
      : setting === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark'
        : 'light';

  document.body.setAttribute('data-preferred-theme', resolved);
}
