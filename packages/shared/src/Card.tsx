import type { ReactNode } from 'react';
import { CardPrimitive } from '@figma/fpl-components';
import clsx from 'clsx';

interface CardProps {
  contained?: boolean;
  size?: 'md' | 'lg';
  selected?: boolean;
  label: string;
  subtext?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function Card({
  contained = false,
  size = 'md',
  selected = false,
  label,
  subtext,
  leading,
  trailing,
  onClick,
  children,
  className,
}: CardProps) {
  const hasRow = leading || trailing;

  const rootClasses = clsx(
    contained
      ? clsx(
          'relative group border rounded-lg',
          selected
            ? 'border-border-selected bg-bg-selected'
            : 'border-border',
        )
      : clsx(
          'relative flex flex-col gap-2 p-2',
          selected && 'bg-bg-selected rounded-lg ring-1 ring-border-selected',
        ),
    className,
  );

  const contentRowClasses = clsx(
    contained
      ? clsx('px-16px pt-8px pb-16px', hasRow && 'flex items-center gap-3')
      : hasRow && 'flex items-center justify-between',
    !hasRow && 'flex flex-col',
  );

  const labelClasses = clsx(
    size === 'lg' ? 'text-bodyLg' : 'text-bodyMd',
    'text-text',
  );

  const subtextClasses = 'text-bodyMd text-text-secondary';

  return (
    <CardPrimitive.Root className={rootClasses}>
      {onClick && (
        <CardPrimitive.MainButton
          onClick={onClick}
          className="absolute inset-0 rounded-lg hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-selected"
        />
      )}
      {children}
      <div className={contentRowClasses}>
        {leading}
        <div className="flex flex-col">
          <span className={labelClasses}>{label}</span>
          {subtext && <span className={subtextClasses}>{subtext}</span>}
        </div>
        {trailing && (
          <CardPrimitive.Interactive>{trailing}</CardPrimitive.Interactive>
        )}
      </div>
    </CardPrimitive.Root>
  );
}
