import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type DesignTab = 'design' | 'prototype' | 'animation';

interface DesignTabContextValue {
  activeTab: DesignTab;
  setActiveTab: (tab: DesignTab) => void;
}

const DesignTabContext = createContext<DesignTabContextValue | null>(null);

export function useDesignTab() {
  const ctx = useContext(DesignTabContext);
  if (!ctx) throw new Error('useDesignTab must be used within DesignTabProvider');
  return ctx;
}

export function useDesignTabOptional() {
  return useContext(DesignTabContext);
}

interface DesignTabProviderProps {
  children: ReactNode;
}

export function DesignTabProvider({ children }: DesignTabProviderProps) {
  const [activeTab, setActiveTabState] = useState<DesignTab>('design');
  const setActiveTab = useCallback((tab: DesignTab) => setActiveTabState(tab), []);
  const value: DesignTabContextValue = { activeTab, setActiveTab };
  return (
    <DesignTabContext.Provider value={value}>
      {children}
    </DesignTabContext.Provider>
  );
}
