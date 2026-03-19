import { forwardRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { ToolbarPrimitive } from '@figma/fpl-components';

interface ToolbarShellProps {
  children: ReactNode;
  className?: string;
}

export const ToolbarShell = forwardRef<HTMLDivElement, ToolbarShellProps>(
  function ToolbarShell({ children, className }, ref) {
    return (
      <ToolbarPrimitive aria-label='Toolbar' ref={ref} className={clsx('bg-bg rounded-lg shadow-300', className)}>
        {children}
      </ToolbarPrimitive>
    );
  },
);
