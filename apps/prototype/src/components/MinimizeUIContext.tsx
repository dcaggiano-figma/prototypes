import { createContext, useContext } from 'react';

export interface MinimizeUIState {
  isMinimized: boolean;
  toggleMinimize: () => void;
  fileName: string;
  setFileName: (name: string) => void;
}

const MinimizeUIContext = createContext<MinimizeUIState | null>(null);

export const MinimizeUIProvider = MinimizeUIContext.Provider;

export function useMinimizeUI(): MinimizeUIState {
  const ctx = useContext(MinimizeUIContext);
  if (!ctx) throw new Error('useMinimizeUI must be used within a MinimizeUIProvider');
  return ctx;
}
