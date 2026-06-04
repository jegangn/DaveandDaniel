import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';
import { analyzeShortDiv } from '../src/logic-daniel.js';

// Daniel · OP: SPLIT — decimal short division. Drops the quotient digits
// LEFT-to-RIGHT including the decimal digits (the auto-placed point is not a tile).

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

async function solveShortDiv(page) {
  const prob = await page.locator('#screen-short-div').getAttribute('data-problem'); // "764÷5"
  const [a, b] = prob.split('÷').map(Number);
  const info = analyzeShortDiv(a, b);
  const digits = info.quotientIntDigits.concat(info.quotientDecDigits); // LTR incl. decimals
  for (const d of digits) {
    await dragDigit(page, d, '.div-ws .slot.active');
    await page.waitForTimeout(900); // snap + carried-remainder reveal
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('SPLIT shows an auto-placed decimal point and no remainder', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');
  await goToLevel(page, 'ndiv', 2, 'daniel'); // 3-digit ÷ 2/5 → 1 decimal place
  await expect(page.locator('#screen-short-div')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);
  await expect(page.locator('.div-ws .div-point').first()).toBeVisible();
  await expect(page.locator('.div-ws')).not.toContainText('r ');
  await solveShortDiv(page); // decimal slots are functional
});

for (let level = 1; level <= 5; level++) {
  test(`SPLIT M${level}: solve all 5 problems → 3 stars`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?profile=daniel');
    await unlockAll(page, 'daniel');
    await goToLevel(page, 'ndiv', level, 'daniel');
    await expect(page.locator('#screen-short-div')).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(i === 0 ? 300 : 700);
      await solveShortDiv(page);
    }

    await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('.star-meter.big .star.earned'),
      `M${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}
