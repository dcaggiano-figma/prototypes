import {
  Icon24AiEdit,
  Icon24Check,
  Icon24Checklist,
  Icon24ExtendImage,
  Icon24FirstDraft,
  Icon24ImageToDesign,
  Icon24Instance,
  Icon24Interactive,
  Icon24Moon,
  Icon24Pencil,
  Icon24ReadyForDev,
  Icon24RemoveBackground,
  Icon24Rename,
  Icon24ReplaceContent,
  Icon24Reset,
  Icon24Rewrite,
  Icon24Settings,
  Icon24Shorten,
  Icon24Sun,
  Icon24Translate,
  Icon24VisualSearch,
  Icon24Wand,
} from '@figma/fpl-icons';
import type { TabConfig } from '@prototype/shared';

export const QUICK_ACTIONS_TABS: TabConfig[] = [
  {
    key: 'all',
    label: 'All',
    sections: [
      {
        title: 'Recents',
        items: [
          { id: 'preferences', icon: Icon24Settings, label: 'Preferences' },
          { id: 'mark-ready', icon: Icon24Check, label: 'Mark as ready' },
          { id: 'image-to-design', icon: Icon24ImageToDesign, label: 'Image to design' },
        ],
      },
      {
        title: 'Suggestions',
        items: [
          { id: 'rename', icon: Icon24Pencil, label: 'Rename selection' },
          { id: 'ai-assistant', icon: Icon24Wand, label: 'AI assistant', badge: 'New' },
          { id: 'create-component', icon: Icon24Instance, label: 'Create component' },
          { id: 'checklist', icon: Icon24Checklist, label: 'Design review checklist' },
          { id: 'mcp-toggle', label: 'Enable desktop MCP server', checkbox: true, defaultChecked: true },
        ],
      },
      {
        title: 'Image editing',
        items: [
          { id: 'remove-background', icon: Icon24RemoveBackground, label: 'Remove background', badge: 'AI' },
          { id: 'boost-resolution', icon: Icon24ExtendImage, label: 'Boost resolution' },
          { id: 'edit-image-prompt', icon: Icon24AiEdit, label: 'Edit image with prompt' },
        ],
      },
      {
        title: 'Design tools',
        items: [
          { id: 'rename-layers', icon: Icon24Rename, label: 'Rename layers' },
          { id: 'replace-content', icon: Icon24ReplaceContent, label: 'Replace content' },
          { id: 'search-image-selection', icon: Icon24VisualSearch, label: 'Search with image or selection' },
          { id: 'first-draft', icon: Icon24FirstDraft, label: 'First Draft' },
          { id: 'add-interactions', icon: Icon24Interactive, label: 'Add interactions' },
          { id: 'check-designs', icon: Icon24ReadyForDev, label: 'Check designs', badge: 'New' },
        ],
      },
      {
        title: 'Riffing and writing',
        items: [
          { id: 'rewrite', icon: Icon24Rewrite, label: 'Rewrite this...' },
          { id: 'shorten', icon: Icon24Shorten, label: 'Shorten' },
          { id: 'translate', icon: Icon24Translate, label: 'Translate to...' },
        ],
      },
      {
        title: 'Theme',
        items: [
          { id: 'theme-light', icon: Icon24Sun, label: 'Switch to light mode' },
          { id: 'theme-dark', icon: Icon24Moon, label: 'Switch to dark mode' },
          { id: 'theme-system', icon: Icon24Settings, label: 'Use system theme' },
        ],
      },
      {
        title: 'Canvas',
        items: [
          { id: 'reset-canvas', icon: Icon24Reset, label: 'Reset canvas' },
        ],
      },
    ],
  },
  {
    key: 'assets',
    label: 'Assets',
    sections: [],
    emptyMessage: 'No recent assets',
  },
  {
    key: 'plugins',
    label: 'Plugins & widgets',
    sections: [],
    emptyMessage: 'No plugins installed',
  },
];
