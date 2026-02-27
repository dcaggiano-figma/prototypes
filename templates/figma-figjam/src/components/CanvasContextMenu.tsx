import { useEffect, useRef } from 'react';
import { ButtonPrimitive, Menu } from '@figma/fpl-components';
import type { MenuItemDef } from './menuTypes';
import { renderMenuItems } from './menuTypes';

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'node' | 'canvas';
}

interface CanvasContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
}

function getNodeMenuItems(onClose: () => void): MenuItemDef[] {
  return [
    { type: 'item', id: 'copy', label: 'Copy', shortcut: '⌘C', onClick: onClose },
    { type: 'item', id: 'paste', label: 'Paste', shortcut: '⌘V', onClick: onClose },
    { type: 'item', id: 'paste-replace', label: 'Paste to replace', shortcut: '⇧⌘R', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'delete', label: 'Delete', shortcut: '⌫', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'copy-link', label: 'Copy link to section', shortcut: '⌘L', onClick: onClose },
    { type: 'item', id: 'copy-png', label: 'Copy as PNG', shortcut: '⇧⌘C', onClick: onClose },
    { type: 'item', id: 'export', label: 'Export selection...', shortcut: '⇧⌘E', onClick: onClose },
    { type: 'separator' },
    {
      type: 'submenu', id: 'move-to-page', label: 'Move to page', children: [
        { type: 'item', id: 'page-1', label: 'Page 1', onClick: onClose },
      ],
    },
    { type: 'item', id: 'bring-front', label: 'Bring to front', shortcut: ']', onClick: onClose },
    { type: 'item', id: 'send-back', label: 'Send to back', shortcut: '[', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'ungroup', label: 'Ungroup', shortcut: '⌘⌫', onClick: onClose },
    { type: 'item', id: 'set-thumbnail', label: 'Set as thumbnail', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'lock', label: 'Lock/Unlock', shortcut: '⇧⌘L', onClick: onClose },
    { type: 'item', id: 'unlock-all', label: 'Unlock all objects', shortcut: '⌥⇧⌘L', onClick: onClose },
    { type: 'separator' },
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
    { type: 'item', id: 'inspect', label: 'Inspect in FigmaScope', onClick: onClose },
    { type: 'item', id: 'print-test', label: 'Print as generated test code', onClick: onClose },
  ];
}

function getCanvasMenuItems(onClose: () => void): MenuItemDef[] {
  return [
    { type: 'item', id: 'paste', label: 'Paste', shortcut: '⌘V', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'unlock-all', label: 'Unlock all objects', shortcut: '⌥⇧⌘L', onClick: onClose },
    { type: 'separator' },
    { type: 'item', id: 'cursor-chat', label: 'Cursor chat', shortcut: '/', onClick: onClose },
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
    { type: 'item', id: 'publish-template', label: 'Publish template...', onClick: onClose },
  ];
}

export function CanvasContextMenu({ state, onClose }: CanvasContextMenuProps) {
  const { getTriggerProps, manager } = Menu.useMenu({
    onOpenChange: (open) => {
      if (!open) onClose();
    },
  });
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Open the menu after the trigger is positioned in the DOM
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      manager.setOpen(true);
    });
    return () => cancelAnimationFrame(id);
  }, [state.x, state.y, manager]);

  const items = state.type === 'node'
    ? getNodeMenuItems(onClose)
    : getCanvasMenuItems(onClose);

  return (
    <div data-preferred-theme="dark">
      <Menu.Root manager={manager}>
        <ButtonPrimitive
          ref={triggerRef}
          {...getTriggerProps()}
          style={{
            position: 'fixed',
            left: state.x,
            top: state.y,
            width: 1,
            height: 1,
            opacity: 0,
            overflow: 'hidden',
            padding: 0,
            border: 'none',
          }}
        >
          {'\u200B'}
        </ButtonPrimitive>
        <Menu.Container>
          {renderMenuItems(items)}
        </Menu.Container>
      </Menu.Root>
    </div>
  );
}
