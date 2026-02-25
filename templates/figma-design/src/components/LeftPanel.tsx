import { useResizablePanel } from '../helpers/useResizablePanel';
import { ResizeHandle } from './ResizeHandle';
import { FilePanel, SearchPanel, AiChatPanel, AssetsPanel } from './panels';
import { VariablesPanel } from './variables';

interface LeftPanelProps {
  activeItem: string;
}

/* ---------- Main LeftPanel ---------- */

const PANELS: Record<string, React.FC> = {
  file: FilePanel,
  assets: AssetsPanel,
  search: SearchPanel,
  ai: AiChatPanel,
  variables: VariablesPanel,
};

export function LeftPanel({ activeItem }: LeftPanelProps) {
  const PanelContent = PANELS[activeItem] ?? FilePanel;
  const { panelRef, onMouseDown } = useResizablePanel({ minWidth: 240, side: 'right' });

  return (
    <aside ref={panelRef} className="relative w-[240px] shrink-0 bg-bg border-r border-border flex flex-col z-sidebar">
      <PanelContent />
      <ResizeHandle onMouseDown={onMouseDown} side="right" />
    </aside>
  );
}
