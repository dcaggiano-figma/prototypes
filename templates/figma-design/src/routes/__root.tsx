import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { createRootRoute } from '@tanstack/react-router';
import {
  Icon24Page,
  Icon24Add,
  Icon24Search,
  Icon24AiAssistant,
  Icon24Variable,
  Icon24Library,
  Icon24Star,
} from '@figma/fpl-icons';
import { RightPanel } from '../components/RightPanel';
import { Canvas, useViewport } from '../canvas';
import { CanvasOverlay } from '../components/CanvasOverlay';
import { VariablesView, VariablesWindow } from '../components/variables';
import type { Mode } from '../components/menuTypes';
import { getCanvasMenuItems, getNodeMenuItems } from '../components/CanvasContextMenu';
import { useAppTheme } from '@prototype/shared';
import { DEFAULT_MODE, MODE_TO_BRAND } from '../helpers/theme';
import { IconButton } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { showToast } from '../components/toast';
import { CommentOverlay, ContextMenuRenderer, LeftSidebar, useComments, useContextMenu } from '@prototype/shared';
import { PrototypeFeaturesModal } from '../components/PrototypeFeaturesModal';
import { Providers } from '../providers';
import { useAction } from '../actions/provider';
import { MinimizeUIProvider } from '../components/MinimizeUIContext';
import { FloatingFileHeader } from '../components/FloatingFileHeader';
import { MinimizedRightPanel } from '../components/MinimizedRightPanel';
import { DesignMainMenu } from '../components/DesignMainMenu';
import { FilePanel, SearchPanel, AiChatPanel, AssetsPanel } from '../components/panels';
import { VariablesPanel } from '../components/variables';
import { LibraryWindow } from '../components/LibraryWindow';
import { PatternLibraryWindow } from '@prototype/shared';

// ---------------------------------------------------------------------------
// Panel content per nav item
// ---------------------------------------------------------------------------

const PANELS: Record<string, React.ComponentType> = {
  file: FilePanel,
  assets: AssetsPanel,
  search: SearchPanel,
  ai: AiChatPanel,
  variables: VariablesPanel,
};

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

const mainNavItems = [
  { Icon: Icon24Page, label: 'File', id: 'file' },
  { Icon: Icon24Add, label: 'Assets', id: 'assets' },
  { Icon: Icon24Search, label: 'Find', id: 'search' },
  { Icon: Icon24AiAssistant, label: 'AI Chat', id: 'ai' },
];

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
  return (
    <Providers>
      <EditorContent />
    </Providers>
  );
}

