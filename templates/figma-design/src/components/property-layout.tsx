import { IconButton } from '@figma/fpl-components';
import clsx from 'clsx';
import { Icon24Plus } from '@figma/fpl-icons';

export interface PropertySectionProps {
  title: string
  children: React.ReactNode
  /** Icons to show on the right side of the section header */
  headerActions?: React.ReactNode
}

export function PropertySection({ title, children, headerActions }: PropertySectionProps) {
  return (
    <div className="border-b border-border pb-12px">
      <div className="flex items-center justify-between pl-3 pr-2 h-40px">
        <span className="text-text text-bodyMdStrong">
          {title}
        </span>
        {headerActions && (
          <div className="flex items-center gap-4px">
            {headerActions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** A single property row that owns its horizontal padding and uses CSS grid for layout.
 * By default includes a trailing 24px icon slot to keep inputs aligned. */
export function PropertyRow({
  children,
  className,
  columns = '1fr 1fr 24px',
}: {
  children: React.ReactNode
  className?: string
  columns?: string
}) {
  return (
    <div
      className={clsx('grid gap-x-2 items-center pl-3 pr-2 h-32px', className)}
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  );
}

export function PlaceholderSection({ title, actions }: { title: string; actions?: boolean }) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between pl-3 pr-2 h-40px">
        <span className="text-text-secondary text-bodyMdStrong">
          {title}
        </span>
        {actions && (
          <div className="flex items-center gap-4px icon-secondary">
            <IconButton aria-label={`Add ${title.toLowerCase()}`}><Icon24Plus /></IconButton>
          </div>
        )}
      </div>
    </div>
  );
}
