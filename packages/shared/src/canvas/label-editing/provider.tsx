import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import type { NodeId } from '../../scene-graph/node-id';

export interface LabelEditingAPI {
  /** ID of the node whose label is currently being edited, or null */
  editingLabelNodeId: NodeId | null
  /** Enter label editing mode for a node */
  startLabelEdit(nodeId: NodeId): void
  /** Exit label editing mode */
  stopLabelEdit(): void
}

const LabelEditingContext = createContext<LabelEditingAPI | null>(null);

export function LabelEditingProvider({ children }: { children: React.ReactNode }) {
  const editingRef = useRef<NodeId | null>(null);
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

  const editingLabelNodeId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const startLabelEdit = useCallback((nodeId: NodeId) => {
    editingRef.current = nodeId;
    notify();
  }, []);

  const stopLabelEdit = useCallback(() => {
    if (editingRef.current === null) return;
    editingRef.current = null;
    notify();
  }, []);

  const api = useMemo<LabelEditingAPI>(
    () => ({ editingLabelNodeId, startLabelEdit, stopLabelEdit }),
    [editingLabelNodeId, startLabelEdit, stopLabelEdit],
  );

  return <LabelEditingContext.Provider value={api}>{children}</LabelEditingContext.Provider>;
}

export function useLabelEditing(): LabelEditingAPI {
  const ctx = useContext(LabelEditingContext);
  if (!ctx) throw new Error('useLabelEditing must be used within a LabelEditingProvider');
  return ctx;
}
