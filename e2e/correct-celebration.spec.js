import { test, expect } from '@playwright/test';

test('correct drop spawns sparkle particles and pulses slot', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(500);

  // L1 P1 = 12+3 = 15. Ones-digit = 5.
  const tile = page.locator('.tile[data-digit="5"]').first();
  const slot = page.locator('.slot.active').first();
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();

  // Spark particles should appear within ~250ms of drop
  await page.waitForTimeout(280);
  const particleCount = await page.locator('.spark-particle').count();
  expect(particleCount).toBeGreaterThanOrEqual(10);

  // Slot should have just-filled class for the pulse
  await expect(page.locator('.slot.just-filled')).toHaveCount(1);

  // Capture mid-burst screenshot
  await page.screenshot({ path: 'test-results/correct-burst.png', clip: { x: 380, y: 100, width: 540, height: 540 }});

  // After 1s, particles should be gone
  await page.waitForTimeout(1000);
  const afterCount = await page.locator('.spark-particle').count();
  expect(afterCount).toBe(0);
});
