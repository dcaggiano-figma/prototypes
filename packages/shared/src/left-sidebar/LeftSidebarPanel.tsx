import { type ComponentType } from 'react';
import { useRegisterPopupObstacle } from '@figma/fpl-components';
import { useResizablePanel } from '../layout/useResizablePanel';
import { ResizeHandle } from '../layout/ResizeHandle';
import { useLeftSidebar } from './LeftSidebarContext';

interface LeftSidebarPanelProps {
  /** Map of nav item IDs to panel content components */
  panels: Record<string, ComponentType>;
  /** Component to show when active item has no panel entry. If null/undefined, panel is hidden. */
  fallback?: ComponentType | null;
}

export function LeftSidebarPanel({ panels, fallback }: LeftSidebarPanelProps) {
  const { activeItem } = useLeftSidebar();
  const { panelRef, onMouseDown } = useResizablePanel({ minWidth: 240, side: 'right' });
  const obstacleRef = useRegisterPopupObstacle(panelRef);

  const PanelContent = panels[activeItem] ?? fallback ?? null;

  if (!PanelContent) return null;

  return (
    <aside ref={obstacleRef} className="relative w-[240px] shrink-0 bg-bg border-r border-border flex flex-col z-sidebar">
      <PanelContent />
      <ResizeHandle onMouseDown={onMouseDown} side="right" />
    </aside>
  );
}
