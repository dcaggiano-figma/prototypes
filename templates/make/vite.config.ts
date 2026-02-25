import { createViteConfig } from '@figma/proto-vite-config';

export default createViteConfig({
  appDir: __dirname,
  portEnvVar: 'MAKE_PORT',
  wsPortEnvVar: 'MAKE_WS_PORT',
});
