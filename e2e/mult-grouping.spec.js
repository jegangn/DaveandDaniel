import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

// "a × b" means a items per group, shown b times → b groups of a.
test('tap screen: 2×1 renders 1 group of 2', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 1); // first problem 2×1
  await expect(page.locator('#screen-mult-tap')).toBeVisible();
  await expect(page.locator('.lily-group')).toHaveCount(1);            // b = 1 group
  await expect(page.locator('.lily-group .block-host')).toHaveCount(2); // a = 2 each
});

test('drag screen: 2×3 renders 3 trays of 2 ghosts', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 4); // L4 problems are drag; first is 2×3
  await expect(page.locator('#screen-mult-drag')).toBeVisible();
  // First problem 2×3 → 3 groups of 2.
  await expect(page.locator('.group-tray')).toHaveCount(3);
  await expect(page.locator('.group-tray').first().locator('.ghost')).toHaveCount(2);
});

test('answer slot lives in the equation, no separate panel', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 1);
  await expect(page.locator('.mult-problem .slot.active')).toHaveCount(1);
  await expect(page.locator('.total-reveal')).toHaveCount(0);
  await expect(page.locator('.op-chip.q')).toHaveCount(0);
});
