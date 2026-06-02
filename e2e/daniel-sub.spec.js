import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

// Daniel · OP: GETAWAY math-audit. Each problem first plays an auto-borrow
// pre-pass (drag is only wired up afterwards), so we wait it out, then read the
// live problem and drop the difference digits right-to-left.

async function dragDigit(page, digit, slotSel) {
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  const tBox = await tile.boundingBox();
  const sBox = await page.locator(slotSel).first().boundingBox();
  if (!tBox || !sBox) throw new Error(`missing tile ${digit} or active slot`);
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function solveColSub(page) {
  const prob = await page.locator('#screen-col-sub').getAttribute('data-problem'); // "4003-1567"
  const [a, b] = prob.split('-').map(Number);
  const digits = String(a - b).split('').map(Number); // MSB-first
  for (let i = digits.length - 1; i >= 0; i--) { // ones first
    await dragDigit(page, digits[i], '.col-ws .slot.active');
    await page.waitForTimeout(800); // snap + buffer (no carry fly on subtraction)
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (let level = 1; level <= 5; level++) {
  test(`GETAWAY M${level}: solve all 5 problems → 3 stars`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?profile=daniel');
    await unlockAll(page, 'daniel');
    await goToLevel(page, 'nsub', level, 'daniel');
    await expect(page.locator('#screen-col-sub')).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      // Wait out the transition (~0.5s) + borrow pre-pass (up to ~3.5s) before
      // the slots become draggable.
      await page.waitForTimeout(4000);
      await solveColSub(page);
    }

    await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('.star-meter.big .star.earned'),
      `M${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}
