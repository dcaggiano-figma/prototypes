import { useState, useEffect, useRef } from 'react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import {
  Menu,
  IconButton,
  Button,
  ButtonGroup,
  Badge,
  Input,
} from '@figma/fpl-components';
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
} from '@figma/fpl-icons';
import { useTheme, type ThemeSetting } from '../helpers/theme';
import { useWorkingState } from '../helpers/workingState';

function HomeLayout() {
  const navigate = useNavigate();
  const ws = useWorkingState();
  const [theme, setTheme] = useTheme();
  const [audioNotifications, setAudioNotifications] = useState(true);
  const [openLinksDesktop, setOpenLinksDesktop] = useState(true);
  const [fileName, setFileName] = useState('Untitled');
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const fileNameInputRef = useRef<HTMLInputElement>(null);

  /* Menus */
  const chevronMenu = Menu.useMenu();
  const fileMenu = Menu.useMenu();
  const settingsMenu = Menu.useMenu();

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

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      {/* ---- Header ---- */}
      <header className="flex items-center justify-between px-8px py-8px border-b border-border shrink-0">
        {/* Leading */}
        <div className="flex items-center gap-4px">
          {/* 1. Chevron menu (theme switcher) */}
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

              {/* Preferences (with theme switcher) */}
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

          {/* 2. File name button group */}
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
                  <span className="text-bodyLg text-text">{fileName}</span>
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

        {/* Trailing */}
        <div className="flex items-center gap-8px">
          {/* AI Badge */}
          <Badge size="md" variant="defaultOutline">AI</Badge>

          {/* Settings icon button with menu */}
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
      </header>

      {/* ---- Page content ---- */}
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute('/_home')({
  component: HomeLayout,
});
