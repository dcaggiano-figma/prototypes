import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';

interface IllustrationToolButtonProps {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
}

export function IllustrationToolButton({
  id,
  label,
  isActive,
  onSelect,
  children,
}: IllustrationToolButtonProps) {
  return (
    <ButtonPrimitive
      aria-label={label}
      aria-pressed={isActive}
      onClick={() => onSelect(id)}
      className={clsx(
        'group relative flex items-start justify-center rounded-t-md cursor-pointer overflow-visible w-[48px] h-6',
        isActive && 'bg-bg-secondary',
      )}
    >
      <div
        className={clsx(
          'transition-transform duration-md ease-out group-hover:-translate-y-3',
          isActive ? '-translate-y-4 group-hover:-translate-y-4' : '-translate-y-2 hover:-translate-y-1',
        )}
      >
        {children}
      </div>
    </ButtonPrimitive>
  );
}
