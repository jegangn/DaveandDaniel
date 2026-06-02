/**
 * math-audit-subtraction.spec.js
 *
 * Rigorous math-correctness audit for all 6 subtraction levels (30 problems total).
 *
 * Borrow note:
 *   When aOnes < bOnes the game plays animateBorrow (~1050ms) before the player
 *   can drag. After borrow the worksheet shows regrouped values:
 *     tens cell: aTens - 1
 *     ones cell: aOnes + 10   (shown as two-digit text, e.g. "12")
 *   readWorksheetOperands() joins the raw cell text, which yields a mis-parsed
 *   number for regrouped ones (e.g. "2" + "12" = "212"). So on borrow problems
 *   we verify b only and trust the answer-drop as the math-correctness assertion.
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
      // advanceProblem's 500ms transition + borrow animation if applicable.
      const baseWait = i === 0 ? 400 : 700;
      const borrowWait = needsBorrow ? 1200 : 0;
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
//   After animation: ones cell = "12", replacement = "2"
// ---------------------------------------------------------------------------
test("subtraction L4 P1: borrow animation shows regrouped values correctly", async ({ page }) => {
  test.setTimeout(30_000);

  await goToLevel(page, "sub", 4);
  await expect(page.locator("#screen-sub")).toBeVisible({ timeout: 5000 });

  // animateBorrow ~1050ms — wait for it
  await page.waitForTimeout(1400);

  // 32 - 15: aTens=3, aOnes=2. Borrow: newTens=2, onesBecomesValue=12.
  await expect(page.locator(".strike")).toBeVisible();
  await expect(page.locator(".borrow-replacement")).toHaveText("2");
  const onesCell = page.locator(".row.top .cell").nth(1);
  await expect(onesCell).toHaveText("12");
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
