import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import {
  createLiveChatStore,
  type LiveChatStore,
  type Task,
} from '@prototype/shared';
import { RateLimitError } from '@figma/ppg-ai';
import { aiClient, resolveModel, SYSTEM_PROMPT } from './aiClient';
import {
  StreamingActionParser,
  getPreviewHtml,
  renderMarkdown,
  type GeneratedFile,
} from './parseAiResponse';

/* ------------------------------------------------------------------ */
/*  useAiConversation hook                                             */
/* ------------------------------------------------------------------ */

interface MessageEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiConversationState {
  items: ReturnType<LiveChatStore['getSnapshot']>['items'];
  transient: ReturnType<LiveChatStore['getSnapshot']>['transient'];
  tasks: ReturnType<LiveChatStore['getSnapshot']>['tasks'];
  isWorking: boolean;
  awaitingUserAction: boolean;
  onStreamComplete: () => void;
  onStartTasks: () => void;
  reset: () => void;
  restart: () => void;
  generatedFiles: GeneratedFile[];
  previewHtml: string | null;
  sendMessage: (text: string, model: string) => Promise<void>;
  stopGeneration: () => void;
}

export function useAiConversation(): AiConversationState {
  const storeRef = useRef<LiveChatStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createLiveChatStore();
  }
  const store = storeRef.current;

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const messageHistoryRef = useRef<MessageEntry[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const generatedFilesRef = useRef<GeneratedFile[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const versionCountRef = useRef(0);
  const reasoningAccRef = useRef('');
  const nextIdRef = useRef(0);
  const genId = useCallback(() => { nextIdRef.current += 1; return `live-${nextIdRef.current}`; }, []);

  const sendMessage = useCallback(async (text: string, model: string) => {
    store.setWorking(true);
    store.setTransient({ type: 'progress', label: 'Thinking...' });

    messageHistoryRef.current.push({ role: 'user', content: text });

    let fullResponse = '';
    let currentReasoningItemId: string | null = null;
    reasoningAccRef.current = '';

    const parser = new StreamingActionParser({
      onText(textContent) {
        const id = genId();
        const html = renderMarkdown(textContent);
        store.pushItem({ id, type: 'ai-message', content: html, streaming: false });
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

      onTodo(tasks) {
        const taskList: Task[] = tasks.map((label) => ({ label, status: 'pending' as const }));
        store.setTasks(taskList);
        store.pushItem({ id: genId(), type: 'todo-list' });
        store.setTransient(null);
      },

      onWriteFileStart(fileName) {
        // Show the write-file card in minimized state (no code yet)
        store.setTransient({ type: 'write-file', fileName, code: '' });
      },

      onWriteFileDelta() {
        // No-op: code accumulates in the parser. The card stays minimized
        // until the file is complete, then StreamingContent animates it.
      },

      onWriteFileEnd(fileName, code) {
        // Set the transient with complete code — StreamingContent will
        // animate the reveal, and onComplete clears the card.
        store.setTransient({ type: 'write-file', fileName, code });

        setGeneratedFiles((prev) => {
          const next = [...prev.filter((f) => f.fileName !== fileName), { fileName, code }];
          generatedFilesRef.current = next;
          return next;
        });
        store.appendWorkLog([fileName]);

        // Update tasks — mark first pending task as complete
        const currentSnapshot = store.getSnapshot();
        const pendingIdx = currentSnapshot.tasks.findIndex((t) => t.status === 'pending' || t.status === 'in_progress');
        if (pendingIdx >= 0) {
          const updatedTasks = currentSnapshot.tasks.map((t, i) => (
            i === pendingIdx ? { ...t, status: 'complete' as const } : t
          ));
          store.setTasks(updatedTasks);
        }
      },

      onViewFile(fileName) {
        store.setTransient({ type: 'view-file', fileName });
        setTimeout(() => {
          store.setTransient(null);
        }, 2000);
      },
    });

    try {
      abortRef.current = new AbortController();

      const stream = await aiClient.messages.create({
        model: resolveModel(model),
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messageHistoryRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true as const,
      });

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
        // User stopped — clear any active card and show interrupted message
        store.setTransient(null);
        store.pushItem({ id: genId(), type: 'ai-message', content: 'Generation stopped.', streaming: false });
      } else {
        // Update preview from files accumulated during streaming
        const currentFiles = generatedFilesRef.current;
        if (currentFiles.length > 0) {
          const html = getPreviewHtml(currentFiles);
          setPreviewHtml(html);
          const versionNum = versionCountRef.current + 1;
          versionCountRef.current = versionNum;
          store.pushItem({ id: genId(), type: 'version', label: `v${String(versionNum)}` });
          store.pushItem({ id: genId(), type: 'rating' });
        }
      }

      // Save partial or full response for multi-turn context
      if (fullResponse) {
        messageHistoryRef.current.push({ role: 'assistant', content: fullResponse });
      }
    } catch (error) {
      store.setTransient(null);
      // Show a short interrupted message if the user manually stopped
      if (error instanceof Error && error.name === 'AbortError') {
        store.pushItem({ id: genId(), type: 'ai-message', content: 'Generation stopped.', streaming: false });
      } else {
        const message = error instanceof RateLimitError
          ? 'Rate limit reached. Please wait a moment and try again.'
          : `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`;
        store.pushItem({ id: genId(), type: 'ai-message', content: message, streaming: false });
      }
    } finally {
      store.setTransient(null);
      store.setWorking(false);
      abortRef.current = null;
    }
  }, [genId, store]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    store.reset();
    messageHistoryRef.current = [];
    versionCountRef.current = 0;
    reasoningAccRef.current = '';
    nextIdRef.current = 0;
    setGeneratedFiles([]);
    generatedFilesRef.current = [];
    setPreviewHtml(null);
  }, [store]);

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
    generatedFiles,
    previewHtml,
    sendMessage,
    stopGeneration,
  };
}
