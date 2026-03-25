import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { loadComments, installCommentsAutoSave } from './comment-storage';
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

interface CommentsProviderProps {
  children: React.ReactNode;
  /** Fallback threads used on first visit (before anything is saved to localStorage). */
  defaultComments?: CommentThread[];
}

export function CommentsProvider({ children, defaultComments }: CommentsProviderProps) {
  const storeRef = useRef<CommentsStoreAPI | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createCommentsStore(loadComments() ?? defaultComments);
  }

  // Auto-save comments to localStorage on mutations
  useEffect(() => installCommentsAutoSave(storeRef.current!), []);

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
