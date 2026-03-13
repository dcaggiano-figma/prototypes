import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import clsx from 'clsx';
import { colorClassMap, truncateClassMap, type TextColor, type Truncate } from './Text';

export type HeadingSize = 'display' | 'lg' | 'md' | 'sm';

type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';

const headingSizeClassMap: Record<HeadingSize, string> = {
  display: 'text-headingDisplay',
  lg: 'text-headingLg',
  md: 'text-headingMd',
  sm: 'text-headingSm',
};

const headingDefaultElement: Record<HeadingSize, HeadingElement> = {
  display: 'h1',
  lg: 'h1',
  md: 'h2',
  sm: 'h3',
};

export interface HeadingProps extends ComponentPropsWithoutRef<'h1'> {
  size?: HeadingSize;
  color?: TextColor;
  truncate?: Truncate;
  as?: HeadingElement;
}

export const Heading = forwardRef<HTMLElement, HeadingProps>(function Heading(
  { size = 'md', color = 'default', truncate, as, className, ...rest },
  ref,
) {
  const Component = (as ?? headingDefaultElement[size]) as ElementType;
  const sizeClass = headingSizeClassMap[size];
  const colorClass = colorClassMap[color];
  const truncateClass = truncate != null ? truncateClassMap[String(truncate)] : undefined;

  return (
    <Component
      ref={ref}
      className={clsx(sizeClass, colorClass, truncateClass, className)}
      {...rest}
    />
  );
});
