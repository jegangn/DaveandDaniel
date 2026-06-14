import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

// The subtraction borrow pre-pass now shows the borrowed "1" TRAVELLING in from
// the left (the lender digit) to the column that needs it, so the child sees
// where the regroup comes from. nsub L5 always borrows across a zero, so a
// travelling chip is guaranteed.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('borrow pre-pass shows a "1" travelling in from the left', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');
  await goToLevel(page, 'nsub', 5, 'daniel');
  await expect(page.locator('#screen-col-sub')).toBeVisible({ timeout: 5000 });

  // A travelling borrow "1" appears during the pre-pass.
  const chip = page.locator('.borrow-travel').first();
  await expect(chip).toBeVisible({ timeout: 4000 });
  await expect(chip).toHaveText('1');
});
