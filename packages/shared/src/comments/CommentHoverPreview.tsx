import { Avatar } from '../Avatar';
import { formatRelativeTime } from './utils';
import type { CommentThread } from './types';
import styles from './comments.module.css';

interface CommentHoverPreviewProps {
  thread: CommentThread;
  style?: React.CSSProperties;
}

export function CommentHoverPreview({ thread, style }: CommentHoverPreviewProps) {
  const lastComment = thread.comments[thread.comments.length - 1];
  if (!lastComment) return null;

  return (
    <div
      className={`${styles.previewEnter} bg-bg-elevated rounded-lg shadow-300 pointer-events-auto`}
      style={{ width: 240, ...style }}
    >
      <div className="flex gap-2 p-3">
        <Avatar size="sm" initial={lastComment.authorInitial} src={lastComment.avatarUrl} alt={lastComment.authorName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-bodySmStrong text-text truncate">{lastComment.authorName}</span>
            <span className="text-bodySm text-text-tertiary">{formatRelativeTime(lastComment.createdAt)}</span>
          </div>
          <p className="text-bodySm text-text mt-0.5 line-clamp-3">{lastComment.body}</p>
        </div>
      </div>
    </div>
  );
}
