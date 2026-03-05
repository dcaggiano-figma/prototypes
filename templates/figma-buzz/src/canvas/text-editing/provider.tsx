import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

export interface TextEditingAPI {
  /** ID of the text node currently being edited inline, or null */
  editingNodeId: string | null
  /** Enter inline editing mode for a text node */
  startEditing(nodeId: string): void
  /** Exit inline editing mode */
  stopEditing(): void
}

const TextEditingContext = createContext<TextEditingAPI | null>(null);

export function TextEditingProvider({ children }: { children: React.ReactNode }) {
  const editingRef = useRef<string | null>(null);
  const snapshotRef = useRef<string | null>(null);
  const listeners = useRef(new Set<() => void>());

  function notify() {
    snapshotRef.current = editingRef.current;
    for (const listener of listeners.current) {
      listener();
    }
  }

  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const editingNodeId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const startEditing = useCallback((nodeId: string) => {
    editingRef.current = nodeId;
    notify();
  }, []);

  const stopEditing = useCallback(() => {
    if (editingRef.current === null) return;
    editingRef.current = null;
    notify();
  }, []);

  const api = useMemo<TextEditingAPI>(
    () => ({ editingNodeId, startEditing, stopEditing }),
    [editingNodeId, startEditing, stopEditing],
  );

  return <TextEditingContext.Provider value={api}>{children}</TextEditingContext.Provider>;
}

export function useTextEditing(): TextEditingAPI {
  const ctx = useContext(TextEditingContext);
  if (!ctx) throw new Error('useTextEditing must be used within a TextEditingProvider');
  return ctx;
}
