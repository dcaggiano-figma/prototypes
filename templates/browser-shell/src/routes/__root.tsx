import { useAppTheme, type ThemeSetting } from '@prototype/shared';
import {
  createRootRoute,
  Outlet,
  Link,
  useLocation,
} from '@tanstack/react-router';
import {
  Menu,
  IconButton,
  Button,
  ButtonPrimitive,
  Input,
} from '@figma/fpl-components';
import {
  Icon16ChevronDown,
  Icon24ChevronRightLarge,
  Icon24ChevronLeftLarge,
  Icon24NotificationBell,
  Icon24Home,
  Icon24Recent,
  Icon24Community,
  Icon24Search,
  Icon24Page,
  Icon24GridView,
  Icon24Trash,
  Icon24Settings,
  Icon24Import,
  Icon24Plus,
  Icon16Plus,
  Icon24Template,
  Icon24Signout,
} from '@figma/fpl-icons';
import { ThemeProvider } from '@figma/fpl-tokens';
import { Avatar } from '@prototype/shared';

/* ------------------------------------------------------------------ */
/*  Nav data                                                           */
/* ------------------------------------------------------------------ */

const PRIMARY_NAV = [
  { path: '/' as const, label: 'Home', icon: Icon24Home },
  { path: '/recents' as const, label: 'Recents', icon: Icon24Recent },
  { path: '/community' as const, label: 'Community', icon: Icon24Community },
];

const SECONDARY_NAV = [
  { path: '/drafts' as const, label: 'Drafts', icon: Icon24Page },
  { path: '/workspaces' as const, label: 'All workspaces', icon: Icon24GridView },
  { path: '/trash' as const, label: 'Trash', icon: Icon24Trash },
  { path: '/admin' as const, label: 'Admin', icon: Icon24Settings },
];

/* ------------------------------------------------------------------ */
/*  Shell layout                                                       */
/* ------------------------------------------------------------------ */

function Shell() {
  const [theme, setTheme] = useAppTheme();
  const { getTriggerProps, manager } = Menu.useMenu();
  const location = useLocation();

  const allNavItems = [...PRIMARY_NAV, ...SECONDARY_NAV];
  const currentLabel = allNavItems.find((item) => item.path === location.pathname)?.label ?? '';

  return (
    <div className="bg-bg min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-[240px] bg-bg border-r border-border flex flex-col shrink-0">
        <div className="p-8px border-b border-border flex items-center justify-between">
          <Menu.Root manager={manager}>
            <ButtonPrimitive {...getTriggerProps()} className="flex items-center gap-1 p-1 py-1 rounded-md hover:bg-bg-transparent active:bg-bg-transparent-secondary">
              <span className="mr-1"><Avatar size="md" src="./assets/avatar.jpg" /></span>
              <span className="text-bodyLg text-text">Kelly Shin</span>
              <Icon16ChevronDown />
            </ButtonPrimitive>
            <Menu.Container>
              <div className="flex flex-col items-center justify-center px-2 pt-2 pb-3 w-[200px]">
                <span className="mb-2"><Avatar size="xlg" src="./assets/avatar.jpg" /></span>
                <span className="text-bodyMd text-text">Kelly Shin</span>
                <span className="text-bodyMd text-text-secondary">dylan@figma.com</span>
              </div>
              <Menu.Group>
                <Menu.Item onClick={() => console.log('clicked')}>
                  <Menu.ItemLead>
                    <Icon24Settings />
                  </Menu.ItemLead>
                  <span>Settings</span>
                </Menu.Item>
                <Menu.SubMenu>
                  <Menu.SubTrigger>
                    <Menu.ItemLead>
                      <Icon24Template />
                    </Menu.ItemLead>
                    <span>Theme</span>
                  </Menu.SubTrigger>
                  <Menu.SubContainer>
                    <Menu.RadioGroup
                      title={<Menu.HiddenTitle>Theme</Menu.HiddenTitle>}
                      value={theme}
                      onChange={(value) => setTheme(value as ThemeSetting)}
                    >
                      <Menu.RadioGroupItem value="light">Light</Menu.RadioGroupItem>
                      <Menu.RadioGroupItem value="dark">Dark</Menu.RadioGroupItem>
                      <Menu.RadioGroupItem value="system">System</Menu.RadioGroupItem>
                    </Menu.RadioGroup>
                  </Menu.SubContainer>
                </Menu.SubMenu>
              </Menu.Group>
              <Menu.Group>
                <Menu.Item onClick={() => console.log('clicked')}>
                  <Menu.ItemLead>
                    <Icon24Plus />
                  </Menu.ItemLead>
                  <span>Add account</span>
                </Menu.Item>
              </Menu.Group>
              <Menu.Group>
                <Menu.Item onClick={() => console.log('clicked')}>
                  <Menu.ItemLead>
                    <Icon24Signout />
                  </Menu.ItemLead>
                  <span>Log out</span>
                </Menu.Item>
              </Menu.Group>
            </Menu.Container>
          </Menu.Root>
          <IconButton size="lg" aria-label="Notifications">
            <Icon24NotificationBell />
          </IconButton>
        </div>
        <div className="flex flex-col gap-4px overflow-auto">
          {/* Search */}
          <div className="px-8px pt-8px">
            <Input.Root size="lg">
              <div className="py-4px pl-4px pr-8px"><Icon24Search className="text-icon-tertiary shrink-0" /></div>
              <Input id="sidebar-search" placeholder="Search" size="lg" />
            </Input.Root>
          </div>

          {/* Primary nav */}
          <nav className="flex flex-col gap-4px px-8px pb-8px pt-4px">
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
          </nav>

          {/* Secondary nav */}
          <nav className="flex flex-col gap-4px border-t border-border p-8px">
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

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-8px gap-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center">
            <IconButton size="lg" aria-label="Back" onClick={() => window.history.back()}>
              <Icon24ChevronLeftLarge />
            </IconButton>
            <IconButton size="lg" aria-label="Forward" onClick={() => window.history.forward()}>
              <Icon24ChevronRightLarge />
            </IconButton>
            <h1 className="text-bodyLg text-text pl-12px">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-8px">
            <Button size="lg" variant="secondary" aria-label="Create new">
              <div className="flex items-center">
                <Icon16Plus />
                <span className="pl-8px pr-4px">Create new</span>
                <Icon16ChevronDown />
              </div>
            </Button>
            <IconButton size="lg" aria-label="Import">
              <Icon24Import />
            </IconButton>
          </div>
        </header>

        {/* Routed content */}
        <main className="flex-1 p-24px overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root layout (router + theme provider)                              */
/* ------------------------------------------------------------------ */

function RootLayout() {
  return (
    <ThemeProvider initialVersion="ui3">
      <Shell />
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
