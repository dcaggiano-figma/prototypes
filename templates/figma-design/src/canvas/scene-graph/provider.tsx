import {
  createContext, useCallback, useContext, useRef, useSyncExternalStore,
} from 'react';

import { createSceneGraph, DEMO_SCENE, type SceneGraphStore } from './store';
import type { Paint, SceneNode } from '../types';

export type { SceneGraphStore };

const SceneGraphContext = createContext<SceneGraphStore | null>(null);

export function SceneGraphProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<SceneGraphStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSceneGraph(DEMO_SCENE);
  }

  return (
    <SceneGraphContext.Provider value={storeRef.current}>{children}</SceneGraphContext.Provider>
  );
}

/** Access the scene graph store directly for imperative operations */
export function useSceneGraph(): SceneGraphStore {
  const store = useContext(SceneGraphContext);
  if (!store) throw new Error('useSceneGraph must be used within a SceneGraphProvider');
  return store;
}

/** Subscribe to the root nodes list — rerenders when the tree changes */
export function useRootNodes(): SceneNode[] {
  const store = useSceneGraph();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** Get a single node by ID — rerenders on any tree change */
export function useNode(id: string): SceneNode | undefined {
  const store = useSceneGraph();
  const getSnapshot = useCallback(() => store.getNode(id), [store, id]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/** Subscribe to the page background fill */
export function usePageBackground(): Paint {
  const store = useSceneGraph();
  const getSnapshot = useCallback(() => store.getPageBackground(), [store]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
