import { SceneGraph } from '@prototype/shared/canvas';
import { hydrateFromSnapshot } from '@prototype/shared';
import type { SerializedSceneGraph } from '@prototype/shared';
import defaultScene from './default-scene.json';

export function createInitialSceneGraph(): SceneGraph {
  try {
    return hydrateFromSnapshot(defaultScene as unknown as SerializedSceneGraph)
  } catch {
    const sg = new SceneGraph()
    sg.createCanvas('Page 1')
    return sg
  }
}
