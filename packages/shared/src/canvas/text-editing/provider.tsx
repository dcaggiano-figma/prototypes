import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import type { NodeId } from '../../scene-graph/node-id';

export interface TextEditingAPI {
  /** ID of the text node currently being edited inline, or null */
  editingNodeId: NodeId | null
  /** Ref indicating whether current editing session should select all on focus */
  selectAllRef: { current: boolean }
  /** Enter inline editing mode for a text node. selectAll=true selects all text on focus. */
  startEditing(nodeId: NodeId, selectAll?: boolean): void
  /** Exit inline editing mode */
  stopEditing(): void
}

const TextEditingContext = createContext<TextEditingAPI | null>(null);

export function TextEditingProvider({ children }: { children: React.ReactNode }) {
  const editingRef = useRef<NodeId | null>(null);
  const selectAllRef = useRef(true);
  const snapshotRef = useRef<NodeId | null>(null);
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

  const startEditing = useCallback((nodeId: NodeId, selectAll = true) => {
    editingRef.current = nodeId;
    selectAllRef.current = selectAll;
    notify();
  }, []);

  const stopEditing = useCallback(() => {
    if (editingRef.current === null) return;
    editingRef.current = null;
    notify();
  }, []);

  const api = useMemo<TextEditingAPI>(
    () => ({ editingNodeId, selectAllRef, startEditing, stopEditing }),
    [editingNodeId, startEditing, stopEditing],
  );

  return <TextEditingContext.Provider value={api}>{children}</TextEditingContext.Provider>;
}

export function useTextEditing(): TextEditingAPI {
  const ctx = useContext(TextEditingContext);
  if (!ctx) throw new Error('useTextEditing must be used within a TextEditingProvider');
  return ctx;
}