function EditorContent() {
  const helpMenu = MenuV2.useMenu();
  const featuresModal = PrototypeFeaturesModal();
  const contextMenu = useContextMenu();
  const [activeRailItem, setActiveRailItem] = useState('file');
  const [activeMode, setActiveMode] = useState<Mode>(DEFAULT_MODE);
  const [themeSetting, setThemeSetting] = useAppTheme({
    storageKey: 'editor-shell-theme',
    brand: MODE_TO_BRAND[activeMode],
  });
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [variablesViewMode, setVariablesViewMode] = useState<VariablesViewMode>('hidden');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);

  // Minimize UI state
  const [isMinimized, setIsMinimized] = useState(false);
  const viewport = useViewport();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore, threads: commentThreads } = useComments();
  const [fileName, setFileName] = useState('Untitled');
  const toggleMinimized = useCallback(() => setIsMinimized((v) => !v), []);

  // Register keyboard shortcut for minimize UI
  useAction('view.minimize-ui', toggleMinimized);

  const minimizeCtx = useMemo(
    () => ({ isMinimized, toggleMinimize: toggleMinimized, fileName, setFileName }),
    [isMinimized, toggleMinimized, fileName],
  );

  // Nav item change handler — manages variablesViewMode transitions
  const handleRailItemChange = (id: string) => {
    if (id === 'variables') {
      // Auto-exit minimize mode when entering variables view
      if (isMinimized) setIsMinimized(false);
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

  const contextMenuItems = contextMenu.lastMenuType === 'node'
    ? getNodeMenuItems(contextMenu.close)
    : getCanvasMenuItems(contextMenu.close);

  // Filter nav items based on mode
  const filteredNavItems = useMemo(() => {
    switch (activeMode) {
      case 'draw':
        return mainNavItems.filter((item) => item.id !== 'ai');
      case 'dev':
        return mainNavItems.filter((item) => item.id !== 'assets');
      default:
        return mainNavItems;
    }
  }, [activeMode]);

  // CMD+K / CMD+P opens QuickActions, CMD+O blocked
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'p') && e.metaKey) {
        e.preventDefault();
        setIsActionsOpen(true);
      }
      if (e.key === 'o' && e.metaKey) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Escape resets nav to file
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      setActiveRailItem('file');
      setVariablesViewMode('hidden');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derive what to show based on active nav item
  const viewConfig = NAV_VIEW_CONFIG[activeRailItem];
  const MainContent = viewConfig?.mainContent;
  const showRightPanel = viewConfig?.showRightPanel ?? true;

  return (
    <LeftSidebar.Provider activeItem={activeRailItem} onItemChange={handleRailItemChange}>
    <MinimizeUIProvider value={minimizeCtx}>
    <div className="h-screen flex overflow-hidden">
      {/* Canvas — fixed behind everything */}
      <Canvas onOpenContextMenu={contextMenu.handleOpen} />

      {/* Left icon rail — hidden when minimized */}
      {!isMinimized && (
        <LeftSidebar.Rail>
          <DesignMainMenu
            themeSetting={themeSetting}
            onThemeChange={setThemeSetting}
            onOpenActions={() => setIsActionsOpen(true)}
            onToggleMinimize={toggleMinimized}
            onOpenPatternLibrary={() => setShowPatternLibrary(true)}
          />
          <LeftSidebar.Divider />
          <LeftSidebar.NavGroup>
            {filteredNavItems.map((item) => (
              <LeftSidebar.NavItem key={item.id} id={item.id} icon={item.Icon} label={item.label} />
            ))}
          </LeftSidebar.NavGroup>
          <LeftSidebar.Divider />
          <LeftSidebar.NavGroup>
            <LeftSidebar.NavItem id="variables" icon={Icon24Variable} label="Variables" />
          </LeftSidebar.NavGroup>
          <LeftSidebar.Footer>
            <IconButton
              size="lg"
              aria-label="Library"
              onClick={() => setShowLibrary((v) => !v)}
            >
              <Icon24Library />
            </IconButton>
          </LeftSidebar.Footer>
        </LeftSidebar.Rail>
      )}

      {/* Left panel — hidden when minimized */}
      {!isMinimized && <LeftSidebar.Panel panels={PANELS} fallback={FilePanel} />}

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
      {showRightPanel && !isMinimized && <RightPanel activeMode={activeMode} />}

      {/* Floating panels in minimized mode */}
      {isMinimized && <FloatingFileHeader />}
      {showRightPanel && isMinimized && <MinimizedRightPanel activeMode={activeMode} />}

      {/* Minimized Variables floating window */}
      {variablesViewMode === 'minimized' && (
        <VariablesWindow
          onExpand={handleVariablesExpand}
          onClose={handleVariablesClose}
        />
      )}

      {/* Library window */}
      {showLibrary && <LibraryWindow onClose={() => setShowLibrary(false)} />}

      {/* Pattern library window */}
      {showPatternLibrary && <PatternLibraryWindow onClose={() => setShowPatternLibrary(false)} />}

      {/* Context menu — always mounted, visibility managed by FPL */}
      <ContextMenuRenderer manager={contextMenu.manager} items={contextMenuItems} anchorRef={contextMenu.anchorRef} />

      {/* Floating Help Button */}
      <MenuV2.Root manager={helpMenu.manager}>
          <MenuV2.Item onClick={() => showToast({
            icon: Icon24Star,
            message: 'This is a test toast!',
            button: { label: 'Action', onClick: () => console.log('Action clicked') },
          })}>
            Render test toast
          </MenuV2.Item>
          <MenuV2.Item onClick={featuresModal.trigger}>
            Prototype features
          </MenuV2.Item>
      </MenuV2.Root>
      {featuresModal.modal}
      <CommentOverlay
        interaction={interaction}
        setInteraction={setInteraction}
        selectedThreadId={selectedThreadId}
        setSelectedThreadId={setSelectedThreadId}
        store={commentsStore}
        threads={commentThreads}
        worldToScreen={viewport.worldToScreen}
      />
    </div>
    </MinimizeUIProvider>
    </LeftSidebar.Provider>
  );
}

export const Route = createRootRoute({
  component: EditorLayout,
});
