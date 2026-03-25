import { ActionProvider } from './actions/provider';
import {
  FontLoader,
  LabelEditingProvider,
  SceneGraphProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  UndoManagerProvider,
  ViewportProvider,
} from './canvas';
import { CommentsProvider, UserConfigProvider } from '@prototype/shared';
import type { CommentThread } from '@prototype/shared';
import { RenderingBridge } from './rendering-bridge';
import { createInitialSceneGraph } from './defaults/createInitialSceneGraph';
import defaultComments from './defaults/default-comments.json';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserConfigProvider defaultConfig={{ name: 'Josh Ferrell', color: 'yellow' }}>
      <SceneGraphProvider createDefault={createInitialSceneGraph}>
        <FontLoader />
        <UndoManagerProvider>
          <ViewportProvider>
            <RenderingBridge>
              <SelectionProvider>
                <TextEditingProvider>
                  <LabelEditingProvider>
                    <ToolProvider>
                      <CommentsProvider defaultComments={defaultComments.threads as CommentThread[]}>
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
