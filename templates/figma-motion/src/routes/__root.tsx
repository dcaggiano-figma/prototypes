import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { createRootRoute, Outlet, useMatchRoute } from '@tanstack/react-router';
import {
  Icon24Page,
  Icon24Add,
  Icon24Search,
  Icon24AiAssistant,
  Icon24Variable,
  Icon24Library,
  Icon24Star,
  Icon24Clipboard,
  Icon24Check,
  Icon24Download,
} from '@figma/fpl-icons';
import { RightPanel } from '../components/RightPanel';
import { Canvas, useViewport } from '../canvas';
import { CanvasOverlay } from '../components/CanvasOverlay';
import { VariablesView, VariablesWindow } from '../components/variables';
import type { Mode } from '../components/menuTypes';
import { getCanvasMenuItems, getNodeMenuItems } from '../components/CanvasContextMenu';
import { useAppTheme } from '@prototype/shared';
import { DEFAULT_MODE, MODE_TO_BRAND } from '../helpers/theme';
import { Button, ButtonPrimitive, IconButton } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { showToast } from '../components/toast';
import { CommentOverlay, ContextMenuRenderer, LeftSidebar, useComments, useContextMenu } from '@prototype/shared';
import { PrototypeFeaturesModal } from '../components/PrototypeFeaturesModal';
import { Providers } from '../providers';
import { useAction } from '../actions/provider';
import { MinimizeUIProvider } from '../components/MinimizeUIContext';
import { FloatingFileHeader } from '../components/FloatingFileHeader';
import { MinimizedRightPanel } from '../components/MinimizedRightPanel';
import { clearSceneGraphStorage } from '@prototype/shared/canvas';
import { SaveAsDefaultModal, UserConfigModal, Pre, Text } from '@prototype/shared';
import { MainMenu } from '../components/MainMenu';
import { FilePanel, SearchPanel, AiChatPanel, AssetsPanel } from '../components/panels';
import { VariablesPanel } from '../components/variables';
import { LibraryWindow } from '../components/LibraryWindow';
import { PatternLibraryWindow } from '@prototype/shared';

// Animation contexts
import { DesignTabProvider, useDesignTabOptional } from '../contexts/DesignTabContext';
import { TimelineVisibilityProvider } from '../contexts/TimelineVisibilityContext';
import { AnimationStoreProvider, useAnimationStore } from '../contexts/AnimationStoreContext';
import { loadDefaultAnimations } from '../defaults/loadDefaultAnimations';
import { PlaybackProvider, usePlaybackOptional } from '../contexts/PlaybackContext';
import { KeyframeStoreProvider } from '../contexts/KeyframeStoreContext';
import { CanvasWorkspaceInsetsProvider, type CanvasWorkspaceInsets } from '../contexts/CanvasWorkspaceInsetsContext';
import { TimelinePanel, TIMELINE_PANEL_HEIGHT_PX, TIMELINE_COLLAPSED_HEIGHT_PX } from '../components/timeline';

// ---------------------------------------------------------------------------
// Animation timing constants
// ---------------------------------------------------------------------------

const defaultAnimations = loadDefaultAnimations();

