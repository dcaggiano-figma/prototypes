import type {
  AiChatSnapshot,
  AiChatStoreAPI,
  ChatItem,
  ScriptStep,
  Task,
  TaskStatus,
  TransientItem,
} from './types';

/* ------------------------------------------------------------------ */
/*  ID generation                                                      */
/* ------------------------------------------------------------------ */

let nextId = 0;
function genId(): string {
  nextId += 1;
  return `item-${nextId}`;
}

/* ------------------------------------------------------------------ */
/*  State & actions (ported from useChatScript reducer)                 */
/* ------------------------------------------------------------------ */

interface ScriptState {
  stepIndex: number;
  items: ChatItem[];
  transient: TransientItem | null;
  tasks: Task[];
  isWorking: boolean;
  awaitingUserAction: boolean;
}

type Action =
  | { type: 'ADVANCE' }
  | { type: 'ADD_ITEM'; item: ChatItem }
  | { type: 'UPDATE_ITEM'; id: string; updates: Record<string, unknown> }
  | { type: 'APPEND_WORK_LOG'; id: string; files: string[] }
  | { type: 'SET_TRANSIENT'; transient: TransientItem | null }
  | { type: 'CLEAR_TRANSIENT' }
  | { type: 'SET_TASKS'; tasks: Task[] }
  | { type: 'UPDATE_TASK'; index: number; status: TaskStatus }
  | { type: 'SET_AWAITING'; value: boolean }
  | { type: 'SET_WORKING'; value: boolean }
  | { type: 'RESET' };

const initialState: ScriptState = {
  stepIndex: 0,
  items: [],
  transient: null,
  tasks: [],
  isWorking: false,
  awaitingUserAction: false,
};

function reduce(state: ScriptState, action: Action): ScriptState {
  switch (action.type) {
    case 'ADVANCE':
      return { ...state, stepIndex: state.stepIndex + 1 };

    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item) => (
          item.id === action.id ? { ...item, ...action.updates } : item
        )),
      };

    case 'APPEND_WORK_LOG': {
      const existing = state.items.find(
        (item): item is Extract<ChatItem, { type: 'work-log' }> => item.type === 'work-log',
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) => (
            item.id === existing.id
              ? { ...item, files: [...existing.files, ...action.files] }
              : item
          )),
        };
      }
      return {
        ...state,
        items: [...state.items, { id: action.id, type: 'work-log' as const, files: action.files }],
      };
    }

    case 'SET_TRANSIENT':
      return { ...state, transient: action.transient };

    case 'CLEAR_TRANSIENT':
      return { ...state, transient: null };

    case 'SET_TASKS':
      return { ...state, tasks: action.tasks };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task, i) => (
          i === action.index ? { ...task, status: action.status } : task
        )),
      };

    case 'SET_AWAITING':
      return { ...state, awaitingUserAction: action.value };

    case 'SET_WORKING':
      return { ...state, isWorking: action.value };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Scripted chat store                                                */
/* ------------------------------------------------------------------ */

export interface ScriptedChatStore extends AiChatStoreAPI {
  start(): void;
  restart(): void;
  /** Re-enable the store after a dispose (handles React StrictMode double-mount). */
  revive(): void;
  dispose(): void;
}

