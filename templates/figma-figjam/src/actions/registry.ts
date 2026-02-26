export type ActionHandler = () => void

/**
 * Centralized action registry. Components register handlers for named actions.
 * The keyboard shortcut system dispatches actions by name.
 */
export interface ActionRegistry {
  /** Register a handler for an action. Returns an unregister function. */
  register(action: string, handler: ActionHandler): () => void
  /** Dispatch an action by name. Calls the most recently registered handler. */
  dispatch(action: string): boolean
}

export function createActionRegistry(): ActionRegistry {
  // Stack per action — last registered wins (most specific context)
  const handlers = new Map<string, ActionHandler[]>();

  return {
    register(action, handler) {
      let stack = handlers.get(action);
      if (!stack) {
        stack = [];
        handlers.set(action, stack);
      }
      stack.push(handler);

      return () => {
        const s = handlers.get(action);
        if (!s) return;
        const idx = s.indexOf(handler);
        if (idx !== -1) s.splice(idx, 1);
        if (s.length === 0) handlers.delete(action);
      };
    },

    dispatch(action) {
      const stack = handlers.get(action);
      if (!stack || stack.length === 0) return false;
      // Last registered handler wins
      stack[stack.length - 1]();
      return true;
    },
  };
}
