import { type ComponentType } from 'react';
import { HiddenLegend, RadioLikePrimitive } from '@figma/fpl-components';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModeSwitcherOption {
  value: string;
  icon: ComponentType;
  label: string;
}

interface RootProps {
  value: string;
  onChange: (value: string) => void;
  legend: string;
  layout?: 'horizontal' | 'vertical';
  children: React.ReactNode;
}

interface OptionProps {
  value: string;
  'aria-label': string;
  children: NonNullable<React.ReactNode>;
}

// ---------------------------------------------------------------------------
// Compound components
// ---------------------------------------------------------------------------

function ModeSwitcherRoot({
  value,
  onChange,
  legend,
  layout = 'horizontal',
  children,
}: RootProps) {
  return (
    <RadioLikePrimitive.Root
      value={value}
      onChange={onChange}
      legend={<HiddenLegend>{legend}</HiddenLegend>}
      // eslint-disable-next-line @repo/no-arbitrary-value
      className={clsx(
        'bg-bg-secondary rounded-md p-[2px] [&>[data-radio-options-root]]:flex [&>[data-radio-options-root]]:gap-[2px]',
        layout === 'vertical'
          ? '[&>[data-radio-options-root]]:flex-col'
          : '[&>[data-radio-options-root]]:flex-row',
      )}
    >
      {children}
    </RadioLikePrimitive.Root>
  );
}

function Option({ value, 'aria-label': ariaLabel, children }: OptionProps) {
  return (
    <RadioLikePrimitive.Option
      value={value}
      aria-label={ariaLabel}
      className="flex items-center justify-center w-[28px] h-[28px] rounded-sm icon-secondary hover:bg-bg-transparent-hover has-[:checked]:bg-bg has-[:checked]:icon-brand has-[:checked]:shadow-100 has-[:focus-visible]:outline has-[:focus-visible]:outline-border-selected has-[:focus-visible]:-outline-offset-1"
    >
      {children}
    </RadioLikePrimitive.Option>
  );
}

// ---------------------------------------------------------------------------
// Data-driven component
// ---------------------------------------------------------------------------

interface ModeSwitcherProps {
  value: string;
  onChange: (value: string) => void;
  legend: string;
  layout?: 'horizontal' | 'vertical';
  options: ModeSwitcherOption[];
}

function ModeSwitcherDataDriven({
  value,
  onChange,
  legend,
  layout,
  options,
}: ModeSwitcherProps) {
  return (
    <ModeSwitcherRoot value={value} onChange={onChange} legend={legend} layout={layout}>
      {options.map((opt) => (
        <Option key={opt.value} value={opt.value} aria-label={opt.label}>
          <opt.icon />
        </Option>
      ))}
    </ModeSwitcherRoot>
  );
}

// ---------------------------------------------------------------------------
// Export with compound sub-components attached
// ---------------------------------------------------------------------------

export const ModeSwitcher = Object.assign(ModeSwitcherDataDriven, {
  Root: ModeSwitcherRoot,
  Option,
});
