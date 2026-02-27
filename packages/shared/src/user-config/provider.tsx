import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UserConfig } from './types';

interface UserConfigContextValue {
  config: UserConfig;
  initial: string;
}

const UserConfigContext = createContext<UserConfigContextValue | null>(null);

interface UserConfigProviderProps {
  config: UserConfig;
  children: ReactNode;
}

export function UserConfigProvider({ config, children }: UserConfigProviderProps) {
  const value = useMemo<UserConfigContextValue>(() => ({
    config,
    initial: config.name.charAt(0).toUpperCase(),
  }), [config]);

  return (
    <UserConfigContext.Provider value={value}>
      {children}
    </UserConfigContext.Provider>
  );
}

export function useUserConfig(): UserConfigContextValue {
  const ctx = useContext(UserConfigContext);
  if (!ctx) {
    throw new Error('useUserConfig must be used within a UserConfigProvider');
  }
  return ctx;
}
