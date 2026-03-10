import path from 'path';
import { createViteConfig } from '@figma/ppg-vite-config';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default createViteConfig({
  appDir: __dirname,
  rootDir: path.resolve(__dirname, '../..'),
  enablePropertiesPanel: true,
  plugins: [TanStackRouterVite()],
});
