import { useRef, useSyncExternalStore } from 'react';
import { CommentPin } from './CommentPin';
import { resolveCommentPosition } from './utils';
import type { CommentsStoreAPI, CommentInteraction } from './types';

/** Minimum pixel distance before a pointer-down is treated as a drag */
const DRAG_THRESHOLD = 3;

/** Stable no-op subscribe/snapshot for when nodeStore props aren't provided */
const NOOP_SUBSCRIBE = (_cb: () => void) => () => {};
const NOOP_SNAPSHOT = () => 0;

interface CommentPinLayerProps {
  commentsStore: CommentsStoreAPI;
  interaction: CommentInteraction;
  selectedThreadId: string | null;
  zoom?: number;
  onPinClick: (threadId: string) => void;
  onPinHoverStart: (threadId: string) => void;
  onPinHoverEnd: () => void;
  getNodePosition?: (nodeId: string) => { x: number; y: number } | undefined;
  /** Drag lifecycle callbacks */
  onDragStart?: (threadId: string) => void;
  onDragMove?: (threadId: string, worldX: number, worldY: number) => void;
  onDragEnd?: (threadId: string, worldX: number, worldY: number) => void;
  /** Convert screen-local coords to world coords (from useViewport) */
  screenToWorld?: (localX: number, localY: number) => { x: number; y: number };
  /** Container ref for computing local screen coords (from useViewport) */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** Subscribe to scene-graph changes so pins update when nodes move */
  nodeStoreSubscribe?: (listener: () => void) => () => void;
  nodeStoreGetSnapshot?: () => unknown;
}

export function CommentPinLayer({
  commentsStore,
  interaction,
  selectedThreadId,
  zoom = 1,
  onPinClick,
  onPinHoverStart,
  onPinHoverEnd,
  getNodePosition,
  onDragStart,
  onDragMove,
  onDragEnd,
  screenToWorld,
  containerRef,
  nodeStoreSubscribe,
  nodeStoreGetSnapshot,
}: CommentPinLayerProps) {
  const threads = useSyncExternalStore(
    commentsStore.subscribe,
    commentsStore.getSnapshot,
  );

  // Also subscribe to scene-graph changes so pins track nodes during drag
  useSyncExternalStore(
    nodeStoreSubscribe ?? NOOP_SUBSCRIBE,
    nodeStoreGetSnapshot ?? NOOP_SNAPSHOT,
  );

  /** Track per-pin drag state */
  const dragState = useRef<{
    threadId: string;
    startScreenX: number;
    startScreenY: number;
    isDragging: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, threadId: string) => {
    // Only left button
    if (e.button !== 0) return;
    if (!screenToWorld || !containerRef) return;

    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragState.current = {
      threadId,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      isDragging: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state || !screenToWorld || !containerRef) return;

    const dx = e.clientX - state.startScreenX;
    const dy = e.clientY - state.startScreenY;

    if (!state.isDragging) {
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      state.isDragging = true;
      onDragStart?.(state.threadId);
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    onDragMove?.(state.threadId, world.x, world.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const state = dragState.current;
    dragState.current = null;
    if (!state) return;

    if (state.isDragging && screenToWorld && containerRef) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        onDragEnd?.(state.threadId, world.x, world.y);
      }
    } else {
      // Not a drag — treat as click
      onPinClick(state.threadId);
    }
  };

  return (
    <div className="absolute top-0 left-0 pointer-events-none" style={{ zIndex: 1 }}>
      {threads.map((thread) => {
        const isDragging = interaction.type === 'dragging' && interaction.threadId === thread.id;
        const pos = isDragging
          ? { worldX: interaction.worldX, worldY: interaction.worldY }
          : resolveCommentPosition(thread.anchor, getNodePosition);
        const isSelected = selectedThreadId === thread.id;
        const isHovered = interaction.type === 'hovering' && interaction.threadId === thread.id;
        const firstComment = thread.comments[0];
        if (!firstComment) return null;

        return (
          <div
            key={thread.id}
            className="absolute pointer-events-auto"
            style={{
              left: pos.worldX,
              top: pos.worldY - 32,
              transform: `scale(${1 / zoom})`,
              transformOrigin: 'bottom left',
              cursor: isDragging ? 'grabbing' : 'pointer',
              opacity: isDragging ? 0.8 : 1,
            }}
            onPointerDown={(e) => handlePointerDown(e, thread.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <CommentPin
              authorInitial={firstComment.authorInitial}
              avatarUrl={firstComment.avatarUrl}
              selected={isSelected}
              hovered={isHovered}
              resolved={thread.resolved}
              onMouseEnter={() => onPinHoverStart(thread.id)}
              onMouseLeave={onPinHoverEnd}
            />
          </div>
        );
      })}
    </div>
  );
}
