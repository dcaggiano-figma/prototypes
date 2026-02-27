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

  // Seed with demo threads
  const now = Date.now();
  const demoThreads: CommentThread[] = [
    {
      id: 'thread_demo_1',
      anchor: { worldX: -200, worldY: -180 },
      comments: [
        {
          id: 'comment_demo_1',
          threadId: 'thread_demo_1',
          authorName: 'Alice',
          authorInitial: 'A',
          body: 'Love the layout here! Can we add more whitespace between sections?',
          createdAt: now - 27 * 60 * 1000,
        },
        {
          id: 'comment_demo_2',
          threadId: 'thread_demo_1',
          authorName: 'Bob',
          authorInitial: 'B',
          body: 'Agreed, I\'ll update the spacing.',
          createdAt: now - 15 * 60 * 1000,
        },
      ],
      resolved: false,
      createdAt: now - 27 * 60 * 1000,
    },
    {
      id: 'thread_demo_2',
      anchor: { worldX: 180, worldY: 50 },
      comments: [
        {
          id: 'comment_demo_3',
          threadId: 'thread_demo_2',
          authorName: 'Charlie',
          authorInitial: 'C',
          body: 'Should this shape be a different color?',
          createdAt: now - 2 * 60 * 60 * 1000,
        },
      ],
      resolved: false,
      createdAt: now - 2 * 60 * 60 * 1000,
    },
    {
      id: 'thread_demo_3',
      anchor: { worldX: -50, worldY: 200 },
      comments: [
        {
          id: 'comment_demo_4',
          threadId: 'thread_demo_3',
          authorName: 'Diana',
          authorInitial: 'D',
          body: 'Great work on this section!',
          createdAt: now - 5 * 60 * 60 * 1000,
        },
      ],
      resolved: true,
      createdAt: now - 5 * 60 * 60 * 1000,
    },
  ];

  for (const thread of demoThreads) {
    threads.set(thread.id, thread);
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
