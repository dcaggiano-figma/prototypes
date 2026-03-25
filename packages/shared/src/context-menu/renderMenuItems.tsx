import type { ReactNode } from 'react';
import { MenuV2 } from '@figma/fpl-components/beta';
import type { MenuItemDef } from './types';

export function renderMenuItems(items: MenuItemDef[]): ReactNode {
  return items.map((item, i) => {
    switch (item.type) {
      case 'separator':
        return <MenuV2.Separator key={`sep-${String(i)}`} />;
      case 'title':
        return <MenuV2.Group key={item.id} title={item.label}>{null}</MenuV2.Group>;
      case 'checkbox':
        return (
          <MenuV2.CheckboxItem key={item.id} checked={item.checked} onChange={item.onChange}>
            {item.label}
          </MenuV2.CheckboxItem>
        );
      case 'radiogroup':
        return (
          <MenuV2.RadioGroup
            key={item.id}
            value={item.value}
            onChange={item.onChange}
            aria-label={item.title ?? item.id}
          >
            {item.options.map((opt) => (
              <MenuV2.RadioGroupItem key={opt.id} value={opt.id}>
                {opt.label}
              </MenuV2.RadioGroupItem>
            ))}
          </MenuV2.RadioGroup>
        );
      case 'group':
        return (
          <MenuV2.Group key={item.id} title={item.title}>
            {renderMenuItems(item.children)}
          </MenuV2.Group>
        );
      case 'submenu':
        return (
          <MenuV2.SubMenu key={item.id} title={item.label}>
            {renderMenuItems(item.children)}
          </MenuV2.SubMenu>
        );
      case 'item': {
        const Icon = item.icon;
        return (
          <MenuV2.Item
            key={item.id}
            disabled={item.disabled}
            onClick={item.onClick}
            lead={Icon ? <Icon /> : undefined}
            trail={item.shortcut ? <MenuV2.Shortcut>{item.shortcut}</MenuV2.Shortcut> : undefined}
          >
            {item.label}
          </MenuV2.Item>
        );
      }
    }
  });
}
