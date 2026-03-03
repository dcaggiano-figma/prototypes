import path from 'path';
import { createViteConfig } from '@figma/ppg-vite-config';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default createViteConfig({
  appDir: __dirname,
  rootDir: path.resolve(__dirname, '../..'),
  portEnvVar: 'BLANK_SLATE_PORT',
  wsPortEnvVar: 'BLANK_SLATE_WS_PORT',
  plugins: [TanStackRouterVite()],
});
