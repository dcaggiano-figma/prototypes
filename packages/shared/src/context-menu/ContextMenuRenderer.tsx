import { Menu } from '@figma/fpl-components';
import type { MenuItemDef } from './types';
import { renderMenuItems } from './renderMenuItems';

interface ContextMenuRendererProps {
  manager: ReturnType<typeof Menu.useMenu>['manager'];
  items: MenuItemDef[];
}

export function ContextMenuRenderer({ manager, items }: ContextMenuRendererProps) {
  return (
    <div data-preferred-theme="dark">
      <Menu.Root manager={manager}>
        <Menu.Container>
          {renderMenuItems(items)}
        </Menu.Container>
      </Menu.Root>
    </div>
  );
}
