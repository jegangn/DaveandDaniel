/**
 * compound-tile.spec.js
 *
 * Verifies the compound-tile mechanic for carry addition problems:
 *  1. Compound row (10-18) appears only for carry problems.
 *  2. Dragging the correct compound tile splits correctly (ones into slot, carry flies up).
 *  3. Wrong compound tile is rejected.
 *  4. Single-digit tile is rejected on the ones slot of a carry problem.
 *  5. Carry slot is positioned directly above the tens cell of the top operand.
 */

import { test, expect } from "@playwright/test";
import { unlockAll, goToLevel, dragDigitToSlot, dragCompoundToSlot } from "./helpers/math.js";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await unlockAll(page);
  await page.goto("/");
});

// ---------------------------------------------------------------------------
// L3 P1: 15 + 6 = 21, onesSum = 11
// ---------------------------------------------------------------------------

test("addition L3 P1 (15+6): compound row appears for carry problem", async ({ page }) => {
  await goToLevel(page, "add", 3);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // 9 compound tiles: 10 through 18
  const compounds = page.locator(".tile.compound");
  await expect(compounds).toHaveCount(9);
});

test("addition L3 P1 (15+6): correct compound tile 11 snaps ones=1 and carry flies", async ({ page }) => {
  test.setTimeout(30_000);
  await goToLevel(page, "add", 3);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // Drag compound tile "11" to the active (ones) slot
  await dragCompoundToSlot(page, 11, page.locator(".slot.active"));
  // Wait for snap + carry fly animation
  await page.waitForTimeout(1500);

  // Ones slot filled with "1"
  await expect(page.locator(".slot.filled")).toHaveCount(1);
  await expect(page.locator(".slot.filled")).toContainText("1");

  // Carry slot filled with "1"
  await expect(page.locator(".carry-slot.filled")).toBeVisible();
  await expect(page.locator(".carry-slot.filled")).toContainText("1");

  // Tens slot is now active
  await expect(page.locator(".slot.active")).toHaveCount(1);
  await expect(page.locator(".slot.active[data-index='0']")).toBeVisible();
});

test("addition L3 P1: correct compound then correct tens advances problem (P2 loads)", async ({ page }) => {
  test.setTimeout(30_000);
  await goToLevel(page, "add", 3);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // P1: 15+6=21. Compound 11 → ones, then digit 2 → tens
  await dragCompoundToSlot(page, 11, page.locator(".slot.active"));
  await page.waitForTimeout(1500); // wait for snap + flyCarry + re-render

  await dragDigitToSlot(page, 2, page.locator(".slot.active"));
  await page.waitForTimeout(200); // brief pause before advance

  // P2 (18+4=22) should now load after 500ms — the progress dot for P1 should be filled
  await page.waitForTimeout(600);
  // Second dot should now be current (P2), first dot filled (P1 done)
  const filledDot = page.locator(".progress-dots .dot.filled");
  await expect(filledDot).toHaveCount(1, { timeout: 3000 });
});

test("addition L3 P1: wrong compound (12) is rejected", async ({ page }) => {
  test.setTimeout(30_000);
  await goToLevel(page, "add", 3);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // 15+6=21, correct onesSum=11; drag 12 instead
  await dragCompoundToSlot(page, 12, page.locator(".slot.active"));
  await page.waitForTimeout(700);

  // No slot filled, still active
  await expect(page.locator(".slot.filled")).toHaveCount(0);
  await expect(page.locator(".slot.active")).toHaveCount(1);
});

test("addition L3 P1: single-digit tile on ones slot rejected in carry problem", async ({ page }) => {
  test.setTimeout(30_000);
  await goToLevel(page, "add", 3);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  // Try dragging digit "1" (single) to the ones slot
  await dragDigitToSlot(page, 1, page.locator(".slot.active"));
  await page.waitForTimeout(700);

  // Slot must remain empty
  await expect(page.locator(".slot.filled")).toHaveCount(0);
  await expect(page.locator(".slot.active")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// Non-carry level: no compound row
// ---------------------------------------------------------------------------

test("non-carry addition L1: no compound tiles shown", async ({ page }) => {
  await goToLevel(page, "add", 1);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  await expect(page.locator(".tile.compound")).toHaveCount(0);
});

test("non-carry addition L2: no compound tiles shown", async ({ page }) => {
  await goToLevel(page, "add", 2);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  await expect(page.locator(".tile.compound")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Carry slot position: horizontally centered on tens cell, above the row
// ---------------------------------------------------------------------------

test("carry slot is horizontally centered on the top operand tens cell", async ({ page }) => {
  test.setTimeout(30_000);
  await goToLevel(page, "add", 3);
  await expect(page.locator("#screen-add")).toBeVisible({ timeout: 5000 });
  // Give requestAnimationFrame time to fire so carry slot is repositioned
  await page.waitForTimeout(600);

  const carrySlot = page.locator(".carry-slot").first();
  const tensCell = page.locator(".worksheet .row.top .cell:nth-child(1)").first();

  const csBox = await carrySlot.boundingBox();
  const tcBox = await tensCell.boundingBox();

  expect(csBox, "carry slot should have a bounding box").not.toBeNull();
  expect(tcBox, "tens cell should have a bounding box").not.toBeNull();

  const csCenter = csBox.x + csBox.width / 2;
  const tcCenter = tcBox.x + tcBox.width / 2;

  // Horizontally within 15px of the tens cell center
  expect(
    Math.abs(csCenter - tcCenter),
    `carry slot center (${csCenter}) should be within 15px of tens cell center (${tcCenter})`
  ).toBeLessThan(15);

  // Carry slot bottom edge should be above the tens cell top edge (allow up to 4px overlap for sub-pixel rounding)
  expect(
    csBox.y + csBox.height,
    `carry slot bottom (${csBox.y + csBox.height}) should be above tens cell top (${tcBox.y})`
  ).toBeLessThan(tcBox.y + 4);
});
