import { createContext, useContext, type ReactNode } from 'react';

/** Insets (px) from the full canvas element to the "clean" workspace used for zoom/center. */
export interface CanvasWorkspaceInsets {
  /** Left edge: icon rail (48) + file panel when open (default width 240). */
  leftPx: number;
  /** Right properties panel when visible (default width 240). */
  rightPx: number;
  /** Optional top chrome (e.g. header); 0 if none. */
  topPx: number;
  /**
   * Reserved bottom band inside the canvas rect for floating UI (toolbar stack).
   * Framing center/zoom uses the region above this so content isn't hidden behind the toolbar.
   */
  bottomPx: number;
  /**
   * True when the main toolbar is in Animate mode — timeline height applies to framing
   * and canvas bottom inset even if the file "Animate" tab hasn't synced yet (one frame).
   */
  animateToolbarActive: boolean;
}

const defaultInsets: CanvasWorkspaceInsets = {
  leftPx: 48 + 240,
  rightPx: 240,
  topPx: 0,
  bottomPx: 0,
  animateToolbarActive: false,
};

const CanvasWorkspaceInsetsContext = createContext<CanvasWorkspaceInsets | null>(null);

export function CanvasWorkspaceInsetsProvider({
  value,
  children,
}: {
  value: CanvasWorkspaceInsets;
  children: ReactNode;
}) {
  return (
    <CanvasWorkspaceInsetsContext.Provider value={value}>
      {children}
    </CanvasWorkspaceInsetsContext.Provider>
  );
}

/** Returns workspace insets; throws if used outside a provider. */
export function useCanvasWorkspaceInsets(): CanvasWorkspaceInsets {
  const ctx = useContext(CanvasWorkspaceInsetsContext);
  if (ctx === null) {
    return defaultInsets;
  }
  return ctx;
}

/** Returns workspace insets or `null` if no provider is present. */
export function useCanvasWorkspaceInsetsOptional(): CanvasWorkspaceInsets | null {
  return useContext(CanvasWorkspaceInsetsContext);
}
