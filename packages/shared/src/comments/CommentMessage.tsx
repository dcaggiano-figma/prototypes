import { IconButton } from '@figma/fpl-components';
import { Icon24More } from '@figma/fpl-icons';
import { Avatar } from '../avatar/Avatar';
import type { MultiplayerColor } from '../avatar/Avatar';
import { formatRelativeTime } from './utils';

interface CommentMessageProps {
  authorName: string;
  authorInitial: string;
  avatarUrl?: string;
  color?: MultiplayerColor;
  body: string;
  createdAt: number;
  showSeparator?: boolean;
}

export function CommentMessage({
  authorName,
  authorInitial,
  avatarUrl,
  color,
  body,
  createdAt,
  showSeparator = false,
}: CommentMessageProps) {
  return (
    <div className={showSeparator ? 'border-t border-border' : ''}>
      <div className="flex gap-2 px-3 pt-3 pb-2">
        <Avatar size="md" initial={authorInitial} src={avatarUrl} color={color} alt={authorName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-bodyLgStrong text-text truncate">{authorName}</span>
            <span className="text-bodyLg text-text-tertiary whitespace-nowrap">{formatRelativeTime(createdAt)}</span>
            <div className="ml-auto">
              <IconButton aria-label="More options">
                <Icon24More />
              </IconButton>
            </div>
          </div>
          <p className="text-bodyLg text-text mt-2 mb-2 whitespace-pre-wrap break-words">{body}</p>
        </div>
      </div>
    </div>
  );
}
