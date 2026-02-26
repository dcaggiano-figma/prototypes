import { createViteConfig } from '@figma/ppg-vite-config';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default createViteConfig({
  appDir: __dirname,
  portEnvVar: 'BROWSER_SHELL_PORT',
  wsPortEnvVar: 'BROWSER_SHELL_WS_PORT',
  plugins: [TanStackRouterVite()],
});
