import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

test('borrow: 10 + 4 equation is briefly visible before ones digit becomes 14', async ({ page }) => {
  test.setTimeout(20_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').click();
  // Sub L4 problem 1 is 32-15: ones-top is 2, borrow makes it 12.
  // Or sub L3 problem 1: 22-7 — ones-top is 2 → 12 after borrow.
  // Either way the "+" reveal applies. Use L3.
  await page.locator('.world-panel').nth(1).locator('.level-node[data-level="3"]').click();

  // Wait until the chip has finished its drop and the "+" should be visible:
  // Phase A ends ~1300ms, held 300ms, Phase B 1300ms → "+" appears ~2900ms in.
  await page.waitForTimeout(3200);

  // The "+" sign should be on screen
  const plus = page.locator('.borrow-plus');
  await expect(plus).toBeVisible();
  expect((await plus.textContent()).trim()).toBe('+');

  // The "10" chip should still be visible (to the left of the ones cell)
  const chip = page.locator('.borrow-chip');
  await expect(chip).toBeVisible();
  expect((await chip.textContent()).trim()).toBe('10');

  // The ones cell should STILL show the original ones digit, not the regrouped one
  const onesCell = page.locator('.worksheet .row.top .cell:nth-child(2)');
  const onesText = (await onesCell.textContent()).trim();
  expect(onesText.length).toBe(1); // still single digit ("2"), not "12" yet

  // Visual sanity: chip is above the plus, and the plus is above the
  // visible digit. The plus may overlap the cell's whitespace area since
  // the digit itself is centered in the cell with ~26px of empty space
  // at the top.
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

  // The new tens "1" (.borrow-replacement) should be centered above the tens cell
  const newTens = page.locator('.borrow-replacement');
  await expect(newTens).toBeVisible();
  const newTensBox = await newTens.boundingBox();
  const tensCell = page.locator('.worksheet .row.top .cell:nth-child(1)');
  const tensBox = await tensCell.boundingBox();
  const newTensCenterX = newTensBox.x + newTensBox.width / 2;
  const tensCenterX = tensBox.x + tensBox.width / 2;
  expect(Math.abs(newTensCenterX - tensCenterX)).toBeLessThan(8);

  await page.screenshot({ path: 'test-results/borrow-equation.png' });
});

test('borrow: by the end of the animation the ones cell shows the regrouped value', async ({ page }) => {
  test.setTimeout(15_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(1).locator('.level-node[data-level="3"]').click();

  await page.waitForFunction(() => {
    const cell = document.querySelector('.worksheet .row.top .cell:nth-child(2)');
    return cell && cell.textContent.trim().length === 2;
  }, { timeout: 10000 });

  // Wait for the final fade-in + cleanup
  await page.waitForTimeout(800);

  // Chip and plus should both be gone
  expect(await page.locator('.borrow-chip').count()).toBe(0);
  expect(await page.locator('.borrow-plus').count()).toBe(0);

  // Ones cell shows the new regrouped digit
  const onesText = (await page.locator('.worksheet .row.top .cell:nth-child(2)').textContent()).trim();
  expect(onesText).toBe('12'); // for 22-7: ones 2 + 10 = 12
});
