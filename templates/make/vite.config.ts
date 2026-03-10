import path from 'path';
import { createViteConfig } from '@figma/ppg-vite-config';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default createViteConfig({
  appDir: __dirname,
  rootDir: path.resolve(__dirname, '../..'),
  portEnvVar: 'MAKE_PORT',
  wsPortEnvVar: 'MAKE_WS_PORT',
  plugins: [TanStackRouterVite()],
});
