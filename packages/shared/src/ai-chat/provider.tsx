import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { AiChatSnapshot, AiChatStoreAPI, ModelOption } from './types';

/* ------------------------------------------------------------------ */
/*  Default model options                                              */
/* ------------------------------------------------------------------ */

export const DEFAULT_MODEL_OPTIONS: ModelOption[] = [
  { value: 'default', label: 'Default', description: 'Scripted demo' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Fast, capable' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fastest, lightweight' },
];

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface AiChatContextValue {
  store: AiChatStoreAPI;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  modelOptions: ModelOption[];
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export interface AiChatProviderProps {
  store: AiChatStoreAPI;
  modelOptions?: ModelOption[];
  children: React.ReactNode;
}

export function AiChatProvider({
  store,
  modelOptions = DEFAULT_MODEL_OPTIONS,
  children,
}: AiChatProviderProps) {
  const [selectedModel, setSelectedModel] = useState('default');

  const value = useMemo<AiChatContextValue>(() => ({
    store,
    selectedModel,
    setSelectedModel,
    modelOptions,
  }), [store, selectedModel, modelOptions]);

  return (
    <AiChatContext.Provider value={value}>
      {children}
    </AiChatContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useAiChat() {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error('useAiChat must be used within an AiChatProvider');

  const snapshot = useSyncExternalStore(
    ctx.store.subscribe,
    ctx.store.getSnapshot,
  );

  return {
    ...snapshot,
    onStreamComplete: ctx.store.onStreamComplete,
    onStartTasks: ctx.store.onStartTasks,
    selectedModel: ctx.selectedModel,
    setSelectedModel: ctx.setSelectedModel,
    modelOptions: ctx.modelOptions,
  };
}

export function useAiChatSnapshot(): AiChatSnapshot {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error('useAiChatSnapshot must be used within an AiChatProvider');

  return useSyncExternalStore(
    ctx.store.subscribe,
    ctx.store.getSnapshot,
  );
}
