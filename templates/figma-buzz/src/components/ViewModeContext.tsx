import { createContext, useContext } from 'react';
import type { NodeId } from '@prototype/shared/canvas';

export type ViewMode = 'asset' | 'grid';

export interface ViewModeAPI {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  focusedFrameId: NodeId | null
  setFocusedFrameId: (id: NodeId | null) => void
  /** True while the viewport is animating (mode change or focus change) */
  isAnimatingViewMode: boolean
  setIsAnimatingViewMode: (v: boolean) => void
  /** True only during mode-change animations (grid should be rendered) */
  isAnimatingModeChange: boolean
  setIsAnimatingModeChange: (v: boolean) => void
}

const ViewModeContext = createContext<ViewModeAPI | null>(null);

export const ViewModeProvider = ViewModeContext.Provider;

export function useViewMode(): ViewModeAPI {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within a ViewModeProvider');
  return ctx;
}
