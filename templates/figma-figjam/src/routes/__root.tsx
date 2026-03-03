import { useCallback, useState } from 'react';
import { createRootRoute } from '@tanstack/react-router';
import {
  Icon24Page,
  Icon24TemplateLarge,
  Icon24Add,
  Icon24AiAssistant,
  Icon24Library,
  Icon24Help,
  Icon24Star,
} from '@figma/fpl-icons';
import { Canvas, getWorldPosition, isGeometryNode, useActiveTool, useSceneGraph, useViewport } from '../canvas';
import { CommentOverlay, ContextMenuRenderer, LeftSidebar, useComments, useContextMenu } from '@prototype/shared';
import { CommentPanel } from '../components/CommentPanel';
import { FigJamCanvasOverlay } from '../components/FigJamCanvasOverlay';
import { FigJamFileHeader } from '../components/FigJamFileHeader';
import { FigJamTopRight } from '../components/FigJamTopRight';
import { FloatingObjectToolbar } from '../components/FloatingObjectToolbar';
import { getCanvasMenuItems, getNodeMenuItems } from '../components/CanvasContextMenu';
import { FigJamZoomControls } from '../components/FigJamZoomControls';
import { FigJamMainMenu } from '../components/FigJamMainMenu';
import { TemplatesPanel, AssetsPanel, AiChatPanel } from '../components/panels';
import { useAppTheme } from '@prototype/shared';
import { MODE_TO_BRAND } from '../helpers/theme';
import { ButtonPrimitive, IconButton, Menu } from '@figma/fpl-components';
import { showToast } from '../components/toast';
import { PrototypeFeaturesModal } from '../components/PrototypeFeaturesModal';
import { Providers } from '../providers';

// ---------------------------------------------------------------------------
// Panel content per nav item (file has no panel in FigJam)
// ---------------------------------------------------------------------------

const PANELS: Record<string, React.ComponentType> = {
  templates: TemplatesPanel,
  assets: AssetsPanel,
  ai: AiChatPanel,
};

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

const navItems = [
  { Icon: Icon24Page, label: 'File', id: 'file' },
  { Icon: Icon24TemplateLarge, label: 'Templates', id: 'templates' },
  { Icon: Icon24Add, label: 'Assets', id: 'assets' },
  { Icon: Icon24AiAssistant, label: 'AI Chat', id: 'ai' },
];

// ---------------------------------------------------------------------------

function EditorLayout() {
  return (
    <Providers>
      <EditorContent />
    </Providers>
  );
}

function EditorContent() {
  const helpMenu = Menu.useMenu();
  const featuresModal = PrototypeFeaturesModal();
  const [themeSetting, setThemeSetting] = useAppTheme({
    storageKey: 'editor-shell-theme',
    brand: MODE_TO_BRAND.figjam,
  });
  const [activeRailItem, setActiveRailItem] = useState('file');
  const contextMenu = useContextMenu();
  const { activeTool, setActiveTool } = useActiveTool();
  const viewport = useViewport();
  const sceneStore = useSceneGraph();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore, threads: commentThreads } = useComments();

  /** Resolve the world position of a node by ID (for comment node-attachment) */
  const getNodePosition = useCallback(
    (nodeId: string): { x: number; y: number } | undefined => {
      const node = sceneStore.getNode(nodeId);
      if (!node || !isGeometryNode(node)) return undefined;
      return getWorldPosition(sceneStore, node);
    },
    [sceneStore],
  );

  const contextMenuItems = (contextMenu.lastMenuType) === 'node'
    ? getNodeMenuItems(contextMenu.close)
    : getCanvasMenuItems(contextMenu.close);

  return (
    <LeftSidebar.Provider activeItem={activeRailItem} onItemChange={setActiveRailItem}>
    <div className="h-screen flex overflow-hidden pointer-events-none">
      {/* Canvas — fixed behind everything */}
      <Canvas onOpenContextMenu={contextMenu.handleOpen} />

      {/* Left rail + panel */}
      <div className="pointer-events-auto flex shrink-0">
        <LeftSidebar.Rail>
          <FigJamMainMenu themeSetting={themeSetting} onThemeChange={setThemeSetting} />
          <LeftSidebar.Divider />
          <LeftSidebar.NavGroup>
            {navItems.map((item) => (
              <LeftSidebar.NavItem key={item.id} id={item.id} icon={item.Icon} label={item.label} />
            ))}
          </LeftSidebar.NavGroup>
          <LeftSidebar.Footer>
            <IconButton
              size="lg"
              aria-label="Library"
              onClick={() => console.log('Library clicked')}
            >
              <Icon24Library />
            </IconButton>
          </LeftSidebar.Footer>
        </LeftSidebar.Rail>
        <LeftSidebar.Panel panels={PANELS} />
      </div>

      {/* Main overlay with toolbar at bottom */}
      <main className="flex-1 relative pointer-events-none">
        <FigJamCanvasOverlay />
        {activeRailItem === 'file' && <FigJamFileHeader />}
      </main>

      <FigJamTopRight />
      <FloatingObjectToolbar />

      {/* Context menu — always mounted, visibility managed by FPL */}
      <ContextMenuRenderer manager={contextMenu.manager} items={contextMenuItems} />

      {activeTool === 'COMMENT' && (
        <CommentPanel onClose={() => setActiveTool('MOVE')} />
      )}

      <CommentOverlay
        interaction={interaction}
        setInteraction={setInteraction}
        selectedThreadId={selectedThreadId}
        setSelectedThreadId={setSelectedThreadId}
        store={commentsStore}
        threads={commentThreads}
        worldToScreen={viewport.worldToScreen}
        getNodePosition={getNodePosition}
      />

      <div className="absolute bottom-16px right-16px gap-2 flex items-center">
        <FigJamZoomControls />

        {/* Floating Help Button */}
        <Menu.Root manager={helpMenu.manager}>
          <ButtonPrimitive
            aria-label="Help"
            className="bg-bg-elevated border-solid active:bg-bg-elevated-hover shadow-300 rounded-full p-1 bottom-3 z-nav pointer-events-auto"
            {...helpMenu.getTriggerProps()}
          >
            <Icon24Help />
          </ButtonPrimitive>
          <Menu.Container>
            <Menu.Item onClick={() => showToast({
              icon: Icon24Star,
              message: 'This is a test toast!',
              button: { label: 'Action', onClick: () => console.log('Action clicked') },
            })}>
              Render test toast
            </Menu.Item>
            <Menu.Item onClick={featuresModal.trigger}>
              Prototype features
            </Menu.Item>
          </Menu.Container>
        </Menu.Root>
        {featuresModal.modal}
      </div>

    </div>
    </LeftSidebar.Provider>
  );
}

export const Route = createRootRoute({
  component: EditorLayout,
});
