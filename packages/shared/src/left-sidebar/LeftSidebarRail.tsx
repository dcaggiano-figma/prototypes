import type { ReactNode } from 'react';

interface LeftSidebarRailProps {
  children: ReactNode;
}

export function LeftSidebarRail({ children }: LeftSidebarRailProps) {
  return (
    <nav className="w-[48px] bg-bg border-r border-border flex flex-col items-center pt-2 pb-3 z-sidebar">
      {children}
    </nav>
  );
}
