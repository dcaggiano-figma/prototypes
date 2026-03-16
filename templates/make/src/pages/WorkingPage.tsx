import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import {
  Menu,
  IconButton,
  Button,
  ButtonGroup,
  Input,
  SegmentedControl,
  HiddenLegend,
  InputPrimitive,
} from '@figma/fpl-components';
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
  const chevronMenu = Menu.useMenu();
  const fileMenu = Menu.useMenu();
  const settingsMenu = Menu.useMenu();
  const deviceMenu = Menu.useMenu();

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
            <Menu.Root manager={chevronMenu.manager}>
              <IconButton
                aria-label="Figma"
                size="lg"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...chevronMenu.getTriggerProps()}
              >
                <Icon24FigmaLarge />
              </IconButton>
              <Menu.Container>
                {/* File */}
                <Menu.SubMenu>
                  <Menu.SubTrigger>File</Menu.SubTrigger>
                  <Menu.SubContainer>
                    <Menu.Item onClick={() => { ws.reset(); navigate({ to: '/' }); }}>New Make</Menu.Item>
                    <Menu.SubMenu>
                      <Menu.SubTrigger>New</Menu.SubTrigger>
                      <Menu.SubContainer>
                        <Menu.Item onClick={() => console.log('design')}>Design</Menu.Item>
                        <Menu.Item onClick={() => console.log('figjam')}>FigJam</Menu.Item>
                        <Menu.Item onClick={() => console.log('slides')}>Slides</Menu.Item>
                        <Menu.Item onClick={() => console.log('buzz')}>Buzz</Menu.Item>
                        <Menu.Item onClick={() => console.log('site')}>Site</Menu.Item>
                      </Menu.SubContainer>
                    </Menu.SubMenu>
                    <Menu.Separator />
                    <Menu.Item onClick={() => console.log('save-local')}>Save local copy...</Menu.Item>
                    <Menu.Item disabled onClick={() => console.log('save-version')}>
                      <span>Save to version history...</span>
                      <Menu.Shortcut>⌥⌘S</Menu.Shortcut>
                    </Menu.Item>
                    <Menu.Item disabled onClick={() => console.log('show-version')}>Show version history</Menu.Item>
                  </Menu.SubContainer>
                </Menu.SubMenu>

                {/* Preferences */}
                <Menu.SubMenu>
                  <Menu.SubTrigger>Preferences</Menu.SubTrigger>
                  <Menu.SubContainer>
                    <Menu.Group>
                      <Menu.CheckboxItem checked={audioNotifications} onChange={setAudioNotifications}>Play audio notifications in AI chat</Menu.CheckboxItem>
                      <Menu.CheckboxItem checked={openLinksDesktop} onChange={setOpenLinksDesktop}>Open links in desktop app</Menu.CheckboxItem>
                    </Menu.Group>
                    <Menu.Group>
                      <Menu.SubMenu>
                        <Menu.SubTrigger>Labs</Menu.SubTrigger>
                        <Menu.SubContainer>
                          <Menu.Item onClick={() => console.log('lab-1')}>Feature preview 1</Menu.Item>
                          <Menu.Item onClick={() => console.log('lab-2')}>Feature preview 2</Menu.Item>
                        </Menu.SubContainer>
                      </Menu.SubMenu>
                      <Menu.Item onClick={() => console.log('color-profile')}>Color profile...</Menu.Item>
                      <Menu.Item onClick={() => console.log('keyboard-layout')}>Keyboard layout...</Menu.Item>
                      <Menu.Item onClick={() => console.log('accessibility')}>Accessibility settings...</Menu.Item>
                    </Menu.Group>
                    <Menu.SubMenu>
                      <Menu.SubTrigger>
                        <span>Theme</span>
                      </Menu.SubTrigger>
                      <Menu.SubContainer>
                        <Menu.RadioGroup
                          title={<Menu.HiddenTitle>Theme</Menu.HiddenTitle>}
                          value={theme}
                          onChange={(value) => setTheme(value as ThemeSetting)}
                        >
                          <Menu.RadioGroupItem value="light">Light</Menu.RadioGroupItem>
                          <Menu.RadioGroupItem value="dark">Dark</Menu.RadioGroupItem>
                          <Menu.RadioGroupItem value="system">System</Menu.RadioGroupItem>
                        </Menu.RadioGroup>
                      </Menu.SubContainer>
                    </Menu.SubMenu>
                  </Menu.SubContainer>
                </Menu.SubMenu>
                <Menu.Separator />

                {/* AI balance */}
                <Menu.SubMenu>
                  <Menu.SubTrigger>AI balance</Menu.SubTrigger>
                  <Menu.SubContainer>
                    <Menu.Item onClick={() => console.log('speed')}>Speed</Menu.Item>
                    <Menu.Item onClick={() => console.log('balanced')}>Balanced</Menu.Item>
                    <Menu.Item onClick={() => console.log('quality')}>Quality</Menu.Item>
                  </Menu.SubContainer>
                </Menu.SubMenu>

                {/* Help and account */}
                <Menu.SubMenu>
                  <Menu.SubTrigger>Help and account</Menu.SubTrigger>
                  <Menu.SubContainer>
                    <Menu.Item onClick={() => console.log('help-center')}>Help center</Menu.Item>
                    <Menu.Item onClick={() => console.log('keyboard')}>Keyboard shortcuts</Menu.Item>
                    <Menu.Separator />
                    <Menu.Item onClick={() => console.log('account')}>Account settings</Menu.Item>
                  </Menu.SubContainer>
                </Menu.SubMenu>

                {/* Debug */}
                <Menu.SubMenu>
                  <Menu.SubTrigger>Debug</Menu.SubTrigger>
                  <Menu.SubContainer>
                    <Menu.Item onClick={() => console.log('console')}>Open console</Menu.Item>
                    <Menu.Item onClick={() => console.log('network')}>Network log</Menu.Item>
                    <Menu.Item onClick={() => console.log('performance')}>Performance</Menu.Item>
                  </Menu.SubContainer>
                </Menu.SubMenu>
              </Menu.Container>
            </Menu.Root>

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
              <Menu.Root manager={fileMenu.manager}>
                <ButtonGroup aria-label="File actions">
                  <Button size="lg" variant="ghost" onClick={startEditingFileName}>
                    <span className="text-bodyLg text-text max-w-[120px] block truncate">{ws.fileName}</span>
                  </Button>
                  <ButtonGroup.Trigger
                    size="lg"
                    aria-label="File options"
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...fileMenu.getTriggerProps()}
                  >
                    <Icon16ChevronDown />
                  </ButtonGroup.Trigger>
                </ButtonGroup>
                <Menu.Container>
                  <Menu.Group>
                    <Menu.SubMenu>
                      <Menu.SubTrigger>Add to sidebar</Menu.SubTrigger>
                      <Menu.SubContainer>
                        <Menu.Group>
                          <Menu.Item onClick={() => console.log('starred')}>Starred</Menu.Item>
                        </Menu.Group>
                      </Menu.SubContainer>
                    </Menu.SubMenu>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.Item onClick={() => console.log('duplicate')}>Duplicate</Menu.Item>
                    <Menu.Item onClick={() => console.log('rename')}>Rename</Menu.Item>
                    <Menu.Item onClick={() => console.log('move-file')}>Move file…</Menu.Item>
                    <Menu.Item onClick={() => console.log('move-to-trash')}>Move to trash</Menu.Item>
                  </Menu.Group>
                </Menu.Container>
              </Menu.Root>
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
            <Menu.Root manager={deviceMenu.manager}>
              <IconButton
                size="md"
                aria-label="Device preview"
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...deviceMenu.getTriggerProps()}
              >
                <Icon24LayoutSet />
              </IconButton>
              <Menu.Container>
                <Menu.RadioGroup
                  title={<Menu.HiddenTitle>Device preview</Menu.HiddenTitle>}
                  value={devicePreview}
                  onChange={setDevicePreview}
                >
                  <Menu.RadioGroupItem value="mobile">Mobile</Menu.RadioGroupItem>
                  <Menu.RadioGroupItem value="tablet">Tablet</Menu.RadioGroupItem>
                  <Menu.RadioGroupItem value="desktop">
                    Desktop
                    <span className="text-text-secondary pl-1">
                      (Default)
                    </span>
                  </Menu.RadioGroupItem>
                  <Menu.RadioGroupItem value="custom">Custom</Menu.RadioGroupItem>
                </Menu.RadioGroup>
              </Menu.Container>
            </Menu.Root>
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
              <Menu.Root manager={settingsMenu.manager}>
                <IconButton
                  size="lg"
                  aria-label="Settings"
                  // eslint-disable-next-line react/jsx-props-no-spreading
                  {...settingsMenu.getTriggerProps()}
                >
                  <Icon24SettingsLarge />
                </IconButton>
                <Menu.Container>
                  <Menu.Group>
                    <Menu.Item onClick={() => navigate({ to: '/settings', state: { section: 'general' } })}>
                      <Menu.ItemLead><Icon24Adjust /></Menu.ItemLead>
                      General
                    </Menu.Item>
                    <Menu.Item onClick={() => navigate({ to: '/settings', state: { section: 'design-libraries' } })}>
                      <Menu.ItemLead><Icon24Library /></Menu.ItemLead>
                      Design libraries
                    </Menu.Item>
                    <Menu.Item onClick={() => navigate({ to: '/settings', state: { section: 'domains' } })}>
                      <Menu.ItemLead><Icon24Public /></Menu.ItemLead>
                      Domains
                    </Menu.Item>
                    <Menu.Item onClick={() => navigate({ to: '/settings', state: { section: 'fonts' } })}>
                      <Menu.ItemLead><Icon24Font /></Menu.ItemLead>
                      Fonts
                    </Menu.Item>
                    <Menu.Item onClick={() => navigate({ to: '/settings', state: { section: 'chat' } })}>
                      <Menu.ItemLead><Icon24Chat /></Menu.ItemLead>
                      Chat
                    </Menu.Item>
                  </Menu.Group>
                  <Menu.Group>
                    <Menu.Item onClick={() => navigate({ to: '/settings', state: { section: 'general' } })}>
                      <Menu.ItemLead><Icon24SpacingVertical /></Menu.ItemLead>
                      Adjust guidelines
                    </Menu.Item>
                    <Menu.Item onClick={() => navigate({ to: '/settings', state: { section: 'general' } })}>
                      <Menu.ItemLead><Icon24Code /></Menu.ItemLead>
                      Access code editor
                    </Menu.Item>
                  </Menu.Group>
                </Menu.Container>
              </Menu.Root>
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
