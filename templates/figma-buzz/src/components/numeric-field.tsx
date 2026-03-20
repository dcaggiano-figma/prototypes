import { ScrubbableInput, type Formatter } from '@figma/fpl-components';

import {
  PixelFormatter,
  PositivePixelFormatter,
  PercentageFormatter,
  OpacityFormatter,
  type MixedNumberFormatter,
} from '@prototype/shared/canvas';
import type { Mixed } from '@prototype/shared/scene-graph';

export const defaultFormatter = new PixelFormatter();
export const positiveFormatter = new PositivePixelFormatter();
export const percentFormatter = new PercentageFormatter();
export const opacityFormatter = new OpacityFormatter();

export interface NumericFieldChangeOpts {
  commit: boolean
}

export interface NumericFieldProps {
  label: string
  value: number | Mixed
  onChange: (value: number, opts: NumericFieldChangeOpts) => void
  formatter?: MixedNumberFormatter | Formatter.IncrementFormatter<number | Mixed, number>
  /** Override the default text icon with a custom React node */
  icon?: React.ReactNode
  /** Disable the input */
  disabled?: boolean
}

/** 24x24px box for a text-based icon character (X, Y, W, H, R, %, etc.) */
export function CharIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center w-24px h-24px text-bodyMd text-text-secondary">
      {children}
    </span>
  );
}

export function NumericField({
  label, value, onChange, formatter, icon, disabled,
}: NumericFieldProps) {
  const fmt = formatter ?? defaultFormatter;

  return (
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon>
        {icon ?? <CharIcon>{label}</CharIcon>}
      </ScrubbableInput.Icon>
      <ScrubbableInput.Field
        aria-label={label}
        value={value}
        formatter={fmt}
        onChange={(v, opts) => onChange(v, { commit: opts.commit })}
        disabled={disabled}
      />
    </ScrubbableInput.Root>
  );
}
