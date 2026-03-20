import { useMemo } from 'react';

import { ActionProvider } from './actions/provider';
import {
  LabelEditingProvider,
  SceneGraph,
  SceneGraphProvider,
  NodeBehaviorProvider,
  SelectionProvider,
  TextEditingProvider,
  ToolProvider,
  UndoManagerProvider,
  ViewportProvider,
  getTypeDefaults,
  createPaint,
} from './canvas';
import type { NodeBehaviorConfig } from './canvas';
import { CommentsProvider, UserConfigProvider } from '@prototype/shared';
import { RenderingBridge } from './rendering-bridge';
import { SpeakerNotesProvider } from './components/SpeakerNotesContext';
import {
  SLIDE_WIDTH, SLIDE_HEIGHT, getSlidePosition, getSectionBounds, getSectionRowY,
} from './canvas/scene-graph/grid';

const NODE_BEHAVIOR: NodeBehaviorConfig = {
  SLIDE: { showHoverOutline: false, showSelectionOutline: false, showResizeHandles: false },
  GRID_SECTION: { showHoverOutline: false, showSelectionOutline: false, showResizeHandles: false },
};

/** Build the initial scene graph with 2 sections x 3 slides each */
function createSlidesSceneGraph(): SceneGraph {
  const sg = new SceneGraph();
  const canvas = sg.createCanvas('Page 1');

  const WHITE_FILL = createPaint({ type: 'SOLID', color: { r: 255, g: 255, b: 255 }, opacity: 1, visible: true });
  const SECTION_STROKE = createPaint({ type: 'SOLID', color: { r: 217, g: 217, b: 217 }, opacity: 1, visible: true });
  const SECTION_FILL = createPaint({ type: 'SOLID', color: { r: 245, g: 245, b: 245 }, opacity: 1, visible: true });

  // Create two section rows with 3 slides each
  const rows = [
    { name: 'Row 1', slideNames: ['Slide 1', 'Slide 2', 'Slide 3'] },
    { name: 'Row 2', slideNames: ['Slide 4', 'Slide 5', 'Slide 6'] },
  ];

  for (let row = 0; row < rows.length; row++) {
    const { name, slideNames } = rows[row];
    const bounds = getSectionBounds(row, slideNames.length);
    const y = getSectionRowY(row);

    const section = sg.createNode('GRID_SECTION', canvas.id, {
      ...getTypeDefaults('GRID_SECTION'),
      name,
      x: bounds.x,
      y,
      width: bounds.width,
      height: bounds.height,
      cornerRadius: 8,
      fills: [SECTION_FILL],
      strokes: [SECTION_STROKE],
      strokeWeight: 2,
      strokeAlign: 'INSIDE',
    });

    for (let col = 0; col < slideNames.length; col++) {
      const pos = getSlidePosition(row, col);
      sg.createNode('SLIDE', section.id, {
        ...getTypeDefaults('SLIDE'),
        name: slideNames[col],
        x: pos.x,
        y: pos.y,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        fills: [WHITE_FILL],
        strokes: [],
        strokeWeight: 0,
        strokeAlign: 'CENTER',
        clipsContent: true,
      });
    }
  }

  return sg;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const sg = useMemo(() => createSlidesSceneGraph(), []);

  return (
    <UserConfigProvider config={{ name: 'Josh Ferrell', color: 'yellow' }}>
      <NodeBehaviorProvider config={NODE_BEHAVIOR}>
        <SceneGraphProvider sceneGraph={sg}>
          <UndoManagerProvider>
            <ViewportProvider>
              <RenderingBridge>
                <SelectionProvider>
                  <TextEditingProvider>
                    <LabelEditingProvider>
                      <ToolProvider>
                        <CommentsProvider>
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
