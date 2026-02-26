import { useCallback } from 'react';
import { NumberFormatter, ScrubbableInput } from '@figma/fpl-components';

export const defaultFormatter = new NumberFormatter({ maximumFractionDigits: 2 });
export const positiveFormatter = new NumberFormatter({ min: 0, maximumFractionDigits: 2 });
export const percentFormatter = new NumberFormatter({ min: 0, max: 100, maximumFractionDigits: 0 });

export interface NumericFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  formatter?: NumberFormatter
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

  const handleChange = useCallback(
    (v: number) => {
      onChange(v);
    },
    [onChange],
  );

  return (
    <ScrubbableInput.Root>
      <ScrubbableInput.Icon>
        {icon ?? <CharIcon>{label}</CharIcon>}
      </ScrubbableInput.Icon>
      <ScrubbableInput.Field
        aria-label={label}
        value={value}
        formatter={fmt}
        onChange={handleChange}
        disabled={disabled}
      />
    </ScrubbableInput.Root>
  );
}
