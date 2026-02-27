import { IconButton } from '@figma/fpl-components';
import { Icon24Reset, Icon24VersionCurrent } from '@figma/fpl-icons';

export interface VersionCardProps {
  /** Display label for this version */
  label: string;
  /** 'previous' shows muted text + restore button; 'current' shows green success styling */
  variant: 'previous' | 'current';
  /** Version number shown as subtitle for the previous variant */
  versionNumber?: number;
  /** Called when the restore button is clicked (previous variant only) */
  onRestore?: () => void;
}

export function VersionCard({
  label,
  variant,
  versionNumber,
  onRestore,
}: VersionCardProps) {
  if (variant === 'current') {
    return (
      <div className="flex flex-col border-border border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-12px">
          <div className="flex flex-col flex-grow">
            <span className="text-bodyLgStrong text-text-success">{label}</span>
            <span className="text-text-secondary">Current version</span>
          </div>
          <div className="flex items-center gap-2 text-text-success">
            <Icon24VersionCurrent />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-border border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-12px">
        <div className="flex flex-col flex-grow text-text-secondary">
          <span className="text-bodyLgStrong">{label}</span>
          {versionNumber != null && (
            <span>
              {'Version '}
              {versionNumber}
            </span>
          )}
        </div>
        <IconButton
          aria-label={`Restore ${label}`}
          onClick={onRestore}
        >
          <Icon24Reset />
        </IconButton>
      </div>
    </div>
  );
}
