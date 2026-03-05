import { createContext, useContext } from 'react';
import type { Mode } from './menuTypes';

const ModeContext = createContext<Mode | null>(null);

export const ModeProvider = ModeContext.Provider;

export function useMode(): Mode {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within a ModeProvider');
  return ctx;
}
