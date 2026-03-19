import { createContext, useContext, type ComponentType } from 'react';
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

export type ModeSwitcherVariant = 'primary' | 'secondary';

interface RootProps {
  value: string;
  onChange: (value: string) => void;
  legend: string;
  layout?: 'horizontal' | 'vertical';
  variant?: ModeSwitcherVariant;
  children: React.ReactNode;
}

interface OptionProps {
  value: string;
  'aria-label': string;
  variant?: ModeSwitcherVariant;
  children: NonNullable<React.ReactNode>;
}

// ---------------------------------------------------------------------------
// Context for variant propagation
// ---------------------------------------------------------------------------

const VariantContext = createContext<ModeSwitcherVariant>('primary');

// ---------------------------------------------------------------------------
// Compound components
// ---------------------------------------------------------------------------

function ModeSwitcherRoot({
  value,
  onChange,
  legend,
  layout = 'horizontal',
  variant = 'primary',
  children,
}: RootProps) {
  return (
    <VariantContext.Provider value={variant}>
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
    </VariantContext.Provider>
  );
}

function Option({ value, 'aria-label': ariaLabel, variant: variantProp, children }: OptionProps) {
  const contextVariant = useContext(VariantContext);
  const variant = variantProp ?? contextVariant;

  return (
    <RadioLikePrimitive.Option
      value={value}
      aria-label={ariaLabel}
      className={clsx(
        'flex items-center justify-center w-[28px] h-[28px] rounded-sm hover:bg-bg-transparent-hover has-[:checked]:bg-bg has-[:checked]:shadow-100 has-[:focus-visible]:outline has-[:focus-visible]:outline-border-selected has-[:focus-visible]:-outline-offset-1',
        variant === 'secondary'
          ? 'icon-secondary has-[:checked]:icon'
          : 'icon-secondary has-[:checked]:icon-brand',
      )}
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
  variant?: ModeSwitcherVariant;
  options: ModeSwitcherOption[];
}

function ModeSwitcherDataDriven({
  value,
  onChange,
  legend,
  layout,
  variant,
  options,
}: ModeSwitcherProps) {
  return (
    <ModeSwitcherRoot value={value} onChange={onChange} legend={legend} layout={layout} variant={variant}>
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
