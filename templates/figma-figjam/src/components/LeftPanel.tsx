import { useResizablePanel, ResizeHandle } from '@prototype/shared';
import { TemplatesPanel, AssetsPanel, AiChatPanel } from './panels';

interface LeftPanelProps {
  activeItem: string;
}

const PANELS: Record<string, React.FC> = {
  templates: TemplatesPanel,
  assets: AssetsPanel,
  ai: AiChatPanel,
};

export function LeftPanel({ activeItem }: LeftPanelProps) {
  const PanelContent = PANELS[activeItem];
  const { panelRef, onMouseDown } = useResizablePanel({ minWidth: 240, side: 'right' });

  // No panel for 'file' or unknown items
  if (!PanelContent) return null;

  return (
    <aside ref={panelRef} className="relative w-[240px] shrink-0 bg-bg border-r border-border flex flex-col z-sidebar">
      <PanelContent />
      <ResizeHandle onMouseDown={onMouseDown} side="right" />
    </aside>
  );
}
