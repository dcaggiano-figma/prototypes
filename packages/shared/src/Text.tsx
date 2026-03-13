import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import clsx from 'clsx';

export type TextColor =
  // Base hierarchy
  | 'default'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  // Brand
  | 'brand'
  | 'brand-secondary'
  | 'brand-tertiary'
  // Danger
  | 'danger'
  | 'danger-secondary'
  | 'danger-tertiary'
  // Success
  | 'success'
  | 'success-secondary'
  | 'success-tertiary'
  // Warning
  | 'warning'
  | 'warning-secondary'
  | 'warning-tertiary'
  // "On" variants
  | 'onbrand'
  | 'onbrand-secondary'
  | 'onbrand-tertiary'
  | 'ondanger'
  | 'onsuccess'
  | 'onwarning'
  | 'ondisabled'
  | 'onselected'
  | 'onselected-secondary'
  | 'onselected-tertiary';

export type Truncate = boolean | 1 | 2 | 3 | 4 | 5 | 6;

export type TextSize = 'lg' | 'md' | 'sm';

export const colorClassMap: Record<TextColor, string> = {
  default: 'text-text',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  disabled: 'text-text-disabled',
  brand: 'text-text-brand',
  'brand-secondary': 'text-text-brand-secondary',
  'brand-tertiary': 'text-text-brand-tertiary',
  danger: 'text-text-danger',
  'danger-secondary': 'text-text-danger-secondary',
  'danger-tertiary': 'text-text-danger-tertiary',
  success: 'text-text-success',
  'success-secondary': 'text-text-success-secondary',
  'success-tertiary': 'text-text-success-tertiary',
  warning: 'text-text-warning',
  'warning-secondary': 'text-text-warning-secondary',
  'warning-tertiary': 'text-text-warning-tertiary',
  onbrand: 'text-text-onbrand',
  'onbrand-secondary': 'text-text-onbrand-secondary',
  'onbrand-tertiary': 'text-text-onbrand-tertiary',
  ondanger: 'text-text-ondanger',
  onsuccess: 'text-text-onsuccess',
  onwarning: 'text-text-onwarning',
  ondisabled: 'text-text-ondisabled',
  onselected: 'text-text-onselected',
  'onselected-secondary': 'text-text-onselected-secondary',
  'onselected-tertiary': 'text-text-onselected-tertiary',
};

const textSizeClassMap: Record<`${TextSize}-${boolean}`, string> = {
  'lg-false': 'text-bodyLg',
  'lg-true': 'text-bodyLgStrong',
  'md-false': 'text-bodyMd',
  'md-true': 'text-bodyMdStrong',
  'sm-false': 'text-bodySm',
  'sm-true': 'text-bodySmStrong',
};

export const truncateClassMap: Record<string, string> = {
  true: 'truncate',
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};

type TextElement = 'p' | 'span' | 'div' | 'label' | 'li' | 'code' | 'em' | 'strong';

const defaultTextElement: Record<TextSize, TextElement> = {
  lg: 'span',
  md: 'span',
  sm: 'span',
};

export interface TextProps extends ComponentPropsWithoutRef<'p'> {
  size?: TextSize;
  strong?: boolean;
  mono?: boolean;
  color?: TextColor;
  truncate?: Truncate;
  as?: TextElement;
}

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { size = 'md', strong = false, mono = false, color = 'default', truncate, as, className, ...rest },
  ref,
) {
  const Component = (as ?? (mono ? 'code' : defaultTextElement[size])) as ElementType;
  const sizeClass = mono ? 'text-codeSm' : textSizeClassMap[`${size}-${strong}`];
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
