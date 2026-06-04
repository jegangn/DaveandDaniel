/**
 * math-audit-subtraction.spec.js
 *
 * Rigorous math-correctness audit for all 6 subtraction levels (30 problems total).
 *
 * Borrow note:
 *   When aOnes < bOnes the game plays animateBorrow (a ~6.5s teacher's-pen
 *   walkthrough) BEFORE the tiles become draggable, so each borrow problem must
 *   wait the animation out. After borrow the worksheet shows regrouped values
 *   as teacher's notation: the tens digit is struck and rewritten (aTens - 1),
 *   and a separate "1" carry mark is drawn beside the UNCHANGED ones digit (so
 *   the ones column reads aOnes+10, e.g. "1" + "2" = "12", while the cell text
 *   itself stays "2"). readWorksheetOperands() joins the raw cell text, which on
 *   borrow problems no longer equals seedA, so we verify b only and trust the
 *   answer-drop as the math-correctness assertion.
 */

import { test, expect } from "@playwright/test";
import {
  SEEDS,
  computeAnswer,
  unlockAll,
  goToLevel,
  enterAnswer,
  readWorksheetOperands,
} from "./helpers/math.js";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await unlockAll(page);
  await page.goto("/");
});

// ---------------------------------------------------------------------------
// Subtraction L1-L6
// ---------------------------------------------------------------------------

for (let level = 1; level <= 6; level++) {
  test(`subtraction L${level}: all 5 problems verified against seed table`, async ({ page }) => {
    test.setTimeout(120_000);

    await goToLevel(page, "sub", level);
    await expect(page.locator("#screen-sub")).toBeVisible({ timeout: 5000 });

    const seeds = SEEDS.sub[level];

    for (let i = 0; i < seeds.length; i++) {
      const [seedA, seedB] = seeds[i];
      const expected = computeAnswer("sub", seedA, seedB);
      const needsBorrow = (seedA % 10) < (seedB % 10);

      // On first problem wait for initial render; on subsequent ones wait for
      // advanceProblem's 500ms transition. Borrow problems then play a ~6.5s
      // animation that blocks dragging until it resolves (setupDrag fires only
      // after animateBorrow's promise settles), so wait it out fully.
      const baseWait = i === 0 ? 400 : 700;
      const borrowWait = needsBorrow ? 7000 : 0;
      await page.waitForTimeout(baseWait + borrowWait);

      // --- Verify operands ---
      const { a, b } = await readWorksheetOperands(page);

      if (!needsBorrow) {
        // Straight subtraction: worksheet shows original operands
        expect(a, `L${level} P${i + 1}: expected a=${seedA}, got ${a}`).toBe(seedA);
      }
      // b (subtrahend) is always unchanged by borrow animation
      expect(b, `L${level} P${i + 1}: expected b=${seedB}, got ${b}`).toBe(seedB);

      // --- Enter the correct answer ---
      await enterAnswer(page, expected);

      await page.waitForTimeout(300);
    }

    // Level complete with 3 stars
    await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".complete-title")).toHaveText("LEVEL CLEAR!");
    await expect(
      page.locator(".star-meter.big .star.earned"),
      `L${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}

// ---------------------------------------------------------------------------
// Borrow animation check: L4 P1 (32-15, needsBorrow=true)
//   Tens digit struck + rewritten "2"; ones column shows carry "1" beside "2".
// ---------------------------------------------------------------------------
test("subtraction L4 P1: borrow animation shows regrouped values correctly", async ({ page }) => {
  test.setTimeout(30_000);

  await goToLevel(page, "sub", 4);
  await expect(page.locator("#screen-sub")).toBeVisible({ timeout: 5000 });

  // 32 - 15: aTens=3, aOnes=2. Borrow: new tens digit = 2, ones regroups to 12.
  // Phase A: the tens digit is struck and a small "2" is written above it.
  await page.waitForSelector(".strike", { timeout: 5000 });
  await expect(page.locator(".strike")).toBeVisible();
  await expect(page.locator(".borrow-replacement:not(.borrow-carry)")).toHaveText("2");

  // The regrouped ones value is shown as a carry mark "1" beside the UNCHANGED
  // ones digit "2" (reading "12"); the cell text itself stays "2".
  await page.waitForSelector(".borrow-carry", { timeout: 9000 });
  await expect(page.locator(".borrow-carry")).toHaveText("1");
  const onesCell = page.locator(".row.top .cell").nth(1);
  await expect(onesCell).toHaveText("2");
});

// ---------------------------------------------------------------------------
// Wrong-digit rejection for subtraction
// ---------------------------------------------------------------------------
test("subtraction L1 P1: wrong digit bounces back, correct digit accepted", async ({ page }) => {
  test.setTimeout(30_000);

  await goToLevel(page, "sub", 1);
  await expect(page.locator("#screen-sub")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // L1 P1: 15 - 3 = 12. Ones slot expects 2.
  // Drop wrong digit 7 first.
  const { dragDigitToSlot } = await import("./helpers/math.js");
  await dragDigitToSlot(page, 7, page.locator(".slot.active"));
  await page.waitForTimeout(600);

  await expect(page.locator(".slot.active")).toBeVisible();
  await expect(page.locator(".slot.filled")).toHaveCount(0);

  // Drop correct ones digit 2
  await dragDigitToSlot(page, 2, page.locator(".slot.active"));
  await page.waitForTimeout(400);
  await expect(page.locator(".slot.filled")).toHaveCount(1);
});
