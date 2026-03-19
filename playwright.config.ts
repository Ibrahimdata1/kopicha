import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/reports/playwright-html', open: 'never' }],
    ['json', { outputFile: 'e2e/reports/test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 20000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000,
  },
})
