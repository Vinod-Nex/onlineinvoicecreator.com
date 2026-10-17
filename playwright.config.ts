import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for OnlineInvoiceCreator.com
 * Tests all key user journeys, accessibility, responsive viewports (320px, 360px, 390px, 768px, 1280px)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome 1280',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'Mobile 320 (iPhone SE 1st gen)',
      use: {
        viewport: { width: 320, height: 640 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'Mobile 360 (Standard Android)',
      use: {
        viewport: { width: 360, height: 740 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
      },
    },
    {
      name: 'Mobile 390 (iPhone 13/14)',
      use: {
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'Tablet 768 (iPad Mini)',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
