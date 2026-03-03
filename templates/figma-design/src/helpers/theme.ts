import type { Mode } from '../components/menuTypes';

export type { ThemeSetting } from '@prototype/shared';

// ---------------------------------------------------------------------------
// Default mode — change this single value to reconfigure the app's starting
// mode for template reuse.
// ---------------------------------------------------------------------------

export const DEFAULT_MODE: Mode = 'design';

// ---------------------------------------------------------------------------
// Mode → FPL brand mapping
// ---------------------------------------------------------------------------

/**
 * Maps each editor mode to the FPL `data-editor-theme` brand value.
 * @see fpl/packages/tokens/src/constants.ts — BRAND_TO_COLLECTION_MAP
 */
export const MODE_TO_BRAND: Record<Mode, string> = {
  design: 'design',
  draw: 'sulli',
  dev: 'dev-handoff',
};
