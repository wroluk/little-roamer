import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.ROAMER_PORT ?? '5173');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('ROAMER_PORT must be a valid TCP port');
export default defineConfig({
  testDir: './tests/browser',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-tablet', use: { ...devices['iPad (gen 7) landscape'], defaultBrowserType: 'chromium', browserName: 'chromium' } },
    { name: 'webkit-tablet', use: { ...devices['iPad (gen 7) landscape'], browserName: 'webkit' } },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
