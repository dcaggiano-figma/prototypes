import type { ComponentType } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';
import { useLeftSidebar } from './LeftSidebarContext';

interface LeftSidebarNavItemProps {
  id: string;
  icon: ComponentType;
  label: string;
  showLabel?: boolean;
}

export function LeftSidebarNavItem({ id, icon: Icon, label, showLabel = false }: LeftSidebarNavItemProps) {
  const { activeItem, onItemChange } = useLeftSidebar();
  const isActive = activeItem === id;

  return (
    <ButtonPrimitive
      onClick={() => onItemChange(id)}
      aria-label={label}
      className="group flex flex-col items-center"
    >
      <div
        className={clsx(
          'rounded-md h-32px w-32px flex items-center justify-center group-hover:bg-bg-hover',
          isActive ? 'bg-bg-selected icon-brand' : '',
        )}
      >
        <Icon />
      </div>
      {showLabel && (
        <span className="text-bodySm text-text py-1 flex items-center justify-center">
          {label}
        </span>
      )}
    </ButtonPrimitive>
  );
}
