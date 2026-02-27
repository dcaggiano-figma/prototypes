import { useState } from 'react';
import { ButtonPrimitive, Input, Menu, Slider } from '@figma/fpl-components';
import { Icon16ChevronDown } from '@figma/fpl-icons';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DrawToolSecondaryToolbarProps {
  color: string;
  onColorChange: (color: string) => void;
  strokeWeight: number;
  onStrokeWeightChange: (weight: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DrawToolSecondaryToolbar({
  color,
  onColorChange,
  strokeWeight,
  onStrokeWeightChange,
}: DrawToolSecondaryToolbarProps) {
  const [strokeStyle, setStrokeStyle] = useState('solid');
  const strokeStyleMenu = Menu.useMenu();

  const handleWeightChange = (value: string) => {
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) {
      onStrokeWeightChange(num);
    }
  };

  return (
    <div className="flex items-center bg-bg rounded-lg shadow-300">
      {/* Left section: Color swatch + stroke weight */}
      <div className="flex items-center gap-2 p-2 border-r border-solid border-border">
        {/* Color swatch with native color picker */}
        {/* eslint-disable-next-line react/forbid-elements -- native color picker, no FPL equivalent */}
        <label
          className="relative flex-shrink-0 cursor-pointer overflow-hidden w-4 h-4 rounded border-bordertranslucent focus-within:ring-1 focus-within:ring-border-selected focus-within:ring-offset-1 focus-within:ring-offset-bg"
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: color }}
          />
          {/* eslint-disable-next-line react/forbid-elements -- native color picker, no FPL equivalent */}
          <input
            type="color"
            aria-label="Stroke color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </label>

        {/* Stroke weight input + slider */}
        <div className="w-[64px]">
          <Input
            aria-label="Stroke weight"
            value={String(strokeWeight)}
            onChange={handleWeightChange}
          />
        </div>
        <div className="w-[120px]">
          <Slider
            aria-label="Stroke weight"
            value={strokeWeight}
            onChange={onStrokeWeightChange}
            min={0}
            max={200}
            step={1}
            bigStep={10}
          />
        </div>
      </div>

      {/* Right section: Stroke style dropdown */}
      <div className="flex items-center p-2">
        <Menu.Root manager={strokeStyleMenu.manager}>
          <ButtonPrimitive
            aria-label="Stroke style"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-bg-hover cursor-pointer w-[100px]"
            {...strokeStyleMenu.getTriggerProps()}
          >
            <StrokeStylePreview style={strokeStyle} />
            <Icon16ChevronDown />
          </ButtonPrimitive>
          <Menu.Container>
            <Menu.RadioGroup title={<Menu.HiddenTitle>Stroke style</Menu.HiddenTitle>} value={strokeStyle} onChange={(value) => setStrokeStyle(value)}>
              <Menu.RadioGroupItem value="solid">Solid</Menu.RadioGroupItem>
              <Menu.RadioGroupItem value="dashed">Dashed</Menu.RadioGroupItem>
              <Menu.RadioGroupItem value="dotted">Dotted</Menu.RadioGroupItem>
            </Menu.RadioGroup>
          </Menu.Container>
        </Menu.Root>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stroke style preview
// ---------------------------------------------------------------------------

function StrokeStylePreview({ style }: { style: string }) {
  const dashArray =
    style === 'dashed' ? '6 4' : style === 'dotted' ? '2 3' : undefined;

  return (
    <svg width="80" height="8" viewBox="0 0 80 8" className="text-text">
      <line
        x1="0" y1="4" x2="80" y2="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
    </svg>
  );
}
