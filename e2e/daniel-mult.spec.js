import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

// Daniel · OP: OVERRIDE math-audit. Reads the live problem, then drops the
// partial-product digits and (for 2×2) the sum digits in entry order, always
// onto the single active slot. The screen advances phases automatically.

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

async function solveLongMult(page) {
  const prob = await page.locator('#screen-long-mult').getAttribute('data-problem'); // "47×38"
  const [a, b] = prob.split('×').map(Number);
  const ones = b % 10, tens = Math.floor(b / 10);
  const seq = [];
  const pushRTL = (v) => { const d = String(v).split('').map(Number); for (let i = d.length - 1; i >= 0; i--) seq.push(d[i]); };
  pushRTL(a * ones);                 // partial 0 (= product when ×1-digit)
  if (b >= 10) { pushRTL(a * tens); pushRTL(a * b); } // partial 1, then sum
  for (const d of seq) {
    await dragDigit(page, d, '.col-ws .slot.active');
    await page.waitForTimeout(1300); // snap + phase re-render + possible sum carry
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (let level = 1; level <= 5; level++) {
  test(`OVERRIDE M${level}: solve all 5 problems → 3 stars`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/?profile=daniel');
    await unlockAll(page, 'daniel');
    await goToLevel(page, 'nmul', level, 'daniel');
    await expect(page.locator('#screen-long-mult')).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(i === 0 ? 300 : 700);
      await solveLongMult(page);
    }

    await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('.star-meter.big .star.earned'),
      `M${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}
