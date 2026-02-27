import {
  createContext, useContext, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { createCommentsStore } from './store';
import type { CommentInteraction, CommentsStoreAPI, CommentThread } from './types';

interface CommentsContextValue {
  store: CommentsStoreAPI;
  interaction: CommentInteraction;
  setInteraction: (interaction: CommentInteraction) => void;
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
}

const CommentsContext = createContext<CommentsContextValue | null>(null);

export function CommentsProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<CommentsStoreAPI | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createCommentsStore();
  }

  const [interaction, setInteraction] = useState<CommentInteraction>({ type: 'none' });
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const value = useMemo<CommentsContextValue>(() => ({
    store: storeRef.current!,
    interaction,
    setInteraction,
    selectedThreadId,
    setSelectedThreadId,
  }), [interaction, selectedThreadId]);

  return (
    <CommentsContext.Provider value={value}>
      {children}
    </CommentsContext.Provider>
  );
}

/** Access the full comments context */
export function useComments() {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error('useComments must be used within a CommentsProvider');

  const threads = useSyncExternalStore(
    ctx.store.subscribe,
    ctx.store.getSnapshot,
  );

  return {
    store: ctx.store,
    threads,
    interaction: ctx.interaction,
    setInteraction: ctx.setInteraction,
    selectedThreadId: ctx.selectedThreadId,
    setSelectedThreadId: ctx.setSelectedThreadId,
  };
}

/** Subscribe to a specific thread reactively */
export function useThread(threadId: string | null): CommentThread | undefined {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error('useThread must be used within a CommentsProvider');

  const threads = useSyncExternalStore(
    ctx.store.subscribe,
    ctx.store.getSnapshot,
  );

  return threadId ? threads.find((t) => t.id === threadId) : undefined;
}
