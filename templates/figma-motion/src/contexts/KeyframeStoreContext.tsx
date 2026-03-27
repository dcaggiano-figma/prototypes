import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type KeyframeableProperty = 'x' | 'y' | 'rotation' | 'opacity' | 'width' | 'height';

export const KEYFRAMEABLE_PROPERTIES: KeyframeableProperty[] = ['x', 'y', 'rotation', 'opacity', 'width', 'height'];

export interface Keyframe {
  timeMs: number;
  value: number;
}

export interface KeyframeStoreValue {
  autoKeyframeActive: boolean;
  setAutoKeyframeActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  /** Properties that have keyframing enabled per node. */
  enabledProperties: Map<string, Set<KeyframeableProperty>>;
  /** Keyframes per node per property, sorted by timeMs. */
  keyframes: Map<string, Map<KeyframeableProperty, Keyframe[]>>;
  isPropertyEnabled: (nodeId: string, property: KeyframeableProperty) => boolean;
  togglePropertyKeyframing: (nodeId: string, property: KeyframeableProperty, initialValue?: number, currentMs?: number) => void;
  enableAllKeyframing: (nodeId: string) => void;
  addKeyframe: (nodeId: string, property: KeyframeableProperty, timeMs: number, value: number, baseValue?: number) => void;
  getKeyframes: (nodeId: string, property: KeyframeableProperty) => Keyframe[];
  getNodeKeyframes: (nodeId: string) => Map<KeyframeableProperty, Keyframe[]>;
  hasAnyKeyframes: (nodeId: string) => boolean;
  moveKeyframe: (nodeId: string, property: KeyframeableProperty, oldTimeMs: number, newTimeMs: number) => void;
}

const KeyframeStoreContext = createContext<KeyframeStoreValue | null>(null);

export function useKeyframeStore(): KeyframeStoreValue {
  const ctx = useContext(KeyframeStoreContext);
  if (!ctx) throw new Error('useKeyframeStore must be used within KeyframeStoreProvider');
  return ctx;
}

export function useKeyframeStoreOptional(): KeyframeStoreValue | null {
  return useContext(KeyframeStoreContext);
}