function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AnimationExportSection({ onCopy }: { onCopy?: () => void }) {
  const { animations } = useAnimationStore();
  const [copied, setCopied] = useState(false);

  const json = useMemo(
    () => JSON.stringify(animations, null, 2),
    [animations],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  if (animations.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <Text strong>default-animations.json</Text>
      <Pre syntax="json" className="max-h-[150px] overflow-auto">
        {json}
      </Pre>
      <div className="flex gap-2 mt-1">
        <Button
          variant="secondary"
          iconPrefix={copied ? <Icon24Check /> : <Icon24Clipboard />}
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="secondary"
          iconPrefix={<Icon24Download />}
          onClick={() => downloadJson(json, 'default-animations.json')}
        >
          Download
        </Button>
      </div>
    </div>
  );
}

const TOOLBAR_SLIDE_MS = 420;
const TIMELINE_SLIDE_MS = 300;
const MIN_TIMELINE_HEIGHT = 150;
const MAX_TIMELINE_HEIGHT = 700;

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
// ModeAnimationSync: auto-switch to animation tab on animate mode
// ---------------------------------------------------------------------------

function ModeAnimationSync({ activeMode }: { activeMode: Mode }) {
  const designTab = useDesignTabOptional();
  useEffect(() => {
    if (!designTab) return;
    if (activeMode === 'animate') {
      designTab.setActiveTab('animation');
    } else if (designTab.activeTab === 'animation') {
      designTab.setActiveTab('design');
    }
  }, [activeMode, designTab]);
  return null;
}

// ---------------------------------------------------------------------------

function EditorLayout() {
  return (
    <Providers>
      <DesignTabProvider>
        <AnimationStoreProvider initialAnimations={defaultAnimations}>
          <KeyframeStoreProvider>
            <PlaybackProvider>
              <EditorContent />
            </PlaybackProvider>
          </KeyframeStoreProvider>
        </AnimationStoreProvider>
      </DesignTabProvider>
    </Providers>
  );
}

function EditorContent() {
  const playback = usePlaybackOptional();
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
  const [showSaveAsDefault, setShowSaveAsDefault] = useState(false);
  const [showUserConfig, setShowUserConfig] = useState(false);

  // Minimize UI state
  const [isMinimized, setIsMinimized] = useState(false);
  const viewport = useViewport();
  const { interaction, setInteraction, selectedThreadId, setSelectedThreadId, store: commentsStore, threads: commentThreads, showComments, setShowComments } = useComments();
  const [fileName, setFileName] = useState('Untitled');
  const toggleMinimized = useCallback(() => setIsMinimized((v) => !v), []);

  // Timeline slide-in/out sequencing for animate mode.
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(TIMELINE_PANEL_HEIGHT_PX);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [timelineHeightReached, setTimelineHeightReached] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const isResizingRef = useRef(false);
  const timelineTimerRef = useRef(0);
  const timelineRafRef = useRef(0);

  // Mode change with timeline sequencing
  const handleModeChange = useCallback((newMode: Mode) => {
    clearTimeout(timelineTimerRef.current);
    cancelAnimationFrame(timelineRafRef.current);

    if (activeMode === 'animate' && newMode !== 'animate') {
      // LEAVING animate: switch mode now (toolbar slides), collapse timeline after
      setActiveMode(newMode);
      timelineTimerRef.current = window.setTimeout(() => {
        setTimelineOpen(false);
      }, TOOLBAR_SLIDE_MS);
    } else if (newMode === 'animate' && activeMode !== 'animate') {
      // ENTERING animate: switch mode now (toolbar slides), expand timeline after
      setActiveMode(newMode);
      timelineTimerRef.current = window.setTimeout(() => {
        setTimelineVisible(true);
        timelineRafRef.current = requestAnimationFrame(() => {
          setTimelineOpen(true);
        });
      }, TOOLBAR_SLIDE_MS);
    } else {
      setActiveMode(newMode);
    }
  }, [activeMode]);

  const handleTimelineTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName !== 'height') return;
    if (timelineOpen) {
      setTimelineHeightReached(true);
    } else {
      setTimelineVisible(false);
      setTimelineHeightReached(false);
    }
  }, [timelineOpen]);

  const handleTimelineResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizingTimeline(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = timelineHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [timelineHeight]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = resizeStartY.current - e.clientY;
      let newHeight = resizeStartHeight.current + delta;
      if (newHeight < MIN_TIMELINE_HEIGHT) newHeight = MIN_TIMELINE_HEIGHT;
      if (newHeight > MAX_TIMELINE_HEIGHT) newHeight = MAX_TIMELINE_HEIGHT;
      setTimelineHeight(newHeight);
    };
    const onMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsResizingTimeline(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timelineTimerRef.current);
      cancelAnimationFrame(timelineRafRef.current);
    };
  }, []);

  const effectiveTimelineHeight = timelineOpen ? (timelineExpanded ? timelineHeight : TIMELINE_COLLAPSED_HEIGHT_PX) : 0;

  // Register keyboard shortcut for minimize UI
  useAction('view.minimize-ui', toggleMinimized);
  useAction('view.toggle-comments', useCallback(() => setShowComments((prev: boolean) => !prev), [setShowComments]));

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

  // Stable ref for setThemeSetting so handleQuickAction doesn't cause rerenders
  const setThemeRef = useRef(setThemeSetting);
  setThemeRef.current = setThemeSetting;

  const handleQuickAction = useCallback((id: string) => {
    switch (id) {
      case 'theme-light':
        setThemeRef.current('light');
        break;
      case 'theme-dark':
        setThemeRef.current('dark');
        break;
      case 'theme-system':
        setThemeRef.current('system');
        break;
      case 'reset-canvas':
        clearSceneGraphStorage();
        window.location.reload();
        break;
    }
  }, []);

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

  // Workspace insets for canvas framing
  const RAIL_WIDTH = 48;
  const DEFAULT_PANEL_WIDTH = 240;
  const canvasInsets = useMemo<CanvasWorkspaceInsets>(() => ({
    leftPx: isMinimized ? 0 : RAIL_WIDTH + DEFAULT_PANEL_WIDTH,
    rightPx: showRightPanel && !isMinimized ? DEFAULT_PANEL_WIDTH : 0,
    topPx: 0,
    bottomPx: effectiveTimelineHeight,
    animateToolbarActive: activeMode === 'animate',
  }), [isMinimized, showRightPanel, effectiveTimelineHeight, activeMode]);

  return (
    <TimelineVisibilityProvider
      visible={timelineHeightReached}
      heightPx={effectiveTimelineHeight}
      resizing={isResizingTimeline}
    >
    <ModeAnimationSync activeMode={activeMode} />
    <LeftSidebar.Provider activeItem={activeRailItem} onItemChange={handleRailItemChange}>
    <MinimizeUIProvider value={minimizeCtx}>
    <CanvasWorkspaceInsetsProvider value={canvasInsets}>
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top row: canvas + left + main + right (shrinks when timeline is visible) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Canvas — fixed behind everything */}
      <Canvas onOpenContextMenu={contextMenu.handleOpen} />

      {/* Left icon rail — hidden when minimized */}
      {!isMinimized && (
        <LeftSidebar.Rail>
          <MainMenu
            themeSetting={themeSetting}
            onThemeChange={setThemeSetting}
            onOpenActions={() => setIsActionsOpen(true)}
            onToggleMinimize={toggleMinimized}
            onOpenPatternLibrary={() => setShowPatternLibrary(true)}
            onSaveAsDefault={() => setShowSaveAsDefault(true)}
            onOpenUserConfig={() => setShowUserConfig(true)}
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
            onModeChange={handleModeChange}
            isActionsOpen={isActionsOpen}
            onActionsOpenChange={setIsActionsOpen}
            onQuickAction={handleQuickAction}
            timelineHeightPx={effectiveTimelineHeight}
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
      <SaveAsDefaultModal
        open={showSaveAsDefault}
        onClose={() => setShowSaveAsDefault(false)}
        onCopy={() => showToast({ message: 'JSON copied to clipboard' })}
        extraSections={<AnimationExportSection onCopy={() => showToast({ message: 'JSON copied to clipboard' })} />}
      />
      <UserConfigModal open={showUserConfig} onClose={() => setShowUserConfig(false)} />
      {showComments && (
        <CommentOverlay
          interaction={interaction}
          setInteraction={setInteraction}
          selectedThreadId={selectedThreadId}
          setSelectedThreadId={setSelectedThreadId}
          store={commentsStore}
          threads={commentThreads}
          worldToScreen={viewport.worldToScreen}
          onTimestampClick={(ms) => {
            playback?.setCurrentMs(ms);
          }}
        />
      )}
      </div>

      {/* Timeline — full width, animated slide in/out */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          zIndex: 7,
          height: effectiveTimelineHeight,
          transition: isResizingTimeline ? 'none' : `height ${String(TIMELINE_SLIDE_MS)}ms ease-out`,
        }}
        onTransitionEnd={handleTimelineTransitionEnd}
      >
        {/* Resize handle — top edge, only when expanded */}
        {timelineOpen && timelineExpanded && (
          <ButtonPrimitive
            className="absolute top-0 left-0 right-0 h-8px z-[8] cursor-row-resize"
            onMouseDown={handleTimelineResizeStart}
            aria-label="Resize timeline"
          >
            {null}
          </ButtonPrimitive>
        )}
        {timelineVisible && (
          <TimelinePanel
            expanded={timelineExpanded}
            onExpandCollapse={() => setTimelineExpanded((e) => !e)}
          />
        )}
      </div>

      {/* Portal target for toolbar — above timeline (7) but below windows (9) and modals (12) */}
      <div id="toolbar-portal" className="fixed inset-0 pointer-events-none z-[8]" aria-hidden="true" />
    </div>
    </CanvasWorkspaceInsetsProvider>
    </MinimizeUIProvider>
    </LeftSidebar.Provider>
    </TimelineVisibilityProvider>
  );
}

function RootLayout() {
  const matchRoute = useMatchRoute();
  const isExport = matchRoute({ to: '/export' });

  if (isExport) {
    return <Outlet />;
  }

  return <EditorLayout />;
}

export const Route = createRootRoute({
  component: RootLayout,
});
