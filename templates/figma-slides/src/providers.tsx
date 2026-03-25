import { ActionProvider } from './actions/provider';
import {
  FontLoader,
  LabelEditingProvider,
  SceneGraphProvider,
  NodeBehaviorProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  UndoManagerProvider,
  ViewportProvider,
} from './canvas';
import type { NodeBehaviorConfig } from './canvas';
import { CommentsProvider, UserConfigProvider } from '@prototype/shared';
import { RenderingBridge } from './rendering-bridge';
import { SpeakerNotesProvider } from './components/SpeakerNotesContext';
import { createInitialSceneGraph } from './defaults/createInitialSceneGraph';
import defaultComments from './defaults/default-comments.json';

const NODE_BEHAVIOR: NodeBehaviorConfig = {
  SLIDE: { showHoverOutline: false, showSelectionOutline: false, showResizeHandles: false },
  GRID_SECTION: { showHoverOutline: false, showSelectionOutline: false, showResizeHandles: false },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserConfigProvider defaultConfig={{ name: 'Josh Ferrell', color: 'yellow' }}>
      <NodeBehaviorProvider config={NODE_BEHAVIOR}>
        <SceneGraphProvider createDefault={createInitialSceneGraph}>
          <FontLoader />
          <UndoManagerProvider>
            <ViewportProvider>
              <RenderingBridge>
                <SelectionProvider>
                  <TextEditingProvider>
                    <LabelEditingProvider>
                      <ToolProvider>
                        <CommentsProvider defaultComments={defaultComments.threads}>
                          <ActionProvider>
                            <SpeakerNotesProvider>{children}</SpeakerNotesProvider>
                          </ActionProvider>
                        </CommentsProvider>
                      </ToolProvider>
                    </LabelEditingProvider>
                  </TextEditingProvider>
                </SelectionProvider>
              </RenderingBridge>
            </ViewportProvider>
          </UndoManagerProvider>
        </SceneGraphProvider>
      </NodeBehaviorProvider>
    </UserConfigProvider>
  );
}
