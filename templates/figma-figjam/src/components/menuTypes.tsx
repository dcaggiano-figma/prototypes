import { type ComponentType, type ReactNode } from 'react';
import { Menu } from '@figma/fpl-components';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type Mode = 'figjam';

export type MenuItemDef =
  | { type: 'item'; id: string; label: string; shortcut?: string; icon?: ComponentType; disabled?: boolean; onClick: () => void }
  | { type: 'checkbox'; id: string; label: string; checked: boolean; onChange: (v: boolean) => void }
  | { type: 'radiogroup'; id: string; title?: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }
  | { type: 'submenu'; id: string; label: string; children: MenuItemDef[] }
  | { type: 'separator' }
  | { type: 'title'; id: string; label: string };

// ---------------------------------------------------------------------------
// Recursive menu renderer
// ---------------------------------------------------------------------------

export function renderMenuItems(items: MenuItemDef[]): ReactNode {
  return items.map((item, i) => {
    switch (item.type) {
      case 'separator':
        return <Menu.Separator key={`sep-${String(i)}`} />;
      case 'title':
        return <Menu.Title key={item.id}>{item.label}</Menu.Title>;
      case 'checkbox':
        return (
          <Menu.CheckboxItem key={item.id} checked={item.checked} onChange={item.onChange}>
            {item.label}
          </Menu.CheckboxItem>
        );
      case 'radiogroup':
        return (
          <Menu.RadioGroup
            key={item.id}
            value={item.value}
            onChange={item.onChange}
            title={item.title ? <Menu.Title>{item.title}</Menu.Title> : <Menu.HiddenTitle>{item.id}</Menu.HiddenTitle>}
          >
            {item.options.map((opt) => (
              <Menu.RadioGroupItem key={opt.id} value={opt.id}>
                {opt.label}
              </Menu.RadioGroupItem>
            ))}
          </Menu.RadioGroup>
        );
      case 'submenu':
        return (
          <Menu.SubMenu key={item.id}>
            <Menu.SubTrigger>{item.label}</Menu.SubTrigger>
            <Menu.SubContainer>{renderMenuItems(item.children)}</Menu.SubContainer>
          </Menu.SubMenu>
        );
      case 'item': {
        const Icon = item.icon;
        return (
          <Menu.Item key={item.id} disabled={item.disabled} onClick={item.onClick}>
            {Icon && <Menu.ItemLead><Icon /></Menu.ItemLead>}
            {item.label}
            {item.shortcut && (
              <Menu.ItemTrail><Menu.Shortcut>{item.shortcut}</Menu.Shortcut></Menu.ItemTrail>
            )}
          </Menu.Item>
        );
      }
    }
  });
}
