import { useMemo } from 'react';
import { ScrubbableInput, type Formatter } from '@figma/fpl-components';

import {
  PixelFormatter,
  PositivePixelFormatter,
  PercentageFormatter,
  OpacityFormatter,
  MixedNumberFormatter,
  type MixedChangeHandler,
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
  /**
   * Handler for per-node mixed operations (scrubbing and math expressions).
   * When provided and the value is MIXED, scrub deltas and math expressions
   * are applied to each node's individual value instead of clobbering.
   */
  onMixedChange?: MixedChangeHandler
  /** Optional trailing action rendered inside the input root (e.g. keyframe toggle) */
  trailingAction?: React.ReactNode
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
  label, value, onChange, formatter, icon, disabled, onMixedChange, trailingAction,
}: NumericFieldProps) {
  const baseFmt = formatter ?? defaultFormatter;

  // Create a per-instance formatter with the mixed handler wired up.
  // Uses Object.create so each NumericField gets its own handler without
  // mutating the shared formatter singleton.
  const fmt = useMemo(() => {
    if (!onMixedChange || !(baseFmt instanceof MixedNumberFormatter)) return baseFmt
    const instance = Object.create(baseFmt) as MixedNumberFormatter
    instance.setMixedHandler(onMixedChange)
    return instance
  }, [baseFmt, onMixedChange]);

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
      {trailingAction}
    </ScrubbableInput.Root>
  );
}
