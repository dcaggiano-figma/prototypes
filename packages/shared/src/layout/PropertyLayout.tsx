import { IconButton } from '@figma/fpl-components';
import clsx from 'clsx';
import { Icon24Plus } from '@figma/fpl-icons';

export interface PropertySectionProps {
  title: string
  children?: React.ReactNode
  /** Icons to show on the right side of the section header */
  headerActions?: React.ReactNode
}

export function PropertySection({ title, children, headerActions }: PropertySectionProps) {
  return (
    <div className={clsx(`group border-b border-border`, children ? 'pb-12px' : '')}>
      <div className="flex items-center justify-between pl-3 pr-2 h-40px">
        <span className={clsx(`text-bodyMdStrong group-hover:text-text`, children ? 'text-text' : 'text-text-secondary')}>
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

export interface PropertyRowProps {
  children: React.ReactNode
  className?: string
  columns?: string
  style?: React.CSSProperties
}

/** A single property row that owns its horizontal padding and uses CSS grid for layout.
 * By default includes a trailing 24px icon slot to keep inputs aligned. */
export function PropertyRow({
  children,
  className,
  columns = '1fr 1fr 24px',
  style,
}: PropertyRowProps) {
  return (
    <div
      className={clsx('grid gap-x-2 items-center pl-3 pr-2 py-1', className)}
      style={{ gridTemplateColumns: columns, ...style }}
    >
      {children}
    </div>
  );
}

export interface PlaceholderSectionProps {
  title: string
  actions?: boolean
  onAdd?: () => void
}

export function PlaceholderSection({ title, actions, onAdd }: PlaceholderSectionProps) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between pl-3 pr-2 h-40px">
        <span className="text-text-secondary text-bodyMdStrong">
          {title}
        </span>
        {actions && (
          <div className="flex items-center gap-4px icon-secondary">
            <IconButton aria-label={`Add ${title.toLowerCase()}`} onClick={onAdd}><Icon24Plus /></IconButton>
          </div>
        )}
      </div>
    </div>
  );
}
