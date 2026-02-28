import {
  useState,
  useEffect,
  useRef,
  type ReactElement,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  IconButton,
  Button,
  ButtonPrimitive,
  ButtonGroup,
  Input,
  Textarea,
  Checkbox,
  Label,
  Badge,
  Switch,
  Select,
  HiddenLabel,
} from '@figma/fpl-components';
import { Form, TextInput } from '@figma/fpl-components/form';
import {
  Icon16ChevronDown,
  Icon24FigmaLarge,
  Icon24Figma,
  Icon24SettingsLarge,
  Icon24ChevronLeftLarge,
  Icon24Adjust,
  Icon24Library,
  Icon24Public,
  Icon24Font,
  Icon24Chat,
  Icon24SpacingVertical,
  Icon24Code,
  Icon24Plugin,
  Icon24Github,
} from '@figma/fpl-icons';
import { z } from 'zod';
import { useTheme, type ThemeSetting } from '../helpers/theme';
import { useWorkingState } from '../helpers/workingState';
import { useResizablePanel, UserAvatar, ResizeHandle, NavList } from '@prototype/shared';

/* ------------------------------------------------------------------ */
/*  Navigation data                                                     */
/* ------------------------------------------------------------------ */

const SITE_NAV_ITEMS = [
  { id: 'general', label: 'General', icon: Icon24Adjust },
  { id: 'design-libraries', label: 'Design libraries', icon: Icon24Library },
  { id: 'domains', label: 'Domains', icon: Icon24Public },
  { id: 'fonts', label: 'Fonts', icon: Icon24Font },
  { id: 'chat', label: 'Chat', icon: Icon24Chat },
];

const INTEGRATION_NAV_ITEMS = [
  { id: 'supabase', label: 'Supabase', icon: Icon24Plugin },
  { id: 'figma-npm-registry', label: 'Figma npm registry', icon: Icon24Figma },
  { id: 'github', label: 'GitHub', icon: Icon24Github },
];

/* ------------------------------------------------------------------ */
/*  Settings content panels                                             */
/* ------------------------------------------------------------------ */

const generalSchema = z.object({
  title: z.string().default(''),
  metaDescription: z.string().default(''),
  language: z.string().default(''),
  analyticsId: z.string().default(''),
  favicon: z.string().default(''),
  socialImage: z.string().default(''),
  audience: z.string().default('anyone'),
  headStart: z.string().default(''),
  headEnd: z.string().default(''),
  bodyStart: z.string().default(''),
  bodyEnd: z.string().default(''),
});

