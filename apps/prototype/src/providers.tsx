import { ActionProvider } from './actions/provider';
import {
  SceneGraphProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  UndoManagerProvider,
  ViewportProvider,
} from './canvas';
import { CommentsProvider, UserConfigProvider } from '@prototype/shared';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserConfigProvider config={{ name: 'Josh Ferrell', color: 'yellow' }}>
      <SceneGraphProvider>
        <UndoManagerProvider>
          <ViewportProvider>
            <SelectionProvider>
              <TextEditingProvider>
                <ToolProvider>
                  <CommentsProvider>
                    <ActionProvider>{children}</ActionProvider>
                  </CommentsProvider>
                </ToolProvider>
              </TextEditingProvider>
            </SelectionProvider>
          </ViewportProvider>
        </UndoManagerProvider>
      </SceneGraphProvider>
    </UserConfigProvider>
  );
}
