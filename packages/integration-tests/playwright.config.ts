import { defineConfig } from '@playwright/test'

/** Temporary hard-coded port for the figma-design dev server. */
const FIGMA_DESIGN_PORT = 5173

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  /** Chrome only — keeps test runs fast. */
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  /** Dev server must already be running — no webServer auto-start. */
  use: {
    baseURL: `http://localhost:${FIGMA_DESIGN_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  retries: 0,
  reporter: [['list']],
})
