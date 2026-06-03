import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

// Regression: a digit that is BOTH lent-from (a lower column borrows it) AND
// borrowed-into (it then borrows for itself) gets two regroup steps on the same
// column. The pre-pass must show only the final regrouped value above it — not
// stack both marks at the same spot (which rendered a garbled overlap).
//
// Determinism: the screen seeds its RNG from Date.now(). We freeze it so nsub
// L5 problem[0] is always 6060-4177, whose tens column (RTL col 1) is lent-from
// (6->5) then borrowed-into (5->15) — the exact double-borrow shape.
const FROZEN_NOW = 1700000000001;

test.beforeEach(async ({ page }) => {
  await page.addInitScript((t) => {
    localStorage.clear();
    const RealNow = Date.now.bind(Date);
    Date.now = () => t; // fix the problem-generator seed
    // keep constructor-based timing intact for anything else
    void RealNow;
  }, FROZEN_NOW);
});

test('borrow pre-pass shows one mark per column for a double-borrow digit', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');
  await goToLevel(page, 'nsub', 5, 'daniel');
  await expect(page.locator('#screen-col-sub')).toBeVisible({ timeout: 5000 });

  // Sanity: the frozen seed produced the expected double-borrow problem.
  await expect(page.locator('#screen-col-sub')).toHaveAttribute('data-problem', '6060-4177');

  // Wait out the auto-borrow pre-pass (5 steps × ~560ms + resolve buffer).
  await page.waitForTimeout(4000);

  // No top-row cell may hold more than one regroup mark.
  const marksPerCell = await page.$$eval('.col-ws .cell[data-rtl]', (cells) =>
    cells.map((c) => ({
      rtl: c.getAttribute('data-rtl'),
      marks: Array.from(c.querySelectorAll('.regroup-mark')).map((m) => m.textContent.trim()),
    }))
  );

  const offenders = marksPerCell.filter((c) => c.marks.length > 1);
  expect(
    offenders,
    `cells with stacked regroup marks: ${JSON.stringify(offenders)}`
  ).toEqual([]);

  // The double-borrowed tens column (RTL 1) must show its FINAL value (15).
  const tens = marksPerCell.find((c) => c.rtl === '1');
  expect(tens.marks).toEqual(['15']);
});
