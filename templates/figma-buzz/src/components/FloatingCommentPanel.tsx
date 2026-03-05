import { useCallback, useRef, useState } from 'react';
import { IconButton, ScrollContainer, SearchInput } from '@figma/fpl-components';
import {
  Icon24Comment,
  Icon24Filter,
  Icon24More,
  Icon24Close,
} from '@figma/fpl-icons';
import { CommentListItem, useComments } from '@prototype/shared';
import { useActiveTool } from '../canvas';

/** Height of BuzzTopRight header (p-2 = 8px top/bottom + ~32px content) */
const HEADER_HEIGHT = 48;
/** Matches BuzzTopRight top/right offset */
const EDGE_INSET = 12;
/** Gap between header and this panel */
const GAP = 12;

export function FloatingCommentPanel() {
  const { activeTool } = useActiveTool();
  const { threads, setSelectedThreadId, setInteraction } = useComments();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleThreadClick = (threadId: string) => {
    setSelectedThreadId(threadId);
    setInteraction({ type: 'viewing', threadId });
  };

  const handleClose = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  };

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        offsetX: dragOffset.x,
        offsetY: dragOffset.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [dragOffset],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setDragOffset({
        x: dragStartRef.current.offsetX + (e.clientX - dragStartRef.current.mouseX),
        y: dragStartRef.current.offsetY + (e.clientY - dragStartRef.current.mouseY),
      });
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (activeTool !== 'COMMENT') return null;

  return (
    <div
      ref={panelRef}
      className="absolute z-nav pointer-events-auto flex flex-col bg-bg-elevated rounded-lg shadow-300 overflow-hidden"
      style={{
        width: 320,
        height: 400,
        right: EDGE_INSET - dragOffset.x,
        top: EDGE_INSET + HEADER_HEIGHT + GAP + dragOffset.y,
      }}
    >
      {/* Draggable header */}
      <div
        className="flex items-center px-3 py-2 border-b border-border cursor-grab active:cursor-grabbing select-none shrink-0"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        <span className="text-bodyMdStrong text-text flex-1">Comments</span>
        <IconButton aria-label="Close comments" onClick={handleClose}>
          <Icon24Close />
        </IconButton>
      </div>

      {/* Search / filter bar */}
      <div className="flex items-center gap-4px px-2 py-2 border-b border-border shrink-0">
        <div className="flex-1">
          <SearchInput aria-label="Search comments" placeholder="Search" />
        </div>
        <IconButton aria-label="Filter comments">
          <Icon24Filter />
        </IconButton>
        <IconButton aria-label="More options">
          <Icon24More />
        </IconButton>
      </div>

      {/* Comment threads */}
      <ScrollContainer scroll="y" fill>
        {threads.length === 0 ? (
          <div className="flex items-start justify-center pl-2 pr-3 py-3 gap-2">
            <div className="text-icon-tertiary shrink-0">
              <Icon24Comment />
            </div>
            <p className="text-bodyMd text-text">
              Click anywhere on the canvas to leave a comment.
            </p>
          </div>
        ) : (
          <div className="p-2">
            {threads.map((thread) => (
              <CommentListItem
                key={thread.id}
                thread={thread}
                onClick={() => handleThreadClick(thread.id)}
              />
            ))}
          </div>
        )}
      </ScrollContainer>
    </div>
  );
}
