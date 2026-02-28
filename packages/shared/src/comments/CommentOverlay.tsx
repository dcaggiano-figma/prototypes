import { useCallback, useEffect } from 'react';
import { useUserConfig } from '../user-config';
import { CommentPopover } from './CommentPopover';
import { CommentHoverPreview } from './CommentHoverPreview';
import { CommentThreadWindow } from './CommentThreadWindow';
import { CommentPin } from './CommentPin';
import { resolveCommentPosition } from './utils';
import type { CommentInteraction, CommentsStoreAPI, CommentThread } from './types';

interface CommentOverlayProps {
  interaction: CommentInteraction;
  setInteraction: (interaction: CommentInteraction) => void;
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
  store: CommentsStoreAPI;
  threads: CommentThread[];
  worldToScreen: (wx: number, wy: number) => { x: number; y: number };
  getNodePosition?: (nodeId: string) => { x: number; y: number } | undefined;
}

export function CommentOverlay({
  interaction,
  setInteraction,
  selectedThreadId,
  setSelectedThreadId,
  store,
  threads,
  worldToScreen,
  getNodePosition,
}: CommentOverlayProps) {
  const { config, initial } = useUserConfig();

  const handleCreateSubmit = useCallback((body: string) => {
    if (interaction.type !== 'placing') return;
    const anchor = {
      worldX: interaction.worldX,
      worldY: interaction.worldY,
      nodeId: interaction.nodeId,
      nodeOffsetX: interaction.nodeOffsetX,
      nodeOffsetY: interaction.nodeOffsetY,
    };
    const thread = store.createThread(anchor, {
      authorName: config.name,
      authorInitial: initial,
      avatarUrl: config.avatarUrl,
      body,
      createdAt: Date.now(),
    });
    setSelectedThreadId(thread.id);
    setInteraction({ type: 'viewing', threadId: thread.id });
  }, [interaction, store, setSelectedThreadId, setInteraction, config, initial]);

  const handleCreateClose = useCallback(() => {
    setInteraction({ type: 'none' });
  }, [setInteraction]);

  const selectedThread = selectedThreadId ? threads.find((t) => t.id === selectedThreadId) : undefined;

  // Close thread window on Escape (when focus is outside the reply input)
  useEffect(() => {
    if (interaction.type !== 'viewing' || !selectedThread) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSelectedThreadId(null);
        setInteraction({ type: 'none' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [interaction.type, selectedThread, setSelectedThreadId, setInteraction]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Placing: show pin + creation popover */}
      {interaction.type === 'placing' && (() => {
        const screen = worldToScreen(interaction.worldX, interaction.worldY);
        return (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                left: screen.x,
                top: screen.y - 32,
              }}
            >
              <CommentPin authorInitial={initial} empty selected />
            </div>
            <div
              className="absolute"
              style={{
                left: screen.x + 48,
                top: screen.y - 32,
              }}
            >
              <CommentPopover
                onSubmit={handleCreateSubmit}
                onClose={handleCreateClose}
              />
            </div>
          </>
        );
      })()}

      {/* Hovering: show preview */}
      {interaction.type === 'hovering' && (() => {
        const thread = threads.find((t) => t.id === interaction.threadId);
        if (!thread) return null;
        const pos = resolveCommentPosition(thread.anchor, getNodePosition);
        const screen = worldToScreen(pos.worldX, pos.worldY);
        return (
          <div
            className="absolute"
            style={{
              left: screen.x + 48,
              top: screen.y - 32,
            }}
          >
            <CommentHoverPreview thread={thread} />
          </div>
        );
      })()}

      {/* Viewing: show thread window positioned near pin */}
      {selectedThread && interaction.type === 'viewing' && (() => {
        const pos = resolveCommentPosition(selectedThread.anchor, getNodePosition);
        const screen = worldToScreen(pos.worldX, pos.worldY);
        const closeThread = () => {
          setSelectedThreadId(null);
          setInteraction({ type: 'none' });
        };
        return (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 pointer-events-auto"
              onPointerDown={closeThread}
            />
            <div
              className="pointer-events-auto absolute"
              style={{
                left: screen.x + 48,
                top: Math.max(8, screen.y - 32),
              }}
            >
              <CommentThreadWindow
                key={selectedThread.id}
                thread={selectedThread}
                onClose={closeThread}
                onResolve={() => {
                  store.deleteThread(selectedThread.id);
                  setSelectedThreadId(null);
                  setInteraction({ type: 'none' });
                }}
                onReply={(body) => {
                  store.addComment(selectedThread.id, {
                    authorName: config.name,
                    authorInitial: initial,
                    avatarUrl: config.avatarUrl,
                    body,
                    createdAt: Date.now(),
                  });
                }}
              />
            </div>
          </>
        );
      })()}
    </div>
  );
}
