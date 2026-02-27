import { ActionProvider } from './actions/provider';
import {
  SceneGraphProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  ViewportProvider,
} from './canvas';
import { CommentsProvider } from '@prototype/shared';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
