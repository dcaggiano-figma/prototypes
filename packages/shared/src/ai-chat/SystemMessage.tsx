import { type ReactNode } from 'react';
import { IconButton } from '@figma/fpl-components';
import { Icon24ChevronDownLarge, Icon24Plus } from '@figma/fpl-icons';

export interface SystemMessageProps {
  /** Icon rendered before the label */
  icon: ReactNode;
  /** Header label text */
  label: string;
  /** Called when the add button is clicked */
  onAdd?: () => void;
  /** Called when the collapse button is clicked */
  onCollapse?: () => void;
  children?: ReactNode;
}

export function SystemMessage({
  icon,
  label,
  onAdd,
  onCollapse,
  children,
}: SystemMessageProps) {
  return (
    <div className="flex flex-col border-border border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-12px">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 w-full">
          {icon}
          <span className="text-text text-bodyLgStrong">{label}</span>
          <div className="flex gap-1">
            <IconButton aria-label="Add" variant="ghost" onClick={onAdd}>
              <Icon24Plus />
            </IconButton>
            <IconButton aria-label="Collapse" variant="ghost" onClick={onCollapse}>
              <Icon24ChevronDownLarge />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
