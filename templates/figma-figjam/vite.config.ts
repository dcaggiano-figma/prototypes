import path from 'path';
import { createViteConfig } from '@figma/ppg-vite-config';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default createViteConfig({
  appDir: __dirname,
  rootDir: path.resolve(__dirname, '../..'),
  portEnvVar: 'FIGMA_FIGJAM_PORT',
  wsPortEnvVar: 'FIGMA_FIGJAM_WS_PORT',
  plugins: [TanStackRouterVite()],
});
