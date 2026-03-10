import { useEffect, useRef } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Toolbar } from './Toolbar';
import { ToastContainer } from './toast';
import { SpeakerNotes } from './SpeakerNotes';
import type { Mode } from './menuTypes';
import { useViewMode } from './ViewModeContext';

interface CanvasOverlayProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
  isActionsOpen: boolean;
  onActionsOpenChange: (open: boolean) => void;
}

/**
 * Default main content overlay — renders route outlet, toolbar, and toasts
 * on top of the canvas. Uses pointer-events: none so clicks pass through to
 * the canvas, with pointer-events: auto on interactive children.
 */
export function CanvasOverlay({ activeMode, onModeChange, isActionsOpen, onActionsOpenChange }: CanvasOverlayProps) {
  const { bottomInsetRef, notifyBottomInsetChange } = useViewMode();
  const bottomContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bottomContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      // Total inset = element height + 12px bottom offset
      const totalInset = el.offsetHeight + 12;
      if (bottomInsetRef.current !== totalInset) {
        bottomInsetRef.current = totalInset;
        notifyBottomInsetChange();
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [bottomInsetRef, notifyBottomInsetChange]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pointer-events-auto">
        <Outlet />
      </div>
      {/* Toolbar area — positioned at bottom center */}
      <div ref={bottomContainerRef} className="absolute bottom-12px left-1/2 -translate-x-1/2 z-nav pointer-events-auto w-full px-3">
        <ToastContainer />
        {activeMode === 'slide' && <SpeakerNotes />}
        <div>{/* Toolbar stack — future secondary toolbars go here */}
          <Toolbar activeMode={activeMode} onModeChange={onModeChange} isActionsOpen={isActionsOpen} onActionsOpenChange={onActionsOpenChange} />
        </div>
      </div>
    </div>
  );
}
