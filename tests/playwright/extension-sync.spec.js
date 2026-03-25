/**
 * extension-sync.spec.js
 *
 * End-to-end test that validates the full sync loop:
 *   Chrome Extension popup → sync-server → Web App
 *
 * Flow:
 *   1. Open the extension popup (extensionId resolved by fixture)
 *   2. Assert initial count is 0
 *   3. Click the Sync Item button
 *   4. Assert the popup reflects count = 1
 *   5. Open the web app in a new tab and assert it also shows count = 1
 */

const { test, expect } = require('./fixtures');

test.describe('Chrome Extension → Web App sync', () => {
  test('clicking Sync Item in the extension updates the web app counter', async ({
    context,
    extensionId,
  }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('0', {
      timeout: 5_000,
    });

    await popup.click('[data-testid="sync-btn"]');

    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('1', {
      timeout: 5_000,
    });

    const webApp = await context.newPage();
    await webApp.goto('http://localhost:3000');

    await expect(webApp.locator('[data-testid="sync-count"]')).toHaveText('1', {
      timeout: 8_000,
    });
  });

  test('multiple syncs accumulate correctly across both surfaces', async ({
    context,
    extensionId,
  }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('0', { timeout: 5_000 });

    for (let i = 1; i <= 3; i++) {
      await popup.click('[data-testid="sync-btn"]');
      await expect(popup.locator('[data-testid="sync-count"]')).toHaveText(String(i), {
        timeout: 5_000,
      });
    }

    const webApp = await context.newPage();
    await webApp.goto('http://localhost:3000');
    await expect(webApp.locator('[data-testid="sync-count"]')).toHaveText('3', {
      timeout: 8_000,
    });
  });

  test('web app receives current state snapshot on fresh load', async ({
    context,
    extensionId,
  }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('0', { timeout: 5_000 });

    await popup.click('[data-testid="sync-btn"]');
    await popup.click('[data-testid="sync-btn"]');
    await expect(popup.locator('[data-testid="sync-count"]')).toHaveText('2', { timeout: 5_000 });

    const webApp = await context.newPage();
    await webApp.goto('http://localhost:3000');
    await expect(webApp.locator('[data-testid="sync-count"]')).toHaveText('2', {
      timeout: 8_000,
    });
  });
});
