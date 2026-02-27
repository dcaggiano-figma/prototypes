import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// QuickActions data types
// ---------------------------------------------------------------------------

export interface ActionItem {
  id: string;
  icon?: ComponentType;
  label: string;
  onClick?: () => void;
  badge?: string;
  checkbox?: boolean;
  defaultChecked?: boolean;
}

export interface ActionSection {
  title: string;
  items: ActionItem[];
}

export interface TabConfig {
  key: string;
  label: string;
  sections: ActionSection[];
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// ToolButton types
// ---------------------------------------------------------------------------

export interface SubTool {
  id: string;
  label: string;
  Icon: ComponentType;
  LargeIcon?: ComponentType;
  shortcut?: string;
}
