import clsx from 'clsx';
import { Avatar } from '../Avatar';
import type { MultiplayerColor } from '../Avatar';
import styles from './comments.module.css';

interface CommentPinProps {
  authorInitial: string;
  avatarUrl?: string;
  color?: MultiplayerColor;
  selected?: boolean;
  hovered?: boolean;
  resolved?: boolean;
  empty?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export function CommentPin({
  authorInitial,
  avatarUrl,
  color,
  selected = false,
  hovered = false,
  resolved = false,
  empty = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CommentPinProps) {
  const borderColor = selected
    ? 'var(--color-border-selected-strong)'
    : hovered
      ? 'var(--color-border-brand)'
      : resolved
        ? 'var(--color-border-transparent)'
        : 'var(--color-border-transparent)';

  return (
    <div
      className={clsx(styles.pinHover, styles.pinEnter, 'relative cursor-pointer')}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="flex items-center justify-center bg-bg shadow-100"
        style={{
          width: 32,
          height: 32,
          borderRadius: '999px 999px 999px 0',
          outline: `${selected || hovered ? 2 : 1}px solid ${borderColor}`,
        }}
      >
        {!empty && (
          <Avatar
            size="md"
            initial={authorInitial}
            src={avatarUrl}
            color={color}
            alt={authorInitial}
          />
        )}
      </div>
    </div>
  );
}
