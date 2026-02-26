import type { ComponentType } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive, IconButton, Menu } from '@figma/fpl-components';
import {
  Icon24Page,
  Icon24TemplateLarge,
  Icon24Add,
  Icon24AiAssistant,
  Icon24Library,
  Icon24FigmaLarge,
} from '@figma/fpl-icons';
import { renderMenuItems, type MenuItemDef } from './menuTypes';

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
}

const navItems = [
  { Icon: Icon24Page, label: 'File', id: 'file' },
  { Icon: Icon24TemplateLarge, label: 'Templates', id: 'templates' },
  { Icon: Icon24Add, label: 'Assets', id: 'assets' },
  { Icon: Icon24AiAssistant, label: 'AI Chat', id: 'ai' },
];

const noop = () => {};

export function LeftRail({ activeItem, onItemChange }: LeftRailProps) {
  const mainMenu = Menu.useMenu();

  const menuItems: MenuItemDef[] = [
    { type: 'item', id: 'new', label: 'New FigJam file', onClick: noop },
    { type: 'separator' },
    { type: 'item', id: 'rename', label: 'Rename', onClick: noop },
    { type: 'item', id: 'duplicate', label: 'Duplicate', onClick: noop },
    { type: 'separator' },
    { type: 'item', id: 'export', label: 'Export...', onClick: noop },
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
