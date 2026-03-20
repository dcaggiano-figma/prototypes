import { Button } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { Icon16ChevronDown } from '@figma/fpl-icons';
import type { ModelOption } from './types';

export interface ModelSelectorProps {
  options: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  maxWidth?: number;
}

export function ModelSelector({
  options,
  value,
  onChange,
  maxWidth,
}: ModelSelectorProps) {
  const modelMenu = MenuV2.useMenu();
  const selectedLabel = options.find((m) => m.value === value)?.label ?? 'Default';

  return (
    <>
      <Button
        aria-label="Select model"
        variant="ghost"
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...modelMenu.getTriggerProps()}
      >
        <span className="flex items-center gap-4px">
          <span className={maxWidth ? `truncate` : undefined} style={maxWidth ? { maxWidth } : undefined}>
            {selectedLabel}
          </span>
          <span className="flex-shrink w-12px"><Icon16ChevronDown /></span>
        </span>
      </Button>
      <MenuV2.Root manager={modelMenu.manager}>
        <MenuV2.RadioGroup
          title="Select model"
          value={value}
          onChange={(v) => onChange(v as string)}
        >
          {options.map((model) => (
            <MenuV2.RadioGroupItem key={model.value} value={model.value} disabled={model.disabled}>
              <span>
                {model.label}
                <MenuV2.SubText>{model.description}</MenuV2.SubText>
              </span>
            </MenuV2.RadioGroupItem>
          ))}
        </MenuV2.RadioGroup>
      </MenuV2.Root>
    </>
  );
}
