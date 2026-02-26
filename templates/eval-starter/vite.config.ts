import { createViteConfig } from '@figma/ppg-vite-config';

export default createViteConfig({
  appDir: __dirname,
  portEnvVar: 'EVAL_STARTER_PORT',
  wsPortEnvVar: 'EVAL_STARTER_WS_PORT',
});
