import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

// Portrait phone — this is where the layout engine (layoutMultTap) actually
// runs. The answer slot now lives in the equation header; the play band must
// sit between the header and the bottom-anchored digit tray without overlap.
test.use({ viewport: { width: 414, height: 896 } });

test('mult tap-count: answer slot is in the equation, play area clears the tray', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(2).locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(800);

  // The answer slot lives inside the equation header, after the "=".
  await expect(page.locator('.mult-problem .slot.active')).toHaveCount(1);
  await expect(page.locator('.total-reveal')).toHaveCount(0);

  const slotBox = await page.locator('.mult-problem .slot').first().boundingBox();
  const problemBox = await page.locator('.mult-problem').boundingBox();
  const fireflyBox = await page.locator('.firefly-area').boundingBox();
  const trayBox = await page.locator('.digit-tray').boundingBox();

  // Slot sits within the equation header row.
  expect(slotBox.y).toBeGreaterThanOrEqual(problemBox.y - 1);
  expect(slotBox.y + slotBox.height).toBeLessThanOrEqual(problemBox.y + problemBox.height + 1);

  // Equation is above the play area, which is above the digit tray — no overlap.
  expect(problemBox.y + problemBox.height).toBeLessThanOrEqual(fireflyBox.y + 1);
  expect(fireflyBox.y + fireflyBox.height).toBeLessThanOrEqual(trayBox.y + 1);

  await page.screenshot({ path: 'test-results/mult-tap-fixed.png' });
});
