import type { MenuItemDef } from './menuTypes';

export function getNodeMenuItems(onClose: () => void): MenuItemDef[] {
  return [
    { type: 'item', id: 'copy', label: 'Copy', shortcut: '⌘C', onClick: onClose },
    { type: 'item', id: 'paste-here', label: 'Paste here', shortcut: '⌘V', onClick: onClose },
    { type: 'item', id: 'paste-replace', label: 'Paste to replace', shortcut: '⇧⌘R', onClick: onClose },
    {
      type: 'submenu', id: 'copy-paste-as', label: 'Copy/Paste as', children: [
        { type: 'item', id: 'copy-png', label: 'Copy as PNG', shortcut: '⇧⌘C', onClick: onClose },
        { type: 'item', id: 'copy-svg', label: 'Copy as SVG', onClick: onClose },
        { type: 'item', id: 'copy-css', label: 'Copy as CSS', onClick: onClose },
      ],
    },
    { type: 'item', id: 'send-to-make', label: 'Send to Figma Make', onClick: onClose },
    { type: 'item', id: 'find-similar', label: 'Find similar designs', onClick: onClose },
    { type: 'item', id: 'check-designs', label: 'Check designs', onClick: onClose },
    { type: 'separator' },
    {
      type: 'submenu', id: 'move-to-page', label: 'Move to page', children: [
        { type: 'item', id: 'page-1', label: 'Page 1', onClick: onClose },
      ],
    },
    { type: 'item', id: 'bring-front', label: 'Bring to front', shortcut: ']', onClick: onClose },
    { type: 'item', id: 'send-back', label: 'Send to back', shortcut: '[', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'convert-section', label: 'Convert to section', onClick: onClose },
    { type: 'item', id: 'frame', label: 'Frame selection', shortcut: '⌥⌘G', onClick: onClose },
    { type: 'item', id: 'use-mask', label: 'Use as mask', shortcut: '⌃⌘M', onClick: onClose },
    { type: 'item', id: 'set-thumbnail', label: 'Set as thumbnail', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'auto-layout', label: 'Add auto layout', shortcut: '⇧A', onClick: onClose },
    {
      type: 'submenu', id: 'more-layout', label: 'More layout options', children: [
        { type: 'item', id: 'absolute', label: 'Absolute position', onClick: onClose },
        { type: 'item', id: 'constraints', label: 'Constraints', onClick: onClose },
      ],
    },
    { type: 'item', id: 'create-component', label: 'Create component', shortcut: '⌥⌘K', onClick: onClose },
    { type: 'item', id: 'create-prototype', label: 'Create make prototype', onClick: onClose },
    {
      type: 'submenu', id: 'plugins', label: 'Plugins', children: [
        { type: 'item', id: 'run-last-plugin', label: 'Run last plugin', onClick: onClose },
      ],
    },
    {
      type: 'submenu', id: 'widgets', label: 'Widgets', children: [
        { type: 'item', id: 'browse-widgets', label: 'Browse widgets', onClick: onClose },
      ],
    },
    { type: 'separator' },
    { type: 'item', id: 'show-hide', label: 'Show/Hide', shortcut: '⇧⌘H', onClick: onClose },
    { type: 'item', id: 'lock', label: 'Lock/Unlock', shortcut: '⇧⌘L', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'flip-h', label: 'Flip horizontal', shortcut: '⇧H', onClick: onClose },
    { type: 'item', id: 'flip-v', label: 'Flip vertical', shortcut: '⇧V', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'inspect', label: 'Inspect in FigmaScope', onClick: onClose },
    { type: 'item', id: 'print-test', label: 'Print as generated test code', onClick: onClose },
  ];
}

export function getCanvasMenuItems(onClose: () => void): MenuItemDef[] {
  return [
    { type: 'item', id: 'paste', label: 'Paste here', shortcut: '⌘V', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'show-hide-ui', label: 'Show/Hide UI', shortcut: '⌘\\', onClick: onClose },
    { type: 'item', id: 'show-hide-comments', label: 'Show/Hide comments', shortcut: '⇧C', onClick: onClose },
    { type: 'item', id: 'actions', label: 'Actions...', shortcut: '⌘K', onClick: onClose },
    {
      type: 'submenu', id: 'plugins', label: 'Plugins', children: [
        { type: 'item', id: 'run-last-plugin', label: 'Run last plugin', onClick: onClose },
      ],
    },
    {
      type: 'submenu', id: 'widgets', label: 'Widgets', children: [
        { type: 'item', id: 'browse-widgets', label: 'Browse widgets', onClick: onClose },
      ],
    },
  ];
}
