import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.SITE_URL || 'http://127.0.0.1:8787' },
  webServer: process.env.SITE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://127.0.0.1:8787',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
