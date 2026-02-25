import { HiddenLegend, RadioLikePrimitive } from '@figma/fpl-components';
import clsx from 'clsx';

interface ModeSwitcherProps {
  value: string;
  onChange: (value: string) => void;
  legend: string;
  layout?: 'horizontal' | 'vertical';
  children: React.ReactNode;
}

function ModeSwitcherRoot({
  value,
  onChange,
  legend,
  layout = 'horizontal',
  children,
}: ModeSwitcherProps) {
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

interface OptionProps {
  value: string;
  'aria-label': string;
  children: NonNullable<React.ReactNode>;
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

export const ModeSwitcher = Object.assign(ModeSwitcherRoot, { Option });
