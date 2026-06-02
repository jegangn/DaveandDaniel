import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

// Daniel · OP: STOCKPILE math-audit. Problems are generated randomly per mount,
// so we read the live problem (#screen-col-add[data-problem]="168+54"), compute
// the answer, and drag the result digits right-to-left, waiting out the
// auto-carry animation between columns.

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

async function solveColAdd(page) {
  const prob = await page.locator('#screen-col-add').getAttribute('data-problem'); // "168+54"
  const [a, b] = prob.split('+').map(Number);
  const digits = String(a + b).split('').map(Number); // MSB-first
  for (let i = digits.length - 1; i >= 0; i--) { // ones first
    await dragDigit(page, digits[i], '.col-ws .slot.active');
    await page.waitForTimeout(1700); // snap (~0.4s) + possible carry fly (~0.9s) + buffer
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (let level = 1; level <= 5; level++) {
  test(`STOCKPILE M${level}: solve all 5 problems → 3 stars`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?profile=daniel');
    await unlockAll(page, 'daniel');
    await goToLevel(page, 'nadd', level, 'daniel');
    await expect(page.locator('#screen-col-add')).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(i === 0 ? 300 : 700);
      await solveColAdd(page);
    }

    await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('.star-meter.big .star.earned'),
      `M${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}
