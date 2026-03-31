import { createContext, useContext, type ReactNode } from 'react';

export interface TimelineVisibilityValue {
  /** True when timeline panel has finished its open transition (used to avoid canvas jump). */
  visible: boolean;
  /** Current timeline panel height in px (0 when closed, 48 when collapsed, 302 when expanded). */
  heightPx: number;
  /** True when the user is dragging the timeline resize handle. */
  resizing: boolean;
}

const TimelineVisibilityContext = createContext<TimelineVisibilityValue>({ visible: false, heightPx: 0, resizing: false });

export function useTimelineVisible() {
  return useContext(TimelineVisibilityContext).visible;
}

export function useTimelineHeightPx() {
  return useContext(TimelineVisibilityContext).heightPx;
}

export function useTimelineResizing() {
  return useContext(TimelineVisibilityContext).resizing;
}

interface TimelineVisibilityProviderProps {
  visible: boolean;
  heightPx: number;
  resizing?: boolean;
  children: ReactNode;
}

export function TimelineVisibilityProvider({ visible, heightPx, resizing = false, children }: TimelineVisibilityProviderProps) {
  return (
    <TimelineVisibilityContext.Provider value={{ visible, heightPx, resizing }}>
      {children}
    </TimelineVisibilityContext.Provider>
  );
}
