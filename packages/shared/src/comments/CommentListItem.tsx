import { Avatar } from '../Avatar';
import { formatRelativeTime } from './utils';
import type { CommentThread } from './types';

interface CommentListItemProps {
  thread: CommentThread;
  onClick: () => void;
  selected?: boolean;
}

export function CommentListItem({ thread, onClick, selected = false }: CommentListItemProps) {
  const firstComment = thread.comments[0];
  const lastComment = thread.comments[thread.comments.length - 1];
  if (!firstComment || !lastComment) return null;

  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 flex gap-2 hover:bg-bg-hover cursor-pointer border-none bg-transparent ${selected ? 'bg-bg-selected' : ''} ${thread.resolved ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <Avatar size="md" initial={firstComment.authorInitial} src={firstComment.avatarUrl} alt={firstComment.authorName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-bodySmStrong text-text truncate">{firstComment.authorName}</span>
          <span className="text-bodySm text-text-tertiary">{formatRelativeTime(lastComment.createdAt)}</span>
        </div>
        <p className="text-bodySm text-text-secondary truncate mt-0.5">{lastComment.body}</p>
        {thread.comments.length > 1 && (
          <span className="text-bodySm text-text-tertiary">{thread.comments.length} replies</span>
        )}
      </div>
    </button>
  );
}
