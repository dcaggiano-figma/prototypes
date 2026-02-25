import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { createRootRoute } from '@tanstack/react-router';
import { LeftRail } from '../components/LeftRail';
import { LeftPanel } from '../components/LeftPanel';
import { RightPanel } from '../components/RightPanel';
import { Canvas } from '../canvas';
import { CanvasOverlay } from '../components/CanvasOverlay';
import { VariablesView, VariablesWindow } from '../components/variables';
import type { Mode } from '../components/menuTypes';
import {
  DEFAULT_MODE,
  MODE_TO_BRAND,
  applyTheme,
  persistTheme,
  readStoredTheme,
  type ThemeSetting,
} from '../helpers/theme';
import { ButtonPrimitive, Menu } from '@figma/fpl-components';
import { Icon24Help, Icon24Star } from '@figma/fpl-icons';
import { showToast } from '../components/toast';
import { PrototypeFeaturesModal } from '../components/PrototypeFeaturesModal';
import { Providers } from '../providers';

// ---------------------------------------------------------------------------
// Generic main content switching per nav item
// ---------------------------------------------------------------------------

type VariablesViewMode = 'hidden' | 'full' | 'minimized';

interface NavViewConfig {
  /** Custom main content component; undefined = show CanvasOverlay (default) */
  mainContent?: React.FC<{ onMinimize: () => void }>;
  /** Whether the right panel is visible; default true */
  showRightPanel?: boolean;
}

const NAV_VIEW_CONFIG: Partial<Record<string, NavViewConfig>> = {
  // file, assets, search, ai — all use defaults (CanvasOverlay + right panel)
  variables: {
    mainContent: VariablesView,
    showRightPanel: false,
  },
};

// ---------------------------------------------------------------------------

function EditorLayout() {
  const helpMenu = Menu.useMenu();
  const featuresModal = PrototypeFeaturesModal();
  const [activeRailItem, setActiveRailItem] = useState('file');
  const [activeMode, setActiveMode] = useState<Mode>(DEFAULT_MODE);
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(() => readStoredTheme());
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [variablesViewMode, setVariablesViewMode] = useState<VariablesViewMode>('hidden');

  const handleThemeChange = (next: ThemeSetting) => {
    setThemeSetting(next);
    persistTheme(next);
  };

  // Nav item change handler — manages variablesViewMode transitions
  const handleRailItemChange = (id: string) => {
    if (id === 'variables') {
      // No-op if already viewing variables in full mode
      if (activeRailItem === 'variables' && variablesViewMode === 'full') return;
      setVariablesViewMode('full');
    } else {
      setVariablesViewMode('hidden');
    }
    setActiveRailItem(id);
  };

  // Variables minimize → return to normal editor with floating window
  const handleVariablesMinimize = () => {
    setVariablesViewMode('minimized');
    setActiveRailItem('file');
  };

  // Variables window expand → return to full variables view
  const handleVariablesExpand = () => {
    setVariablesViewMode('full');
    setActiveRailItem('variables');
  };

  // Variables window close → dismiss entirely
  const handleVariablesClose = () => {
    setVariablesViewMode('hidden');
  };

  // Apply theme attributes whenever mode or color setting changes
  useEffect(() => {
    applyTheme(themeSetting, MODE_TO_BRAND[activeMode]);

    if (themeSetting !== 'system') return undefined;

    // Re-apply when OS color scheme changes while set to "system"
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system', MODE_TO_BRAND[activeMode]);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [activeMode, themeSetting]);

  // CMD+K opens QuickActions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && e.metaKey) {
        e.preventDefault();
        setIsActionsOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derive what to show based on active nav item
  const viewConfig = NAV_VIEW_CONFIG[activeRailItem];
  const MainContent = viewConfig?.mainContent;
  const showRightPanel = viewConfig?.showRightPanel ?? true;

  return (
    <Providers>
    <div className="h-screen flex overflow-hidden">
      {/* Canvas — fixed behind everything */}
      <Canvas />

      {/* Left icon rail */}
      <LeftRail
        activeItem={activeRailItem}
        onItemChange={handleRailItemChange}
        labelsVisible={false}
        activeMode={activeMode}
        themeSetting={themeSetting}
        onThemeChange={handleThemeChange}
        onOpenActions={() => setIsActionsOpen(true)}
      />

      {/* Left panel */}
      <LeftPanel activeItem={activeRailItem} />

      {/* Canvas / main area */}
      <main className={clsx('flex-1 relative', MainContent ? 'bg-bg' : 'pointer-events-none')}>
        {MainContent ? (
          <MainContent onMinimize={handleVariablesMinimize} />
        ) : (
          <CanvasOverlay
            activeMode={activeMode}
            onModeChange={setActiveMode}
            isActionsOpen={isActionsOpen}
            onActionsOpenChange={setIsActionsOpen}
          />
        )}
      </main>

      {/* Right panel — conditionally hidden */}
      {showRightPanel && <RightPanel activeMode={activeMode} />}

      {/* Minimized Variables floating window */}
      {variablesViewMode === 'minimized' && (
        <VariablesWindow
          onExpand={handleVariablesExpand}
          onClose={handleVariablesClose}
        />
      )}

      {/* Floating Help Button */}
      <Menu.Root manager={helpMenu.manager}>
        <ButtonPrimitive aria-label="Help" className="bg-bg-elevated border-solid active:bg-bg-elevated-hover shadow-300 rounded-full p-1 absolute bottom-4 right-4 z-nav" {...helpMenu.getTriggerProps()}>
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
    </Providers>
  );
}

export const Route = createRootRoute({
  component: EditorLayout,
});
