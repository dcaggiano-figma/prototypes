import { useSyncExternalStore } from 'react';
import { CommentPin } from './CommentPin';
import { resolveCommentPosition } from './utils';
import type { CommentsStoreAPI, CommentInteraction } from './types';

interface CommentPinLayerProps {
  commentsStore: CommentsStoreAPI;
  interaction: CommentInteraction;
  selectedThreadId: string | null;
  onPinClick: (threadId: string) => void;
  onPinHoverStart: (threadId: string) => void;
  onPinHoverEnd: () => void;
  getNodePosition?: (nodeId: string) => { x: number; y: number } | undefined;
}

export function CommentPinLayer({
  commentsStore,
  interaction,
  selectedThreadId,
  onPinClick,
  onPinHoverStart,
  onPinHoverEnd,
  getNodePosition,
}: CommentPinLayerProps) {
  const threads = useSyncExternalStore(
    commentsStore.subscribe,
    commentsStore.getSnapshot,
  );

  return (
    <div className="absolute top-0 left-0 pointer-events-none" style={{ zIndex: 1 }}>
      {threads.map((thread) => {
        const pos = resolveCommentPosition(thread.anchor, getNodePosition);
        const isSelected = selectedThreadId === thread.id;
        const isHovered = interaction.type === 'hovering' && interaction.threadId === thread.id;
        const firstComment = thread.comments[0];
        if (!firstComment) return null;

        return (
          <div
            key={thread.id}
            className="absolute pointer-events-auto"
            style={{
              left: pos.worldX - 6,
              top: pos.worldY - 40,
            }}
          >
            <CommentPin
              authorInitial={firstComment.authorInitial}
              avatarUrl={firstComment.avatarUrl}
              selected={isSelected || isHovered}
              resolved={thread.resolved}
              onClick={(e) => {
                e.stopPropagation();
                onPinClick(thread.id);
              }}
              onMouseEnter={() => onPinHoverStart(thread.id)}
              onMouseLeave={onPinHoverEnd}
            />
          </div>
        );
      })}
    </div>
  );
}
