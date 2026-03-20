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
  return (
    <UserConfigProvider config={{ name: 'Josh Ferrell', color: 'yellow' }}>
      <SceneGraphProvider createDefault={createInitialSceneGraph}>
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
