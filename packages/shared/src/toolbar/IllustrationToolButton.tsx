import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';

interface IllustrationToolButtonProps {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
  /** Tailwind width class for the button container. Default: `'w-[48px]'` */
  widthClass?: string;
  /** Translate class for the rest state. Default: `'-translate-y-2'` */
  restTranslate?: string;
  /** Translate class for the hover state. Default: `'group-hover:-translate-y-3'` */
  hoverTranslate?: string;
  /** Translate class for the active state. Default: `'-translate-y-4 group-hover:-translate-y-4'` */
  activeTranslate?: string;
}

export function IllustrationToolButton({
  id,
  label,
  isActive,
  onSelect,
  children,
  widthClass = 'w-[48px]',
  restTranslate = '-translate-y-2',
  hoverTranslate = 'group-hover:-translate-y-3',
  activeTranslate = '-translate-y-4 group-hover:-translate-y-4',
}: IllustrationToolButtonProps) {
  return (
    <ButtonPrimitive
      aria-label={label}
      aria-pressed={isActive}
      onClick={() => onSelect(id)}
      className={clsx(
        'group relative flex items-start justify-center rounded-t-md cursor-pointer overflow-visible h-6',
        widthClass,
        isActive && 'bg-bg-secondary',
      )}
    >
      <div
        className={clsx(
          'transition-transform duration-md ease-out',
          hoverTranslate,
          isActive ? activeTranslate : `${restTranslate} hover:-translate-y-1`,
        )}
      >
        {children}
      </div>
    </ButtonPrimitive>
  );
}
