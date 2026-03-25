import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from '@figma/fpl-tokens';
import { UserConfigProvider } from '@prototype/shared';
import { AppThemeProvider } from '../helpers/theme';
import { WorkingStateProvider } from '../helpers/workingState';

function RootLayout() {
  return (
    <ThemeProvider initialVersion="ui3">
      <AppThemeProvider initial="system">
        <UserConfigProvider defaultConfig={{ name: 'Josh Ferrell', color: 'yellow' }}>
          <WorkingStateProvider>
            <Outlet />
          </WorkingStateProvider>
        </UserConfigProvider>
      </AppThemeProvider>
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
