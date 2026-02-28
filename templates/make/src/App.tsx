import { useState, useEffect, useRef } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Outlet,
  useNavigate,
  useOutletContext,
} from 'react-router-dom';
import {
  Menu,
  IconButton,
  Button,
  ButtonGroup,
  Badge,
  CardPrimitive,
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
  Icon24ArrowLeft,
  Icon24ArrowRight,
  Icon24Adjust,
} from '@figma/fpl-icons';
import { ThemeProvider } from '@figma/fpl-tokens';
import { PromptLanding, UserConfigProvider, type PromptSubmission } from '@prototype/shared';
import { AppThemeProvider, useTheme, type ThemeSetting } from './helpers/theme';
import { WorkingStateProvider, useWorkingState } from './helpers/workingState';
import { WorkingPage } from './pages/WorkingPage';
import { SettingsPage } from './pages/SettingsPage';

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
/*  Layout context (shared between home layout and home page)           */
/* ------------------------------------------------------------------ */

type LayoutContext = {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Home layout (header for the home / landing page)                    */
/* ------------------------------------------------------------------ */

function HomeLayout() {
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
                  <Menu.Item onClick={() => { ws.reset(); navigate('/'); }}>New Make</Menu.Item>
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
                <Menu.Item onClick={() => navigate('/settings', { state: { section: 'general' } })}>
                  <Menu.ItemLead><Icon24Adjust /></Menu.ItemLead>
                  General
                </Menu.Item>
                <Menu.Item onClick={() => navigate('/settings', { state: { section: 'design-libraries' } })}>
                  <Menu.ItemLead><Icon24Library /></Menu.ItemLead>
                  Design libraries
                </Menu.Item>
                <Menu.Item onClick={() => navigate('/settings', { state: { section: 'domains' } })}>
                  <Menu.ItemLead><Icon24Public /></Menu.ItemLead>
                  Domains
                </Menu.Item>
                <Menu.Item onClick={() => navigate('/settings', { state: { section: 'fonts' } })}>
                  <Menu.ItemLead><Icon24Font /></Menu.ItemLead>
                  Fonts
                </Menu.Item>
                <Menu.Item onClick={() => navigate('/settings', { state: { section: 'chat' } })}>
                  <Menu.ItemLead><Icon24Chat /></Menu.ItemLead>
                  Chat
                </Menu.Item>
              </Menu.Group>
              <Menu.Group>
                <Menu.Item onClick={() => navigate('/settings', { state: { section: 'general' } })}>
                  <Menu.ItemLead><Icon24SpacingVertical /></Menu.ItemLead>
                  Adjust guidelines
                </Menu.Item>
                <Menu.Item onClick={() => navigate('/settings', { state: { section: 'general' } })}>
                  <Menu.ItemLead><Icon24Code /></Menu.ItemLead>
                  Access code editor
                </Menu.Item>
              </Menu.Group>
            </Menu.Container>
          </Menu.Root>
        </div>
      </header>

      {/* ---- Page content ---- */}
      <Outlet context={{ selectedModel, setSelectedModel } satisfies LayoutContext} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home page (/)                                                       */
/* ------------------------------------------------------------------ */

function HomePage() {
  const { selectedModel, setSelectedModel } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const [promptValue, setPromptValue] = useState('');

  const handlePromptSubmit = (submission: PromptSubmission) => {
    if (!submission.text.trim()) return;
    navigate('/working', {
      state: {
        prompt: submission.text.trim(),
        attachments: submission.attachments,
        inspectedElements: submission.inspectedElements,
      },
    });
    setPromptValue('');
  };

  return (
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
              <CardPrimitive.Root
                key={card.id}
                className="relative flex flex-col gap-2 p-2"
              >
                <CardPrimitive.MainButton
                  onClick={() => console.log(card.id)}
                  className="absolute inset-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-selected"
                />
                <div className="overflow-hidden border border-border rounded-lg aspect-[16/9] bg-bg-secondary"> </div>
                <div className="flex flex-col">
                  <span className="text-bodyLg text-text">{card.title}</span>
                  <span className="text-bodyMd text-text-secondary">{card.subtitle}</span>
                </div>
              </CardPrimitive.Root>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

function App() {
  return (
    <ThemeProvider initialVersion="ui3">
      <AppThemeProvider initial="light">
        <HashRouter>
          <UserConfigProvider config={{ name: 'Josh Ferrell', color: 'yellow' }}>
            <WorkingStateProvider>
              <Routes>
              <Route element={<HomeLayout />}>
                <Route index element={<HomePage />} />
              </Route>
              <Route path="working" element={<WorkingPage />} />
              <Route path="settings" element={<SettingsPage />} />
              </Routes>
            </WorkingStateProvider>
          </UserConfigProvider>
        </HashRouter>
      </AppThemeProvider>
    </ThemeProvider>
  );
}

export default App;
