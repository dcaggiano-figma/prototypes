import { Outlet } from '@tanstack/react-router';
import { FigJamToolbar } from './FigJamToolbar';
import { ToastContainer } from './toast';

/**
 * FigJam canvas overlay — renders route outlet, toast container, and the
 * FigJam toolbar stack at bottom center. Uses pointer-events: none so clicks
 * pass through to the canvas, with pointer-events: auto on interactive children.
 */
export function FigJamCanvasOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pointer-events-auto">
        <Outlet />
      </div>
      {/* Toolbar area — positioned at bottom center */}
      <div className="absolute bottom-12px left-1/2 -translate-x-1/2 z-nav pointer-events-auto">
        <ToastContainer />
        <FigJamToolbar />
      </div>
    </div>
  );
}
