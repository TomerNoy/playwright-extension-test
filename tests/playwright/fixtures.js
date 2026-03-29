// Custom fixtures — Playwright's dependency-injection system.
// We override the default `context` because Chrome extensions only work
// in a persistent context (launchPersistentContext), not the default isolated one.

const http = require('http');
const { test: base, chromium, expect } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../chrome-extension');

// Zeros the server counter so each test starts from count = 0
function resetServer() {
  return new Promise((resolve) => {
    const req = http.request(
      { method: 'POST', hostname: 'localhost', port: 8080, path: '/reset' },
      () => resolve(),
    );
    req.on('error', () => resolve());
    req.end();
  });
}

// base.extend() creates a new `test` with custom fixtures injected into every test
const test = base.extend({
  // Override built-in `context` — launches a real browser profile with the extension loaded.
  // Code after use() is teardown (runs when the test finishes).
  context: async ({}, use) => {
    await resetServer();
    const context = await chromium.launchPersistentContext('', {
      headless: false,  // extensions require a visible browser
      slowMo: 1000,      // ms delay before every action (click, type, goto, etc.)
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  },

  // Extracts the extension's random runtime ID from its service worker URL
  // so tests can navigate to chrome-extension://<id>/popup.html
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    const extensionId = new URL(worker.url()).hostname;
    await use(extensionId);
  },
});

module.exports = { test, expect };
