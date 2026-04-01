import { useRegisterPopupObstacle } from '@figma/fpl-components';
import { useActiveTool } from '../canvas';
import { useResizablePanel, ResizeHandle } from '@prototype/shared';
import type { Mode } from './menuTypes';
import { PanelHeader, DesignModeContent, DevModeContent, DrawModeContent, CommentsPanelContent } from './modes';

interface RightPanelProps {
  activeMode: Mode;
}

/* ---------- Main RightPanel ---------- */

const MODE_CONTENT: Record<Mode, React.FC> = {
  design: DesignModeContent,
  dev: DevModeContent,
  draw: DrawModeContent,
};

export function RightPanel({ activeMode }: RightPanelProps) {
  const { panelRef, onMouseDown } = useResizablePanel({ minWidth: 240, side: 'left' });
  const obstacleRef = useRegisterPopupObstacle(panelRef);
  const { activeTool } = useActiveTool();
  const ModeContent = MODE_CONTENT[activeMode];

  return (
    <aside
      ref={obstacleRef}
      className="relative w-[240px] shrink-0 bg-bg border-l border-border flex flex-col z-sidebar"
    >
      <PanelHeader />
      {activeTool === 'COMMENT' ? <CommentsPanelContent /> : <ModeContent />}
      <ResizeHandle onMouseDown={onMouseDown} side="left" />
    </aside>
  );
}
