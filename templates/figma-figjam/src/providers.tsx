import { ActionProvider } from './actions/provider';
import {
  SceneGraphProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  ViewportProvider,
} from './canvas';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SceneGraphProvider>
      <ViewportProvider>
        <SelectionProvider>
          <TextEditingProvider>
            <ToolProvider>
              <ActionProvider>{children}</ActionProvider>
            </ToolProvider>
          </TextEditingProvider>
        </SelectionProvider>
      </ViewportProvider>
    </SceneGraphProvider>
  );
}
