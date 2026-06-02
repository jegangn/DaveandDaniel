import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

test('mult tap-count: TOTAL panel does not overlap digit tray', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(2).locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(800);

  // Tap all blocks (2x1=2 fireflies)
  const blocks = page.locator('.block-host.untapped');
  const count = await blocks.count();
  for (let i = 0; i < count; i++) {
    await blocks.nth(0).click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(600);

  const totalBox = await page.locator('.total-reveal').boundingBox();
  const trayBox = await page.locator('.digit-tray').boundingBox();
  const slotBox = await page.locator('.total-reveal .slot').first().boundingBox();

  // Panel bottom must be above tray top
  expect(totalBox.y + totalBox.height).toBeLessThan(trayBox.y);

  // Slot must be fully inside the total panel
  expect(slotBox.y).toBeGreaterThanOrEqual(totalBox.y - 1);
  expect(slotBox.y + slotBox.height).toBeLessThanOrEqual(totalBox.y + totalBox.height + 1);

  await page.screenshot({ path: 'test-results/mult-tap-fixed.png' });
});
