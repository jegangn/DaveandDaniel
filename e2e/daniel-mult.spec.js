import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';
import { analyzeLongMult, analyzePartialWork } from '../src/logic-daniel.js';

// Daniel · OP: BUILDSUM. Each partial-product column is built as a little sum:
// the child drags the product (e.g. 9×6=54), the carried "+4" is shown, then the
// child drags the total (58); the total's ones digit drops into the partial row
// and its tens digit carries left. The final addition row is entered the old way
// (result digits + carries by column).

function partialWorks(a, b) {
  const info = analyzeLongMult(a, b);
  return info.partials.map((pp) => analyzePartialWork(a, pp.digit, pp.shift, info.N));
}
function sumSteps(a, b) {
  const info = analyzeLongMult(a, b);
  return info.needsSum ? info.sum.steps : [];
}

async function dragTo(page, digit, sel) {
  const slot = page.locator(sel).first();
  await slot.waitFor({ state: 'visible', timeout: 5000 });
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  await tile.waitFor({ state: 'visible' });
  const tb = await tile.boundingBox(), sb = await slot.boundingBox();
  if (!tb || !sb) throw new Error(`missing tile ${digit} or target ${sel}`);
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function fillNumber(page, kind, numStr) {
  for (let i = 0; i < numStr.length; i++) {
    await dragTo(page, Number(numStr[i]), `.lm-work .lwbox.active[data-kind="${kind}"][data-i="${i}"]`);
    await page.waitForTimeout(450);
  }
}

async function buildColumn(page, c) {
  if (c.carryIn > 0) await fillNumber(page, 'product', String(c.product));
  await fillNumber(page, 'total', String(c.total));
  await page.waitForTimeout(320); // column → next column / phase transition
}

async function solveSum(page, a, b) {
  for (const s of sumSteps(a, b)) {
    const sel = s.kind === 'carry'
      ? `.col-ws .carry-cell.fillable.active[data-col="${s.col}"]`
      : `.col-ws .slot.active[data-col="${s.col}"]`;
    await dragTo(page, s.value, sel);
    await page.waitForTimeout(800);
  }
}

async function solveLongMult(page) {
  const prob = await page.locator('#screen-long-mult').getAttribute('data-problem');
  const [a, b] = prob.split('×').map(Number);
  for (const w of partialWorks(a, b)) {
    for (const c of w.cols) await buildColumn(page, c);
    await page.waitForTimeout(450); // bring-down + phase change
  }
  await solveSum(page, a, b);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (let level = 1; level <= 5; level++) {
  test(`OVERRIDE M${level}: build all 5 problems (sums + carries) → 3 stars`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto('/?profile=daniel');
    await unlockAll(page, 'daniel');
    await goToLevel(page, 'nmul', level, 'daniel');
    await expect(page.locator('#screen-long-mult')).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(i === 0 ? 400 : 700);
      await solveLongMult(page);
    }

    await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('.star-meter.big .star.earned'),
      `M${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}

test('BUILDSUM: a carry column shows "product + carry" and the child builds the total', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');

  // Re-roll until the first partial has a write-and-carry column.
  let a, b, work, carryIdx = -1;
  for (let t = 0; t < 15; t++) {
    await goToLevel(page, 'nmul', 5, 'daniel');
    await expect(page.locator('#screen-long-mult')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);
    const prob = await page.locator('#screen-long-mult').getAttribute('data-problem');
    [a, b] = prob.split('×').map(Number);
    const info = analyzeLongMult(a, b);
    work = analyzePartialWork(a, info.partials[0].digit, info.partials[0].shift, info.N);
    carryIdx = work.cols.findIndex((c) => c.carryIn > 0);
    if (carryIdx >= 0) break;
  }
  expect(carryIdx, 'a partial column with a carry').toBeGreaterThanOrEqual(0);

  // Build the columns up to the carry column.
  for (let k = 0; k < carryIdx; k++) await buildColumn(page, work.cols[k]);

  const c = work.cols[carryIdx];
  // The carry column shows the "+N" carried number and the product boxes first.
  await expect(page.locator('.lm-work .lw-add')).toHaveText(`+${c.carryIn}`);
  await expect(page.locator('.lm-work .lwbox.active[data-kind="product"]').first()).toBeVisible();
  await fillNumber(page, 'product', String(c.product));
  // Product is now shown; the TOTAL boxes become the active targets to build.
  await expect(page.locator('.lm-work .lwbox.filled[data-kind="product"]')).toHaveCount(String(c.product).length);
  await expect(page.locator('.lm-work .lwbox.active[data-kind="total"]').first()).toBeVisible();
});
