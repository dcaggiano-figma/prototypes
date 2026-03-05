import { createContext, useContext } from 'react';

export type ViewMode = 'asset' | 'grid';

export interface ViewModeAPI {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  focusedFrameId: string | null
  setFocusedFrameId: (id: string | null) => void
  /** True while the viewport is animating between view modes */
  isAnimatingViewMode: boolean
  setIsAnimatingViewMode: (v: boolean) => void
}

const ViewModeContext = createContext<ViewModeAPI | null>(null);

export const ViewModeProvider = ViewModeContext.Provider;

export function useViewMode(): ViewModeAPI {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within a ViewModeProvider');
  return ctx;
}
