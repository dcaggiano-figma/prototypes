import { LeftSidebarProvider } from './LeftSidebarContext';
import { LeftSidebarRail } from './LeftSidebarRail';
import { LeftSidebarNavGroup } from './LeftSidebarNavGroup';
import { LeftSidebarNavItem } from './LeftSidebarNavItem';
import { LeftSidebarDivider } from './LeftSidebarDivider';
import { LeftSidebarFooter } from './LeftSidebarFooter';
import { LeftSidebarPanel } from './LeftSidebarPanel';

export const LeftSidebar = {
  Provider: LeftSidebarProvider,
  Rail: LeftSidebarRail,
  NavGroup: LeftSidebarNavGroup,
  NavItem: LeftSidebarNavItem,
  Divider: LeftSidebarDivider,
  Footer: LeftSidebarFooter,
  Panel: LeftSidebarPanel,
};

export { useLeftSidebar } from './LeftSidebarContext';
