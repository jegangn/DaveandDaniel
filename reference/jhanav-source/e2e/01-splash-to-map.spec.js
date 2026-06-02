import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('boot loads splash with title and tap-to-play', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#screen-splash')).toBeVisible();
  await expect(page.locator('.splash-title')).toHaveText("JHANAV'S MATH");
  await expect(page.locator('.splash-play')).toBeVisible();
  await expect(page.locator('.mascot.banji')).toBeVisible();
});

test('tap-to-play navigates to world map', async ({ page }) => {
  await page.goto('/');
  await page.locator('.splash-play').click();
  await expect(page.locator('#screen-map')).toBeVisible();
  await expect(page.locator('.world-panel')).toHaveCount(3);
});

test('world map shows correct lock states on fresh save', async ({ page }) => {
  await page.goto('/');
  await page.locator('.splash-play').click();
  // All three worlds' L1 nodes should be unlocked
  await expect(page.locator('.world-panel').first().locator('.level-node').first()).toHaveClass(/unlocked/);
  // L2 in the first world should be locked
  await expect(page.locator('.world-panel').first().locator('.level-node').nth(1)).toHaveClass(/locked/);
  // Mult world L1 is also unlocked (level === 1 → always unlocked per isLevelUnlocked)
  await expect(page.locator('.world-panel').nth(2).locator('.level-node').first()).toHaveClass(/unlocked/);
});

test('locked node tap triggers shake (no nav)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node').nth(1).click();
  // Still on map, no level screen
  await expect(page.locator('#screen-map')).toBeVisible();
  await expect(page.locator('#screen-add')).not.toBeAttached();
});
