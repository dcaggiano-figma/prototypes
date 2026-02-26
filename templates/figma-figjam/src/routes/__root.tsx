import { useEffect, useState } from 'react';
import { createRootRoute } from '@tanstack/react-router';
import { Canvas, useActiveTool } from '../canvas';
import { CommentPanel } from '../components/CommentPanel';
import { FigJamCanvasOverlay } from '../components/FigJamCanvasOverlay';
import { FigJamFileHeader } from '../components/FigJamFileHeader';
import { FigJamTopRight } from '../components/FigJamTopRight';
import { FloatingObjectToolbar } from '../components/FloatingObjectToolbar';
import { FigJamZoomControls } from '../components/FigJamZoomControls';
import { LeftRail } from '../components/LeftRail';
import { LeftPanel } from '../components/LeftPanel';
import {
  MODE_TO_BRAND,
  applyTheme,
  readStoredTheme,
  type ThemeSetting,
} from '../helpers/theme';
import { ButtonPrimitive, Menu } from '@figma/fpl-components';
import { Icon24Help, Icon24Star } from '@figma/fpl-icons';
import { showToast } from '../components/toast';
import { PrototypeFeaturesModal } from '../components/PrototypeFeaturesModal';
import { Providers } from '../providers';

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
  const [themeSetting] = useState<ThemeSetting>(() => readStoredTheme());
  const [activeRailItem, setActiveRailItem] = useState('file');
  const { activeTool, setActiveTool } = useActiveTool();

  // Apply FigJam theme (sulli brand)
  useEffect(() => {
    applyTheme(themeSetting, MODE_TO_BRAND.figjam);

    if (themeSetting !== 'system') return undefined;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system', MODE_TO_BRAND.figjam);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeSetting]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Canvas — fixed behind everything */}
      <Canvas />

      {/* Left rail + panel */}
      <LeftRail activeItem={activeRailItem} onItemChange={setActiveRailItem} />
      <LeftPanel activeItem={activeRailItem} />

      {/* Main overlay with toolbar at bottom */}
      <main className="flex-1 relative pointer-events-none">
        <FigJamCanvasOverlay />
        {activeRailItem === 'file' && <FigJamFileHeader />}
      </main>

      <FigJamTopRight />
      <FloatingObjectToolbar />

      {activeTool === 'COMMENT' && (
        <CommentPanel onClose={() => setActiveTool('MOVE')} />
      )}

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
  );
}

export const Route = createRootRoute({
  component: EditorLayout,
});
