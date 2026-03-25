import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRootRoute } from '@tanstack/react-router';
import {
  Icon24Page,
  Icon24Template,
  Icon24Text,
  Icon24Image,
  Icon24Insert,
  Icon24Plugin,
  Icon24Table,
  Icon24GridView,
  Icon24AiAssistant,
  Icon24Write,
  Icon24FocusView,
} from '@figma/fpl-icons';
import { RightPanel } from '../components/RightPanel';
import { Canvas, useViewport } from '../canvas';
import type { NodeId } from '../canvas';
import { CanvasOverlay } from '../components/CanvasOverlay';
import type { Mode } from '../components/menuTypes';
import { getCanvasMenuItems, getNodeMenuItems } from '../components/CanvasContextMenu';
import {
  DEFAULT_MODE,
  MODE_TO_BRAND,
  applyTheme,
  persistTheme,
  readStoredTheme,
  type ThemeSetting,
} from '../helpers/theme';
import { CommentOverlay, ContextMenuRenderer, LeftSidebar, ModeSwitcher, PatternLibraryWindow, SaveAsDefaultModal, UserConfigModal, useComments, useContextMenu } from '@prototype/shared';
import { showToast } from '../components/toast';
import { PrototypeFeaturesModal } from '../components/PrototypeFeaturesModal';
import { Providers } from '../providers';
import { useAction } from '../actions/provider';
import { MinimizeUIProvider } from '../components/MinimizeUIContext';
import { ModeProvider } from '../components/ModeContext';
import { FloatingFileHeader } from '../components/FloatingFileHeader';
import { FloatingFrameToolbar } from '../components/FloatingFrameToolbar';
import { MinimizedRightPanel } from '../components/MinimizedRightPanel';
import { FloatingCommentPanel } from '../components/FloatingCommentPanel';
import { MainMenu } from '../components/MainMenu';
import {
  FilePanel,
  AiChatPanel,
  TemplatesPanel,
  TextPanel,
  MediaPanel,
  InsertsPanel,
  PluginsPanel,
  EditContentPanel,
  BulkCreatePanel,
} from '../components/panels';
import { BuzzTopRight } from '../components/BuzzTopRight';
import { BuzzZoomControls } from '../components/BuzzZoomControls';
import { ViewModeProvider, type ViewModeAPI } from '../components/ViewModeContext';

// ---------------------------------------------------------------------------
// Panel content per nav item
// ---------------------------------------------------------------------------

const PANELS: Record<string, React.ComponentType> = {
  file: FilePanel,
  templates: TemplatesPanel,
  text: TextPanel,
  media: MediaPanel,
  inserts: InsertsPanel,
  plugins: PluginsPanel,
  edit: EditContentPanel,
  'bulk-create': BulkCreatePanel,
  ai: AiChatPanel,
};

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

const primaryNavItems = [
  { Icon: Icon24Page, label: 'File', id: 'file' },
  { Icon: Icon24Template, label: 'Templates', id: 'templates' },
  { Icon: Icon24Text, label: 'Text', id: 'text' },
  { Icon: Icon24Image, label: 'Media', id: 'media' },
  { Icon: Icon24Insert, label: 'Inserts', id: 'inserts' },
  { Icon: Icon24Plugin, label: 'Plugins', id: 'plugins' },
  { Icon: Icon24AiAssistant, label: 'AI Chat', id: 'ai' },
];

const secondaryNavItems = [
  { Icon: Icon24Write, label: 'Edit Content', id: 'edit' },
  { Icon: Icon24Table, label: 'Bulk Create', id: 'bulk-create' },
];

// ---------------------------------------------------------------------------
// Generic main content switching per nav item
// ---------------------------------------------------------------------------

interface NavViewConfig {
  /** Custom main content component; undefined = show CanvasOverlay (default) */
  mainContent?: React.FC<{ onMinimize: () => void }>;
  /** Whether the right panel is visible; default true */
  showRightPanel?: boolean;
}

