import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react';

import { type ScriptStep } from '../data/chatScript';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TaskStatus = 'pending' | 'in_progress' | 'complete';

export interface Task {
  label: string;
  status: TaskStatus;
}

export type ChatItem =
  | { id: string; type: 'reasoning'; content: string; status: 'active' | 'complete' }
  | { id: string; type: 'ai-message'; content: string; streaming: boolean }
  | { id: string; type: 'todo-list' }
  | { id: string; type: 'work-log'; files: string[] }
  | { id: string; type: 'version'; label: string }
  | { id: string; type: 'rating' };

export type TransientItem =
  | { type: 'progress'; label: string }
  | { type: 'view-file'; fileName: string }
  | { type: 'write-file'; fileName: string; code: string };

/* ------------------------------------------------------------------ */
/*  State & actions                                                    */
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

function reducer(state: ScriptState, action: Action): ScriptState {
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
/*  ID generation                                                      */
/* ------------------------------------------------------------------ */

let nextId = 0;
function genId(): string {
  nextId += 1;
  return `item-${nextId}`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useChatScript(script: ScriptStep[], enabled = true) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeItemRef = useRef<string | null>(null);
  const transientRef = useRef(state.transient);
  transientRef.current = state.transient;

  /* ---- Set isWorking when script becomes enabled ---- */

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (enabled && !hasStartedRef.current) {
      hasStartedRef.current = true;
      dispatch({ type: 'SET_WORKING', value: true });
    }
  }, [enabled]);

  /* ---- Main effect: process the current step ---- */

  useEffect(() => {
    if (!enabled || state.stepIndex >= script.length) {
      return undefined;
    }

    const step = script[state.stepIndex];
    let timer: ReturnType<typeof setTimeout> | null = null;

    switch (step.type) {
      case 'progress': {
        dispatch({
          type: 'SET_TRANSIENT',
          transient: { type: 'progress', label: step.label },
        });
        timer = setTimeout(() => {
          dispatch({ type: 'CLEAR_TRANSIENT' });
          dispatch({ type: 'ADVANCE' });
        }, step.duration);
        break;
      }

      case 'reasoning': {
        const id = genId();
        dispatch({
          type: 'ADD_ITEM',
          item: {
            id, type: 'reasoning', content: step.content, status: 'active',
          },
        });
        activeItemRef.current = id;
        break;
      }

      case 'ai-message': {
        const id = genId();
        dispatch({
          type: 'ADD_ITEM',
          item: {
            id, type: 'ai-message', content: step.content, streaming: true,
          },
        });
        activeItemRef.current = id;
        break;
      }

      case 'view-file': {
        dispatch({
          type: 'SET_TRANSIENT',
          transient: { type: 'view-file', fileName: step.fileName },
        });
        timer = setTimeout(() => {
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
        dispatch({
          type: 'APPEND_WORK_LOG',
          id: genId(),
          files: step.files,
        });
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

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.stepIndex, script, enabled]);

  /* ---- Callbacks for components ---- */

  const onStreamComplete = useCallback(() => {
    const id = activeItemRef.current;
    if (id) {
      dispatch({
        type: 'UPDATE_ITEM',
        id,
        updates: { streaming: false, status: 'complete' },
      });
      activeItemRef.current = null;
    }
    if (transientRef.current?.type === 'write-file') {
      dispatch({ type: 'CLEAR_TRANSIENT' });
    }
    dispatch({ type: 'ADVANCE' });
  }, []);

  const onStartTasks = useCallback(() => {
    dispatch({ type: 'SET_AWAITING', value: false });
    dispatch({ type: 'ADVANCE' });
  }, []);

  const reset = useCallback(() => {
    hasStartedRef.current = false;
    activeItemRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  const restart = useCallback(() => {
    hasStartedRef.current = false;
    activeItemRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  /* ---- Return ---- */

  return {
    items: state.items,
    transient: state.transient,
    tasks: state.tasks,
    isWorking: state.isWorking,
    awaitingUserAction: state.awaitingUserAction,
    onStreamComplete,
    onStartTasks,
    reset,
    restart,
  };
}
