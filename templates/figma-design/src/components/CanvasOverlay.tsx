import { Outlet } from '@tanstack/react-router';
import { Toolbar } from './Toolbar';
import { ToastContainer } from './toast';
import type { Mode } from './menuTypes';

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
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pointer-events-auto">
        <Outlet />
      </div>
      {/* Toolbar area — positioned at bottom center */}
      <div className="absolute bottom-12px left-1/2 -translate-x-1/2 z-nav pointer-events-auto">
        <ToastContainer />
        <div>{/* Toolbar stack — future secondary toolbars go here */}
          <Toolbar activeMode={activeMode} onModeChange={onModeChange} isActionsOpen={isActionsOpen} onActionsOpenChange={onActionsOpenChange} />
        </div>
      </div>
    </div>
  );
}
