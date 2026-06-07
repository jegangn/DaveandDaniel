import { test, expect } from '@playwright/test';

test('correct drop triggers mascot cheer with sparkles around mascot', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(500);

  // L1 P1 = 12+3 = 15, ones-digit = 5
  const tile = page.locator('.tile[data-digit="5"]').first();
  const slot = page.locator('.slot.active').first();
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();

  // Wait long enough for the cheer to be well underway across any of the
  // 10 randomized celebrations (some have delayed sparkle bursts).
  await page.waitForTimeout(700);

  // Mascot sparkles should have spawned around the corner mascot
  const sparkleCount = await page.locator('.mascot-sparkle').count();
  expect(sparkleCount).toBeGreaterThanOrEqual(3);

  await page.screenshot({ path: 'test-results/mascot-cheer.png' });

  // After 1.2s, sparkles should be gone
  await page.waitForTimeout(1300);
  const afterCount = await page.locator('.mascot-sparkle').count();
  expect(afterCount).toBe(0);
});
