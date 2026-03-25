/**
 * localStorage persistence for comments.
 *
 * Mirrors the scene-graph storage pattern: URL-scoped key, debounced auto-save,
 * and hydration on load.
 *
 * Key format: `ppg:<scope>:comments`
 */

import type { CommentThread, CommentsStoreAPI } from './types';

// ── URL-scoped key derivation (duplicated from scene-graph/storage.ts) ──

function getStorageScope(): string {
  const path = window.location.pathname.replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'share' && segments.length >= 2) {
    return `/share/${segments[1]}`;
  }
  return path || '/';
}

function getStorageKey(): string {
  return `ppg:${getStorageScope()}:comments`;
}

// ── Serialized format ───────────────────────────────────────────────

interface SerializedComments {
  version: 1;
  threads: CommentThread[];
}

// ── Core functions ──────────────────────────────────────────────────

/** Load comments from localStorage. Returns null on any failure. */
export function loadComments(): CommentThread[] | null {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return null;

    const data = JSON.parse(raw) as SerializedComments;
    if (data.version !== 1 || !Array.isArray(data.threads)) return null;

    return data.threads;
  } catch {
    return null;
  }
}

/** Save comments to localStorage. */
export function saveComments(store: CommentsStoreAPI): void {
  try {
    const data: SerializedComments = {
      version: 1,
      threads: store.getSnapshot(),
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  } catch {
    console.warn('Failed to save comments to localStorage');
  }
}

/**
 * Subscribe to comment store changes and auto-save after mutations.
 * Debounces saves to 1 second after the last mutation.
 * Returns a cleanup function.
 */
export function installCommentsAutoSave(store: CommentsStoreAPI): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const unsubscribe = store.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveComments(store);
      timer = null;
    }, 1000);
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}

/** Remove the comments key for the current URL scope. */
export function clearCommentsStorage(): void {
  localStorage.removeItem(getStorageKey());
}
