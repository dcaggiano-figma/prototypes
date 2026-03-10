import { HiddenLegend, RadioLikePrimitive } from '@figma/fpl-components';
import { Icon24FocusView, Icon24GridView } from '@figma/fpl-icons';
import clsx from 'clsx';

interface ViewSwitcherProps {
  value: 'asset' | 'grid';
  onChange: (value: 'asset' | 'grid') => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  const handleChange = (v: string) => {
    if (v === 'asset' || v === 'grid') {
      onChange(v);
    }
  };

  return (
    <RadioLikePrimitive.Root
      value={value}
      onChange={handleChange}
      legend={<HiddenLegend>View mode</HiddenLegend>}
      className="bg-bg-elevated rounded-full shadow-300 p-4px [&>[data-radio-options-root]]:flex [&>[data-radio-options-root]]:gap-4px"
    >
      <RadioLikePrimitive.Option
        value="asset"
        aria-label="Slide view"
        className={clsx(
          'flex items-center gap-4px pl-1 pr-2 h-[28px] rounded-full text-bodyMd cursor-default',
          'has-[:checked]:bg-bg-brand-tertiary has-[:checked]:shadow-100 has-[:checked]:text-text-brand has-[:checked]:icon-brand',
          'text-text-secondary icon-secondary hover:bg-bg-transparent-hover',
        )}
      >
        <Icon24FocusView />
        <span>Slide</span>
      </RadioLikePrimitive.Option>
      <RadioLikePrimitive.Option
        value="grid"
        aria-label="Grid view"
        className={clsx(
          'flex items-center gap-4px pl-1 pr-2 h-[28px] rounded-full text-bodyMd cursor-default',
          'has-[:checked]:bg-bg-brand-tertiary has-[:checked]:shadow-100 has-[:checked]:text-text-brand has-[:checked]:icon-brand',
          'text-text-secondary icon-secondary hover:bg-bg-transparent-hover',
        )}
      >
        <Icon24GridView />
        <span>Grid</span>
      </RadioLikePrimitive.Option>
    </RadioLikePrimitive.Root>
  );
}
