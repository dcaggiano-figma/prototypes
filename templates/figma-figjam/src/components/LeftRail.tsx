import { type ComponentType, useState } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, IconButton, Menu } from '@figma/fpl-components';
import {
  Icon24Page,
  Icon24TemplateLarge,
  Icon24Add,
  Icon24AiAssistant,
  Icon24Library,
  Icon24FigmaLarge,
  Icon24SearchLarge,
} from '@figma/fpl-icons';
import { renderMenuItems, type MenuItemDef } from './menuTypes';
import { type ThemeSetting, applyTheme, persistTheme, MODE_TO_BRAND } from '../helpers/theme';

// ---------------------------------------------------------------------------
// Nav button for the left rail
// ---------------------------------------------------------------------------

interface NavButtonProps {
  Icon: ComponentType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ Icon, label, isActive, onClick }: NavButtonProps) {
  return (
    <ButtonPrimitive onClick={onClick} aria-label={label} className="group flex flex-col items-center">
      <div
        className={clsx(
          'rounded-md h-32px w-32px flex items-center justify-center group-hover:bg-bg-hover',
          isActive ? 'bg-bg-selected icon-brand' : '',
        )}
      >
        <Icon />
      </div>
    </ButtonPrimitive>
  );
}

// ---------------------------------------------------------------------------
// LeftRail component
// ---------------------------------------------------------------------------

interface LeftRailProps {
  activeItem: string;
  onItemChange: (id: string) => void;
  themeSetting: ThemeSetting;
  onThemeChange: (setting: ThemeSetting) => void;
}

const navItems = [
  { Icon: Icon24Page, label: 'File', id: 'file' },
  { Icon: Icon24TemplateLarge, label: 'Templates', id: 'templates' },
  { Icon: Icon24Add, label: 'Assets', id: 'assets' },
  { Icon: Icon24AiAssistant, label: 'AI Chat', id: 'ai' },
];

const noop = () => {};

