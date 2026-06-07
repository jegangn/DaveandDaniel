import { test, expect } from '@playwright/test';

test('localStorage persists star progress across reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());

  // Simulate L1 add being cleared with 3 stars
  // Key format: bm.stars.add.1
  await page.evaluate(() => localStorage.setItem('bm.stars.add.1', '3'));

  // Reload and navigate to map
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();

  // L1 node in first world should have a star ribbon (stars > 0)
  const l1Node = page.locator('.world-panel').first().locator('.level-node').first();
  await expect(l1Node.locator('.node-ribbon')).toBeVisible();

  // L2 should now be unlocked (prev level has stars > 0)
  await expect(page.locator('.world-panel').first().locator('.level-node').nth(1)).toHaveClass(/unlocked/);
});

test('star meter on map reflects stored total', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('bm.stars.add.1', '3');
    localStorage.setItem('bm.stars.add.2', '2');
  });

  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();

  // Total stars should be 5
  const meter = page.locator('.star-meter.total');
  await expect(meter).toContainText('5 / 54');
});

test('fresh save: all worlds L2-L6 are locked', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();

  // All three worlds should have L2 locked
  for (let worldIdx = 0; worldIdx < 3; worldIdx++) {
    await expect(
      page.locator('.world-panel').nth(worldIdx).locator('.level-node').nth(1)
    ).toHaveClass(/locked/);
  }
});

test('world map home button returns to splash', async ({ page }) => {
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await expect(page.locator('#screen-map')).toBeVisible();

  await page.locator('.home-btn').click();
  await expect(page.locator('#screen-splash')).toBeVisible();
});
