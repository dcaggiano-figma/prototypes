import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import {
  IconButton,
  Button,
  ButtonGroup,
  Input,
  SegmentedControl,
  HiddenLegend,
  InputPrimitive,
} from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import {
  Icon16ChevronDown,
  Icon24FigmaLarge,
  Icon24SettingsLarge,
  Icon24Library,
  Icon24Adjust,
  Icon24Reload,
  Icon24EyeLarge,
  Icon24DevLarge,
  Icon24Public,
  Icon24Font,
  Icon24Chat,
  Icon24SpacingVertical,
  Icon24Code,
  Icon24LayoutSet,
  Icon24NewTab,
  Icon24SnapshotLarge,
} from '@figma/fpl-icons';
import { useTheme, type ThemeSetting } from '../helpers/theme';
import { useWorkingState } from '../helpers/workingState';
import { useResizablePanel, UserAvatar, ResizeHandle, type Attachment, type InspectedElement } from '@prototype/shared';
import { ChatPanel } from '../components/ChatPanel';
import { LoadingView } from '../components/LoadingView';
import { CodeView } from '../components/CodeView';
import { PreviewView } from '../components/PreviewView';
import { PublishWindow } from '../components/PublishModal';
import { SnapshotWindow } from '../components/SnapshotWindow';

/* ------------------------------------------------------------------ */
/*  Working page – standalone page with its own header                  */
/* ------------------------------------------------------------------ */

