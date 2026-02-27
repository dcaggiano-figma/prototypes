import { createContext, useContext, type ReactNode } from 'react';

interface LeftSidebarContextValue {
  activeItem: string;
  onItemChange: (id: string) => void;
}

const LeftSidebarContext = createContext<LeftSidebarContextValue | null>(null);

export function useLeftSidebar(): LeftSidebarContextValue {
  const ctx = useContext(LeftSidebarContext);
  if (!ctx) throw new Error('useLeftSidebar must be used within a LeftSidebar.Provider');
  return ctx;
}

interface LeftSidebarProviderProps {
  activeItem: string;
  onItemChange: (id: string) => void;
  children: ReactNode;
}

export function LeftSidebarProvider({ activeItem, onItemChange, children }: LeftSidebarProviderProps) {
  return (
    <LeftSidebarContext.Provider value={{ activeItem, onItemChange }}>
      {children}
    </LeftSidebarContext.Provider>
  );
}
