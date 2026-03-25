import { useState, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  IconButton,
  Button,
  ButtonGroup,
  Badge,
  Input,
} from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import {
  Icon16ChevronDown,
  Icon24FigmaLarge,
  Icon24SettingsLarge,
  Icon24Library,
  Icon24Public,
  Icon24Font,
  Icon24Chat,
  Icon24SpacingVertical,
  Icon24Code,
  Icon24Adjust,
  Icon24ArrowLeft,
  Icon24ArrowRight,
} from '@figma/fpl-icons';
import { Card, PatternLibraryWindow, UserConfigModal, type PromptSubmission } from '@prototype/shared';
import { useTheme, type ThemeSetting } from '../helpers/theme';
import { useWorkingState } from '../helpers/workingState';
import { PromptLanding } from '../components/PromptLanding';

/* ------------------------------------------------------------------ */
/*  Card data                                                          */
/* ------------------------------------------------------------------ */

const CARDS = [
  {
    id: 'example-1',
    title: 'Example 1',
    subtitle: 'By Dylan Field',
  },
  {
    id: 'example-2',
    title: 'Example 2',
    subtitle: 'By Dylan Field',
  },
  {
    id: 'example-3',
    title: 'Example 3',
    subtitle: 'By Dylan Field',
  },
];

/* ------------------------------------------------------------------ */
/*  Home page (/)                                                       */
/* ------------------------------------------------------------------ */

function HomePage() {
  const navigate = useNavigate();
  const ws = useWorkingState();
  const [theme, setTheme] = useTheme();
  const [audioNotifications, setAudioNotifications] = useState(true);
  const [openLinksDesktop, setOpenLinksDesktop] = useState(true);
  const [selectedModel, setSelectedModel] = useState('default');
  const [fileName, setFileName] = useState('Untitled');
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const fileNameInputRef = useRef<HTMLInputElement>(null);
  const [promptValue, setPromptValue] = useState('');
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showUserConfig, setShowUserConfig] = useState(false);

  /* Menus */
  const chevronMenu = MenuV2.useMenu();
  const fileMenu = MenuV2.useMenu();
  const settingsMenu = MenuV2.useMenu();

  /* Auto-focus and select file name input when editing */
  useEffect(() => {
    if (isEditingFileName) {
      fileNameInputRef.current?.focus();
      fileNameInputRef.current?.select();
    }
  }, [isEditingFileName]);

  const startEditingFileName = () => {
    setEditingValue(fileName);
    setIsEditingFileName(true);
  };

  const commitFileName = () => {
    const trimmed = editingValue.trim();
    if (trimmed) {
      setFileName(trimmed);
    }
    setIsEditingFileName(false);
  };

  const handlePromptSubmit = (submission: PromptSubmission) => {
    if (!submission.text.trim()) return;
    navigate({
      to: '/working',
      state: {
        prompt: submission.text.trim(),
        attachments: submission.attachments,
        inspectedElements: submission.inspectedElements,
      },
    });
    setPromptValue('');
  };

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      {/* ---- Header ---- */}
      <header className="flex items-center justify-between px-8px py-8px border-b border-border shrink-0">
        {/* Leading */}
        <div className="flex items-center gap-4px">
          {/* 1. Chevron menu (theme switcher) */}
          <IconButton
              aria-label="Figma"
              size="lg"
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

              {/* Preferences (with theme switcher) */}
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

              {/* Prototype */}
              <MenuV2.SubMenu title="Prototype">
                  <MenuV2.Group>
                    <MenuV2.Item onClick={() => { ws.reset(); navigate({ to: '/' }); }}>Reset prototype</MenuV2.Item>
                  </MenuV2.Group>
                  <MenuV2.Group>
                    <MenuV2.Item onClick={() => setShowPatternLibrary(true)}>Pattern library</MenuV2.Item>
                    <MenuV2.Item onClick={() => setShowUserConfig(true)}>User config...</MenuV2.Item>
                  </MenuV2.Group>
                </MenuV2.SubMenu>
          </MenuV2.Root>

          {/* 2. File name button group */}
          {isEditingFileName && (
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
          )}
          <div className={isEditingFileName ? 'hidden' : ''}>
          <ButtonGroup aria-label="File actions">
            <Button size="lg" variant="ghost" onClick={startEditingFileName}>
              <span className="text-bodyLg text-text">{fileName}</span>
            </Button>
            <ButtonGroup.Trigger
              size="lg"
              {...fileMenu.getTriggerProps() as React.ComponentProps<typeof ButtonGroup.Trigger>}
              aria-label="File options"
            >
              <Icon16ChevronDown />
            </ButtonGroup.Trigger>
          </ButtonGroup>
          </div>
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

        </div>

        {/* Trailing */}
        <div className="flex items-center gap-8px">
          {/* AI Badge */}
          <Badge size="md" variant="defaultOutline">AI</Badge>

          {/* Settings icon button with menu */}
          <IconButton
              size="lg"
              aria-label="Settings"
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
      </header>

      {/* ---- Page content ---- */}
      <main className="flex-1 flex flex-col items-center justify-center px-24px pb-40px gap-24px">
        {/* Prompt box */}
        <div className="w-full max-w-[800px] flex flex-col gap-5 items-center">
          <div className="flex flex-col gap-5 py-5 items-center w-full max-w-[680px]">
            <h1 className="text-headingLg text-text text-center">What do you want to make?</h1>
            <PromptLanding
              value={promptValue}
              onChange={setPromptValue}
              onSubmit={handlePromptSubmit}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              autoFocus
            />
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between gap-2 px-2">
              <span className="text-bodyLg text-text">Start from examples</span>
              <div className="flex items-center gap-3">
                <Button variant="link" aria-label="See more"><span className="text-bodyLg">See more</span></Button>
                <div className="flex items-center gap-1">
                  <IconButton aria-label="Backward"><Icon24ArrowLeft /></IconButton>
                  <IconButton aria-label="Forward"><Icon24ArrowRight /></IconButton>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              {CARDS.map((card) => (
                <Card
                  key={card.id}
                  size="lg"
                  label={card.title}
                  subtext={card.subtitle}
                  onClick={() => console.log(card.id)}
                >
                  <div className="overflow-hidden border border-border rounded-lg aspect-[16/9] bg-bg-secondary" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showPatternLibrary && <PatternLibraryWindow onClose={() => setShowPatternLibrary(false)} />}
      <UserConfigModal open={showUserConfig} onClose={() => setShowUserConfig(false)} />
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
