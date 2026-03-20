/**
 * Bridge component that wires RenderingProvider with the SceneGraph
 * and Viewport instances from their respective providers.
 *
 * Exists because RenderingProvider needs concrete instances, but those
 * are only available via hooks inside the provider tree.
 */

import { useSceneGraph, useViewport, RenderingProvider } from '@prototype/shared/canvas';

export function RenderingBridge({ children }: { children: React.ReactNode }) {
  const sg = useSceneGraph();
  const { instance: viewport } = useViewport();

  return (
    <RenderingProvider sg={sg} viewport={viewport}>
      {children}
    </RenderingProvider>
  );
}
