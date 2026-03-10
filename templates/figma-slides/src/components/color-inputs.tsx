import { useCallback } from 'react';
import { Input } from '@figma/fpl-components';

import type { Color } from '../canvas';

export function rgbToHex(color: Color): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToRgb(hex: string): Color | null {
  const match = hex.match(/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/** 14x14 color chit centered in a 24x24 space, with a hidden native color picker */
export function ColorSwatch({ color, onChange }: { color: Color; onChange: (hex: string) => void }) {
  const hex = rgbToHex(color);
  return (
    // eslint-disable-next-line react/forbid-elements -- native color picker, no FPL equivalent
    <label
      className="relative flex-shrink-0 cursor-pointer overflow-hidden w-[14px] h-[14px] rounded-sm border border-bordertranslucent m-1"
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
      />
      {/* eslint-disable-next-line react/forbid-elements -- native color picker, no FPL equivalent */}
      <input
        type="color"
        className="absolute inset-0 opacity-0 cursor-pointer"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function HexInput({ color, onChange }: { color: Color; onChange: (hex: string) => void }) {
  const hex = rgbToHex(color).slice(1).toUpperCase();

  const handleChange = useCallback(
    (value: string) => {
      const val = value.replace('#', '');
      if (val.length === 6 && /^[0-9a-fA-F]{6}$/.test(val)) {
        onChange(`#${val}`);
      }
    },
    [onChange],
  );

  return (
    <Input
      aria-label="Hex color"
      value={hex}
      onChange={handleChange}
      maxLength={6}
    />
  );
}

/** Opacity input that displays 0-100 and converts to/from 0-1 range */
export function OpacityInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const displayValue = String(Math.round(value * 100));

  const handleChange = useCallback(
    (v: string) => {
      const num = parseInt(v, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        onChange(num);
      }
    },
    [onChange],
  );

  return (
    <Input
      aria-label="Opacity"
      value={displayValue}
      onChange={handleChange}
    />
  );
}

export function PercentSuffix() {
  return (
    <div className="w-[14px] text-bodyMd text-text-secondary">%</div>
  );
}
