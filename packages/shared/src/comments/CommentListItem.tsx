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
      className={`rounded-md w-full text-left px-2 py-2 flex flex-col gap-2 hover:bg-bg-hover cursor-pointer border-none bg-transparent ${selected ? 'bg-bg-selected' : ''} ${thread.resolved ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <Avatar size="md" initial={firstComment.authorInitial} src={firstComment.avatarUrl} color={firstComment.color} alt={firstComment.authorName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-bodyMd text-text truncate">{firstComment.authorName}</span>
          <span className="text-bodyMd text-text-tertiary">{formatRelativeTime(lastComment.createdAt)}</span>
        </div>
        <p className="text-bodyMd text-text-secondary truncate mt-0.5">{lastComment.body}</p>
        {thread.comments.length > 1 && (
          <span className="text-bodyMd text-text-tertiary mt-2 flex">{thread.comments.length} replies</span>
        )}
      </div>
    </button>
  );
}