export function KeyframeStoreProvider({ children }: { children: ReactNode }) {
  const [autoKeyframeActive, setAutoKeyframeActive] = useState(false);
  const [enabledProperties, setEnabledProperties] = useState<Map<string, Set<KeyframeableProperty>>>(() => new Map());
  const [keyframes, setKeyframes] = useState<Map<string, Map<KeyframeableProperty, Keyframe[]>>>(() => new Map());

  const isPropertyEnabled = useCallback(
    (nodeId: string, property: KeyframeableProperty) => {
      return enabledProperties.get(nodeId)?.has(property) ?? false;
    },
    [enabledProperties],
  );

  const togglePropertyKeyframing = useCallback(
    (nodeId: string, property: KeyframeableProperty, initialValue?: number, currentMs?: number) => {
      setEnabledProperties((prev) => {
        const next = new Map(prev);
        const nodeSet = new Set(next.get(nodeId) ?? []);
        if (nodeSet.has(property)) {
          nodeSet.delete(property);
        } else {
          nodeSet.add(property);
        }
        if (nodeSet.size === 0) {
          next.delete(nodeId);
        } else {
          next.set(nodeId, nodeSet);
        }
        return next;
      });

      if (initialValue !== undefined && currentMs !== undefined) {
        setKeyframes((prev) => {
          const wasEnabled = prev.get(nodeId)?.get(property)?.length;
          if (wasEnabled) return prev;
          const next = new Map(prev);
          const nodeMap = new Map(next.get(nodeId) ?? []);
          const existing = nodeMap.get(property) ?? [];
          if (existing.length === 0) {
            const kfs: Keyframe[] = [];
            if (currentMs > 0) {
              kfs.push({ timeMs: 0, value: initialValue });
            }
            kfs.push({ timeMs: currentMs, value: initialValue });
            nodeMap.set(property, kfs);
            next.set(nodeId, nodeMap);
          }
          return next;
        });
      }
    },
    [],
  );

  const enableAllKeyframing = useCallback((nodeId: string) => {
    setEnabledProperties((prev) => {
      const next = new Map(prev);
      next.set(nodeId, new Set(KEYFRAMEABLE_PROPERTIES));
      return next;
    });
  }, []);

  const addKeyframe = useCallback(
    (nodeId: string, property: KeyframeableProperty, timeMs: number, value: number, baseValue?: number) => {
      setKeyframes((prev) => {
        const next = new Map(prev);
        const nodeMap = new Map(next.get(nodeId) ?? []);
        const propKfs = [...(nodeMap.get(property) ?? [])];

        if (propKfs.length === 0 && timeMs > 0 && baseValue !== undefined) {
          propKfs.push({ timeMs: 0, value: baseValue });
        }

        const existingIdx = propKfs.findIndex((kf) => kf.timeMs === timeMs);
        if (existingIdx >= 0) {
          propKfs[existingIdx] = { timeMs, value };
        } else {
          propKfs.push({ timeMs, value });
          propKfs.sort((a, b) => a.timeMs - b.timeMs);
        }

        nodeMap.set(property, propKfs);
        next.set(nodeId, nodeMap);
        return next;
      });

      setEnabledProperties((prev) => {
        const nodeSet = prev.get(nodeId);
        if (nodeSet?.has(property)) return prev;
        const next = new Map(prev);
        const updated = new Set(nodeSet ?? []);
        updated.add(property);
        next.set(nodeId, updated);
        return next;
      });
    },
    [],
  );

  const getKeyframes = useCallback(
    (nodeId: string, property: KeyframeableProperty): Keyframe[] => {
      return keyframes.get(nodeId)?.get(property) ?? [];
    },
    [keyframes],
  );

  const getNodeKeyframes = useCallback(
    (nodeId: string): Map<KeyframeableProperty, Keyframe[]> => {
      return keyframes.get(nodeId) ?? new Map();
    },
    [keyframes],
  );

  const moveKeyframe = useCallback(
    (nodeId: string, property: KeyframeableProperty, oldTimeMs: number, newTimeMs: number) => {
      setKeyframes((prev) => {
        const nodeMap = prev.get(nodeId);
        if (!nodeMap) return prev;
        const propKfs = nodeMap.get(property);
        if (!propKfs) return prev;

        const idx = propKfs.findIndex((kf) => kf.timeMs === oldTimeMs);
        if (idx < 0) return prev;

        const updated = [...propKfs];
        updated[idx] = { ...updated[idx], timeMs: Math.max(0, newTimeMs) };
        updated.sort((a, b) => a.timeMs - b.timeMs);

        const next = new Map(prev);
        const nextNode = new Map(nodeMap);
        nextNode.set(property, updated);
        next.set(nodeId, nextNode);
        return next;
      });
    },
    [],
  );

  const hasAnyKeyframes = useCallback(
    (nodeId: string): boolean => {
      const nodeMap = keyframes.get(nodeId);
      if (!nodeMap) return false;
      for (const kfs of nodeMap.values()) {
        if (kfs.length > 0) return true;
      }
      return false;
    },
    [keyframes],
  );

  const value = useMemo<KeyframeStoreValue>(
    () => ({
      autoKeyframeActive,
      setAutoKeyframeActive,
      enabledProperties,
      keyframes,
      isPropertyEnabled,
      togglePropertyKeyframing,
      enableAllKeyframing,
      addKeyframe,
      getKeyframes,
      getNodeKeyframes,
      hasAnyKeyframes,
      moveKeyframe,
    }),
    [autoKeyframeActive, enabledProperties, keyframes, isPropertyEnabled, togglePropertyKeyframing, enableAllKeyframing, addKeyframe, getKeyframes, getNodeKeyframes, hasAnyKeyframes, moveKeyframe],
  );

  return (
    <KeyframeStoreContext.Provider value={value}>
      {children}
    </KeyframeStoreContext.Provider>
  );
}
