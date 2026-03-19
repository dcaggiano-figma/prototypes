import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import type { TextSize } from './Text';

const sizeClassMap: Record<TextSize, string> = {
  lg: 'text-bodyLg',
  md: 'text-bodyMd',
  sm: 'text-bodySm',
};

const spacingMap: Record<TextSize, string> = {
  lg: 'gap-2.5',
  md: 'gap-2',
  sm: 'gap-1',
};

const ListSizeContext = createContext<TextSize>('md');

export interface UnorderedListProps extends ComponentPropsWithoutRef<'ul'> {
  size?: TextSize;
  secondary?: boolean;
}

export interface OrderedListProps extends ComponentPropsWithoutRef<'ol'> {
  size?: TextSize;
  secondary?: boolean;
}

export interface ListItemProps extends ComponentPropsWithoutRef<'li'> {}

export const UnorderedList = forwardRef<HTMLUListElement, UnorderedListProps>(function UnorderedList(
  { size = 'md', secondary = false, className, children, ...rest },
  ref,
) {
  return (
    <ListSizeContext.Provider value={size}>
      <ul
        ref={ref}
        className={clsx(
          'flex flex-col pl-3 list-disc',
          secondary && 'text-text-secondary',
          spacingMap[size],
          className,
        )}
        {...rest}
      >
        {children}
      </ul>
    </ListSizeContext.Provider>
  );
});

export const OrderedList = forwardRef<HTMLOListElement, OrderedListProps>(function OrderedList(
  { size = 'md', secondary = false, className, children, ...rest },
  ref,
) {
  return (
    <ListSizeContext.Provider value={size}>
      <ol
        ref={ref}
        className={clsx(
          'flex flex-col pl-3 list-decimal',
          secondary && 'text-text-secondary',
          spacingMap[size],
          className,
        )}
        {...rest}
      >
        {children}
      </ol>
    </ListSizeContext.Provider>
  );
});

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { className, ...rest },
  ref,
) {
  const size = useContext(ListSizeContext);
  return (
    <li
      ref={ref}
      className={clsx('pl-1 last:mb-0', sizeClassMap[size], className)}
      {...rest}
    />
  );
});