export function createScriptedChatStore(script: ScriptStep[]): ScriptedChatStore {
  const listeners = new Set<() => void>();
  let state = { ...initialState };
  let cachedSnapshot = {
    items: state.items,
    transient: state.transient,
    tasks: state.tasks,
    isWorking: state.isWorking,
    awaitingUserAction: state.awaitingUserAction,
  };
  let activeItemId: string | null = null;
  let hasStarted = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let disposed = false;

  function dispatch(action: Action) {
    if (disposed) return;
    state = reduce(state, action);
    cachedSnapshot = {
      items: state.items,
      transient: state.transient,
      tasks: state.tasks,
      isWorking: state.isWorking,
      awaitingUserAction: state.awaitingUserAction,
    };
    notify();
    // After state change, process the new step if we advanced
    if (action.type === 'ADVANCE') {
      processCurrentStep();
    }
  }

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function addTimer(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  function processCurrentStep() {
    if (disposed || state.stepIndex >= script.length) return;

    const step = script[state.stepIndex];

    switch (step.type) {
      case 'progress': {
        dispatch({ type: 'SET_TRANSIENT', transient: { type: 'progress', label: step.label } });
        addTimer(() => {
          dispatch({ type: 'CLEAR_TRANSIENT' });
          dispatch({ type: 'ADVANCE' });
        }, step.duration);
        break;
      }

      case 'reasoning': {
        const id = genId();
        dispatch({
          type: 'ADD_ITEM',
          item: { id, type: 'reasoning', content: step.content, status: 'active' },
        });
        activeItemId = id;
        break;
      }

      case 'ai-message': {
        const id = genId();
        dispatch({
          type: 'ADD_ITEM',
          item: { id, type: 'ai-message', content: step.content, streaming: true },
        });
        activeItemId = id;
        break;
      }

      case 'view-file': {
        dispatch({
          type: 'SET_TRANSIENT',
          transient: { type: 'view-file', fileName: step.fileName },
        });
        addTimer(() => {
          dispatch({ type: 'CLEAR_TRANSIENT' });
          dispatch({ type: 'ADVANCE' });
        }, step.duration);
        break;
      }

      case 'todo-list': {
        dispatch({
          type: 'SET_TASKS',
          tasks: step.tasks.map((label) => ({ label, status: 'pending' as const })),
        });
        dispatch({
          type: 'ADD_ITEM',
          item: { id: genId(), type: 'todo-list' },
        });
        dispatch({ type: 'SET_AWAITING', value: true });
        break;
      }

      case 'start-task': {
        dispatch({ type: 'UPDATE_TASK', index: step.taskIndex, status: 'in_progress' });
        queueMicrotask(() => dispatch({ type: 'ADVANCE' }));
        break;
      }

      case 'write-file': {
        dispatch({
          type: 'SET_TRANSIENT',
          transient: { type: 'write-file', fileName: step.fileName, code: step.code },
        });
        break;
      }

      case 'complete-task': {
        dispatch({ type: 'CLEAR_TRANSIENT' });
        dispatch({ type: 'UPDATE_TASK', index: step.taskIndex, status: 'complete' });
        dispatch({ type: 'APPEND_WORK_LOG', id: genId(), files: step.files });
        queueMicrotask(() => dispatch({ type: 'ADVANCE' }));
        break;
      }

      case 'version': {
        dispatch({
          type: 'ADD_ITEM',
          item: { id: genId(), type: 'version', label: step.label },
        });
        queueMicrotask(() => dispatch({ type: 'ADVANCE' }));
        break;
      }

      case 'rating': {
        dispatch({
          type: 'ADD_ITEM',
          item: { id: genId(), type: 'rating' },
        });
        queueMicrotask(() => dispatch({ type: 'ADVANCE' }));
        break;
      }

      case 'done': {
        dispatch({ type: 'SET_WORKING', value: false });
        break;
      }

      default:
        break;
    }
  }

  const store: ScriptedChatStore = {
    getSnapshot() {
      return cachedSnapshot;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    onStreamComplete() {
      const id = activeItemId;
      if (id) {
        dispatch({
          type: 'UPDATE_ITEM',
          id,
          updates: { streaming: false, status: 'complete' },
        });
        activeItemId = null;
      }
      if (state.transient?.type === 'write-file') {
        dispatch({ type: 'CLEAR_TRANSIENT' });
      }
      dispatch({ type: 'ADVANCE' });
    },

    onStartTasks() {
      dispatch({ type: 'SET_AWAITING', value: false });
      dispatch({ type: 'ADVANCE' });
    },

    reset() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      hasStarted = false;
      activeItemId = null;
      state = { ...initialState };
      cachedSnapshot = {
        items: state.items,
        transient: state.transient,
        tasks: state.tasks,
        isWorking: state.isWorking,
        awaitingUserAction: state.awaitingUserAction,
      };
      notify();
    },

    start() {
      if (hasStarted) return;
      hasStarted = true;
      dispatch({ type: 'SET_WORKING', value: true });
      processCurrentStep();
    },

    restart() {
      store.reset();
    },

    revive() {
      disposed = false;
    },

    dispose() {
      disposed = true;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      listeners.clear();
    },
  };

  return store;
}

/* ------------------------------------------------------------------ */
/*  Live chat store (future AI integration)                            */
/* ------------------------------------------------------------------ */

export interface LiveChatStore extends AiChatStoreAPI {
  pushItem(item: ChatItem): void;
  updateItem(id: string, updates: Partial<ChatItem>): void;
  setTransient(transient: TransientItem | null): void;
  setTasks(tasks: Task[]): void;
  setAwaiting(value: boolean): void;
  setWorking(working: boolean): void;
  appendWorkLog(files: string[]): void;
}

export function createLiveChatStore(): LiveChatStore {
  const listeners = new Set<() => void>();
  let items: ChatItem[] = [];
  let transient: TransientItem | null = null;
  let tasks: Task[] = [];
  let isWorking = false;
  let awaitingUserAction = false;
  let cachedSnapshot: AiChatSnapshot = { items, transient, tasks, isWorking, awaitingUserAction };

  function updateSnapshot() {
    cachedSnapshot = { items, transient, tasks, isWorking, awaitingUserAction };
  }

  function notify() {
    updateSnapshot();
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot() {
      return cachedSnapshot;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    onStreamComplete() {
      if (transient) {
        transient = null;
        notify();
      }
    },
    onStartTasks() {
      awaitingUserAction = false;
      notify();
    },

    reset() {
      items = [];
      transient = null;
      tasks = [];
      isWorking = false;
      awaitingUserAction = false;
      notify();
    },

    pushItem(item) {
      items = [...items, item];
      notify();
    },

    updateItem(id, updates) {
      items = items.map((item) => (item.id === id ? { ...item, ...updates } : item)) as ChatItem[];
      notify();
    },

    setTransient(t) {
      transient = t;
      notify();
    },

    setTasks(t) {
      tasks = t;
      notify();
    },

    setAwaiting(value) {
      awaitingUserAction = value;
      notify();
    },

    setWorking(working) {
      isWorking = working;
      notify();
    },

    appendWorkLog(files) {
      const existing = items.find(
        (item): item is Extract<ChatItem, { type: 'work-log' }> => item.type === 'work-log',
      );
      if (existing) {
        items = items.map((item) => (
          item.id === existing.id
            ? { ...item, files: [...existing.files, ...files] }
            : item
        )) as ChatItem[];
      } else {
        nextId += 1;
        items = [...items, { id: `item-${nextId}`, type: 'work-log' as const, files }];
      }
      notify();
    },
  };
}
