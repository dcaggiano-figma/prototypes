import { useCallback } from 'react';
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
      authorName: 'You',
      authorInitial: 'Y',
      body,
      createdAt: Date.now(),
    });
    setSelectedThreadId(thread.id);
    setInteraction({ type: 'viewing', threadId: thread.id });
  }, [interaction, store, setSelectedThreadId, setInteraction]);

  const handleCreateClose = useCallback(() => {
    setInteraction({ type: 'none' });
  }, [setInteraction]);

  const selectedThread = selectedThreadId ? threads.find((t) => t.id === selectedThreadId) : undefined;

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
              <CommentPin authorInitial="Y" empty selected />
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
              top: screen.y - 20,
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
        return (
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
              onClose={() => {
                setSelectedThreadId(null);
                setInteraction({ type: 'none' });
              }}
              onResolve={() => {
                if (selectedThread.resolved) {
                  store.unresolveThread(selectedThread.id);
                } else {
                  store.resolveThread(selectedThread.id);
                }
              }}
              onReply={(body) => {
                store.addComment(selectedThread.id, {
                  authorName: 'You',
                  authorInitial: 'Y',
                  body,
                  createdAt: Date.now(),
                });
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}
