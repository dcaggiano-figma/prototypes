import { IconButton } from '@figma/fpl-components';
import { Icon24More } from '@figma/fpl-icons';
import { Avatar } from '../avatar/Avatar';
import { Text } from '../typography/Text';
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
  timestampChip?: React.ReactNode;
}

export function CommentMessage({
  authorName,
  authorInitial,
  avatarUrl,
  color,
  body,
  createdAt,
  showSeparator = false,
  timestampChip,
}: CommentMessageProps) {
  return (
    <div className={showSeparator ? 'border-t border-border' : ''}>
      <div className="flex gap-2 px-3 pt-3 pb-2">
        <Avatar size="md" initial={authorInitial} src={avatarUrl} color={color} alt={authorName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Text size='lg' strong truncate>{authorName}</Text>
            <Text size='lg' color='tertiary' className="whitespace-nowrap pl-1">{formatRelativeTime(createdAt)}</Text>
            <div className="ml-auto">
              <IconButton aria-label="More options">
                <Icon24More />
              </IconButton>
            </div>
          </div>
          <Text size='lg' as='p' className="mt-2 inline-block">
            {timestampChip && <span className="inline-flex align-middle pr-2">{timestampChip}</span>}
            {body}
          </Text>
        </div>
      </div>
    </div>
  );
}
