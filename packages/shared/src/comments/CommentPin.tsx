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
  return (
    <div
      className={clsx(styles.pinHover, styles.pinEnter, 'relative cursor-pointer')}
      style={{ width: 32, height: 40 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Speech bubble shape via SVG */}
      <svg
        width="32"
        height="40"
        viewBox="0 0 32 40"
        fill="none"
        className="absolute inset-0"
      >
        {/* Bubble body + tail */}
        <path
          d="M16 32C16 32 2 32 2 16C2 7.16 8.27 0 16 0C23.73 0 30 7.16 30 16C30 32 16 32 16 32L6 40L2 32"
          fill="white"
        />
        <path
          d="M16 32C16 32 2 32 2 16C2 7.16 8.27 0 16 0C23.73 0 30 7.16 30 16C30 32 16 32 16 32L6 40L2 32"
          stroke={selected ? 'var(--color-border-brand)' : resolved ? 'var(--color-border-success)' : 'var(--color-border)'}
          strokeWidth={selected ? 2.5 : 1.5}
          fill="white"
        />
      </svg>
      {/* Avatar centered in the circle */}
      <div className="absolute top-[4px] left-[4px]">
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
