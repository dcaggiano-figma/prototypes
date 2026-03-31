import { createPortal } from 'react-dom';
import { Outlet } from '@tanstack/react-router';
import { Toolbar } from './Toolbar';
import { ToastContainer } from './toast';
import type { Mode } from './menuTypes';
import { TIMELINE_COLLAPSED_HEIGHT_PX } from './timeline';
import { useTimelineResizing } from '../contexts/TimelineVisibilityContext';

const TOOLBAR_BOTTOM_GAP_PX = 20;
/** When timeline is collapsed, extra gap above it so toolbar sits a bit higher. */
const TOOLBAR_EXTRA_GAP_WHEN_COLLAPSED_PX = 20;

const TIMELINE_SLIDE_MS = 300;

interface CanvasOverlayProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
  isActionsOpen: boolean;
  onActionsOpenChange: (open: boolean) => void;
  onQuickAction?: (id: string) => void;
  /** Timeline panel height in px (0 when closed, 48 when collapsed, 302 when expanded). */
  timelineHeightPx: number;
}

/**
 * Default main content overlay — renders route outlet, toolbar, and toasts
 * on top of the canvas. Timeline is rendered at root level (full width under sidebars).
 */
export function CanvasOverlay({ activeMode, onModeChange, isActionsOpen, onActionsOpenChange, onQuickAction, timelineHeightPx }: CanvasOverlayProps) {
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('toolbar-portal') : null;
  const resizing = useTimelineResizing();

  const isTimelineCollapsed = timelineHeightPx > 0 && timelineHeightPx === TIMELINE_COLLAPSED_HEIGHT_PX;
  const bottom =
    timelineHeightPx > 0
      ? isTimelineCollapsed
        ? TIMELINE_COLLAPSED_HEIGHT_PX + TOOLBAR_EXTRA_GAP_WHEN_COLLAPSED_PX
        : timelineHeightPx - TOOLBAR_BOTTOM_GAP_PX
      : TOOLBAR_BOTTOM_GAP_PX;

  const toolbarElement = (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2"
      style={{
        bottom,
        transition: resizing ? 'none' : `bottom ${String(TIMELINE_SLIDE_MS)}ms ease-out`,
      }}
    >
      <ToastContainer />
      <div>
        <Toolbar activeMode={activeMode} onModeChange={onModeChange} isActionsOpen={isActionsOpen} onActionsOpenChange={onActionsOpenChange} onQuickAction={onQuickAction} />
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pointer-events-auto">
        <Outlet />
      </div>
      {portalRoot
        ? createPortal(toolbarElement, portalRoot)
        : toolbarElement}
    </div>
  );
}
