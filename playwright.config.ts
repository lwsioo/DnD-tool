import { defineConfig, devices } from '@playwright/test';

/**
 * Test end-to-end sulla build di produzione (npm run build + vite preview), in Chromium.
 * Avvio: npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'it-IT',
    viewport: { width: 1440, height: 900 },
    // Il service worker si attiva solo nel test offline, per non interferire con gli altri.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
