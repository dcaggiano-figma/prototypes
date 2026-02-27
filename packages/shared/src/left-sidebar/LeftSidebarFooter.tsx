import type { ReactNode } from 'react';

interface LeftSidebarFooterProps {
  children: ReactNode;
}

export function LeftSidebarFooter({ children }: LeftSidebarFooterProps) {
  return (
    <div className="flex-1 flex flex-col justify-end gap-1">
      {children}
    </div>
  );
}
