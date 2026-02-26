import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

/** Selection state: set of selected node IDs */
export interface SelectionAPI {
  /** Currently selected node IDs */
  selectedIds: Set<string>
  /** Which frame the user has double-clicked into (null = top level) */
  enteredFrameId: string | null
  /** Whether selected nodes are currently being dragged */
  isDragging: boolean
  /** Select a single node (replaces current selection) */
  select(id: string): void
  /** Toggle a node in/out of selection (for shift+click) */
  toggle(id: string): void
  /** Add a node to the current selection */
  add(id: string): void
  /** Deselect all nodes */
  clear(): void
  /** Check if a node is selected */
  isSelected(id: string): boolean
  /** Enter a frame for child selection (double-click) */
  enterFrame(id: string): void
  /** Leave the entered frame */
  exitFrame(): void
  /** Set dragging state (used by Canvas to hide floating UI during drag) */
  setDragging(dragging: boolean): void
}

const SelectionContext = createContext<SelectionAPI | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const selectedRef = useRef(new Set<string>());
  const listeners = useRef(new Set<() => void>());
  const snapshotRef = useRef(new Set<string>());

  const enteredFrameRef = useRef<string | null>(null);
  const enteredFrameSnapshotRef = useRef<string | null>(null);

  const draggingRef = useRef(false);
  const draggingSnapshotRef = useRef(false);

  function notify() {
    snapshotRef.current = new Set(selectedRef.current);
    enteredFrameSnapshotRef.current = enteredFrameRef.current;
    draggingSnapshotRef.current = draggingRef.current;
    for (const listener of listeners.current) {
      listener();
    }
  }

  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => snapshotRef.current, []);
  const getEnteredFrameSnapshot = useCallback(() => enteredFrameSnapshotRef.current, []);
  const getDraggingSnapshot = useCallback(() => draggingSnapshotRef.current, []);

  const selectedIds = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const enteredFrameId = useSyncExternalStore(subscribe, getEnteredFrameSnapshot, getEnteredFrameSnapshot);
  const isDragging = useSyncExternalStore(subscribe, getDraggingSnapshot, getDraggingSnapshot);

  const select = useCallback((id: string) => {
    selectedRef.current = new Set([id]);
    notify();
  }, []);

  const toggle = useCallback((id: string) => {
    const next = new Set(selectedRef.current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedRef.current = next;
    notify();
  }, []);

  const add = useCallback((id: string) => {
    const next = new Set(selectedRef.current);
    next.add(id);
    selectedRef.current = next;
    notify();
  }, []);

  const clear = useCallback(() => {
    if (selectedRef.current.size === 0 && enteredFrameRef.current === null) return;
    selectedRef.current = new Set();
    enteredFrameRef.current = null;
    notify();
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const enterFrame = useCallback((id: string) => {
    enteredFrameRef.current = id;
    notify();
  }, []);

  const exitFrame = useCallback(() => {
    if (enteredFrameRef.current === null) return;
    enteredFrameRef.current = null;
    notify();
  }, []);

  const setDragging = useCallback((dragging: boolean) => {
    if (draggingRef.current === dragging) return;
    draggingRef.current = dragging;
    notify();
  }, []);

  const api = useMemo<SelectionAPI>(
    () => ({
      selectedIds, enteredFrameId, isDragging, select, toggle, add, clear, isSelected, enterFrame, exitFrame, setDragging,
    }),
    [selectedIds, enteredFrameId, isDragging, select, toggle, add, clear, isSelected, enterFrame, exitFrame, setDragging],
  );

  return <SelectionContext.Provider value={api}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionAPI {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within a SelectionProvider');
  return ctx;
}
