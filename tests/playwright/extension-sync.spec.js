// Test suite — validates the full sync loop:
// Extension popup → sync-server (WebSocket) → Web App

// Imports our custom fixtures (context with extension, extensionId)
const { test, expect } = require('./fixtures');

// test.describe() groups related tests for organization / reporting
test.describe('Chrome Extension → Web App sync', () => {

  test('clicking Sync Item in the extension updates the web app counter', async ({
    context,     // persistent browser context with extension loaded (from fixtures)
    extensionId, // the extension's runtime ID (from fixtures)
  }) => {
    // Open extension popup via its chrome-extension:// URL
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    // locator() finds elements; toHaveText() auto-retries until match or timeout
    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('0', { timeout: 5_000 });

    // click() waits for the element to be visible and enabled, then clicks
    await popup.click('[data-testid="sync-btn"]');
    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('1', { timeout: 5_000 });

    // Open web app in a second tab — same browser context, same WebSocket server
    const webApp = await context.newPage();
    await webApp.goto('http://localhost:3000');
    await expect(webApp.locator('[data-testid="sync-count"]')).toHaveText('1', { timeout: 8_000 });
  });

  test('multiple syncs accumulate correctly across both surfaces', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('0', { timeout: 5_000 });

    for (let i = 1; i <= 3; i++) {
      await popup.click('[data-testid="sync-btn"]');
      await expect(popup.locator('[data-testid="sync-count"]')).toHaveText(String(i), { timeout: 5_000 });
    }

    const webApp = await context.newPage();
    await webApp.goto('http://localhost:3000');
    await expect(webApp.locator('[data-testid="sync-count"]')).toHaveText('3', { timeout: 8_000 });
  });

  // Verifies late-joining clients get the current state, not starting from 0
  test('web app receives current state snapshot on fresh load', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('0', { timeout: 5_000 });

    await popup.click('[data-testid="sync-btn"]');
    await popup.click('[data-testid="sync-btn"]');
    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('2', { timeout: 5_000 });

    // Web app loads AFTER the syncs — should still show 2
    const webApp = await context.newPage();
    await webApp.goto('http://localhost:3000');
    await expect(webApp.locator('[data-testid="sync-count"]')).toHaveText('2', { timeout: 8_000 });
  });
});
