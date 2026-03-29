// Playwright config — controls test discovery, execution, and reporting.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Runs once before all tests — starts servers, seeds state
  globalSetup: './global-setup.js',
  testDir: '.',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  // Retry failed tests in CI to handle flakiness; fail fast locally
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],                          // terminal output
    ['html', { open: 'never' }],       // HTML report in playwright-report/
    ...(process.env.CI ? [['github']] : []),  // inline annotations on PR diffs
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Projects let you run the same tests with different configs (browsers, viewports).
  // We only need one: Chromium with extension support via custom fixtures.
  projects: [
    { name: 'chromium-extension' },
  ],
});
