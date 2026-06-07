import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';
import { analyzeLongMult } from '../src/logic-daniel.js';

// Daniel · OP: OVERRIDE + CARRYOVER. The child fills every result digit AND every
// carry, right-to-left, on each partial row and the final sum. We compute the
// exact ordered drop values from the real analyzer and drop each onto whichever
// box is currently active (result slot OR fillable carry cell).

const ACTIVE = '.col-ws .slot.active, .col-ws .carry-cell.fillable.active';

function dropValues(a, b) {
  const info = analyzeLongMult(a, b);
  const phases = info.needsSum
    ? [info.partials[0], info.partials[1], info.sum]
    : [info.partials[0]];
  return phases.flatMap((ph) => ph.steps.map((s) => s.value));
}

async function dragDigit(page, digit, slotSel) {
  const slot = page.locator(slotSel).first();
  await slot.waitFor({ state: 'visible' });
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  await tile.waitFor({ state: 'visible' });
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  if (!tBox || !sBox) throw new Error(`missing tile ${digit} or active box`);
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function solveLongMult(page) {
  const prob = await page.locator('#screen-long-mult').getAttribute('data-problem'); // "56×74"
  const [a, b] = prob.split('×').map(Number);
  for (const v of dropValues(a, b)) {
    await dragDigit(page, v, ACTIVE);
    await page.waitForTimeout(1000); // snap + re-render (no auto carry-fly anymore)
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (let level = 1; level <= 5; level++) {
  test(`OVERRIDE M${level}: solve all 5 problems (results + carries) → 3 stars`, async ({ page }) => {
    test.setTimeout(240_000);
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

test('OVERRIDE: carries are child-filled, not auto (a 2×2 problem)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');
  await goToLevel(page, 'nmul', 5, 'daniel'); // 2-digit × 2-digit
  await expect(page.locator('#screen-long-mult')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // Fillable carry boxes exist for this problem, and none is pre-filled.
  await expect(page.locator('.col-ws .carry-cell.fillable')).not.toHaveCount(0);
  await expect(page.locator('.col-ws .carry-cell.fillable.filled')).toHaveCount(0);

  // After the first result digit, a carry box becomes the active target.
  const prob = await page.locator('#screen-long-mult').getAttribute('data-problem');
  const [a, b] = prob.split('×').map(Number);
  const first = dropValues(a, b)[0];
  await dragDigit(page, first, ACTIVE);
  await page.waitForTimeout(1000);
  await expect(page.locator('.col-ws .carry-cell.fillable.active')).toHaveCount(1);
});