function GeneralSettings() {
  const { manager } = Form.useForm({ schema: generalSchema, size: 'lg' });
  const [excludeSearch, setExcludeSearch] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [skipLinks, setSkipLinks] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);

  return (
    <Form manager={manager} onSubmit={(values) => console.log(values)}>
      <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
        {/* ---- General card ---- */}
        <div className="border border-border rounded-lg p-24px flex flex-col">
          <h2 className="text-bodyLgStrong text-text">General</h2>

          {/* Status */}
          <div className="flex flex-col gap-4px py-4">
            <span className="text-bodyMdStrong text-text">Status</span>
            <div className="flex items-center justify-between">
              <Badge>Not published</Badge>
              <Button variant="secondary" size="md">Publish</Button>
            </div>
          </div>

          <Form.Row name="title" label={<Form.Label>Title</Form.Label>}>
            <TextInput autoComplete="off" placeholder="Sign Up Form" />
          </Form.Row>

          <Form.Row name="metaDescription" label={<Form.Label>Meta description</Form.Label>}>
            <Textarea
              id="metaDescription"
              placeholder="Create and manage user accounts effortlessly with a streamlined sign-up form designed for businesses and developers to enhance user engagement."
              rows={4}
            />
          </Form.Row>

          <Form.Row name="language" label={<Form.Label>Language</Form.Label>}>
            <TextInput autoComplete="off" placeholder="Ex: en" />
            <Form.Helper>Enter one ISO language code</Form.Helper>
          </Form.Row>

          <Form.Row name="analyticsId" label={<Form.Label>Google Analytics ID</Form.Label>}>
            <TextInput autoComplete="off" placeholder="Ex: G-P4S7K43V4" />
          </Form.Row>

          <Checkbox
            checked={excludeSearch}
            onChange={setExcludeSearch}
            label={<Label>Exclude from search results</Label>}
          />
        </div>

        {/* ---- Accessibility card ---- */}
        <div className="border border-border rounded-lg p-24px flex flex-col gap-3">
          <h2 className="text-bodyLgStrong text-text">Accessibility</h2>

          <Checkbox
            checked={reducedMotion}
            onChange={setReducedMotion}
            label={(
              <Label className="flex flex-col gap-4px">
                Allow reduced motion
                <p className="text-bodyMd text-text-secondary">
                  Site will respect user device settings to limit animations and interactions.
                </p>
              </Label>
            )}
          />

          <Checkbox
            checked={skipLinks}
            onChange={setSkipLinks}
            label={(
              <Label className="flex flex-col gap-4px">
                Include skip links
                <p className="text-bodyMd text-text-secondary">
                  Adds visually hidden links to main content so users can skip repetitive navigation elements.
                </p>
              </Label>
            )}
          />
        </div>

        {/* ---- Images card ---- */}
        <div className="border border-border rounded-lg px-24px pt-24px flex flex-col">
          <h2 className="text-bodyLgStrong text-text pb-4">Images</h2>

          <Form.Row name="favicon" label={<Form.Label>Favicon</Form.Label>}>
            <ButtonPrimitive className="flex items-center gap-8px border border-border rounded-md p-8px w-fit">
              <div className="w-32px h-32px rounded-md bg-bg-secondary border border-border shrink-0" />
              <span className="text-bodyMd text-text">Select a frame or image</span>
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <Form.Helper>Recommended dimensions: 48 × 48</Form.Helper>
          </Form.Row>

          <Form.Row name="socialImage" label={<Form.Label>Social sharing image</Form.Label>}>
            <ButtonPrimitive className="flex items-center gap-8px border border-border rounded-md p-8px w-fit">
              <div className="w-32px h-32px rounded-md bg-bg-secondary border border-border shrink-0" />
              <span className="text-bodyMd text-text">Select a frame or image</span>
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <Form.Helper>Recommended dimensions: 1200 × 630</Form.Helper>
          </Form.Row>
        </div>

        {/* ---- Published app access card ---- */}
        <div className="border border-border rounded-lg p-24px flex flex-col">
          <h2 className="text-bodyLgStrong text-text pb-4">Published app access</h2>

          <Form.Row name="audience" label={<Form.Label>Who can view</Form.Label>}>
            <Select.Root value="anyone" onChange={() => {}}>
              <Select.Trigger size="lg" width="fill" label={<HiddenLabel>Who can view</HiddenLabel>} />
              <Select.Container>
                <Select.Option value="anyone" iconLead={<Icon24Public />}>
                  Anyone on the web
                </Select.Option>
                <Select.Option value="org" iconLead={<Icon24Figma />}>
                  Figma Staging Org
                </Select.Option>
              </Select.Container>
            </Select.Root>
            <Form.Helper>Changing audience will take effect immediately.</Form.Helper>
          </Form.Row>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-4px">
              <span className="text-bodyMdStrong text-text">Require password</span>
              <p className="text-bodyMd text-text-secondary">
                Only people with the password will be able to view the published app.
              </p>
            </div>
            <Switch
              label={<HiddenLabel>Require password</HiddenLabel>}
              checked={requirePassword}
              onChange={setRequirePassword}
            />
          </div>

        </div>

        {/* ---- Custom code card ---- */}
        <div className="border border-border rounded-lg px-24px pt-24px flex flex-col">
          <h2 className="text-bodyLgStrong text-text pb-4">Custom code</h2>

          <Form.Row name="headStart" label={<Form.Label>{'Start of <head>'}</Form.Label>}>
            <Textarea id="headStart" placeholder="Include any custom code for ad tracking or analytics" rows={2} />
          </Form.Row>

          <Form.Row name="headEnd" label={<Form.Label>{'End of <head>'}</Form.Label>}>
            <Textarea id="headEnd" placeholder="Include any custom code for ad tracking or analytics" rows={2} />
          </Form.Row>

          <Form.Row name="bodyStart" label={<Form.Label>{'Start of <body>'}</Form.Label>}>
            <Textarea id="bodyStart" placeholder="Include any custom code for ad tracking or analytics" rows={2} />
          </Form.Row>

          <Form.Row name="bodyEnd" label={<Form.Label>{'End of <body>'}</Form.Label>}>
            <Textarea id="bodyEnd" placeholder="Include any custom code for ad tracking or analytics" rows={2} />
          </Form.Row>
        </div>
      </div>
    </Form>
  );
}

function DesignLibrariesSettings() {
  return (
    <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
      <div className="border border-border rounded-lg p-24px flex flex-col gap-24px">
        <h2 className="text-bodyLgStrong text-text">Design libraries</h2>
        <div className="flex items-center justify-center h-[160px]">
          <span className="text-bodyLg text-text-tertiary">No design libraries connected</span>
        </div>
      </div>
    </div>
  );
}

