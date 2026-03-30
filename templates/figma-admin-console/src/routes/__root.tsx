import { useState } from 'react';
import { useAppTheme, type ThemeSetting, PatternLibraryWindow, UserConfigModal, UserConfigProvider, useUserConfig } from '@prototype/shared';
import {
  createRootRoute,
  Outlet,
  Link,
  useNavigate,
} from '@tanstack/react-router';
import {
  IconButton,
  ButtonPrimitive,
} from '@figma/fpl-components';
import { MenuV2 } from '@figma/fpl-components/beta';
import {
  Icon16ChevronDown,
  Icon24ChevronRightLarge,
  Icon24ChevronLeftLarge,
  Icon24ApprovedCheckmark,
  Icon24Person,
  Icon24Billing,
  Icon24Folder,
  Icon24Library,
  Icon24RewindTemplate,
  Icon24NotificationBell,
  Icon24Settings,
  Icon24Plus,
  Icon24Template,
  Icon24Signout,
  Icon24Adjust,
} from '@figma/fpl-icons';
import { ThemeProvider } from '@figma/fpl-tokens';
import { Avatar } from '@prototype/shared';

/* ------------------------------------------------------------------ */
/*  Nav data                                                           */
/* ------------------------------------------------------------------ */

const PRIMARY_NAV = [
  { path: '/' as const, label: 'Dashboard', icon: Icon24ApprovedCheckmark },
  { path: '/people' as const, label: 'People', icon: Icon24Person },
  { path: '/billing' as const, label: 'Billing', icon: Icon24Billing },
];

const SECONDARY_NAV = [
  { path: '/content' as const, label: 'Content', icon: Icon24Folder },
  { path: '/resources' as const, label: 'Resources', icon: Icon24Library },
  { path: '/activity' as const, label: 'Activity', icon: Icon24RewindTemplate },
  { path: '/settings' as const, label: 'Settings', icon: Icon24Adjust },
];

/* ------------------------------------------------------------------ */
/*  Shell layout                                                       */
/* ------------------------------------------------------------------ */

function Shell() {
  const [theme, setTheme] = useAppTheme();
  const { getTriggerProps, manager } = MenuV2.useMenu();
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showUserConfig, setShowUserConfig] = useState(false);
  const navigate = useNavigate();
  const { config } = useUserConfig();

  return (
    <div className="bg-bg h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] bg-bg border-r border-border flex flex-col shrink-0">
        <div className="p-8px border-b border-border flex items-center justify-between">
          <ButtonPrimitive {...getTriggerProps()} className="flex items-center gap-1 p-1 py-1 rounded-md hover:bg-bg-transparent active:bg-bg-transparent-secondary">
              <span className="mr-1"><Avatar size="md" src={config.avatarUrl ?? './assets/avatar.jpg'} /></span>
              <span className="text-bodyLg text-text">{config.name}</span>
              <Icon16ChevronDown />
            </ButtonPrimitive>
          <MenuV2.Root manager={manager}>
              <div className="flex flex-col items-center justify-center px-2 pt-4 pb-3 w-[200px]">
                <span className="mb-2"><Avatar size="xlg" src={config.avatarUrl ?? './assets/avatar.jpg'} /></span>
                <span className="text-bodyMd text-text">{config.name}</span>
                <span className="text-bodyMd text-text-secondary">dylan@figma.com</span>
              </div>
              <MenuV2.Group>
                <MenuV2.SubMenu title="Theme" titleLead={<Icon24Template />}>
                    <MenuV2.RadioGroup
                      aria-label="Theme"
                      value={theme}
                      onChange={(value) => setTheme(value as ThemeSetting)}
                    >
                      <MenuV2.RadioGroupItem value="light">Light</MenuV2.RadioGroupItem>
                      <MenuV2.RadioGroupItem value="dark">Dark</MenuV2.RadioGroupItem>
                      <MenuV2.RadioGroupItem value="system">System</MenuV2.RadioGroupItem>
                    </MenuV2.RadioGroup>
                  </MenuV2.SubMenu>
                  <MenuV2.Item onClick={() => console.log('clicked')} lead={<Icon24Settings />}>
                  <span>Settings</span>
                </MenuV2.Item>
              </MenuV2.Group>
              <MenuV2.Group>
                <MenuV2.Item onClick={() => console.log('clicked')} lead={<Icon24Plus />}>
                  <span>Add account</span>
                </MenuV2.Item>
              </MenuV2.Group>
              <MenuV2.Group>
                <MenuV2.Item onClick={() => console.log('clicked')} lead={<Icon24Signout />}>
                  <span>Log out</span>
                </MenuV2.Item>
              </MenuV2.Group>
              <MenuV2.SubMenu title="Prototype">
                <MenuV2.Group>
                  <MenuV2.Item onClick={() => { void navigate({ to: '/' }); window.location.reload(); }}>
                    Reset prototype
                  </MenuV2.Item>
                </MenuV2.Group>
                <MenuV2.Group>
                  <MenuV2.Item onClick={() => setShowPatternLibrary(true)}>
                    Pattern library
                  </MenuV2.Item>
                  <MenuV2.Item onClick={() => setShowUserConfig(true)}>
                    User config...
                  </MenuV2.Item>
                </MenuV2.Group>
              </MenuV2.SubMenu>
          </MenuV2.Root>
          <IconButton size="lg" aria-label="Notifications">
            <Icon24NotificationBell />
          </IconButton>
        </div>
        <div className="pl-12px pr-8px py-8px border-b border-border flex items-center gap-8px">
          <IconButton aria-label="Back">
            <Icon24ChevronLeftLarge />
          </IconButton>
          <span className="text-bodyLg text-text">Admin</span>
        </div>
        <div className="flex flex-col gap-4px overflow-auto">
          <nav className="flex flex-col gap-4px px-8px py-8px">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                activeOptions={{ exact: item.path === '/' }}
                activeProps={{ className: 'flex items-center gap-8px px-4px py-4px rounded-md text-bodyMd no-underline bg-bg-selected text-text' }}
                inactiveProps={{ className: 'flex items-center gap-8px px-4px py-4px rounded-md text-bodyMd no-underline text-text hover:bg-bg-transparent-hover' }}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
            {SECONDARY_NAV.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                activeProps={{ className: 'flex items-center gap-8px px-4px py-4px rounded-md text-bodyMd no-underline bg-bg-selected text-text' }}
                inactiveProps={{ className: 'flex items-center gap-8px px-4px py-4px rounded-md text-bodyMd no-underline text-text hover:bg-bg-transparent-hover' }}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="px-16px py-12px flex items-center shrink-0">
          <IconButton size="lg" aria-label="Back" onClick={() => window.history.back()}>
            <Icon24ChevronLeftLarge />
          </IconButton>
          <IconButton size="lg" aria-label="Forward" onClick={() => window.history.forward()}>
            <Icon24ChevronRightLarge />
          </IconButton>
        </header>

        {/* Routed content */}
        <main className="flex-1 px-0 pt-8px overflow-hidden">
          <Outlet />
        </main>
      </div>

      {showPatternLibrary && <PatternLibraryWindow onClose={() => setShowPatternLibrary(false)} />}
      <UserConfigModal open={showUserConfig} onClose={() => setShowUserConfig(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root layout (router + theme provider)                              */
/* ------------------------------------------------------------------ */

function RootLayout() {
  return (
    <ThemeProvider initialVersion="ui3">
      <UserConfigProvider defaultConfig={{ name: 'Kelly Shin', avatarUrl: './assets/avatar.jpg' }}>
        <Shell />
      </UserConfigProvider>
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
