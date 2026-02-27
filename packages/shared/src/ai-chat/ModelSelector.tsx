import { Button, Menu } from '@figma/fpl-components';
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
  const modelMenu = Menu.useMenu();
  const selectedLabel = options.find((m) => m.value === value)?.label ?? 'Default';

  return (
    <Menu.Root manager={modelMenu.manager}>
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
      <Menu.Container>
        <Menu.RadioGroup
          title={<Menu.Title>Select model</Menu.Title>}
          value={value}
          onChange={(v) => onChange(v as string)}
        >
          {options.map((model) => (
            <Menu.RadioGroupItem key={model.value} value={model.value}>
              <span>
                {model.label}
                <Menu.SubText>{model.description}</Menu.SubText>
              </span>
            </Menu.RadioGroupItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Container>
    </Menu.Root>
  );
}
