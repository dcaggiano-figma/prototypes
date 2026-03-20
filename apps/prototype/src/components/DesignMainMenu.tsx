import { useState } from 'react';
import { IconButton } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { Icon24FigmaLarge, Icon24SearchLarge } from '@figma/fpl-icons';
import type { MenuItemDef } from './menuTypes';
import { renderMenuItems } from './menuTypes';
import type { ThemeSetting } from '../helpers/theme';

interface DesignMainMenuProps {
  themeSetting: ThemeSetting;
  onThemeChange: (setting: ThemeSetting) => void;
  onOpenActions: () => void;
  onToggleMinimize?: () => void;
}

export function DesignMainMenu({ themeSetting, onThemeChange, onOpenActions, onToggleMinimize }: DesignMainMenuProps) {
  const mainMenu = MenuV2.useMenu();

  // Consolidated preferences state
  const [prefs, setPrefs] = useState({
    // View
    pixelGrid: true,
    showSlices: true,
    comments: true,
    annotations: true,
    additionalLabels: true,
    showUI: true,
    // Text
    showTextSuggestions: true,
    // Preferences
    snapToGeometry: true,
    snapToObjects: false,
    snapToPixelGrid: true,
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
    numberKeysOpacity: true,
    oldShortcutsOpacity: false,
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

  const noop = () => {};

  // -------------------------------------------------------------------------
  // Main menu data
  // -------------------------------------------------------------------------

  const menuItems: MenuItemDef[] = [
    { type: 'item', id: 'actions', label: 'Actions...', icon: Icon24SearchLarge, shortcut: '⌘K', onClick: onOpenActions },
    { type: 'separator' },

    // ── File ──────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'file', label: 'File', children: [
      { type: 'item', id: 'new-design', label: 'New Design', onClick: noop },
      { type: 'submenu', id: 'new', label: 'New', children: [
        { type: 'item', id: 'new-figjam', label: 'FigJam', onClick: noop },
        { type: 'item', id: 'new-slides', label: 'Slides', onClick: noop },
        { type: 'item', id: 'new-buzz', label: 'Buzz', onClick: noop },
        { type: 'item', id: 'new-site', label: 'Site', onClick: noop },
        { type: 'item', id: 'new-make', label: 'Make', onClick: noop },
        { type: 'separator' },
        { type: 'item', id: 'import-sketch', label: 'Import from Sketch', onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'place-image', label: 'Place image/video...', shortcut: '⌥⌘K', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'save-local', label: 'Save local copy...', onClick: noop },
      { type: 'item', id: 'save-version', label: 'Save to version history...', shortcut: '⌥⌘S', onClick: noop },
      { type: 'item', id: 'version-history', label: 'Show version history', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'export', label: 'Export...', shortcut: '⇧⌘E', onClick: noop },
      { type: 'item', id: 'export-pdf', label: 'Export frames to PDF...', onClick: noop },
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
        { type: 'item', id: 'copy-as-css', label: 'Copy as CSS', onClick: noop },
        { type: 'item', id: 'copy-link', label: 'Copy link', onClick: noop },
      ]},
      { type: 'item', id: 'paste-over', label: 'Paste over selection', shortcut: '⇧⌘V', onClick: noop },
      { type: 'item', id: 'paste-replace', label: 'Paste to replace', shortcut: '⇧⌘R', onClick: noop },
      { type: 'item', id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', onClick: noop },
      { type: 'item', id: 'delete', label: 'Delete', shortcut: '⌫', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'find', label: 'Find', shortcut: '⌘F', onClick: noop },
      { type: 'item', id: 'find-next', label: 'Find next', shortcut: '⇧⌘F', onClick: noop },
      { type: 'item', id: 'find-prev', label: 'Find previous', shortcut: '⇧⌘D', onClick: noop },
      { type: 'item', id: 'find-replace', label: 'Find and replace...', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'set-defaults', label: 'Set default properties', onClick: noop },
      { type: 'item', id: 'copy-props', label: 'Copy properties', shortcut: '⌥⌘C', onClick: noop },
      { type: 'item', id: 'paste-props', label: 'Paste properties', shortcut: '⌥⌘V', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'pick-color', label: 'Pick color', shortcut: '⌃C', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'select-all', label: 'Select all', shortcut: '⌘A', onClick: noop },
      { type: 'item', id: 'select-matching', label: 'Select matching layers', shortcut: '⌥⌘A', onClick: noop },
      { type: 'item', id: 'select-none', label: 'Select none', onClick: noop },
      { type: 'item', id: 'select-inverse', label: 'Select inverse', shortcut: '⇧⌘A', onClick: noop },
      { type: 'submenu', id: 'select-all-with', label: 'Select all with', children: [
        { type: 'item', id: 'select-same-fill', label: 'Same fill', onClick: noop },
        { type: 'item', id: 'select-same-stroke', label: 'Same stroke', onClick: noop },
        { type: 'item', id: 'select-same-effect', label: 'Same effect', onClick: noop },
        { type: 'item', id: 'select-same-text', label: 'Same text properties', onClick: noop },
        { type: 'item', id: 'select-same-font', label: 'Same font', onClick: noop },
        { type: 'item', id: 'select-same-instance', label: 'Same instance', onClick: noop },
      ]},
    ]},

    // ── View ──────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'view', label: 'View', children: [
      { type: 'checkbox', id: 'pixel-grid', label: 'Pixel grid', checked: prefs.pixelGrid, onChange: toggle('pixelGrid') },
      { type: 'item', id: 'layout-guides', label: 'Layout guides', shortcut: '⌥G', onClick: noop },
      { type: 'item', id: 'rulers', label: 'Rulers', onClick: noop },
      { type: 'separator' },
      { type: 'checkbox', id: 'show-slices', label: 'Show slices', checked: prefs.showSlices, onChange: toggle('showSlices') },
      { type: 'checkbox', id: 'comments', label: 'Comments', checked: prefs.comments, onChange: toggle('comments') },
      { type: 'checkbox', id: 'annotations', label: 'Annotations', checked: prefs.annotations, onChange: toggle('annotations') },
      { type: 'submenu', id: 'outlines', label: 'Outlines', children: [
        { type: 'item', id: 'show-outlines', label: 'Show outlines', onClick: noop },
        { type: 'item', id: 'hide-outlines', label: 'Hide outlines', onClick: noop },
      ]},
      { type: 'item', id: 'pixel-preview', label: 'Pixel preview', shortcut: '⇧⌘P', onClick: noop },
      { type: 'item', id: 'mask-outlines', label: 'Mask outlines', onClick: noop },
      { type: 'item', id: 'frame-outlines', label: 'Frame outlines', onClick: noop },
      { type: 'item', id: 'memory-usage', label: 'Memory usage', onClick: noop },
      { type: 'separator' },
      { type: 'checkbox', id: 'additional-labels', label: 'Additional labels', checked: prefs.additionalLabels, onChange: toggle('additionalLabels') },
      { type: 'item', id: 'minimize-ui', label: 'Minimize UI', shortcut: '⇧⌘\\', onClick: onToggleMinimize ?? noop },
      { type: 'checkbox', id: 'show-ui', label: 'Show/Hide UI', checked: prefs.showUI, onChange: toggle('showUI') },
      { type: 'item', id: 'multiplayer-cursors', label: 'Multiplayer cursors', shortcut: '⌥⌘\\', onClick: noop },
      { type: 'item', id: 'switch-draw', label: 'Switch to Draw', onClick: noop },
      { type: 'item', id: 'switch-dev', label: 'Switch to Dev Mode', shortcut: '⇧D', onClick: noop },
      { type: 'submenu', id: 'panels', label: 'Panels', children: [
        { type: 'item', id: 'layers-panel', label: 'Layers', onClick: noop },
        { type: 'item', id: 'assets-panel', label: 'Assets', onClick: noop },
        { type: 'item', id: 'design-panel', label: 'Design', onClick: noop },
        { type: 'item', id: 'prototype-panel', label: 'Prototype', onClick: noop },
        { type: 'item', id: 'inspect-panel', label: 'Inspect', onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'zoom-in', label: 'Zoom in', shortcut: '⌘+', onClick: noop },
      { type: 'item', id: 'zoom-out', label: 'Zoom out', shortcut: '⌘−', onClick: noop },
      { type: 'item', id: 'zoom-100', label: 'Zoom to 100%', shortcut: '⌘0', onClick: noop },
      { type: 'item', id: 'zoom-fit', label: 'Zoom to fit', onClick: noop },
      { type: 'item', id: 'zoom-selection', label: 'Zoom to selection', shortcut: '⇧2', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'prev-page', label: 'Previous page', shortcut: 'fn↑', onClick: noop },
      { type: 'item', id: 'next-page', label: 'Next page', shortcut: 'fn↓', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'zoom-prev-frame', label: 'Zoom to previous frame', shortcut: '⌥N', onClick: noop },
      { type: 'item', id: 'zoom-next-frame', label: 'Zoom to next frame', shortcut: 'N', onClick: noop },
      { type: 'item', id: 'find-prev-frame', label: 'Find previous frame', shortcut: 'Home', onClick: noop },
      { type: 'item', id: 'find-next-frame', label: 'Find next frame', shortcut: 'End', onClick: noop },
    ]},

    // ── Object ────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'object', label: 'Object', children: [
      { type: 'item', id: 'frame-selection', label: 'Frame selection', shortcut: '⌥⌘G', onClick: noop },
      { type: 'item', id: 'group', label: 'Group selection', shortcut: '⌘G', onClick: noop },
      { type: 'item', id: 'ungroup', label: 'Ungroup selection', shortcut: '⇧⌘G', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'wrap-section', label: 'Wrap in new section', shortcut: '⌘S', onClick: noop },
      { type: 'item', id: 'convert-section', label: 'Convert to section', onClick: noop },
      { type: 'item', id: 'convert-frame', label: 'Convert to frame', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'use-mask', label: 'Use as mask', shortcut: '⌥⌘M', onClick: noop },
      { type: 'item', id: 'restore-thumb', label: 'Restore default thumbnail', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'add-auto-layout', label: 'Add auto layout', shortcut: '⌥A', disabled: true, onClick: noop },
      { type: 'submenu', id: 'more-layout', label: 'More layout options', children: [
        { type: 'item', id: 'add-grid', label: 'Add grid', onClick: noop },
        { type: 'item', id: 'add-columns', label: 'Add columns', onClick: noop },
        { type: 'item', id: 'add-rows', label: 'Add rows', onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'create-component', label: 'Create component', shortcut: '⌥⌘K', onClick: noop },
      { type: 'item', id: 'make-from-design', label: 'Make from design', disabled: true, onClick: noop },
      { type: 'submenu', id: 'slots', label: 'Slots', children: [
        { type: 'item', id: 'add-slot', label: 'Add slot', onClick: noop },
      ]},
      { type: 'item', id: 'reset-instance', label: 'Reset instance', disabled: true, onClick: noop },
      { type: 'item', id: 'detach-instance', label: 'Detach instance', shortcut: '⌥⌘B', onClick: noop },
      { type: 'submenu', id: 'main-component', label: 'Main component', children: [
        { type: 'item', id: 'go-to-main', label: 'Go to main component', onClick: noop },
        { type: 'item', id: 'push-changes', label: 'Push changes to main component', onClick: noop },
        { type: 'item', id: 'restore-main', label: 'Restore main component', onClick: noop },
      ]},
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
      { type: 'item', id: 'flatten', label: 'Flatten', shortcut: '⌥⇧F', onClick: noop },
      { type: 'item', id: 'outline-stroke', label: 'Outline stroke', shortcut: '⌥⌘O', onClick: noop },
      { type: 'submenu', id: 'boolean-groups', label: 'Boolean groups', children: [
        { type: 'item', id: 'union', label: 'Union selection', onClick: noop },
        { type: 'item', id: 'subtract', label: 'Subtract selection', onClick: noop },
        { type: 'item', id: 'intersect', label: 'Intersect selection', onClick: noop },
        { type: 'item', id: 'exclude', label: 'Exclude selection', onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'show-hide-sel', label: 'Show/Hide selection', shortcut: '⇧⌘H', onClick: noop },
      { type: 'item', id: 'lock-unlock-sel', label: 'Lock/Unlock selection', shortcut: '⇧⌘L', onClick: noop },
      { type: 'item', id: 'hide-others', label: 'Hide other layers', disabled: true, onClick: noop },
      { type: 'item', id: 'collapse-layers', label: 'Collapse layers', shortcut: '⌥L', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'remove-fill', label: 'Remove fill', shortcut: '⌥/', onClick: noop },
      { type: 'item', id: 'remove-stroke', label: 'Remove stroke', shortcut: '⇧/', onClick: noop },
      { type: 'item', id: 'swap-fill-stroke', label: 'Swap fill and stroke', shortcut: '⇧X', onClick: noop },
      { type: 'item', id: 'remove-interactions', label: 'Remove interactions', onClick: noop },
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
      { type: 'item', id: 'text-direction', label: 'Text direction', onClick: noop },
      { type: 'separator' },
      { type: 'submenu', id: 'spell-check', label: 'Spell check', children: [
        { type: 'item', id: 'check-spelling', label: 'Check spelling', onClick: noop },
      ]},
      { type: 'checkbox', id: 'show-text-suggestions', label: 'Show text suggestions', checked: prefs.showTextSuggestions, onChange: toggle('showTextSuggestions') },
    ]},

    // ── Arrange ───────────────────────────────────────────────────────────
    { type: 'submenu', id: 'arrange', label: 'Arrange', children: [
      { type: 'item', id: 'round-pixel', label: 'Round to pixel', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'align-left', label: 'Align left', shortcut: '⌥A', onClick: noop },
      { type: 'item', id: 'align-hcenter', label: 'Align horizontal centers', shortcut: '⌥H', onClick: noop },
      { type: 'item', id: 'align-right', label: 'Align right', shortcut: '⌥D', onClick: noop },
      { type: 'item', id: 'align-top', label: 'Align top', shortcut: '⌥W', onClick: noop },
      { type: 'item', id: 'align-vcenter', label: 'Align vertical centers', shortcut: '⌥V', onClick: noop },
      { type: 'item', id: 'align-bottom', label: 'Align bottom', shortcut: '⌥S', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'tidy-up', label: 'Tidy up', shortcut: '⌃⌥T', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'pack-h', label: 'Pack horizontal', onClick: noop },
      { type: 'item', id: 'pack-v', label: 'Pack vertical', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'distribute-h', label: 'Distribute horizontal spacing', shortcut: '⌃⌥H', onClick: noop },
      { type: 'item', id: 'distribute-v', label: 'Distribute vertical spacing', shortcut: '⌃⌥V', onClick: noop },
      { type: 'separator' },
      { type: 'item', id: 'distribute-left', label: 'Distribute left', onClick: noop },
      { type: 'item', id: 'distribute-hcenter', label: 'Distribute horizontal centers', onClick: noop },
      { type: 'item', id: 'distribute-right', label: 'Distribute right', onClick: noop },
      { type: 'item', id: 'distribute-top', label: 'Distribute top', onClick: noop },
      { type: 'item', id: 'distribute-vcenter', label: 'Distribute vertical centers', onClick: noop },
      { type: 'item', id: 'distribute-bottom', label: 'Distribute bottom', onClick: noop },
    ]},

    // ── Vector ────────────────────────────────────────────────────────────
    { type: 'submenu', id: 'vector', label: 'Vector', children: [
      { type: 'item', id: 'join', label: 'Join selection', shortcut: '⌘J', onClick: noop },
      { type: 'item', id: 'smooth', label: 'Smooth join selection', shortcut: '⇧⌘J', onClick: noop },
      { type: 'item', id: 'delete-heal', label: 'Delete and heal selection', shortcut: '⇧⌫', onClick: noop },
      { type: 'item', id: 'split-vector', label: 'Split vector', onClick: noop },
    ]},

    { type: 'separator' },

    // ── Plugins ───────────────────────────────────────────────────────────
    { type: 'submenu', id: 'plugins', label: 'Plugins', children: [
      { type: 'title', id: 'plugins-recents-title', label: 'Recents' },
      { type: 'item', id: 'plugin-paletto', label: 'Paletto – oklch palette generator', onClick: noop },
      { type: 'submenu', id: 'plugin-syntax', label: 'Make Syntax Highlighter', children: [
        { type: 'item', id: 'syntax-run', label: 'Run', onClick: noop },
      ]},
      { type: 'submenu', id: 'plugin-a11y', label: 'A11y – Color Contrast Checker', children: [
        { type: 'item', id: 'a11y-run', label: 'Run', onClick: noop },
      ]},
      { type: 'item', id: 'plugin-contrast', label: 'Contrast', onClick: noop },
      { type: 'item', id: 'plugin-color-blind', label: 'Color Blind', onClick: noop },
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
      { type: 'item', id: 'widget-asana-staging', label: 'Asana Staging', onClick: noop },
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
      { type: 'checkbox', id: 'snap-pixel-grid', label: 'Snap to pixel grid', checked: prefs.snapToPixelGrid, onChange: toggle('snapToPixelGrid') },
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
      { type: 'checkbox', id: 'number-keys-opacity', label: 'Use number keys for opacity', checked: prefs.numberKeysOpacity, onChange: toggle('numberKeysOpacity') },
      { type: 'checkbox', id: 'old-shortcuts-opacity', label: 'Use old shortcuts for opacity', checked: prefs.oldShortcutsOpacity, onChange: toggle('oldShortcutsOpacity') },
      { type: 'separator' },
      { type: 'checkbox', id: 'play-audio-ai', label: 'Play audio notifications in AI chat', checked: prefs.playAudioAI, onChange: toggle('playAudioAI') },
      { type: 'checkbox', id: 'open-links-desktop', label: 'Open links in desktop app', checked: prefs.openLinksDesktop, onChange: toggle('openLinksDesktop') },
      { type: 'checkbox', id: 'show-text-suggestions-pref', label: 'Show text suggestions', checked: prefs.showTextSuggestions, onChange: toggle('showTextSuggestions') },
      { type: 'checkbox', id: 'show-tool-suggestions', label: 'Show tool suggestions', checked: prefs.showToolSuggestions, onChange: toggle('showToolSuggestions') },
      { type: 'checkbox', id: 'show-ai-chat-canvas', label: 'Show AI chat on canvas', checked: prefs.showAIChatCanvas, onChange: toggle('showAIChatCanvas') },
      { type: 'separator' },
      { type: 'checkbox', id: 'scroll-wheel-zoom', label: 'Use scroll wheel zoom', checked: prefs.scrollWheelZoom, onChange: toggle('scrollWheelZoom') },
      { type: 'checkbox', id: 'right-click-drag', label: 'Right-click and drag to pan', checked: prefs.rightClickDragPan, onChange: toggle('rightClickDragPan') },
      { type: 'separator' },
      { type: 'submenu', id: 'theme', label: 'Theme', children: [
        { type: 'radiogroup', id: 'theme-radio', value: themeSetting, onChange: (v) => onThemeChange(v as ThemeSetting), options: [
          { id: 'light', label: 'Light' },
          { id: 'dark', label: 'Dark' },
          { id: 'system', label: 'System' },
        ]},
      ]},
      { type: 'submenu', id: 'labs', label: 'Labs', children: [
        { type: 'item', id: 'labs-placeholder', label: 'No labs available', disabled: true, onClick: noop },
      ]},
      { type: 'separator' },
      { type: 'item', id: 'color-profile', label: 'Color profile...', onClick: noop },
      { type: 'item', id: 'keyboard-layout', label: 'Keyboard layout...', onClick: noop },
      { type: 'item', id: 'accessibility', label: 'Accessibility settings...', onClick: noop },
      { type: 'item', id: 'nudge-amount', label: 'Nudge amount...', onClick: noop },
    ]},

    { type: 'item', id: 'libraries', label: 'Libraries', onClick: noop },

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
    <>
      <IconButton size="lg" aria-label="Main menu" {...mainMenu.getTriggerProps()}>
        <Icon24FigmaLarge />
      </IconButton>
      <MenuV2.Root manager={mainMenu.manager}>
        {renderMenuItems(menuItems)}
      </MenuV2.Root>
    </>
  );
}