const NAV_VIEW_CONFIG: Partial<Record<string, NavViewConfig>> = {
  // All nav items use defaults (CanvasOverlay + right panel)
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
  const featuresModal = PrototypeFeaturesModal();
  const contextMenu = useContextMenu();
  const [activeRailItem, setActiveRailItem] = useState('file');
  const [activeMode, setActiveMode] = useState<Mode>(DEFAULT_MODE);
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(() => readStoredTheme());
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'asset' | 'grid'>('asset');
  const [focusedFrameId, setFocusedFrameId] = useState<NodeId | null>(null);
  const [isAnimatingViewMode, setIsAnimatingViewMode] = useState(false);
  const [isAnimatingModeChange, setIsAnimatingModeChange] = useState(false);
  const [showSaveAsDefault, setShowSaveAsDefault] = useState(false);
  const [showUserConfig, setShowUserConfig] = useState(false);
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);

  const viewModeCtx = useMemo<ViewModeAPI>(
    () => ({ viewMode, setViewMode, focusedFrameId, setFocusedFrameId, isAnimatingViewMode, setIsAnimatingViewMode, isAnimatingModeChange, setIsAnimatingModeChange }),
    [viewMode, focusedFrameId, isAnimatingViewMode, isAnimatingModeChange],
  );

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

  const handleThemeChange = (next: ThemeSetting) => {
    setThemeSetting(next);
    persistTheme(next);
  };

  const handleRailItemChange = (id: string) => {
    setActiveRailItem(id);
  };

  const contextMenuItems = contextMenu.lastMenuType === 'node'
    ? getNodeMenuItems(contextMenu.close)
    : getCanvasMenuItems(contextMenu.close);

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

  // Escape resets nav to file
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      setActiveRailItem('file');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derive what to show based on active nav item
  const viewConfig = NAV_VIEW_CONFIG[activeRailItem];
  const showRightPanel = viewConfig?.showRightPanel ?? true;

  return (
    <LeftSidebar.Provider activeItem={activeRailItem} onItemChange={handleRailItemChange}>
    <ModeProvider value={activeMode}>
    <ViewModeProvider value={viewModeCtx}>
    <MinimizeUIProvider value={minimizeCtx}>
    <div className="h-screen flex overflow-hidden">
      {/* Canvas — fixed behind everything */}
      <Canvas onOpenContextMenu={contextMenu.handleOpen} />

      {/* Left icon rail — hidden when minimized */}
      {!isMinimized && (
        <LeftSidebar.Rail>
          <MainMenu
            themeSetting={themeSetting}
            onThemeChange={handleThemeChange}
            onOpenActions={() => setIsActionsOpen(true)}
            onToggleMinimize={toggleMinimized}
            onSaveAsDefault={() => setShowSaveAsDefault(true)}
            onOpenPatternLibrary={() => setShowPatternLibrary(true)}
            onOpenUserConfig={() => setShowUserConfig(true)}
          />
          <LeftSidebar.Divider />
          <div className="pt-2 pb-3">
            <ModeSwitcher
              layout="vertical"
              variant="secondary"
              value={viewMode}
              onChange={(v) => setViewMode(v as 'asset' | 'grid')}
              legend="View mode"
              options={[
                { value: 'asset', icon: Icon24FocusView, label: 'Asset view' },
                { value: 'grid', icon: Icon24GridView, label: 'Grid view' },
              ]}
            />
          </div>
          <LeftSidebar.NavGroup>
            {primaryNavItems.map((item) => (
              <LeftSidebar.NavItem key={item.id} id={item.id} icon={item.Icon} label={item.label} />
            ))}
          </LeftSidebar.NavGroup>
          <LeftSidebar.Divider />
          <LeftSidebar.NavGroup>
            {secondaryNavItems.map((item) => (
              <LeftSidebar.NavItem key={item.id} id={item.id} icon={item.Icon} label={item.label} />
            ))}
          </LeftSidebar.NavGroup>
          <LeftSidebar.Footer>
           <div />
          </LeftSidebar.Footer>
        </LeftSidebar.Rail>
      )}

      {/* Left panel — hidden when minimized, or when file panel is active in buzz grid view */}
      {!isMinimized && !(activeMode === 'buzz' && viewMode === 'grid' && activeRailItem === 'file') && (
        <LeftSidebar.Panel panels={PANELS} fallback={FilePanel} />
      )}

      {/* Canvas / main area */}
      <main className="flex-1 relative pointer-events-none">
        <CanvasOverlay
          activeMode={activeMode}
          onModeChange={setActiveMode}
          isActionsOpen={isActionsOpen}
          onActionsOpenChange={setIsActionsOpen}
        />
      </main>

      {/* Right panel — only for design mode */}
      {activeMode === 'design' && showRightPanel && !isMinimized && <RightPanel activeMode={activeMode} />}

      {/* Buzz mode floating UI */}
      {activeMode === 'buzz' && !isMinimized && <BuzzTopRight />}
      {activeMode === 'buzz' && !isMinimized && <FloatingCommentPanel />}
      {activeMode === 'buzz' && !isMinimized && (
        <div className="absolute bottom-3 right-56px z-nav pointer-events-auto">
          <BuzzZoomControls />
        </div>
      )}

      {/* Floating frame toolbar in buzz asset view */}
      {activeMode === 'buzz' && viewMode === 'asset' && !isMinimized && <FloatingFrameToolbar />}

      {/* Floating file header in buzz grid view — only when file panel is active */}
      {activeMode === 'buzz' && viewMode === 'grid' && !isMinimized && activeRailItem === 'file' && <FloatingFileHeader />}

      {/* Floating panels in minimized mode */}
      {isMinimized && <FloatingFileHeader />}
      {showRightPanel && isMinimized && <MinimizedRightPanel activeMode={activeMode} />}

      {/* Context menu — always mounted, visibility managed by FPL */}
      <ContextMenuRenderer manager={contextMenu.manager} items={contextMenuItems} anchorRef={contextMenu.anchorRef} />

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
      {showPatternLibrary && <PatternLibraryWindow onClose={() => setShowPatternLibrary(false)} />}
      <UserConfigModal open={showUserConfig} onClose={() => setShowUserConfig(false)} />
      <SaveAsDefaultModal
        open={showSaveAsDefault}
        onClose={() => setShowSaveAsDefault(false)}
        onCopy={() => showToast({ message: 'JSON copied to clipboard' })}
      />
    </div>
    </MinimizeUIProvider>
    </ViewModeProvider>
    </ModeProvider>
    </LeftSidebar.Provider>
  );
}

export const Route = createRootRoute({
  component: EditorLayout,
});
