import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';
import { analyzeLongMult, buildGroups } from '../src/logic-daniel.js';

// Daniel · OP: OVERRIDE + CARRYOVER + CARRYORDER. The child fills every result
// digit AND every carry, right-to-left, on each partial row and the final sum.
// A result digit and the carry it produces ("write 4, carry 5") are one group
// the child may fill in EITHER order, so each box is targeted by its own column
// rather than "the single active box" — both boxes of a pair are active at once.

function phasesOf(a, b) {
  const info = analyzeLongMult(a, b);
  return info.needsSum
    ? [['p0', info.partials[0]], ['p1', info.partials[1]], ['sum', info.sum]]
    : [['p0', info.partials[0]]];
}

// Every drop step, tagged with the phase its box lives in.
function dropSteps(a, b) {
  return phasesOf(a, b).flatMap(([key, ph]) => ph.steps.map((s) => ({ ...s, phase: key })));
}

// The exact active box a step belongs to (result slot OR fillable carry cell).
function boxSel(step) {
  const kind = step.kind === 'carry' ? '.carry-cell.fillable' : '.slot';
  return `.col-ws ${kind}.active[data-col="${step.col}"][data-phase="${step.phase}"]`;
}

async function dragDigit(page, digit, slotSel) {
  const slot = page.locator(slotSel).first();
  await slot.waitFor({ state: 'visible' });
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  await tile.waitFor({ state: 'visible' });
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  if (!tBox || !sBox) throw new Error(`missing tile ${digit} or active box ${slotSel}`);
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function solveLongMult(page) {
  const prob = await page.locator('#screen-long-mult').getAttribute('data-problem'); // "56×74"
  const [a, b] = prob.split('×').map(Number);
  for (const step of dropSteps(a, b)) {
    await dragDigit(page, step.value, boxSel(step));
    await page.waitForTimeout(1000); // snap + re-render
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
});

// CARRYORDER — the headline change: a result digit and the carry it produces
// may be entered in EITHER order. "9×6=54" → the child can drop the 5 first or
// the 4 first. Both boxes of the pair are active at once; the carry no longer
// has to wait for its result.
test('CARRYORDER: the carry may be dropped before its result digit', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');

  // Re-roll until the first partial has a real write-and-carry pair (most do;
  // a few like 42×1 don't). Each navigation re-seeds with a fresh problem.
  let a, b, groups, pairIdx = -1;
  for (let tries = 0; tries < 15; tries++) {
    await goToLevel(page, 'nmul', 5, 'daniel');
    await expect(page.locator('#screen-long-mult')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);
    const prob = await page.locator('#screen-long-mult').getAttribute('data-problem');
    [a, b] = prob.split('×').map(Number);
    groups = buildGroups(analyzeLongMult(a, b).partials[0].steps);
    pairIdx = groups.findIndex((g) => g.length === 2);
    if (pairIdx >= 0) break;
  }
  expect(pairIdx, 'a 2×2 partial with a carry pair').toBeGreaterThanOrEqual(0);

  // Fill the leading single-step groups (results with no carry) in order.
  for (let gi = 0; gi < pairIdx; gi++) {
    const s = { ...groups[gi][0], phase: 'p0' };
    await dragDigit(page, s.value, boxSel(s));
    await page.waitForTimeout(1000);
  }

  // buildSequence emits result first, then its carry — but BOTH are now active.
  const result = { ...groups[pairIdx][0], phase: 'p0' };
  const carry = { ...groups[pairIdx][1], phase: 'p0' };
  await expect(page.locator(boxSel(result))).toHaveCount(1);
  await expect(page.locator(boxSel(carry))).toHaveCount(1);

  // Drop the CARRY first.
  await dragDigit(page, carry.value, boxSel(carry));
  await page.waitForTimeout(1000);
  await expect(
    page.locator(`.col-ws .carry-cell.fillable.filled[data-col="${carry.col}"][data-phase="p0"]`)
  ).toHaveCount(1);
  // Its result box is still waiting.
  await expect(page.locator(boxSel(result))).toHaveCount(1);

  // The result digit then completes the pair and the row advances.
  await dragDigit(page, result.value, boxSel(result));
  await page.waitForTimeout(1000);
  await expect(
    page.locator(`.col-ws .slot.filled[data-col="${result.col}"][data-phase="p0"]`)
  ).toHaveCount(1);
});