export function LeftRail({ activeItem, onItemChange, themeSetting, onThemeChange }: LeftRailProps) {
  const mainMenu = Menu.useMenu();

  // Consolidated preferences state
  const [prefs, setPrefs] = useState({
    // View
    comments: true,
    annotations: true,
    additionalLabels: true,
    showUI: true,
    // Preferences
    snapToGeometry: true,
    snapToObjects: false,
    keepToolSelected: false,
    highlightOnHover: true,
    renameDuplicated: true,
    showDimensions: false,
    hideCanvasUI: false,
    smartQuotes: true,
    flipOnResize: true,
    keyboardZoom: false,
    invertZoom: false,
    ctrlRightClick: false,
    playAudioAI: true,
    openLinksDesktop: false,
    showToolSuggestions: true,
    showAIChatCanvas: false,
    scrollWheelZoom: false,
    rightClickDragPan: false,
  });

  const toggle = (key: keyof typeof prefs) => (v: boolean) => {
    setPrefs((p) => ({ ...p, [key]: v }));
  };

  const handleThemeChange = (v: string) => {
    const setting = v as ThemeSetting;
    onThemeChange(setting);
    persistTheme(setting);
    applyTheme(setting, MODE_TO_BRAND.figjam);
  };

  // -------------------------------------------------------------------------
  // Main menu data
  // -------------------------------------------------------------------------

  const menuItems: MenuItemDef[] = [
    { type: 'item', id: 'actions', label: 'Actions...', icon: Icon24SearchLarge, shortcut: '⌘K', onClick: noop },
    { type: 'separator' },

    // ── File ──────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'file', label: 'File', children: [
      { type: 'item', id: 'new-figjam', label: 'New FigJam file', onClick: noop },
      { type: 'submenu', id: 'new', label: 'New', children: [
        { type: 'item', id: 'new-design', label: 'Design', onClick: noop },
        { type: 'item', id: 'new-slides', label: 'Slides', onClick: noop },
        { type: 'item', id: 'new-buzz', label: 'Buzz', onClick: noop },
        { type: 'item', id: 'new-site', label: 'Site', onClick: noop },
        { type: 'item', id: 'new-make', label: 'Make', onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'place-image', label: 'Place image/video...', shortcut: '⌥⌘K', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'save-local', label: 'Save local copy...', onClick: noop },
      { type: 'item', id: 'save-version', label: 'Save to version history...', shortcut: '⌥⌘S', onClick: noop },
      { type: 'item', id: 'version-history', label: 'Show version history', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'export', label: 'Export...', shortcut: '⇧⌘E', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'create-branch', label: 'Create branch...', onClick: noop },
    ]},

    // ── Edit ──────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'edit', label: 'Edit', children: [
      { type: 'item', id: 'undo', label: 'Undo', shortcut: '⌘Z', onClick: noop },
      { type: 'item', id: 'redo', label: 'Redo', shortcut: '⇧⌘Z', onClick: noop },
      { type: 'separator' },
      { type: 'submenu', id: 'copy-as', label: 'Copy as', children: [
        { type: 'item', id: 'copy-as-png', label: 'Copy as PNG', onClick: noop },
        { type: 'item', id: 'copy-as-svg', label: 'Copy as SVG', onClick: noop },
        { type: 'item', id: 'copy-link', label: 'Copy link', onClick: noop },
      ]},
      { type: 'item', id: 'paste-over', label: 'Paste over selection', shortcut: '⇧⌘V', onClick: noop },
      { type: 'item', id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', onClick: noop },
      { type: 'item', id: 'delete', label: 'Delete', shortcut: '⌫', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'find', label: 'Find', shortcut: '⌘F', onClick: noop },
      { type: 'item', id: 'find-next', label: 'Find next', shortcut: '⇧⌘F', onClick: noop },
      { type: 'item', id: 'find-prev', label: 'Find previous', shortcut: '⇧⌘D', onClick: noop },
      { type: 'item', id: 'find-replace', label: 'Find and replace...', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'select-all', label: 'Select all', shortcut: '⌘A', onClick: noop },
      { type: 'item', id: 'select-none', label: 'Select none', onClick: noop },
      { type: 'item', id: 'select-inverse', label: 'Select inverse', shortcut: '⇧⌘A', onClick: noop },
    ]},

    // ── View ──────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'view', label: 'View', children: [
      { type: 'checkbox', id: 'comments', label: 'Comments', checked: prefs.comments, onChange: toggle('comments') },
      { type: 'checkbox', id: 'annotations', label: 'Annotations', checked: prefs.annotations, onChange: toggle('annotations') },
      { type: 'item', id: 'memory-usage', label: 'Memory usage', onClick: noop },
      { type: 'separator' },
      { type: 'checkbox', id: 'additional-labels', label: 'Additional labels', checked: prefs.additionalLabels, onChange: toggle('additionalLabels') },
      { type: 'item', id: 'minimize-ui', label: 'Minimize UI', shortcut: '⇧⌘\\', onClick: noop },
      { type: 'checkbox', id: 'show-ui', label: 'Show/Hide UI', checked: prefs.showUI, onChange: toggle('showUI') },
      { type: 'item', id: 'multiplayer-cursors', label: 'Multiplayer cursors', shortcut: '⌥⌘\\', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'zoom-in', label: 'Zoom in', shortcut: '⌘+', onClick: noop },
      { type: 'item', id: 'zoom-out', label: 'Zoom out', shortcut: '⌘−', onClick: noop },
      { type: 'item', id: 'zoom-100', label: 'Zoom to 100%', shortcut: '⌘0', onClick: noop },
      { type: 'item', id: 'zoom-fit', label: 'Zoom to fit', onClick: noop },
      { type: 'item', id: 'zoom-selection', label: 'Zoom to selection', shortcut: '⇧2', onClick: noop },
    ]},

    // ── Object ────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'object', label: 'Object', children: [
      { type: 'item', id: 'group', label: 'Group selection', shortcut: '⌘G', onClick: noop },
      { type: 'item', id: 'ungroup', label: 'Ungroup selection', shortcut: '⇧⌘G', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'wrap-section', label: 'Wrap in new section', shortcut: '⌘S', onClick: noop },
      { type: 'item', id: 'convert-section', label: 'Convert to section', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'bring-front', label: 'Bring to front', shortcut: ']', onClick: noop },
      { type: 'item', id: 'bring-forward', label: 'Bring forward', shortcut: '⌘]', onClick: noop },
      { type: 'item', id: 'send-backward', label: 'Send backward', shortcut: '⌘[', onClick: noop },
      { type: 'item', id: 'send-back', label: 'Send to back', shortcut: '[', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'flip-h', label: 'Flip horizontal', shortcut: '⇧H', onClick: noop },
      { type: 'item', id: 'flip-v', label: 'Flip vertical', shortcut: '⇧V', onClick: noop },
      { type: 'item', id: 'rotate-180', label: 'Rotate 180°', onClick: noop },
      { type: 'item', id: 'rotate-90-left', label: 'Rotate 90° left', onClick: noop },
      { type: 'item', id: 'rotate-90-right', label: 'Rotate 90° right', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'show-hide-sel', label: 'Show/Hide selection', shortcut: '⇧⌘H', onClick: noop },
      { type: 'item', id: 'lock-unlock-sel', label: 'Lock/Unlock selection', shortcut: '⇧⌘L', onClick: noop },
    ]},

    // ── Text ──────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'text', label: 'Text', children: [
      { type: 'item', id: 'bold', label: 'Bold', shortcut: '⌘B', onClick: noop },
      { type: 'item', id: 'italic', label: 'Italic', shortcut: '⌘I', onClick: noop },
      { type: 'item', id: 'underline', label: 'Underline', shortcut: '⌘U', onClick: noop },
      { type: 'item', id: 'strikethrough', label: 'Strikethrough', shortcut: '⇧⌘X', onClick: noop },
      { type: 'item', id: 'create-link', label: 'Create link', shortcut: '⇧⌘U', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'bulleted-list', label: 'Bulleted list', shortcut: '⇧⌘8', onClick: noop },
      { type: 'item', id: 'numbered-list', label: 'Numbered list', shortcut: '⇧⌘7', onClick: noop },
      { type: 'separator' },
      { type: 'submenu', id: 'alignment', label: 'Alignment', children: [
        { type: 'item', id: 'align-text-left', label: 'Left', onClick: noop },
        { type: 'item', id: 'align-text-center', label: 'Center', onClick: noop },
        { type: 'item', id: 'align-text-right', label: 'Right', onClick: noop },
        { type: 'item', id: 'align-text-justify', label: 'Justify', onClick: noop },
      ]},
      { type: 'submenu', id: 'adjust', label: 'Adjust', children: [
        { type: 'item', id: 'increase-size', label: 'Increase font size', onClick: noop },
        { type: 'item', id: 'decrease-size', label: 'Decrease font size', onClick: noop },
        { type: 'item', id: 'increase-weight', label: 'Increase font weight', onClick: noop },
        { type: 'item', id: 'decrease-weight', label: 'Decrease font weight', onClick: noop },
        { type: 'item', id: 'increase-spacing', label: 'Increase letter spacing', onClick: noop },
        { type: 'item', id: 'decrease-spacing', label: 'Decrease letter spacing', onClick: noop },
        { type: 'item', id: 'increase-line-height', label: 'Increase line height', onClick: noop },
        { type: 'item', id: 'decrease-line-height', label: 'Decrease line height', onClick: noop },
      ]},
      { type: 'submenu', id: 'case', label: 'Case', children: [
        { type: 'item', id: 'uppercase', label: 'Uppercase', onClick: noop },
        { type: 'item', id: 'lowercase', label: 'Lowercase', onClick: noop },
        { type: 'item', id: 'titlecase', label: 'Title Case', onClick: noop },
      ]},
    ]},

    // ── Arrange ───────────────────────────────────────────────────────────
    { type: 'submenu', id: 'arrange', label: 'Arrange', children: [
      { type: 'item', id: 'align-left', label: 'Align left', shortcut: '⌥A', onClick: noop },
      { type: 'item', id: 'align-hcenter', label: 'Align horizontal centers', shortcut: '⌥H', onClick: noop },
      { type: 'item', id: 'align-right', label: 'Align right', shortcut: '⌥D', onClick: noop },
      { type: 'item', id: 'align-top', label: 'Align top', shortcut: '⌥W', onClick: noop },
      { type: 'item', id: 'align-vcenter', label: 'Align vertical centers', shortcut: '⌥V', onClick: noop },
      { type: 'item', id: 'align-bottom', label: 'Align bottom', shortcut: '⌥S', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'tidy-up', label: 'Tidy up', shortcut: '⌃⌥T', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'distribute-h', label: 'Distribute horizontal spacing', shortcut: '⌃⌥H', onClick: noop },
      { type: 'item', id: 'distribute-v', label: 'Distribute vertical spacing', shortcut: '⌃⌥V', onClick: noop },
    ]},

    { type: 'separator' },

    // ── Plugins ───────────────────────────────────────────────────────────
    { type: 'submenu', id: 'plugins', label: 'Plugins', children: [
      { type: 'title', id: 'plugins-recents-title', label: 'Recents' },
      { type: 'item', id: 'plugin-paletto', label: 'Paletto – oklch palette generator', onClick: noop },
      { type: 'item', id: 'plugin-contrast', label: 'Contrast', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'run-last-plugin', label: 'Run last plugin', shortcut: '⌥⌘P', onClick: noop },
      { type: 'separator' },
      { type: 'submenu', id: 'saved-plugins', label: 'Saved plugins', children: [
        { type: 'item', id: 'saved-p-1', label: 'No saved plugins', disabled: true, onClick: noop },
      ]},
      { type: 'submenu', id: 'plugins-org', label: 'From Figma Staging Org', children: [
        { type: 'item', id: 'org-p-1', label: 'Browse org plugins', onClick: noop },
      ]},
      { type: 'submenu', id: 'plugins-dev', label: 'Development', children: [
        { type: 'item', id: 'dev-p-1', label: 'New plugin...', onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'manage-plugins', label: 'Manage plugins...', onClick: noop },
    ]},

    // ── Widgets ───────────────────────────────────────────────────────────
    { type: 'submenu', id: 'widgets', label: 'Widgets', children: [
      { type: 'title', id: 'widgets-recents-title', label: 'Recents' },
      { type: 'item', id: 'widget-asana', label: 'Asana', onClick: noop },
      { type: 'item', id: 'widget-figlog', label: 'FigLog', onClick: noop },
      { type: 'item', id: 'widget-figmates', label: 'Figmates!', onClick: noop },
      { type: 'separator' },
      { type: 'submenu', id: 'widgets-org', label: 'From Figma Staging Org', children: [
        { type: 'item', id: 'org-w-1', label: 'Browse org widgets', onClick: noop },
      ]},
      { type: 'submenu', id: 'widgets-dev', label: 'Development', children: [
        { type: 'item', id: 'dev-w-1', label: 'New widget...', onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'manage-widgets', label: 'Manage widgets...', onClick: noop },
      { type: 'item', id: 'select-all-widgets', label: 'Select all widgets', onClick: noop },
    ]},

    // ── Preferences ──────────────────────────────────────────────────────
    { type: 'submenu', id: 'preferences', label: 'Preferences', children: [
      { type: 'checkbox', id: 'snap-geometry', label: 'Snap to geometry', checked: prefs.snapToGeometry, onChange: toggle('snapToGeometry') },
      { type: 'checkbox', id: 'snap-objects', label: 'Snap to objects', checked: prefs.snapToObjects, onChange: toggle('snapToObjects') },
      { type: 'separator' },
      { type: 'checkbox', id: 'keep-tool', label: 'Keep tool selected after use', checked: prefs.keepToolSelected, onChange: toggle('keepToolSelected') },
      { type: 'checkbox', id: 'highlight-hover', label: 'Highlight layers on hover', checked: prefs.highlightOnHover, onChange: toggle('highlightOnHover') },
      { type: 'checkbox', id: 'rename-dup', label: 'Rename duplicated layers', checked: prefs.renameDuplicated, onChange: toggle('renameDuplicated') },
      { type: 'checkbox', id: 'show-dimensions', label: 'Show dimensions on objects', checked: prefs.showDimensions, onChange: toggle('showDimensions') },
      { type: 'checkbox', id: 'hide-canvas-ui', label: 'Hide canvas UI during changes', checked: prefs.hideCanvasUI, onChange: toggle('hideCanvasUI') },
      { type: 'checkbox', id: 'smart-quotes', label: 'Use smart quotes/symbols', checked: prefs.smartQuotes, onChange: toggle('smartQuotes') },
      { type: 'checkbox', id: 'flip-resize', label: 'Flip objects while resizing', checked: prefs.flipOnResize, onChange: toggle('flipOnResize') },
      { type: 'checkbox', id: 'keyboard-zoom', label: 'Keyboard zooms into selection', checked: prefs.keyboardZoom, onChange: toggle('keyboardZoom') },
      { type: 'checkbox', id: 'invert-zoom', label: 'Invert zoom direction', checked: prefs.invertZoom, onChange: toggle('invertZoom') },
      { type: 'checkbox', id: 'ctrl-right-click', label: 'Ctrl+click opens right click menus', checked: prefs.ctrlRightClick, onChange: toggle('ctrlRightClick') },
      { type: 'separator' },
      { type: 'checkbox', id: 'play-audio-ai', label: 'Play audio notifications in AI chat', checked: prefs.playAudioAI, onChange: toggle('playAudioAI') },
      { type: 'checkbox', id: 'open-links-desktop', label: 'Open links in desktop app', checked: prefs.openLinksDesktop, onChange: toggle('openLinksDesktop') },
      { type: 'checkbox', id: 'show-tool-suggestions', label: 'Show tool suggestions', checked: prefs.showToolSuggestions, onChange: toggle('showToolSuggestions') },
      { type: 'checkbox', id: 'show-ai-chat-canvas', label: 'Show AI chat on canvas', checked: prefs.showAIChatCanvas, onChange: toggle('showAIChatCanvas') },
      { type: 'separator' },
      { type: 'checkbox', id: 'scroll-wheel-zoom', label: 'Use scroll wheel zoom', checked: prefs.scrollWheelZoom, onChange: toggle('scrollWheelZoom') },
      { type: 'checkbox', id: 'right-click-drag', label: 'Right-click and drag to pan', checked: prefs.rightClickDragPan, onChange: toggle('rightClickDragPan') },
      { type: 'separator' },
      { type: 'submenu', id: 'theme', label: 'Theme', children: [
        { type: 'radiogroup', id: 'theme-radio', value: themeSetting, onChange: handleThemeChange, options: [
          { id: 'light', label: 'Light' },
          { id: 'dark', label: 'Dark' },
          { id: 'system', label: 'System' },
        ]},
      ]},
      { type: 'submenu', id: 'labs', label: 'Labs', children: [
        { type: 'item', id: 'labs-placeholder', label: 'No labs available', disabled: true, onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'keyboard-layout', label: 'Keyboard layout...', onClick: noop },
      { type: 'item', id: 'accessibility', label: 'Accessibility settings...', onClick: noop },
      { type: 'item', id: 'nudge-amount', label: 'Nudge amount...', onClick: noop },
    ]},

    { type: 'separator' },

    // ── Footer ────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'ai-balance', label: 'AI balance', children: [
      { type: 'item', id: 'ai-credits', label: '4,061 credits left', disabled: true, onClick: noop },
    ]},

    { type: 'submenu', id: 'help', label: 'Help and account', children: [
      { type: 'item', id: 'help-page', label: 'Help page', onClick: noop },
      { type: 'item', id: 'keyboard-shortcuts', label: 'Keyboard shortcuts', shortcut: '⌃⇧?', onClick: noop },
      { type: 'item', id: 'support-forum', label: 'Support forum', onClick: noop },
      { type: 'item', id: 'video-tutorials', label: 'Video tutorials', onClick: noop },
      { type: 'item', id: 'release-notes', label: 'Release notes', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'legal-summary', label: 'Legal summary', onClick: noop },
      { type: 'item', id: 'account-settings', label: 'Account settings', onClick: noop },
      { type: 'item', id: 'log-out', label: 'Log out', onClick: noop },
    ]},

    { type: 'submenu', id: 'debug', label: 'Debug', children: [
      { type: 'item', id: 'console', label: 'Open console', onClick: noop },
      { type: 'item', id: 'network', label: 'Network log', onClick: noop },
      { type: 'item', id: 'performance', label: 'Performance', onClick: noop },
    ]},
  ];

  return (
    <nav className="w-[48px] bg-bg border-r border-border flex flex-col items-center pt-2 pb-3 z-sidebar">
      {/* Main menu / logo */}
      <Menu.Root manager={mainMenu.manager}>
        <IconButton size="lg" aria-label="Main menu" {...mainMenu.getTriggerProps()}>
          <Icon24FigmaLarge />
        </IconButton>
        <Menu.Container>
          {renderMenuItems(menuItems)}
        </Menu.Container>
      </Menu.Root>

      {/* Divider */}
      <div className="w-3 border-t border-border my-2" />

      {/* Nav items */}
      <div className="flex flex-col gap-2 py-1">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            Icon={item.Icon}
            label={item.label}
            isActive={activeItem === item.id}
            onClick={() => onItemChange(item.id)}
          />
        ))}
      </div>

      {/* Bottom buttons */}
      <div className="flex-1 flex flex-col justify-end gap-1">
        <IconButton
          size="lg"
          aria-label="Library"
          onClick={() => console.log('Library clicked')}
        >
          <Icon24Library />
        </IconButton>
      </div>
    </nav>
  );
}
