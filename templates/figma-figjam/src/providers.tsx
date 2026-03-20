import { useRef } from 'react';
import { ActionProvider } from './actions/provider';
import {
  LabelEditingProvider,
  SceneGraphProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  UndoManagerProvider,
  ViewportProvider,
} from './canvas';
import { CommentsProvider, UserConfigProvider } from '@prototype/shared';
import { RenderingBridge } from './rendering-bridge';
import { createInitialSceneGraph } from './createInitialSceneGraph';

export function Providers({ children }: { children: React.ReactNode }) {
  const sceneGraphRef = useRef<ReturnType<typeof createInitialSceneGraph> | null>(null);
  if (!sceneGraphRef.current) {
    sceneGraphRef.current = createInitialSceneGraph();
  }

  return (
    <UserConfigProvider config={{ name: 'Josh Ferrell', color: 'yellow' }}>
      <SceneGraphProvider sceneGraph={sceneGraphRef.current}>
        <UndoManagerProvider>
          <ViewportProvider>
            <RenderingBridge>
              <SelectionProvider>
                <TextEditingProvider>
                  <LabelEditingProvider>
                    <ToolProvider>
                      <CommentsProvider>
                        <ActionProvider>{children}</ActionProvider>
                      </CommentsProvider>
                    </ToolProvider>
                  </LabelEditingProvider>
                </TextEditingProvider>
              </SelectionProvider>
            </RenderingBridge>
          </ViewportProvider>
        </UndoManagerProvider>
      </SceneGraphProvider>
    </UserConfigProvider>
  );
}
