import clsx from 'clsx';
import { Avatar } from '../Avatar';
import styles from './comments.module.css';

interface CommentPinProps {
  authorInitial: string;
  avatarUrl?: string;
  selected?: boolean;
  resolved?: boolean;
  empty?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export function CommentPin({
  authorInitial,
  avatarUrl,
  selected = false,
  resolved = false,
  empty = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CommentPinProps) {
  const borderColor = selected
    ? 'var(--color-border-brand)'
    : resolved
      ? 'var(--color-border-success)'
      : 'var(--color-border)';

  return (
    <div
      className={clsx(styles.pinHover, styles.pinEnter, 'relative cursor-pointer')}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="flex items-center justify-center bg-bg"
        style={{
          width: 32,
          height: 32,
          borderRadius: '999px 999px 999px 0',
          border: `${selected ? 2.5 : 1.5}px solid ${borderColor}`,
        }}
      >
        {!empty && (
          <Avatar
            size="md"
            initial={authorInitial}
            src={avatarUrl}
            alt={authorInitial}
          />
        )}
      </div>
    </div>
  );
}
