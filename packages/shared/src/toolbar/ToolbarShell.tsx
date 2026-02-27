import { forwardRef, type ReactNode } from 'react';
import clsx from 'clsx';

interface ToolbarShellProps {
  children: ReactNode;
  className?: string;
}

export const ToolbarShell = forwardRef<HTMLDivElement, ToolbarShellProps>(
  function ToolbarShell({ children, className }, ref) {
    return (
      <div ref={ref} className={clsx('bg-bg rounded-lg shadow-300', className)}>
        {children}
      </div>
    );
  },
);
