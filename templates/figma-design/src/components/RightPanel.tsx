import { useResizablePanel } from '../helpers/useResizablePanel';
import type { Mode } from './menuTypes';
import { ResizeHandle } from './ResizeHandle';
import { PanelHeader, DesignModeContent, DevModeContent, DrawModeContent } from './modes';

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
  const ModeContent = MODE_CONTENT[activeMode];

  return (
    <aside
      ref={panelRef}
      className="relative w-[240px] shrink-0 bg-bg border-l border-border flex flex-col z-sidebar"
    >
      <PanelHeader />
      <ModeContent />
      <ResizeHandle onMouseDown={onMouseDown} side="left" />
    </aside>
  );
}
