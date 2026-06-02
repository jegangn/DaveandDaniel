/**
 * math-audit-multiplication.spec.js
 *
 * Rigorous math-correctness audit for all 6 multiplication levels (30 problems).
 *   L1-L3: tap-count mode — tap all firefly blocks, then drag the answer.
 *   L4-L6: drag-groups mode — drag blocks from pile into group trays, then drag answer.
 *
 * Operands are verified against SEEDS before every problem via .op-chip elements.
 * Answer correctness is validated by the game accepting the drop and advancing.
 */

import { test, expect } from "@playwright/test";
import {
  SEEDS,
  computeAnswer,
  digitsOf,
  unlockAll,
  goToLevel,
  dragDigitToSlot,
  readMultOperands,
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
// Helper: drag the answer digits into the active slot(s) (ones first, tens second)
// ---------------------------------------------------------------------------
async function enterMultAnswer(page, answer) {
  const digits = digitsOf(answer);
  if (digits.length === 1) {
    await dragDigitToSlot(page, digits[0], page.locator('.slot.active[data-index="0"]'));
  } else {
    // ones first
    await dragDigitToSlot(page, digits[1], page.locator(".slot.active"));
    await page.waitForTimeout(300);
    // then tens
    await dragDigitToSlot(page, digits[0], page.locator(".slot.active"));
  }
}

// ---------------------------------------------------------------------------
// Tap-count levels L1-L3
// ---------------------------------------------------------------------------

for (let level = 1; level <= 3; level++) {
  test(`mult tap L${level}: all 5 problems verified`, async ({ page }) => {
    test.setTimeout(150_000);

    await goToLevel(page, "mult", level);
    await expect(page.locator("#screen-mult-tap")).toBeVisible({ timeout: 5000 });

    const seeds = SEEDS.multTap[level];

    for (let i = 0; i < seeds.length; i++) {
      const [seedA, seedB] = seeds[i];
      const expected = computeAnswer("mult", seedA, seedB);

      // blockFlyIn animation takes ~800ms; problem transition adds 500ms
      await page.waitForTimeout(i === 0 ? 900 : 1100);

      // --- Verify operands ---
      const { a, b } = await readMultOperands(page);
      expect(a, `L${level} P${i + 1}: expected a=${seedA}, got ${a}`).toBe(seedA);
      expect(b, `L${level} P${i + 1}: expected b=${seedB}, got ${b}`).toBe(seedB);

      // --- Verify block count = a × b ---
      const blockCount = await page.locator(".block-host.untapped").count();
      expect(
        blockCount,
        `L${level} P${i + 1}: expected ${seedA * seedB} untapped blocks, got ${blockCount}`
      ).toBe(seedA * seedB);

      // --- Tap all blocks ---
      let remaining = await page.locator(".block-host.untapped").count();
      while (remaining > 0) {
        await page.locator(".block-host.untapped").first().click({ force: true });
        await page.waitForTimeout(160);
        remaining = await page.locator(".block-host.untapped").count();
      }

      // Reveal panel should appear
      await expect(
        page.locator(".total-reveal:not(.hidden)"),
        `L${level} P${i + 1}: reveal panel should appear`
      ).toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(300);

      // --- Enter the answer ---
      await enterMultAnswer(page, expected);

      await page.waitForTimeout(400);
    }

    // Level complete
    await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".complete-title")).toHaveText("LEVEL CLEAR!");
    await expect(
      page.locator(".star-meter.big .star.earned"),
      `L${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}

// ---------------------------------------------------------------------------
// Drag-groups levels L4-L6
// ---------------------------------------------------------------------------

for (let level = 4; level <= 6; level++) {
  test(`mult drag L${level}: all 5 problems verified`, async ({ page }) => {
    test.setTimeout(180_000);

    await goToLevel(page, "mult", level);
    await expect(page.locator("#screen-mult-drag")).toBeVisible({ timeout: 5000 });

    const seeds = SEEDS.multDrag[level];

    for (let i = 0; i < seeds.length; i++) {
      const [seedA, seedB] = seeds[i];
      const expected = computeAnswer("mult", seedA, seedB);

      // Problem transition: 500ms setTimeout in renderProblem + render time
      await page.waitForTimeout(i === 0 ? 400 : 800);

      // --- Verify operands ---
      const { a, b } = await readMultOperands(page);
      expect(a, `L${level} P${i + 1}: expected a=${seedA}, got ${a}`).toBe(seedA);
      expect(b, `L${level} P${i + 1}: expected b=${seedB}, got ${b}`).toBe(seedB);

      // --- Verify tray count = seedA ---
      const trayCount = await page.locator(".group-tray").count();
      expect(
        trayCount,
        `L${level} P${i + 1}: expected ${seedA} group trays, got ${trayCount}`
      ).toBe(seedA);

      // --- Fill each group tray with seedB blocks ---
      for (let g = 0; g < seedA; g++) {
        for (let fill = 0; fill < seedB; fill++) {
          const pileBlock = page.locator(".block-pile .block-host").first();
          const tray = page.locator(`.group-tray[data-idx="${g}"]`);

          const pBox = await pileBlock.boundingBox();
          const tBox = await tray.boundingBox();

          await page.mouse.move(pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 8 });
          await page.mouse.up();
          await page.waitForTimeout(220);
        }

        // Tray chip should show the filled state
        await expect(
          page.locator(`.group-tray[data-idx="${g}"] .count-chip`),
          `L${level} P${i + 1} tray ${g}: expected "★ ${seedB}"`
        ).toHaveText(`★ ${seedB}`, { timeout: 3000 });
      }

      // Answer phase appears after 800ms delay in showAnswerPhase
      await expect(
        page.locator(".ans-host:not(.hidden)"),
        `L${level} P${i + 1}: answer host should appear`
      ).toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(300);

      // --- Enter the answer ---
      await enterMultAnswer(page, expected);

      await page.waitForTimeout(400);
    }

    // Level complete
    await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".complete-title")).toHaveText("LEVEL CLEAR!");
    await expect(
      page.locator(".star-meter.big .star.earned"),
      `L${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}

// ---------------------------------------------------------------------------
// Wrong-digit rejection for multiplication tap mode
// ---------------------------------------------------------------------------
test("mult tap L1 P1: wrong digit bounces back, correct digit accepted", async ({ page }) => {
  test.setTimeout(30_000);

  await goToLevel(page, "mult", 1);
  await expect(page.locator("#screen-mult-tap")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(900);

  // L1 P1: 2×1=2. Tap the 2 blocks first.
  let remaining = await page.locator(".block-host.untapped").count();
  while (remaining > 0) {
    await page.locator(".block-host.untapped").first().click({ force: true });
    await page.waitForTimeout(160);
    remaining = await page.locator(".block-host.untapped").count();
  }
  await expect(page.locator(".total-reveal:not(.hidden)")).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(300);

  // Answer = 2. Drop wrong digit 7 first.
  await dragDigitToSlot(page, 7, page.locator(".slot.active"));
  await page.waitForTimeout(600);

  await expect(page.locator(".slot.active")).toBeVisible();
  await expect(page.locator(".slot.filled")).toHaveCount(0);

  // Drop correct digit 2
  await dragDigitToSlot(page, 2, page.locator(".slot.active"));
  await page.waitForTimeout(400);
  await expect(page.locator(".slot.filled")).toHaveCount(1);
});
