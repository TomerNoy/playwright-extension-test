/**
 * fixtures.js — Custom Playwright fixtures for Chrome Extension testing
 *
 * The default Playwright `context` fixture creates an isolated browser context.
 * Chrome extensions (especially MV3 service workers) only load into a
 * *persistent* context — the one created by chromium.launchPersistentContext().
 *
 * This file overrides `context` and adds an `extensionId` fixture so every
 * test that imports from here gets a properly configured browser.
 */

const http = require('http');
const { test: base, chromium, expect } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../chrome-extension');

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

const test = base.extend({
  // Each test gets its own persistent context with the extension loaded.
  // The server counter is reset first so each test starts from count = 0.
  context: async ({}, use) => {
    await resetServer();

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  },

  // Resolves the runtime extension ID from the service worker URL
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    // URL format: chrome-extension://<id>/background.js
    const extensionId = new URL(worker.url()).hostname;
    await use(extensionId);
  },
});

module.exports = { test, expect };
