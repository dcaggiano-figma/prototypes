import { useActiveTool } from '../canvas';
import { useResizablePanel, ResizeHandle } from '@prototype/shared';
import type { Mode } from './menuTypes';
import { PanelHeader, DesignModeContent, CommentsPanelContent } from './modes';

interface RightPanelProps {
  activeMode: Mode;
}

/* ---------- Main RightPanel ---------- */

export function RightPanel({ activeMode: _activeMode }: RightPanelProps) {
  const { panelRef, onMouseDown } = useResizablePanel({ minWidth: 240, side: 'left' });
  const { activeTool } = useActiveTool();

  return (
    <aside
      ref={panelRef}
      className="relative w-[240px] shrink-0 bg-bg border-l border-border flex flex-col z-sidebar"
    >
      <PanelHeader />
      {activeTool === 'COMMENT' ? <CommentsPanelContent /> : <DesignModeContent />}
      <ResizeHandle onMouseDown={onMouseDown} side="left" />
    </aside>
  );
}
