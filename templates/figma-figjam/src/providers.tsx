import { ActionProvider } from './actions/provider';
import {
  SceneGraphProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  ViewportProvider,
} from './canvas';
import { CommentsProvider, UserConfigProvider } from '@prototype/shared';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserConfigProvider config={{ name: 'Josh Ferrell' }}>
      <SceneGraphProvider>
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
      </SceneGraphProvider>
    </UserConfigProvider>
  );
}
