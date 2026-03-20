import { createContext, useContext } from 'react';
import type { NodeId } from '../canvas';

export type ViewMode = 'asset' | 'grid';

export interface ViewModeAPI {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  focusedFrameId: NodeId | null
  setFocusedFrameId: (id: NodeId | null) => void
  /** True while the viewport is animating between view modes */
  isAnimatingViewMode: boolean
  setIsAnimatingViewMode: (v: boolean) => void
  /** Height of the bottom overlay (speaker notes + toolbar) in px */
  bottomInsetRef: React.MutableRefObject<number>
  /** Subscribe to bottom inset changes (returns unsubscribe fn) */
  onBottomInsetChange: (listener: () => void) => () => void
  /** Emit bottom inset change to all subscribers */
  notifyBottomInsetChange: () => void
}

const ViewModeContext = createContext<ViewModeAPI | null>(null);

export const ViewModeProvider = ViewModeContext.Provider;

export function useViewMode(): ViewModeAPI {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within a ViewModeProvider');
  return ctx;
}
