import type { Comment, CommentThread, CommentsStoreAPI } from './types';

let nextThreadId = 1;
let nextCommentId = 1;

function genThreadId(): string {
  return `thread_${nextThreadId++}`;
}

function genCommentId(): string {
  return `comment_${nextCommentId++}`;
}

export function createCommentsStore(): CommentsStoreAPI {
  const threads = new Map<string, CommentThread>();
  const listeners = new Set<() => void>();
  let snapshot: CommentThread[] = [];

  function updateSnapshot() {
    snapshot = Array.from(threads.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  function notify() {
    updateSnapshot();
    for (const listener of listeners) {
      listener();
    }
  }

  updateSnapshot();

  const store: CommentsStoreAPI = {
    getThread(id) {
      return threads.get(id);
    },

    getAllThreads() {
      return snapshot;
    },

    createThread(anchor, firstCommentData) {
      const threadId = genThreadId();
      const commentId = genCommentId();
      const createdAt = Date.now();

      const comment: Comment = {
        ...firstCommentData,
        id: commentId,
        threadId,
        createdAt: firstCommentData.createdAt ?? createdAt,
      };

      const thread: CommentThread = {
        id: threadId,
        anchor,
        comments: [comment],
        resolved: false,
        createdAt,
      };

      threads.set(threadId, thread);
      notify();
      return thread;
    },

    addComment(threadId, commentData) {
      const thread = threads.get(threadId);
      if (!thread) return undefined;

      const commentId = genCommentId();
      const comment: Comment = {
        ...commentData,
        id: commentId,
        threadId,
        createdAt: commentData.createdAt ?? Date.now(),
      };

      const updated: CommentThread = {
        ...thread,
        comments: [...thread.comments, comment],
      };
      threads.set(threadId, updated);
      notify();
      return comment;
    },

    deleteThread(id) {
      if (!threads.has(id)) return;
      threads.delete(id);
      notify();
    },

    resolveThread(id) {
      const thread = threads.get(id);
      if (!thread) return;
      threads.set(id, { ...thread, resolved: true });
      notify();
    },

    unresolveThread(id) {
      const thread = threads.get(id);
      if (!thread) return;
      threads.set(id, { ...thread, resolved: false });
      notify();
    },

    updateAnchor(threadId, anchorUpdate) {
      const thread = threads.get(threadId);
      if (!thread) return;
      threads.set(threadId, {
        ...thread,
        anchor: { ...thread.anchor, ...anchorUpdate },
      });
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot() {
      return snapshot;
    },
  };

  return store;
}
