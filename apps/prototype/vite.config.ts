import path from 'path';
import { createViteConfig } from '@figma/ppg-vite-config';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default createViteConfig({
  appDir: __dirname,
  rootDir: path.resolve(__dirname, '../../'),
  portEnvVar: 'PROTOTYPE_PORT',
  wsPortEnvVar: 'PROTOTYPE_WS_PORT',
  plugins: [TanStackRouterVite()],
  configOverrides: {
    build: {
      outDir: path.resolve(__dirname, '../../dist'),
      emptyOutDir: true,
    },
  },
});
