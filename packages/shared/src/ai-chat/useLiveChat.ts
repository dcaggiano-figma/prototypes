import { useCallback, useRef, useSyncExternalStore } from 'react';
import { createLiveChatStore, type LiveChatStore } from './store';
import type { Attachment, InspectedElement, ChatItem, TransientItem, Task } from './types';
import { SceneGraphActionParser, renderMarkdown } from './SceneGraphActionParser';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Minimal shape expected from the AI client's messages.create() streaming response. */
interface StreamEvent {
  type: string;
  delta: { type: string; text: string };
}

export interface UseLiveChatOptions {
  /** Unique key for persisting this chat session across component remounts. Defaults to 'default'. */
  storeKey?: string;
  /** AI client instance (from @figma/ppg-ai). Typed as `unknown` to avoid depending on the package. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiClient: any;
  /** System prompt describing the AI's role and available actions. */
  systemPrompt: string;
  /** Model ID to use, or 'default' for the default model. */
  resolveModel?: (modelValue: string) => string;
  /** Serialize current canvas context (selected nodes) for the AI. */
  getCanvasContext?: () => string;
  /** Called when the AI creates a node. Must return the new node's ID. */
  onCreateNode?: (nodeType: string, parentId: string, props: Record<string, unknown>) => string;
  /** Called when the AI updates a node. */
  onUpdateNode?: (nodeId: string, updates: Record<string, unknown>) => void;
  /** Called when the AI deletes a node. */
  onDeleteNode?: (nodeId: string) => void;
  /** Called when the AI reparents a node. */
  onReparentNode?: (nodeId: string, newParentId: string, index: number) => void;
  /** Called when the AI duplicates a node subtree. Returns new top-level IDs and a serialized description. */
  onDuplicateNode?: (nodeId: string) => { newIds: string[]; description: string };
}

export interface LiveChatResult {
  items: ChatItem[];
  transient: TransientItem | null;
  tasks: Task[];
  isWorking: boolean;
  awaitingUserAction: boolean;
  onStreamComplete: () => void;
  onStartTasks: () => void;
  reset: () => void;
  restart: () => void;
  sendMessage: (text: string, model: string, meta?: { attachments?: Attachment[]; inspectedElements?: InspectedElement[] }) => Promise<void>;
  stopGeneration: () => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

interface MessageEntry {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Module-level cache for live chat sessions, keyed by storeKey.
 * Persists stores and message history across component unmount/remount.
 */
const storeCache = new Map<string, {
  store: LiveChatStore;
  messageHistory: MessageEntry[];
  nextId: number;
}>();

function getOrCreateCachedStore(key: string) {
  let cached = storeCache.get(key);
  if (!cached) {
    cached = { store: createLiveChatStore(), messageHistory: [], nextId: 0 };
    storeCache.set(key, cached);
  }
  return cached;
}

export function useLiveChat(options: UseLiveChatOptions): LiveChatResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const storeKey = options.storeKey ?? 'default';
  const cached = getOrCreateCachedStore(storeKey);
  const store = cached.store;

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Use cached array directly — mutations persist across remounts
  const messageHistoryRef = useRef(cached.messageHistory);
  messageHistoryRef.current = cached.messageHistory;
  const abortRef = useRef<AbortController | null>(null);
  const nextIdRef = useRef(cached.nextId);
  const reasoningAccRef = useRef('');
  const didActionRef = useRef(false);
  const genId = useCallback(() => { nextIdRef.current += 1; cached.nextId = nextIdRef.current; return `live-${nextIdRef.current}`; }, [cached]);

