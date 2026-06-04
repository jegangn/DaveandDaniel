import { test, expect } from '@playwright/test';
import { goToLevel } from './helpers/math.js';

// Navigate straight to Dave's Sub L3 (problem 1 = 22-7: ones-top 2, borrow makes
// it read as 12 via a "10 + 2" reveal then a "1" carry mark beside the "2").

test('borrow: 10 + 2 equation is briefly visible before the ones regroup mark appears', async ({ page }) => {
  test.setTimeout(20_000);
  await page.goto('/?profile=dave');
  await goToLevel(page, 'sub', 3);
  await expect(page.locator('#screen-sub')).toBeVisible({ timeout: 5000 });

  // The "+" of the "10 + 2" equation fades in once the chip finishes its drop
  // (~4s into the animation). Wait for it rather than guessing a fixed delay.
  await page.waitForSelector('.borrow-plus', { timeout: 8000 });

  // The "+" sign should be on screen
  const plus = page.locator('.borrow-plus');
  await expect(plus).toBeVisible();
  expect((await plus.textContent()).trim()).toBe('+');

  // The "10" chip should still be visible (above the ones cell)
  const chip = page.locator('.borrow-chip');
  await expect(chip).toBeVisible();
  expect((await chip.textContent()).trim()).toBe('10');

  // The ones cell should STILL show the original ones digit. The regrouped value
  // is revealed LATER as a separate carry mark, not by rewriting the cell, so at
  // this point the carry mark does not exist yet.
  const onesCell = page.locator('.worksheet .row.top .cell:nth-child(2)');
  expect((await onesCell.textContent()).trim()).toBe('2');
  await expect(page.locator('.borrow-carry')).toHaveCount(0);

  // Visual sanity: chip is above the plus, and the plus is above the visible
  // digit (the digit is centred in the cell with empty space above it).
  const chipBox = await chip.boundingBox();
  const plusBox = await plus.boundingBox();
  const onesBox = await onesCell.boundingBox();
  expect(chipBox.y + chipBox.height).toBeLessThanOrEqual(plusBox.y + 12);
  // Plus must sit above the cell's vertical centre (where the digit actually is)
  expect(plusBox.y + plusBox.height).toBeLessThanOrEqual(onesBox.y + onesBox.height / 2);

  // Chip and "+" should be horizontally aligned with the ones cell (within tolerance)
  const chipCenterX = chipBox.x + chipBox.width / 2;
  const onesCenterX = onesBox.x + onesBox.width / 2;
  expect(Math.abs(chipCenterX - onesCenterX)).toBeLessThan(40);

  // The new tens "1" (.borrow-replacement) annotates the UPPER-LEFT of the tens
  // cell — teacher's regroup notation — so its centre sits left of the tens-cell
  // centre, near the cell's left edge (NOT centred over the cell).
  const newTens = page.locator('.borrow-replacement').first();
  await expect(newTens).toBeVisible();
  const newTensBox = await newTens.boundingBox();
  const tensCell = page.locator('.worksheet .row.top .cell:nth-child(1)');
  const tensBox = await tensCell.boundingBox();
  const newTensCenterX = newTensBox.x + newTensBox.width / 2;
  expect(newTensCenterX).toBeLessThan(tensBox.x + tensBox.width / 2);   // left of centre
  expect(Math.abs(newTensCenterX - tensBox.x)).toBeLessThan(40);        // near the left edge

  await page.screenshot({ path: 'test-results/borrow-equation.png' });
});

test('borrow: by the end of the animation the ones column shows the regrouped value', async ({ page }) => {
  test.setTimeout(15_000);
  await page.goto('/?profile=dave');
  await goToLevel(page, 'sub', 3);
  await expect(page.locator('#screen-sub')).toBeVisible({ timeout: 5000 });

  // The regroup mark ("1") fades in next to the ones digit near the end.
  await page.waitForSelector('.borrow-carry', { timeout: 10000 });
  await page.waitForTimeout(900); // let the chip + plus finish fading out

  // Chip and plus should both be gone
  expect(await page.locator('.borrow-chip').count()).toBe(0);
  expect(await page.locator('.borrow-plus').count()).toBe(0);

  // The ones cell keeps its original digit "2"; the regrouped value is shown by
  // a separate carry mark "1" to its left, so the column reads "12" (2 + 10).
  const onesCell = page.locator('.worksheet .row.top .cell:nth-child(2)');
  expect((await onesCell.textContent()).trim()).toBe('2');
  const carry = page.locator('.borrow-carry');
  await expect(carry).toHaveText('1');

  // The carry mark sits just to the LEFT of the ones digit (reads as "1" "2").
  const carryBox = await carry.boundingBox();
  const onesBox = await onesCell.boundingBox();
  const carryCenterX = carryBox.x + carryBox.width / 2;
  expect(carryCenterX).toBeLessThan(onesBox.x + onesBox.width / 2); // left of the "2"
  expect(carryCenterX).toBeGreaterThan(onesBox.x - 30);            // but adjacent to the cell
});
