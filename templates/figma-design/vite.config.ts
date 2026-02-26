import path from 'path';
import { createViteConfig } from '@figma/proto-vite-config';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default createViteConfig({
  appDir: __dirname,
  rootDir: path.resolve(__dirname, '../..'),
  portEnvVar: 'FIGMA_DESIGN_PORT',
  wsPortEnvVar: 'FIGMA_DESIGN_WS_PORT',
  plugins: [TanStackRouterVite()],
});
