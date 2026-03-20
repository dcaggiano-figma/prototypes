import type { ComponentType } from 'react';
import { ButtonGroup, ButtonPrimitive, IconButton } from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import { Icon16ChevronDown } from '@figma/fpl-icons';
import type { SubTool } from './types';

interface ToolButtonProps {
  id: string;
  Icon: ComponentType;
  label: string;
  activeTool: string;
  /** The last sub-tool selected for this group (persists across group switches). */
  selectedSubToolId?: string;
  subTools?: SubTool[];
  onSelectTool: (id: string) => void;
}

export function ToolButton({ id, Icon, label, activeTool, selectedSubToolId, subTools, onSelectTool }: ToolButtonProps) {
  const { getTriggerProps, manager } = MenuV2.useMenu();

  // Determine if this button group owns the active tool
  const activeSubTool = subTools?.find((st) => st.id === activeTool);
  const isActive = subTools ? activeSubTool != null : activeTool === id;

  // The remembered sub-tool for display (even when this group isn't active)
  const rememberedSubTool = subTools?.find((st) => st.id === selectedSubToolId);

  // Show the active sub-tool's icon, then the remembered selection, then the default
  const DisplayIcon = activeSubTool?.LargeIcon ?? activeSubTool?.Icon
    ?? rememberedSubTool?.LargeIcon ?? rememberedSubTool?.Icon
    ?? Icon;

  const variant = isActive ? 'primary' : 'ghost';

  // Clicking main button: re-activate the remembered sub-tool for this group,
  // falling back to the first sub-tool (or own id if no sub-tools).
  const handleMainClick = () => {
    if (activeSubTool) {
      onSelectTool(activeSubTool.id);
    } else if (rememberedSubTool) {
      onSelectTool(rememberedSubTool.id);
    } else if (subTools && subTools.length > 0) {
      onSelectTool(subTools[0].id);
    } else {
      onSelectTool(id);
    }
  };

  if (subTools) {
    return (
      <>
        <ButtonGroup aria-label={label}>
          <div className="rounded-md overflow-hidden">
            <IconButton
              size="lg"
              aria-label={label}
              variant={variant}
              onClick={handleMainClick}
            >
              <DisplayIcon />
            </IconButton>
          </div>
          <ButtonPrimitive
            {...getTriggerProps()}
            className="hover:bg-bg-hover active:bg-bg-pressed rounded-md overflow-hidden w-3 h-5"
          >
            <Icon16ChevronDown />
          </ButtonPrimitive>
        </ButtonGroup>
        <MenuV2.Root manager={manager}>
          <MenuV2.RadioGroup
            title={label}
            value={activeTool}
            onChange={onSelectTool}
          >
            {subTools.map((st) => (
              <MenuV2.RadioGroupItem
                key={st.id}
                value={st.id}
                lead={<st.Icon />}
                trail={st.shortcut ? <MenuV2.Shortcut>{st.shortcut}</MenuV2.Shortcut> : undefined}
              >
                {st.label}
              </MenuV2.RadioGroupItem>
            ))}
          </MenuV2.RadioGroup>
        </MenuV2.Root>
      </>
    );
  }

  return (
    <IconButton
      size="lg"
      aria-label={label}
      variant={variant}
      onClick={handleMainClick}
    >
      <DisplayIcon />
    </IconButton>
  );
}
