import { themeQuartz } from 'ag-grid-community';

/**
 * AG Grid theme that maps to FPL design tokens via CSS custom properties.
 * Automatically responds to light/dark mode since FPL tokens switch via data-preferred-theme.
 */
export const fplTableTheme = themeQuartz.withParams({
  // Core colors
  backgroundColor: 'var(--color-bg)',
  foregroundColor: 'var(--color-text)',
  textColor: 'var(--color-text)',
  borderColor: 'var(--color-border)',
  accentColor: 'var(--color-bg-brand)',

  // Header
  headerBackgroundColor: 'var(--color-bg)',
  headerTextColor: 'var(--color-text-secondary)',
  headerFontWeight: 600,
  chromeBackgroundColor: 'var(--color-bg)',

  // Row states
  rowHoverColor: 'var(--color-bg-hover)',
  selectedRowBackgroundColor: 'var(--color-bg-selected-secondary)',
  oddRowBackgroundColor: 'transparent',

  // Resize handles — hidden by default, shown via CSS on active drag
  headerColumnResizeHandleColor: 'transparent',

  // Typography
  fontFamily: 'var(--text-body-medium-font-family)',

  // Cell editing
  cellEditingBorder: true,

  // Borders — show vertical separators in the header
  headerColumnBorder: true,

  // Layout
  cellHorizontalPaddingScale: 1,
  wrapperBorderRadius: 0,
  borderRadius: 0,
});
