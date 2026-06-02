/**
 * math-audit-addition.spec.js
 *
 * Rigorous math-correctness audit for all 6 addition levels (30 problems total).
 * Each test navigates to a level, verifies the displayed operands match the seed
 * table for every problem, drops the correct digits, and confirms 3 stars on
 * level-complete. Also includes a wrong-digit-rejection test.
 */

import { test, expect } from "@playwright/test";
import {
  SEEDS,
  computeAnswer,
  digitsOf,
  unlockAll,
  goToLevel,
  dragDigitToSlot,
  dragCompoundToSlot,
  enterAnswer,
  readWorksheetOperands,
} from "./helpers/math.js";

// ---------------------------------------------------------------------------
// Shared setup: unlock all levels before each test
// ---------------------------------------------------------------------------
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await unlockAll(page);
  // Re-navigate so the router initialises with the unlocked progress visible
  await page.goto("/");
});

// ---------------------------------------------------------------------------
// Addition L1-L6: 5 problems each, operands verified, answer entered, 3 stars
// ---------------------------------------------------------------------------

for (let level = 1; level <= 6; level++) {
  test(`addition L${level}: all 5 problems verified against seed table`, async ({ page }) => {
    test.setTimeout(120_000);

    await goToLevel(page, "add", level);
    await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });

    const seeds = SEEDS.add[level];

    for (let i = 0; i < seeds.length; i++) {
      const [seedA, seedB] = seeds[i];
      const expected = computeAnswer("add", seedA, seedB);
      const onesSum = (seedA % 10) + (seedB % 10);
      const hasCarry = onesSum >= 10;

      // Wait for problem to render (transition from prior problem = 500ms setTimeout
      // in advanceProblem, plus a little buffer)
      await page.waitForTimeout(i === 0 ? 400 : 700);

      // --- Verify operands match the seed table ---
      const { a, b } = await readWorksheetOperands(page);
      expect(a, `L${level} P${i + 1}: expected operand a=${seedA}, got ${a}`).toBe(seedA);
      expect(b, `L${level} P${i + 1}: expected operand b=${seedB}, got ${b}`).toBe(seedB);

      // --- Enter the correct answer ---
      // Carry problems require compound tile for ones slot
      await enterAnswer(page, expected, { hasCarry, onesSum: hasCarry ? onesSum : null });

      // Brief pause after final digit so advance animation starts
      await page.waitForTimeout(300);
    }

    // Level complete screen with 3 stars (zero wrong drops)
    await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".complete-title")).toHaveText("LEVEL CLEAR!");
    await expect(
      page.locator(".star-meter.big .star.earned"),
      `L${level}: expected 3 stars earned`
    ).toHaveCount(3, { timeout: 5000 });
  });
}

// ---------------------------------------------------------------------------
// Wrong-digit rejection: drop wrong digit → slot stays empty; correct → fills
// ---------------------------------------------------------------------------
test("addition L1 P1: wrong digit bounces back, correct digit accepted", async ({ page }) => {
  test.setTimeout(30_000);

  await goToLevel(page, "add", 1);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // L1 P1: 12 + 3 = 15. Active slot expects ones digit = 5.
  // Drop wrong digit 7 first.
  await dragDigitToSlot(page, 7, page.locator(".slot.active"));
  await page.waitForTimeout(600); // bounce-back animation ~450ms

  // Slot must still be active and empty
  await expect(page.locator(".slot.active")).toBeVisible();
  await expect(page.locator(".slot.filled")).toHaveCount(0);

  // Now drop the correct ones digit (5)
  await dragDigitToSlot(page, 5, page.locator(".slot.active"));
  await page.waitForTimeout(400);

  // Ones slot is now filled
  await expect(page.locator(".slot.filled")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// RTL enforcement: dropping tens before ones is rejected
// ---------------------------------------------------------------------------
test("addition L1 P1: tens slot rejected before ones slot is filled", async ({ page }) => {
  test.setTimeout(30_000);

  await goToLevel(page, "add", 1);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // L1 P1 answer = 15. Tens slot is data-index="0", currently inactive.
  // Try dragging digit 1 onto the inactive tens slot.
  await dragDigitToSlot(page, 1, page.locator('.slot.inactive[data-index="0"]'));
  await page.waitForTimeout(600);

  // Nothing should be filled — active slot (ones) is still active and empty
  await expect(page.locator(".slot.active")).toBeVisible();
  await expect(page.locator(".slot.filled")).toHaveCount(0);
});
