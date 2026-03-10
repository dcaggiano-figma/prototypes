import { ActionProvider } from './actions/provider';
import {
  NodeBehaviorProvider,
  SceneGraphProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  ViewportProvider,
} from './canvas';
import type { NodeBehaviorConfig } from './canvas';
import { CommentsProvider, UserConfigProvider } from '@prototype/shared';
import { SpeakerNotesProvider } from './components/SpeakerNotesContext';

const NODE_BEHAVIOR: NodeBehaviorConfig = {
  SLIDE: { showHoverOutline: false, showSelectionOutline: false, showResizeHandles: false },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserConfigProvider config={{ name: 'Josh Ferrell', color: 'yellow' }}>
      <NodeBehaviorProvider config={NODE_BEHAVIOR}>
        <SceneGraphProvider>
          <ViewportProvider>
            <SelectionProvider>
              <TextEditingProvider>
                <ToolProvider>
                  <CommentsProvider>
                    <ActionProvider>
                      <SpeakerNotesProvider>{children}</SpeakerNotesProvider>
                    </ActionProvider>
                  </CommentsProvider>
                </ToolProvider>
              </TextEditingProvider>
            </SelectionProvider>
          </ViewportProvider>
        </SceneGraphProvider>
      </NodeBehaviorProvider>
    </UserConfigProvider>
  );
}
