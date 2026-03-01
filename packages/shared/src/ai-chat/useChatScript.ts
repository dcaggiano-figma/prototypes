import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { ScriptStep } from './types';
import { createScriptedChatStore, type ScriptedChatStore } from './store';

/**
 * Thin React hook wrapper around createScriptedChatStore.
 * Backward-compatible with the original useChatScript hook from the make template.
 */
export function useChatScript(script: ScriptStep[], enabled = true) {
  const storeRef = useRef<ScriptedChatStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createScriptedChatStore(script);
  }
  const store = storeRef.current;

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (enabled && !hasStartedRef.current) {
      hasStartedRef.current = true;
      store.start();
    }
  }, [enabled, store]);

  useEffect(() => {
    // Re-enable the store after React StrictMode's cleanup-then-remount cycle.
    store.revive();
    return () => store.dispose();
  }, [store]);

  const reset = useCallback(() => {
    hasStartedRef.current = false;
    store.reset();
  }, [store]);

  const restart = useCallback(() => {
    hasStartedRef.current = false;
    store.restart();
    // The useEffect won't re-fire if `enabled` hasn't changed (e.g. still true),
    // so we need to re-start the store directly.
    if (enabled) {
      hasStartedRef.current = true;
      store.start();
    }
  }, [store, enabled]);

  return {
    items: snapshot.items,
    transient: snapshot.transient,
    tasks: snapshot.tasks,
    isWorking: snapshot.isWorking,
    awaitingUserAction: snapshot.awaitingUserAction,
    onStreamComplete: store.onStreamComplete,
    onStartTasks: store.onStartTasks,
    reset,
    restart,
  };
}
