/** A single comment message within a thread */
export interface Comment {
  id: string;
  threadId: string;
  authorName: string;
  authorInitial: string;
  avatarUrl?: string;
  body: string;
  createdAt: number;
}

/** Where a comment thread is anchored on the canvas */
export interface CommentAnchor {
  worldX: number;
  worldY: number;
  /** If attached to a node, the node ID */
  nodeId?: string;
  /** Offset relative to node origin (for node-attached comments) */
  nodeOffsetX?: number;
  nodeOffsetY?: number;
}

/** A comment thread (one anchor, multiple messages) */
export interface CommentThread {
  id: string;
  anchor: CommentAnchor;
  comments: Comment[];
  resolved: boolean;
  createdAt: number;
}

/** Interaction states for the comment system */
export type CommentInteraction =
  | { type: 'none' }
  | { type: 'placing'; worldX: number; worldY: number; nodeId?: string; nodeOffsetX?: number; nodeOffsetY?: number }
  | { type: 'hovering'; threadId: string }
  | { type: 'viewing'; threadId: string };

/** The comments store interface (mirrors SceneGraphStore pattern) */
export interface CommentsStoreAPI {
  getThread(id: string): CommentThread | undefined;
  getAllThreads(): CommentThread[];
  createThread(anchor: CommentAnchor, firstComment: Omit<Comment, 'id' | 'threadId'>): CommentThread;
  addComment(threadId: string, comment: Omit<Comment, 'id' | 'threadId'>): Comment | undefined;
  deleteThread(id: string): void;
  resolveThread(id: string): void;
  unresolveThread(id: string): void;
  updateAnchor(threadId: string, anchor: Partial<CommentAnchor>): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): CommentThread[];
}