  const sendMessage = useCallback(async (text: string, model: string, meta?: { attachments?: Attachment[]; inspectedElements?: InspectedElement[] }) => {
    const opts = optionsRef.current;

    // Push a user-message item for follow-up messages (not the first one — that's rendered by the panel)
    const isFollowUp = messageHistoryRef.current.length > 0;
    if (isFollowUp) {
      store.pushItem({
        id: genId(),
        type: 'user-message',
        content: text,
        attachments: meta?.attachments ?? [],
        inspectedElements: meta?.inspectedElements ?? [],
      });
    }

    store.setWorking(true);
    store.setTransient({ type: 'progress', label: 'Thinking...' });

    // Build user message with canvas context
    let userContent = text;
    if (opts.getCanvasContext) {
      const context = opts.getCanvasContext();
      if (context) {
        userContent = `${context}\n\n${text}`;
      }
    }

    messageHistoryRef.current.push({ role: 'user', content: userContent });

    let fullResponse = '';
    let currentReasoningItemId: string | null = null;
    let currentMessageItemId: string | null = null;
    let messageAcc = '';
    reasoningAccRef.current = '';

    /** Push or update the AI message item. Not marked as streaming —
     *  real-time delta updates provide natural streaming without StreamingContent. */
    const updateMessageItem = (text: string) => {
      const html = renderMarkdown(text);
      if (currentMessageItemId) {
        store.updateItem(currentMessageItemId, { content: html });
      } else {
        const id = genId();
        currentMessageItemId = id;
        store.pushItem({ id, type: 'ai-message', content: html, streaming: false });
      }
    };

    const parser = new SceneGraphActionParser({
      onText(textContent) {
        store.setTransient(null);
        messageAcc += (messageAcc ? '\n\n' : '') + textContent;
        updateMessageItem(messageAcc);
      },

      onTextDelta(pendingText) {
        store.setTransient(null);
        const preview = messageAcc ? messageAcc + '\n\n' + pendingText : pendingText;
        updateMessageItem(preview);
      },

      onReasoning(content) {
        if (currentReasoningItemId) {
          store.updateItem(currentReasoningItemId, { content, status: 'complete' });
          currentReasoningItemId = null;
        } else {
          const id = genId();
          store.pushItem({ id, type: 'reasoning', content, status: 'complete' });
        }
        reasoningAccRef.current = '';
      },

      onReasoningDelta(delta) {
        reasoningAccRef.current += delta;
        if (!currentReasoningItemId) {
          const id = genId();
          currentReasoningItemId = id;
          store.pushItem({ id, type: 'reasoning', content: reasoningAccRef.current, status: 'active' });
        } else {
          store.updateItem(currentReasoningItemId, { content: reasoningAccRef.current });
        }
        store.setTransient(null);
      },

      onCreateNode(nodeType, parentId, props) {
        didActionRef.current = true;
        store.setTransient({ type: 'working' });
        if (opts.onCreateNode) {
          return opts.onCreateNode(nodeType, parentId, props);
        }
        return '';
      },

      onUpdateNode(nodeId, updates) {
        didActionRef.current = true;
        store.setTransient({ type: 'working' });
        opts.onUpdateNode?.(nodeId, updates);
      },

      onDeleteNode(nodeId) {
        didActionRef.current = true;
        store.setTransient({ type: 'working' });
        opts.onDeleteNode?.(nodeId);
      },

      onReparentNode(nodeId, newParentId, index) {
        didActionRef.current = true;
        store.setTransient({ type: 'working' });
        opts.onReparentNode?.(nodeId, newParentId, index);
      },

      onDuplicateNode(nodeId) {
        didActionRef.current = true;
        store.setTransient({ type: 'working' });
        if (opts.onDuplicateNode) {
          const { newIds, description } = opts.onDuplicateNode(nodeId);
          // Inject the duplicated subtree info into message history so the AI
          // can reference child IDs for subsequent update-node actions
          if (description) {
            messageHistoryRef.current.push({
              role: 'user',
              content: `[System: Node duplicated successfully. New subtree:\n${description}]`,
            });
          }
          return newIds;
        }
        return [];
      },
    });

    try {
      abortRef.current = new AbortController();

      const resolveModelFn = opts.resolveModel ?? ((v: string) => v);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const stream = await opts.aiClient.messages.create({
        model: resolveModelFn(model),
        max_tokens: 16384,
        system: opts.systemPrompt,
        messages: messageHistoryRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }) as AsyncIterable<StreamEvent>;

      store.setTransient(null);

      for await (const event of stream) {
        if (abortRef.current?.signal.aborted) break;

        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullResponse += event.delta.text;
          parser.feed(event.delta.text);
        }
      }

      const wasAborted = abortRef.current?.signal.aborted;
      parser.flush();

      if (wasAborted) {
        store.setTransient(null);
        store.pushItem({ id: genId(), type: 'ai-message', content: 'Generation stopped.', streaming: false });
      } else {
        // Successful completion — add rating
        store.pushItem({ id: genId(), type: 'rating' });
      }

      if (fullResponse) {
        messageHistoryRef.current.push({ role: 'assistant', content: fullResponse });
      }
    } catch (error) {
      store.setTransient(null);
      if (error instanceof Error && error.name === 'AbortError') {
        store.pushItem({ id: genId(), type: 'ai-message', content: 'Generation stopped.', streaming: false });
      } else {
        const isRateLimit = error instanceof Error && (error.name === 'RateLimitError' || error.message.includes('rate limit'));
        const message = isRateLimit
          ? 'Rate limit reached. Please wait a moment and try again.'
          : `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`;
        store.pushItem({ id: genId(), type: 'ai-message', content: message, streaming: false });
      }
    } finally {
      store.setTransient(null);
      store.setWorking(false);
      didActionRef.current = false;
      abortRef.current = null;
    }
  }, [genId, store]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    store.reset();
    messageHistoryRef.current = [];
    cached.messageHistory = [];
    nextIdRef.current = 0;
    cached.nextId = 0;
    reasoningAccRef.current = '';
  }, [store, cached]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    items: snapshot.items,
    transient: snapshot.transient,
    tasks: snapshot.tasks,
    isWorking: snapshot.isWorking,
    awaitingUserAction: snapshot.awaitingUserAction,
    onStreamComplete: store.onStreamComplete,
    onStartTasks: store.onStartTasks,
    reset,
    restart: reset,
    sendMessage,
    stopGeneration,
  };
}
