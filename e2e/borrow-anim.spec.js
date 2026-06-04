import { test, expect } from '@playwright/test';
import { goToLevel } from './helpers/math.js';

// "Dave and Daniel" boots to the Who's-playing picker, so the old
// goto('/') -> .splash-play flow no longer reaches a level. Navigate straight
// to Dave's Sub L3 (problem 1 = 22-7, borrow needed) via the router helper.

test('borrow strike stays inside the tens cell (does not bleed into ones)', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/?profile=dave');
  await goToLevel(page, 'sub', 3);
  await expect(page.locator('#screen-sub')).toBeVisible({ timeout: 5000 });

  // Strike should exist
  const strike = page.locator('.strike').first();
  await expect(strike).toBeVisible();

  // Get bounding boxes of the strike and the two cells in the top row
  const strikeBox = await strike.boundingBox();
  const tensCell = page.locator('.worksheet .row.top .cell:nth-child(1)');
  const onesCell = page.locator('.worksheet .row.top .cell:nth-child(2)');
  const tensBox = await tensCell.boundingBox();
  const onesBox = await onesCell.boundingBox();

  // Strike should be entirely inside the tens cell (its right edge cannot exceed the tens cell's right edge by more than a few px)
  expect(strikeBox.x + strikeBox.width).toBeLessThanOrEqual(tensBox.x + tensBox.width + 5);
  expect(strikeBox.x).toBeGreaterThanOrEqual(tensBox.x - 5);

  // And nowhere near the ones cell
  expect(strikeBox.x + strikeBox.width).toBeLessThan(onesBox.x + 5);

  await page.screenshot({ path: 'test-results/borrow-strike.png' });
});

test('borrow animation takes at least 2.5 seconds total', async ({ page }) => {
  test.setTimeout(15_000);
  await page.goto('/?profile=dave');

  const start = Date.now();
  await goToLevel(page, 'sub', 3);

  // The regrouped ones value is revealed LATE in the animation as a separate
  // pencil-style carry mark ("1") next to the unchanged ones digit ("2") — the
  // ones cell text itself stays "2". Wait until that carry mark appears.
  await page.waitForSelector('.borrow-carry', { timeout: 9000 });

  const elapsed = Date.now() - start;
  // Strike + new tens + chip drop + equation hold + carry mark; total is 2.5s+
  expect(elapsed).toBeGreaterThanOrEqual(2500);
});
