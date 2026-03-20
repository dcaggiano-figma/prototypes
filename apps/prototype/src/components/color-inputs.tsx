import { useEffect, useMemo, useRef } from 'react';
import { FormattedInput, NumberFormatter, ScrubbableInput } from '@figma/fpl-components';
import type { Formatter } from '@figma/fpl-components';

import type { Color } from '../canvas';

// ── Hex utilities ────────────────────────────────────────────────────

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

// ── Color hex formatter ──────────────────────────────────────────────

interface ColorIncrementTargets extends Formatter.IncrementTargets {
  r?: boolean;
  g?: boolean;
  b?: boolean;
}

/**
 * Formatter for hex color values without a leading `#`.
 * Supports per-channel increment via cursor position (arrow up/down
 * increments just the R, G, or B channel based on where the cursor is).
 */
class ColorHexFormatter implements Formatter.IncrementFormatter<Color> {
  format(color: Color): string {
    const r = color.r.toString(16).padStart(2, '0');
    const g = color.g.toString(16).padStart(2, '0');
    const b = color.b.toString(16).padStart(2, '0');
    return `${r}${g}${b}`.toUpperCase();
  }

  parse(str: string): Color {
    const cleaned = str.replace(/^#/, '').trim();
    const color = hexToRgb(cleaned);
    if (!color) throw new Error('Invalid hex color');
    return color;
  }

  defaultSelection(str: string): Formatter.SelectionRange {
    return { start: 0, end: str.length };
  }

  isEqual(a: Color, b: Color): boolean {
    return a.r === b.r && a.g === b.g && a.b === b.b;
  }

  getNudgeAmount(big: boolean): number {
    return big ? 10 : 1;
  }

  incrementBy(
    color: Color,
    amount: number,
    incrementTargets: ColorIncrementTargets | null,
  ): Color {
    const result = { ...color };
    if (incrementTargets?.r) result.r += amount;
    if (incrementTargets?.g) result.g += amount;
    if (incrementTargets?.b) result.b += amount;
    return result;
  }

  clamp(color: Color): Color {
    return {
      r: Math.max(0, Math.min(255, Math.round(color.r))),
      g: Math.max(0, Math.min(255, Math.round(color.g))),
      b: Math.max(0, Math.min(255, Math.round(color.b))),
    };
  }

  /**
   * Determine which channel(s) to increment based on cursor position.
   * Without `#`, the layout is: RR GG BB (positions 0-1, 2-3, 4-5).
   */
  getIncrementTargets(_: string, range: Formatter.SelectionRange): ColorIncrementTargets {
    const { start, end } = range;
    const collapsed = start === end;
    const targets: ColorIncrementTargets = {};

    if (start <= 1 || (collapsed && start === 2)) targets.r = true;
    if ((start <= 3 && end > 2) || (collapsed && start === 4)) targets.g = true;
    if ((start <= 5 && end > 4) || (collapsed && start === 6)) targets.b = true;

    return targets;
  }

  /**
   * Return the selection range that covers the incremented channel(s).
   */
  getSelection(_: string, targets: ColorIncrementTargets | null): Formatter.SelectionRange {
    if (!targets) return { start: 0, end: 6 };

    let selStart = 0;
    let selEnd = 0;

    if (targets.r) selStart = 0;
    else if (targets.g) selStart = 2;
    else selStart = 4;

    if (targets.b) selEnd = 6;
    else if (targets.g) selEnd = 4;
    else selEnd = 2;

    return { start: selStart, end: selEnd };
  }
}

// ── Components ───────────────────────────────────────────────────────

/**
 * 14x14 color chit centered in a 24x24 space, with a hidden native color picker.
 *
 * Uses an uncontrolled input to avoid closing the native picker on re-render.
 * Setting `value` on a color input while the OS picker is open causes it to
 * close, so we only sync the value via ref when it changes externally.
 */
export function ColorSwatch({ color, onChange }: { color: Color; onChange: (color: Color) => void }) {
  const hex = rgbToHex(color);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync the input value when the color changes externally (e.g., hex input, undo)
  // without disrupting the native picker during drag.
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== hex) {
      inputRef.current.value = hex;
    }
  }, [hex]);

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
        ref={inputRef}
        type="color"
        className="absolute inset-0 opacity-0 cursor-pointer"
        defaultValue={hex}
        onChange={(e) => {
          const parsed = hexToRgb(e.target.value);
          if (parsed) onChange(parsed);
        }}
      />
    </label>
  );
}

export function HexInput({ color, onChange }: { color: Color; onChange: (color: Color) => void }) {
  const formatter = useMemo(() => new ColorHexFormatter(), []);

  return (
    <FormattedInput.Field<Color>
      aria-label="Hex color"
      formatter={formatter}
      value={color}
      onChange={(newColor) => onChange(newColor)}
    />
  );
}

/** Opacity input that displays 0-100 and converts to/from 0-1 range */
export function OpacityInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const formatter = useMemo(
    () => new NumberFormatter({ min: 0, max: 100, maximumFractionDigits: 0 }),
    [],
  );

  // Convert 0-1 → 0-100 for display, 0-100 → 0-1 on change
  const displayValue = Math.round(value * 100);

  return (
    <ScrubbableInput.Root>
      <ScrubbableInput.Field<number>
        aria-label="Opacity"
        formatter={formatter}
        value={displayValue}
        onChange={(v) => onChange(v / 100)}
      />
      <ScrubbableInput.Trigger>
        <span className="w-[14px] text-bodyMd text-text-secondary select-none text-left">%</span>
      </ScrubbableInput.Trigger>
    </ScrubbableInput.Root>
  );
}
