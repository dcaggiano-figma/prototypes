import { ActionProvider } from './actions/provider';
import {
  SceneGraphProvider,
  SelectionProvider,
  ToolProvider,
  ViewportProvider,
} from './canvas';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SceneGraphProvider>
      <ViewportProvider>
        <SelectionProvider>
          <ToolProvider>
            <ActionProvider>{children}</ActionProvider>
          </ToolProvider>
        </SelectionProvider>
      </ViewportProvider>
    </SceneGraphProvider>
  );
}
