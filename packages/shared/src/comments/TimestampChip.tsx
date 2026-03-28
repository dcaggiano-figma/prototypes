import { Chip } from '@figma/fpl-components';
import { Icon24Time } from '@figma/fpl-icons';

function formatTimestamp(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

interface TimestampChipProps {
  timestampMs: number;
  onClick?: () => void;
}

export function TimestampChip({ timestampMs, onClick }: TimestampChipProps) {
  const label = formatTimestamp(timestampMs);

  return (
    <Chip
      size="sm"
      leading={<Icon24Time />}
      onClick={onClick}
    >
      {label}
    </Chip>
  );
}