function DomainsSettings() {
  return (
    <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
      {/* ---- Base domain card ---- */}
      <div className="border border-border rounded-lg p-24px flex flex-col gap-16px">
        <h2 className="text-bodyLgStrong text-text">Base domain</h2>
        <p className="text-bodyMd text-text-secondary">Publish your site to get your figma.site domain.</p>

        <div className="flex flex-col gap-12px">
          <div className="flex items-center">
            <span className="text-bodyMd text-text-secondary w-[140px] shrink-0">Site URL</span>
            <span className="text-bodyMd text-text">example.figma.site</span>
          </div>
          <div className="flex items-center">
            <span className="text-bodyMd text-text-secondary w-[140px] shrink-0">Status</span>
            <Badge>Not published</Badge>
          </div>
        </div>
      </div>

      {/* ---- Connected domains card ---- */}
      <div className="border border-border rounded-lg p-24px flex flex-col gap-16px">
        <h2 className="text-bodyLgStrong text-text">Connected domains</h2>
        <p className="text-bodyMd text-text-secondary">
          Publish your site to add a domain from a third-party provider.{' '}
          <ButtonPrimitive className="text-text-brand hover:underline">Learn more</ButtonPrimitive>
        </p>
        <div>
          <Button variant="secondary" size="md" disabled>Connect a domain</Button>
        </div>
      </div>
    </div>
  );
}

function FontsSettings() {
  return (
    <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
      <div className="border border-border rounded-lg p-24px flex flex-col gap-24px">
        <h2 className="text-bodyLgStrong text-text">Fonts</h2>
        <div className="flex items-center justify-center h-[160px]">
          <span className="text-bodyLg text-text-tertiary">No custom fonts uploaded</span>
        </div>
      </div>
    </div>
  );
}

const chatSchema = z.object({
  startingTasks: z.string().default('auto-start'),
});

function ChatSettings() {
  const { manager } = Form.useForm({ schema: chatSchema, size: 'lg' });

  return (
    <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
      {/* ---- To-do lists card ---- */}
      <div className="border border-border rounded-lg p-24px flex flex-col gap-16px">
        <h2 className="text-bodyLgStrong text-text">To-do lists</h2>

        <Form manager={manager} onSubmit={(values) => console.log(values)}>
          <Form.Row name="startingTasks" label={<Form.Label>Starting tasks</Form.Label>}>
            <Select.Root value="auto-start" onChange={() => {}}>
              <Select.Trigger size="lg" width="fill" label={<HiddenLabel>Who can view</HiddenLabel>} />
              <Select.Container>
                <Select.Option value="auto-start">Auto-start immediately</Select.Option>
                <Select.Option value="delayed">Start after delay</Select.Option>
                <Select.Option value="ask">Ask to start</Select.Option>
              </Select.Container>
            </Select.Root>
            <Form.Helper>No to-do list editing available.</Form.Helper>
          </Form.Row>
        </Form>
      </div>
    </div>
  );
}

function SubabaseSettings() {
  return (
    <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
      <div className="border border-border rounded-lg p-24px flex flex-col items-center justify-center gap-12px h-[200px]">
        <span className="text-bodyLg text-text-tertiary">Connect your Supabase project</span>
        <Button variant="secondary" size="md">Connect</Button>
      </div>
    </div>
  );
}

function GithubSettings() {
  return (
    <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
      <div className="border border-border rounded-lg p-24px flex flex-col items-center justify-center gap-12px h-[200px]">
        <span className="text-bodyLg text-text-tertiary">Connect your GitHub repository</span>
        <Button variant="secondary" size="md">Connect</Button>
      </div>
    </div>
  );
}

function FigmaNpmRegistrySettings() {
  return (
    <div className="max-w-[640px] mx-auto py-24px px-24px flex flex-col gap-24px">
      <div className="border border-border rounded-lg p-24px flex flex-col items-center justify-center gap-12px h-[200px]">
        <span className="text-bodyLg text-text-tertiary">Connect to Figma npm registry</span>
        <Button variant="secondary" size="md">Connect</Button>
      </div>
    </div>
  );
}

const SETTINGS_PANELS: Record<string, () => ReactElement> = {
  general: GeneralSettings,
  'design-libraries': DesignLibrariesSettings,
  domains: DomainsSettings,
  fonts: FontsSettings,
  chat: ChatSettings,
  supabase: SubabaseSettings,
  'figma-npm-registry': FigmaNpmRegistrySettings,
  github: GithubSettings,
};

