import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import type { NodeId } from '../../scene-graph/node-id';
import type { CanvasNode } from '../../scene-graph/types';
import { Selection } from '../../scene-graph/selection';
import { useCanvasId, useSceneGraph } from '../scene-graph/provider';

/** Selection state and behavior APIs. */
export interface SelectionAPI {
  /** The immutable Selection object from the canvas node. */
  selection: Selection
  /** Currently selected node IDs (convenience — same as selection.getDirectSelection()). */
  selectedIds: ReadonlySet<NodeId>
  /** Which frame the user has double-clicked into (null = top level) */
  enteredFrameId: NodeId | null
  /** Whether selected nodes are currently being dragged */
  isDragging: boolean
  /** Currently hovered node ID (null = no hover) */
  hoveredId: NodeId | null
  /** Select a single node (replaces current selection) */
  select(id: NodeId): void
  /** Toggle a node in/out of selection (for shift+click) */
  toggle(id: NodeId): void
  /** Add a node to the current selection */
  add(id: NodeId): void
  /** Replace selection with multiple IDs at once */
  selectMany(ids: NodeId[]): void
  /** Deselect all nodes */
  clear(): void
  /** Check if a node is selected */
  isSelected(id: NodeId): boolean
  /** Enter a frame for child selection (double-click) */
  enterFrame(id: NodeId): void
  /** Leave the entered frame */
  exitFrame(): void
  /** Set dragging state (used by Canvas to hide floating UI during drag) */
  setDragging(dragging: boolean): void
  /** Set the hovered node ID */
  setHovered(id: NodeId | null): void
}

const SelectionContext = createContext<SelectionAPI | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const sg = useSceneGraph();
  const canvasId = useCanvasId();

  // ── Selection state (lives on the canvas node) ───────────────────

  const subscribeSelection = useCallback(
    (onStoreChange: () => void) => {
      return sg.addListener((event) => {
        if (event.type === 'field-change' && event.nodeId === canvasId && event.field === 'selection') {
          onStoreChange();
        }
      });
    },
    [sg, canvasId],
  );

  const getSelectionSnapshot = useCallback(() => {
    const canvas = sg.getNode(canvasId);
    if (!canvas || canvas.type !== 'CANVAS') return Selection.EMPTY;
    return (canvas as CanvasNode).selection;
  }, [sg, canvasId]);

  const selection = useSyncExternalStore(subscribeSelection, getSelectionSnapshot, getSelectionSnapshot);
  const selectedIds = selection.getDirectSelection();

  // ── Behavior state (local, not undoable) ──────────────────────────

  const behaviorListeners = useRef(new Set<() => void>());

  const enteredFrameRef = useRef<NodeId | null>(null);
  const enteredFrameSnapshotRef = useRef<NodeId | null>(null);

  const draggingRef = useRef(false);
  const draggingSnapshotRef = useRef(false);

  const hoveredRef = useRef<NodeId | null>(null);
  const hoveredSnapshotRef = useRef<NodeId | null>(null);

  function notifyBehavior() {
    enteredFrameSnapshotRef.current = enteredFrameRef.current;
    draggingSnapshotRef.current = draggingRef.current;
    hoveredSnapshotRef.current = hoveredRef.current;
    for (const listener of behaviorListeners.current) {
      listener();
    }
  }

  const subscribeBehavior = useCallback((listener: () => void) => {
    behaviorListeners.current.add(listener);
    return () => behaviorListeners.current.delete(listener);
  }, []);

  const getEnteredFrameSnapshot = useCallback(() => enteredFrameSnapshotRef.current, []);
  const getDraggingSnapshot = useCallback(() => draggingSnapshotRef.current, []);
  const getHoveredSnapshot = useCallback(() => hoveredSnapshotRef.current, []);

  const enteredFrameId = useSyncExternalStore(subscribeBehavior, getEnteredFrameSnapshot, getEnteredFrameSnapshot);
  const isDragging = useSyncExternalStore(subscribeBehavior, getDraggingSnapshot, getDraggingSnapshot);
  const hoveredId = useSyncExternalStore(subscribeBehavior, getHoveredSnapshot, getHoveredSnapshot);

  // ── Selection mutations (go through scene graph) ──────────────────

  /** Read the current selection from the canvas node (always fresh). */
  const currentSelection = useCallback(() => {
    const canvas = sg.getNode(canvasId);
    if (!canvas || canvas.type !== 'CANVAS') return Selection.EMPTY;
    return (canvas as CanvasNode).selection;
  }, [sg, canvasId]);

  const select = useCallback((id: NodeId) => {
    sg.setNodeField(canvasId, 'selection', currentSelection().withSelected([id], sg));
  }, [sg, canvasId, currentSelection]);

  const toggle = useCallback((id: NodeId) => {
    sg.setNodeField(canvasId, 'selection', currentSelection().withToggled(id, sg));
  }, [sg, canvasId, currentSelection]);

  const add = useCallback((id: NodeId) => {
    sg.setNodeField(canvasId, 'selection', currentSelection().withAdded([id], sg));
  }, [sg, canvasId, currentSelection]);

  const selectMany = useCallback((ids: NodeId[]) => {
    sg.setNodeField(canvasId, 'selection', currentSelection().withSelected(ids, sg));
  }, [sg, canvasId, currentSelection]);

  const clear = useCallback(() => {
    const sel = currentSelection();
    if (sel.isEmpty && enteredFrameRef.current === null) return;
    if (!sel.isEmpty) {
      sg.setNodeField(canvasId, 'selection', sel.cleared());
    }
    if (enteredFrameRef.current !== null) {
      enteredFrameRef.current = null;
      notifyBehavior();
    }
  }, [sg, canvasId, currentSelection]);

  const isSelected = useCallback(
    (id: NodeId) => selection.isDirectlySelected(id),
    [selection],
  );

  // ── Behavior mutations ────────────────────────────────────────────

  const enterFrame = useCallback((id: NodeId) => {
    enteredFrameRef.current = id;
    notifyBehavior();
  }, []);

  const exitFrame = useCallback(() => {
    if (enteredFrameRef.current === null) return;
    enteredFrameRef.current = null;
    notifyBehavior();
  }, []);

  const setDragging = useCallback((dragging: boolean) => {
    if (draggingRef.current === dragging) return;
    draggingRef.current = dragging;
    notifyBehavior();
  }, []);

  const setHovered = useCallback((id: NodeId | null) => {
    if (hoveredRef.current === id) return;
    hoveredRef.current = id;
    notifyBehavior();
  }, []);

  // ── Context value ─────────────────────────────────────────────────

  const api = useMemo<SelectionAPI>(
    () => ({
      selection, selectedIds, enteredFrameId, isDragging, hoveredId,
      select, toggle, add, selectMany, clear, isSelected,
      enterFrame, exitFrame, setDragging, setHovered,
    }),
    [
      selection, selectedIds, enteredFrameId, isDragging, hoveredId,
      select, toggle, add, selectMany, clear, isSelected,
      enterFrame, exitFrame, setDragging, setHovered,
    ],
  );

  return <SelectionContext.Provider value={api}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionAPI {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within a SelectionProvider');
  return ctx;
}
