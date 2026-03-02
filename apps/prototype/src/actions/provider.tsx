import {
  createContext, useContext, useEffect, useMemo,
} from 'react';
import { addListener } from '@figma/fpl-components';

import { type ActionHandler, type ActionRegistry, createActionRegistry } from './registry';
import { eventToShortcut, SHORTCUT_MAP } from './shortcuts';

const ActionContext = createContext<ActionRegistry | null>(null);

export function ActionProvider({ children }: { children: React.ReactNode }) {
  const registry = useMemo(() => createActionRegistry(), []);

  // Single top-level keydown listener that dispatches shortcuts
  useEffect(
    () => addListener(document, 'keydown', (e) => {
      if (isTextInput(e.target)) return;

      const shortcut = eventToShortcut(e);
      const action = SHORTCUT_MAP[shortcut];
      if (action && registry.dispatch(action)) {
        e.preventDefault();
      }
    }),
    [registry],
  );

  return <ActionContext.Provider value={registry}>{children}</ActionContext.Provider>;
}

/**
 * Register a handler for a named action. The handler is automatically
 * unregistered when the component unmounts.
 */
export function useAction(action: string, handler: ActionHandler) {
  const registry = useActionRegistry();

  useEffect(() => registry.register(action, handler), [registry, action, handler]);
}

/** Get the action registry for imperative dispatch. */
export function useActionRegistry(): ActionRegistry {
  const ctx = useContext(ActionContext);
  if (!ctx) throw new Error('useActionRegistry must be used within an ActionProvider');
  return ctx;
}

function isTextInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