/* ------------------------------------------------------------------ */
/*  Settings page                                                       */
/* ------------------------------------------------------------------ */

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { section?: string } | null;

  const [activeSection, setActiveSection] = useState(locationState?.section || 'general');

  /* Persistent working state (shared with WorkingPage) */
  const ws = useWorkingState();

  /* Theme */
  const [theme, setTheme] = useTheme();
  const [audioNotifications, setAudioNotifications] = useState(true);
  const [openLinksDesktop, setOpenLinksDesktop] = useState(true);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const fileNameInputRef = useRef<HTMLInputElement>(null);

  /* Resizable left panel */
  const { panelRef, onMouseDown: onResizeMouseDown } = useResizablePanel({ minWidth: 280 });

  /* Menus */
  const chevronMenu = Menu.useMenu();
  const fileMenu = Menu.useMenu();
  const settingsMenu = Menu.useMenu();

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

  const handleBack = () => {
    navigate('/working');
  };

  const ActivePanel = SETTINGS_PANELS[activeSection] || GeneralSettings;

  return (
    <div className="bg-bg h-screen flex overflow-hidden">
      {/* ============================================================ */}
      {/*  Left sidebar (settings navigation)                           */}
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
                    <Menu.Item onClick={() => console.log('new-make')}>New Make</Menu.Item>
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
                    <span className="text-bodyLg text-text">{ws.fileName}</span>
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

        {/* ---- Settings navigation ---- */}
        <nav className="flex-1 overflow-y-auto flex flex-col gap-4px">
          {/* Site section */}
          <div className="flex flex-col gap-4px px-2 py-2">
            <span className="text-bodyMd text-text px-2 py-2">Make</span>
            <NavList
              value={activeSection}
              onChange={setActiveSection}
              size="lg"
              aria-label="Site settings"
              items={SITE_NAV_ITEMS.map((i) => ({ value: i.id, label: i.label, icon: i.icon }))}
            />
          </div>

          {/* Integrations section */}
          <div className="flex flex-col gap-4px border-t border-border px-2 py-2">
            <span className="text-bodyMd text-text px-8px py-2">Integrations</span>
            <NavList
              value={activeSection}
              onChange={setActiveSection}
              size="lg"
              aria-label="Integration settings"
              items={INTEGRATION_NAV_ITEMS.map((i) => ({ value: i.id, label: i.label, icon: i.icon }))}
            />
          </div>
        </nav>
        <ResizeHandle onMouseDown={onResizeMouseDown} />
      </aside>

      {/* ============================================================ */}
      {/*  Right body (settings content with header)                    */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ---- Body header ---- */}
        <header className="flex items-center justify-between px-8px py-8px border-b border-border shrink-0">
          {/* Leading – back button + label */}
          <div className="flex items-center gap-4px">
            <IconButton size="lg" aria-label="Back to editor" onClick={handleBack}>
              <Icon24ChevronLeftLarge />
            </IconButton>
            <span className="text-bodyLg text-text">Make settings</span>
          </div>

          {/* Trailing */}
          <div className="flex items-center gap-8px">
            <UserAvatar size="md" />
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
                  <Menu.Item onClick={() => setActiveSection('general')}>
                    <Menu.ItemLead><Icon24Adjust /></Menu.ItemLead>
                    General
                  </Menu.Item>
                  <Menu.Item onClick={() => setActiveSection('design-libraries')}>
                    <Menu.ItemLead><Icon24Library /></Menu.ItemLead>
                    Design libraries
                  </Menu.Item>
                  <Menu.Item onClick={() => setActiveSection('domains')}>
                    <Menu.ItemLead><Icon24Public /></Menu.ItemLead>
                    Domains
                  </Menu.Item>
                  <Menu.Item onClick={() => setActiveSection('fonts')}>
                    <Menu.ItemLead><Icon24Font /></Menu.ItemLead>
                    Fonts
                  </Menu.Item>
                  <Menu.Item onClick={() => setActiveSection('chat')}>
                    <Menu.ItemLead><Icon24Chat /></Menu.ItemLead>
                    Chat
                  </Menu.Item>
                </Menu.Group>
                <Menu.Group>
                  <Menu.Item onClick={() => console.log('adjust-guidelines')}>
                    <Menu.ItemLead><Icon24SpacingVertical /></Menu.ItemLead>
                    Adjust guidelines
                  </Menu.Item>
                  <Menu.Item onClick={() => console.log('code-editor')}>
                    <Menu.ItemLead><Icon24Code /></Menu.ItemLead>
                    Access code editor
                  </Menu.Item>
                </Menu.Group>
              </Menu.Container>
            </Menu.Root>
            <Button size="lg" variant="secondary">Publish</Button>
            <Button size="lg" variant="primary">Share</Button>
          </div>
        </header>

        {/* ---- Body content ---- */}
        <main className="flex-1 overflow-y-auto bg-bg">
          <ActivePanel />
        </main>
      </div>
    </div>
  );
}
