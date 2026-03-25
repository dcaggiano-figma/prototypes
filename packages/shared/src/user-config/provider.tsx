import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { UserConfig } from './types';

const STORAGE_KEY = 'ppg:userConfig';

function loadStoredConfig(): Partial<UserConfig> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<UserConfig>;
  } catch {
    return null;
  }
}

function saveConfig(config: UserConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    console.warn('Failed to save user config to localStorage');
  }
}

interface UserConfigContextValue {
  config: UserConfig;
  initial: string;
  updateConfig: (partial: Partial<UserConfig>) => void;
}

const UserConfigContext = createContext<UserConfigContextValue | null>(null);

interface UserConfigProviderProps {
  defaultConfig: UserConfig;
  children: ReactNode;
}

export function UserConfigProvider({ defaultConfig, children }: UserConfigProviderProps) {
  const [config, setConfig] = useState<UserConfig>(() => {
    const stored = loadStoredConfig();
    if (stored) return { ...defaultConfig, ...stored };
    return defaultConfig;
  });

  const updateConfig = useCallback((partial: Partial<UserConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const value = useMemo<UserConfigContextValue>(() => ({
    config,
    initial: config.name.charAt(0).toUpperCase(),
    updateConfig,
  }), [config, updateConfig]);

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