export function WorkingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state ?? null) as {
    prompt?: string;
    attachments?: Attachment[];
    inspectedElements?: InspectedElement[];
  } | null;

  /* Persistent working state (survives navigation) */
  const ws = useWorkingState();

  /* Initialize prompt from navigation state (only on first arrival from Home) */
  const { submittedPrompt, setSubmittedPromptData, sendMessage, chatMode } = ws;
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    const prompt = locationState?.prompt;
    if (prompt && prompt !== submittedPrompt) {
      setSubmittedPromptData({
        text: prompt,
        attachments: locationState?.attachments ?? [],
        inspectedElements: locationState?.inspectedElements ?? [],
      });
      // In live mode, trigger the AI call for the initial prompt
      if (chatMode === 'live') {
        sendMessage(prompt);
      }
      initializedRef.current = true;
    } else if (!prompt && !submittedPrompt) {
      // No prompt available (e.g. page refresh) — redirect to landing
      navigate({ to: '/' });
    }
  }, [locationState, submittedPrompt, setSubmittedPromptData, sendMessage, chatMode, navigate]);

  /* Theme */
  const [theme, setTheme] = useTheme();
  const [audioNotifications, setAudioNotifications] = useState(true);
  const [openLinksDesktop, setOpenLinksDesktop] = useState(true);

  /* File name editing (local UI state) */
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const fileNameInputRef = useRef<HTMLInputElement>(null);

  /* Resizable left panel */
  const { panelRef, onMouseDown: onResizeMouseDown } = useResizablePanel({ minWidth: 280 });

  /* Publish window */
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishTriggerRect, setPublishTriggerRect] = useState<DOMRect | null>(null);

  /* Snapshot window */
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [snapshotTriggerRect, setSnapshotTriggerRect] = useState<DOMRect | null>(null);

  /* Menus */
  const chevronMenu = MenuV2.useMenu();
  const fileMenu = MenuV2.useMenu();
  const settingsMenu = MenuV2.useMenu();
  const deviceMenu = MenuV2.useMenu();

  /* Device preview */
  const [devicePreview, setDevicePreview] = useState('desktop');

  /* Auto-focus file name input when editing */
  useEffect(() => {
    if (isEditingFileName) {
      fileNameInputRef.current?.focus();
      fileNameInputRef.current?.select();
    }
  }, [isEditingFileName]);

  const startEditingFileName = () => {
    setEditingValue(ws.fileName);
    setIsEditingFileName(true);
  };

  const commitFileName = () => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      ws.setFileName(trimmed);
    }
    setIsEditingFileName(false);
  };

  return (
    <div className="bg-bg h-screen flex overflow-hidden">
      {/* ============================================================ */}
      {/*  Left sidebar (chat panel with its own header)                */}
      {/* ============================================================ */}
      <aside ref={panelRef} className="relative w-[280px] shrink-0 border-r border-border flex flex-col bg-bg">
        {/* ---- Sidebar header ---- */}
        <header className="flex items-center px-8px py-8px border-b border-border shrink-0">
          <div className="flex items-center gap-4px">
            {/* Figma / chevron menu */}
            <IconButton
                aria-label="Figma"
                size="lg"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...chevronMenu.getTriggerProps()}
              >
                <Icon24FigmaLarge />
              </IconButton>
            <MenuV2.Root manager={chevronMenu.manager}>
                {/* File */}
                <MenuV2.SubMenu title="File">
                    <MenuV2.Item onClick={() => { ws.reset(); navigate({ to: '/' }); }}>New Make</MenuV2.Item>
                    <MenuV2.SubMenu title="New">
                        <MenuV2.Item onClick={() => console.log('design')}>Design</MenuV2.Item>
                        <MenuV2.Item onClick={() => console.log('figjam')}>FigJam</MenuV2.Item>
                        <MenuV2.Item onClick={() => console.log('slides')}>Slides</MenuV2.Item>
                        <MenuV2.Item onClick={() => console.log('buzz')}>Buzz</MenuV2.Item>
                        <MenuV2.Item onClick={() => console.log('site')}>Site</MenuV2.Item>
                      </MenuV2.SubMenu>
                    <MenuV2.Separator />
                    <MenuV2.Item onClick={() => console.log('save-local')}>Save local copy...</MenuV2.Item>
                    <MenuV2.Item disabled onClick={() => console.log('save-version')} trail={<MenuV2.Shortcut>⌥⌘S</MenuV2.Shortcut>}>Save to version history...</MenuV2.Item>
                    <MenuV2.Item disabled onClick={() => console.log('show-version')}>Show version history</MenuV2.Item>
                  </MenuV2.SubMenu>

                {/* Preferences */}
                <MenuV2.SubMenu title="Preferences">
                    <MenuV2.Group>
                      <MenuV2.CheckboxItem checked={audioNotifications} onChange={setAudioNotifications}>Play audio notifications in AI chat</MenuV2.CheckboxItem>
                      <MenuV2.CheckboxItem checked={openLinksDesktop} onChange={setOpenLinksDesktop}>Open links in desktop app</MenuV2.CheckboxItem>
                    </MenuV2.Group>
                    <MenuV2.Group>
                      <MenuV2.SubMenu title="Labs">
                          <MenuV2.Item onClick={() => console.log('lab-1')}>Feature preview 1</MenuV2.Item>
                          <MenuV2.Item onClick={() => console.log('lab-2')}>Feature preview 2</MenuV2.Item>
                        </MenuV2.SubMenu>
                      <MenuV2.Item onClick={() => console.log('color-profile')}>Color profile...</MenuV2.Item>
                      <MenuV2.Item onClick={() => console.log('keyboard-layout')}>Keyboard layout...</MenuV2.Item>
                      <MenuV2.Item onClick={() => console.log('accessibility')}>Accessibility settings...</MenuV2.Item>
                    </MenuV2.Group>
                    <MenuV2.SubMenu title="Theme">
                        <MenuV2.RadioGroup
                          title="Theme"
                          value={theme}
                          onChange={(value) => setTheme(value as ThemeSetting)}
                        >
                          <MenuV2.RadioGroupItem value="light">Light</MenuV2.RadioGroupItem>
                          <MenuV2.RadioGroupItem value="dark">Dark</MenuV2.RadioGroupItem>
                          <MenuV2.RadioGroupItem value="system">System</MenuV2.RadioGroupItem>
                        </MenuV2.RadioGroup>
                      </MenuV2.SubMenu>
                  </MenuV2.SubMenu>
                <MenuV2.Separator />

                {/* AI balance */}
                <MenuV2.SubMenu title="AI balance">
                    <MenuV2.Item onClick={() => console.log('speed')}>Speed</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('balanced')}>Balanced</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('quality')}>Quality</MenuV2.Item>
                  </MenuV2.SubMenu>

                {/* Help and account */}
                <MenuV2.SubMenu title="Help and account">
                    <MenuV2.Item onClick={() => console.log('help-center')}>Help center</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('keyboard')}>Keyboard shortcuts</MenuV2.Item>
                    <MenuV2.Separator />
                    <MenuV2.Item onClick={() => console.log('account')}>Account settings</MenuV2.Item>
                  </MenuV2.SubMenu>

                {/* Debug */}
                <MenuV2.SubMenu title="Debug">
                    <MenuV2.Item onClick={() => console.log('console')}>Open console</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('network')}>Network log</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('performance')}>Performance</MenuV2.Item>
                  </MenuV2.SubMenu>
            </MenuV2.Root>

            {/* File name button group */}
            {isEditingFileName ? (
              <div className="w-[120px]">
                <Input
                  className="text-bodyLg text-text"
                  ref={fileNameInputRef}
                  size="lg"
                  aria-label="File name"
                  value={editingValue}
                  onChange={setEditingValue}
                  onBlur={commitFileName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitFileName();
                    }
                  }}
                />
              </div>
            ) : (
              <>
                <ButtonGroup aria-label="File actions">
                  <Button size="lg" variant="ghost" onClick={startEditingFileName}>
                    <span className="text-bodyLg text-text max-w-[120px] block truncate">{ws.fileName}</span>
                  </Button>
                  <ButtonGroup.Trigger
                    size="lg"
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...fileMenu.getTriggerProps() as React.ComponentProps<typeof ButtonGroup.Trigger>}
                    aria-label="File options"
                  >
                    <Icon16ChevronDown />
                  </ButtonGroup.Trigger>
                </ButtonGroup>
                <MenuV2.Root manager={fileMenu.manager}>
                  <MenuV2.Group>
                    <MenuV2.SubMenu title="Add to sidebar">
                        <MenuV2.Group>
                          <MenuV2.Item onClick={() => console.log('starred')}>Starred</MenuV2.Item>
                        </MenuV2.Group>
                      </MenuV2.SubMenu>
                  </MenuV2.Group>
                  <MenuV2.Group>
                    <MenuV2.Item onClick={() => console.log('duplicate')}>Duplicate</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('rename')}>Rename</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('move-file')}>Move file…</MenuV2.Item>
                    <MenuV2.Item onClick={() => console.log('move-to-trash')}>Move to trash</MenuV2.Item>
                  </MenuV2.Group>
                </MenuV2.Root>
              </>
            )}
          </div>
        </header>

        {/* ---- Sidebar content (chat) ---- */}
        <ChatPanel
          initialPrompt={ws.submittedPrompt}
          promptValue={ws.chatPromptValue}
          onPromptChange={ws.setChatPromptValue}
          selectedModel={ws.selectedModel}
          onModelChange={ws.setSelectedModel}
          onWorkComplete={() => ws.setWorkComplete(true)}
          onStartScript={(submission) => {
            if (ws.submittedPrompt) {
              ws.startNewConversation(submission);
            } else {
              ws.setSubmittedPromptData(submission);
            }
            // In live mode, trigger the actual AI call
            if (ws.chatMode === 'live') {
              ws.sendMessage(submission.text);
            }
          }}
        />
        <ResizeHandle onMouseDown={onResizeMouseDown} />
      </aside>

      {/* ============================================================ */}
      {/*  Right body (preview area with its own header)                */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden h-lvh">
        {/* ---- Body header ---- */}
        <header className="flex items-center justify-between gap-3 p-2 border-b border-border shrink-0">
          {/* Leading – toolbar icon buttons */}
          <div className="block w-[80px]">
            <SegmentedControl.Root
              legend={<HiddenLegend>View mode</HiddenLegend>}
              value={ws.viewMode}
              onChange={ws.setViewMode}
              size="lg"
            >
              <SegmentedControl.Option
                aria-label="Preview"
                value="preview"
                icon={<Icon24EyeLarge />}
              />
              <SegmentedControl.Option
                aria-label="Code"
                value="code"
                icon={<Icon24DevLarge />}
              />
            </SegmentedControl.Root>
          </div>

          {/* Center – Preview / Code toggle */}
          <InputPrimitive.Root className="flex items-center gap-4px bg-bg-secondary rounded-full px-8px py-4px">
            <IconButton
                size="md"
                aria-label="Device preview"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...deviceMenu.getTriggerProps()}
              >
                <Icon24LayoutSet />
              </IconButton>
            <MenuV2.Root manager={deviceMenu.manager}>
                <MenuV2.RadioGroup
                  title="Device preview"
                  value={devicePreview}
                  onChange={setDevicePreview}
                >
                  <MenuV2.RadioGroupItem value="mobile">Mobile</MenuV2.RadioGroupItem>
                  <MenuV2.RadioGroupItem value="tablet">Tablet</MenuV2.RadioGroupItem>
                  <MenuV2.RadioGroupItem value="desktop">
                    Desktop
                    <span className="text-text-secondary pl-1">
                      (Default)
                    </span>
                  </MenuV2.RadioGroupItem>
                  <MenuV2.RadioGroupItem value="custom">Custom</MenuV2.RadioGroupItem>
                </MenuV2.RadioGroup>
            </MenuV2.Root>
            <span className="text-bodyMd text-text-secondary px-1">/</span>
            <InputPrimitive id="url-bar" aria-label="URL" className="flex-1 border-none outline-none text-bodyMd text-text py-4px bg-bg-secondary w-[100px]" />
            <IconButton size="md" aria-label="Design snapshot" onClick={(e) => { setSnapshotTriggerRect((e.currentTarget as HTMLElement).getBoundingClientRect()); setIsSnapshotOpen(true); }}>
              <Icon24SnapshotLarge />
            </IconButton>
            <IconButton size="md" aria-label="Side by side">
              <Icon24NewTab />
            </IconButton>
            <IconButton size="md" aria-label="Reload">
              <Icon24Reload />
            </IconButton>
          </InputPrimitive.Root>

          {/* Trailing */}
          <div className="flex items-center gap-8px">
            <UserAvatar size="md" />
            <div className="flex items-center gap-1">
              <IconButton
                  size="lg"
                  aria-label="Settings"
                  // eslint-disable-next-line react/jsx-props-no-spreading
                  {...settingsMenu.getTriggerProps()}
                >
                  <Icon24SettingsLarge />
                </IconButton>
              <MenuV2.Root manager={settingsMenu.manager}>
                  <MenuV2.Group>
                    <MenuV2.Item onClick={() => navigate({ to: '/settings', state: { section: 'general' } })} lead={<Icon24Adjust />}>
                      General
                    </MenuV2.Item>
                    <MenuV2.Item onClick={() => navigate({ to: '/settings', state: { section: 'design-libraries' } })} lead={<Icon24Library />}>
                      Design libraries
                    </MenuV2.Item>
                    <MenuV2.Item onClick={() => navigate({ to: '/settings', state: { section: 'domains' } })} lead={<Icon24Public />}>
                      Domains
                    </MenuV2.Item>
                    <MenuV2.Item onClick={() => navigate({ to: '/settings', state: { section: 'fonts' } })} lead={<Icon24Font />}>
                      Fonts
                    </MenuV2.Item>
                    <MenuV2.Item onClick={() => navigate({ to: '/settings', state: { section: 'chat' } })} lead={<Icon24Chat />}>
                      Chat
                    </MenuV2.Item>
                  </MenuV2.Group>
                  <MenuV2.Group>
                    <MenuV2.Item onClick={() => navigate({ to: '/settings', state: { section: 'general' } })} lead={<Icon24SpacingVertical />}>
                      Adjust guidelines
                    </MenuV2.Item>
                    <MenuV2.Item onClick={() => navigate({ to: '/settings', state: { section: 'general' } })} lead={<Icon24Code />}>
                      Access code editor
                    </MenuV2.Item>
                  </MenuV2.Group>
              </MenuV2.Root>
            </div>
            <Button size="lg" variant="secondary" onClick={(e) => { setPublishTriggerRect((e.currentTarget as HTMLElement).getBoundingClientRect()); setIsPublishOpen(true); }}>Publish</Button>
            <Button size="lg" variant="primary">Share</Button>
          </div>
        </header>

        {/* ---- Body content ---- */}
        <main className="flex-1 flex bg-bg-secondary overflow-hidden">
          {/* eslint-disable-next-line no-nested-ternary */}
          {ws.viewMode === 'code' ? <CodeView /> : ws.workComplete ? <PreviewView /> : <LoadingView />}
        </main>
      </div>

      {/* Publish window */}
      {isPublishOpen && (
        <PublishWindow
          onClose={() => setIsPublishOpen(false)}
          fileName={ws.fileName}
          triggerRect={publishTriggerRect}
        />
      )}

      {/* Snapshot window */}
      {isSnapshotOpen && (
        <SnapshotWindow
          onClose={() => setIsSnapshotOpen(false)}
          triggerRect={snapshotTriggerRect}
        />
      )}
    </div>
  );
}
