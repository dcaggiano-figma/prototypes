import { MenuV2 } from '@figma/fpl-components/beta';
import type { MenuItemDef } from './types';
import { renderMenuItems } from './renderMenuItems';

interface ContextMenuRendererProps {
  manager: ReturnType<typeof MenuV2.useMenu>['manager'];
  items: MenuItemDef[];
  /** Ref for the hidden positioning anchor — from useContextMenu */
  anchorRef: React.RefObject<HTMLDivElement>;
}

export function ContextMenuRenderer({ manager, items, anchorRef }: ContextMenuRendererProps) {
  return (
    <div data-preferred-theme="dark">
      {/* Hidden zero-size anchor positioned at right-click coordinates */}
      <div ref={anchorRef} style={{ position: 'fixed', width: 0, height: 0, pointerEvents: 'none' }} />
      <MenuV2.Root manager={manager}>
        {renderMenuItems(items)}
      </MenuV2.Root>
    </div>
  );
}
