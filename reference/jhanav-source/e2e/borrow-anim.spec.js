import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

test('borrow strike stays inside the tens cell (does not bleed into ones)', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').click();
  // Sub L3 problem 1 is 22-7 (borrow needed)
  await page.locator('.world-panel').nth(1).locator('.level-node[data-level="3"]').click();
  await page.waitForTimeout(700);

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
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').click();

  const start = Date.now();
  await page.locator('.world-panel').nth(1).locator('.level-node[data-level="3"]').click();

  // The borrow chip is created mid-animation; the ones digit changes textContent
  // late in the animation. We wait until the ones cell shows the regrouped value
  // (e.g., 22-7: ones becomes 12).
  await page.waitForFunction(() => {
    const cell = document.querySelector('.worksheet .row.top .cell:nth-child(2)');
    return cell && cell.textContent.trim().length === 2;
  }, { timeout: 6000 });

  const elapsed = Date.now() - start;
  // Strike + new tens + chip drop + ones morph; total should be 2.5s+
  expect(elapsed).toBeGreaterThanOrEqual(2500);
});
