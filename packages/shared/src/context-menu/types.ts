import type { ComponentType } from 'react';

export type MenuItemDef =
  | { type: 'item'; id: string; label: string; shortcut?: string; icon?: ComponentType; disabled?: boolean; onClick: () => void }
  | { type: 'checkbox'; id: string; label: string; checked: boolean; onChange: (v: boolean) => void }
  | { type: 'radiogroup'; id: string; title?: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }
  | { type: 'submenu'; id: string; label: string; children: MenuItemDef[] }
  | { type: 'group'; id: string; title?: string; children: MenuItemDef[] }
  | { type: 'separator' }
  | { type: 'title'; id: string; label: string };
