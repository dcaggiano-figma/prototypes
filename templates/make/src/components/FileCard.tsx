import { type ReactNode } from 'react';
import { LoadingSpinner } from '@figma/fpl-components';
import { Icon24Eye, Icon24Write } from '@figma/fpl-icons';

import { ProgressIndicator } from './ChatMessage';

export interface FileCardProps {
  /** Whether the card represents a file being read or written */
  variant: 'viewing' | 'writing';
  /** The file name to display */
  fileName: string;
  /** Whether to show the loading spinner (default: true) */
  loading?: boolean;
  /** Optional content slot rendered below the header — typically streaming code content */
  children?: ReactNode;
}

export function FileCard({
  variant,
  fileName,
  loading = true,
  children,
}: FileCardProps) {
  const Icon = variant === 'viewing' ? Icon24Eye : Icon24Write;
  const label = variant === 'viewing' ? `Viewing ${fileName}` : `Writing ${fileName}`;

  return (
    <div className="flex flex-col border-border border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 py-2 px-12px">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 w-full">
          <Icon />
          <ProgressIndicator label={label} />
          {loading && (
            <div className="px-1">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
