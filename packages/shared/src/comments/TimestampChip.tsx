import { ButtonPrimitive } from '@figma/fpl-components';

function formatTimestamp(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5S8.76 1 6 1zm0 9c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm.5-6.5H5v3.25l2.65 1.59.5-.82L6.5 6.25V3.5z" />
    </svg>
  );
}

interface TimestampChipProps {
  timestampMs: number;
  onClick?: () => void;
}

export function TimestampChip({ timestampMs, onClick }: TimestampChipProps) {
  const label = formatTimestamp(timestampMs);

  if (onClick) {
    return (
      <ButtonPrimitive
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-brand-tertiary text-text-brand text-bodySm cursor-pointer hover:bg-bg-brand-secondary"
        onClick={onClick}
      >
        <ClockIcon />
        {label}
      </ButtonPrimitive>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-brand-tertiary text-text-brand text-bodySm">
      <ClockIcon />
      {label}
    </span>
  );
}
