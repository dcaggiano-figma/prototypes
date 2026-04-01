import type { ReactNode } from 'react';
import { useRegisterPopupObstacle } from '@figma/fpl-components';

interface LeftSidebarRailProps {
  children: ReactNode;
}

export function LeftSidebarRail({ children }: LeftSidebarRailProps) {
  const ref = useRegisterPopupObstacle();

  return (
    <nav ref={ref} className="w-[48px] bg-bg border-r border-border flex flex-col items-center pt-2 pb-3 z-sidebar">
      {children}
    </nav>
  );
}
