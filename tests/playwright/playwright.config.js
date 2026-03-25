const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  globalSetup: './global-setup.js',
  testDir: '.',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ...(process.env.CI ? [['github']] : []),
  ],

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      // Extension loading + headless:false are handled by the custom
      // fixture in fixtures.js via chromium.launchPersistentContext()
      name: 'chromium-extension',
    },
  ],
});
