import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import { ButtonPrimitive } from '@figma/fpl-components';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavListItemDef {
  value: string;
  label: string;
  icon?: ComponentType;
  trailing?: ReactNode;
  trailingOnInteraction?: ReactNode;
}

interface NavListContext {
  value: string;
  onChange: (value: string) => void;
  size: 'md' | 'lg';
  selectedVariant: 'default' | 'highlighted';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NavListCtx = createContext<NavListContext | null>(null);

function useNavListContext() {
  const ctx = useContext(NavListCtx);
  if (!ctx) throw new Error('NavList.Item must be used inside NavList.Root');
  return ctx;
}

// ---------------------------------------------------------------------------
// Compound: Root
// ---------------------------------------------------------------------------

interface RootProps {
  value: string;
  onChange: (value: string) => void;
  size?: 'md' | 'lg';
  selectedVariant?: 'default' | 'highlighted';
  'aria-label': string;
  className?: string;
  children: ReactNode;
}

function Root({
  value,
  onChange,
  size = 'md',
  selectedVariant = 'default',
  'aria-label': ariaLabel,
  className,
  children,
}: RootProps) {
  return (
    <NavListCtx.Provider value={{ value, onChange, size, selectedVariant }}>
      <ul role="listbox" aria-label={ariaLabel} className={clsx('flex flex-col', size === 'lg' && 'gap-[1px]', className)}>
        {children}
      </ul>
    </NavListCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Compound: Item
// ---------------------------------------------------------------------------

interface ItemProps {
  value: string;
  icon?: ComponentType;
  label: string | ReactNode;
  trailing?: ReactNode;
  trailingOnInteraction?: ReactNode;
}

function Item({ value, icon: Icon, label, trailing, trailingOnInteraction }: ItemProps) {
  const ctx = useNavListContext();
  const isSelected = ctx.value === value;
  const hasIcon = !!Icon;

  return (
    <li
      role="option"
      aria-selected={isSelected}
      className={clsx('flex flex-col', ctx.size === 'md' && 'px-2 py-1')}
    >
      <ButtonPrimitive
        aria-label={typeof label === 'string' ? label : undefined}
        className={clsx(
          'group flex items-center gap-2 rounded-md text-bodyMd w-full cursor-pointer',
          hasIcon ? 'px-4px' : 'px-8px',
          ctx.size === 'lg' ? 'h-32px' : 'py-1',
          isSelected
            ? ctx.selectedVariant === 'highlighted'
              ? 'bg-bg-selected text-text text-bodyMdStrong'
              : 'bg-bg-secondary text-text text-bodyMdStrong'
            : 'text-text hover:bg-bg-hover',
        )}
        onClick={() => ctx.onChange(value)}
      >
        {Icon && <Icon />}
        <span className="flex-1 min-w-0 truncate text-left">{label}</span>
        {trailing && trailingOnInteraction && (
          <>
            <span className="group-hover:hidden group-focus-within:hidden">{trailing}</span>
            <span className="hidden group-hover:inline-flex group-focus-within:inline-flex">
              {trailingOnInteraction}
            </span>
          </>
        )}
        {trailing && !trailingOnInteraction && <span>{trailing}</span>}
      </ButtonPrimitive>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Data-driven component
// ---------------------------------------------------------------------------

interface NavListProps {
  value: string;
  onChange: (value: string) => void;
  size?: 'md' | 'lg';
  selectedVariant?: 'default' | 'highlighted';
  'aria-label': string;
  items: NavListItemDef[];
  className?: string;
}

function NavListDataDriven({
  value,
  onChange,
  size,
  selectedVariant,
  'aria-label': ariaLabel,
  items,
  className,
}: NavListProps) {
  return (
    <Root
      value={value}
      onChange={onChange}
      size={size}
      selectedVariant={selectedVariant}
      aria-label={ariaLabel}
      className={className}
    >
      {items.map((item) => (
        <Item
          key={item.value}
          value={item.value}
          icon={item.icon}
          label={item.label}
          trailing={item.trailing}
          trailingOnInteraction={item.trailingOnInteraction}
        />
      ))}
    </Root>
  );
}

// ---------------------------------------------------------------------------
// Export with compound sub-components attached
// ---------------------------------------------------------------------------

export const NavList = Object.assign(NavListDataDriven, {
  Root,
  Item,
});
