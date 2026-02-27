import type { ReactNode } from 'react';

interface LeftSidebarNavGroupProps {
  children: ReactNode;
}

export function LeftSidebarNavGroup({ children }: LeftSidebarNavGroupProps) {
  return (
    <div className="flex flex-col gap-2 py-1">
      {children}
    </div>
  );
}
