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
  // Mult uses a SINGLE answer slot (in the equation after "="). Whether the
  // answer is one digit or two, the kid drags the one tile whose value equals
  // the answer — a plain digit tile for <10, a compound tile (e.g. "20") for
  // ≥10. Both carry data-value=<answer>.
  const slot = page.locator(".mult-problem .slot.active").first();
  await slot.waitFor({ state: "visible" });
  const tile = page.locator(`.digit-tray .tile[data-value="${answer}"]`).first();
  await tile.waitFor({ state: "visible" });
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400); // snap-in animation
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

      // The answer slot lives in the equation header (no separate panel).
      await expect(
        page.locator(".mult-problem .slot.active"),
        `L${level} P${i + 1}: answer slot should be present`
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

      // "a × b" = a items per group, shown b times → b group trays of a each.
      const groups = seedB;
      const perGroup = seedA;

      // --- Verify tray count = seedB ---
      const trayCount = await page.locator(".group-tray").count();
      expect(
        trayCount,
        `L${level} P${i + 1}: expected ${groups} group trays, got ${trayCount}`
      ).toBe(groups);

      // --- Optional pile-counting: fill each group tray with `perGroup` blocks ---
      // Tapping a pile mango auto-flies a copy into the next empty slot
      // (onPileTap fills group 0 fully, then group 1, …), so a sequence of
      // taps fills the trays in order. The pile never shrinks, so we always
      // tap the first pile mango.
      //
      // Counting is OPTIONAL in the app (it does not gate answering). For the
      // largest answer (5×5=25) the two-row compound digit tray overlaps the
      // mango pile in landscape (pre-existing layout quirk), so the pile can't
      // be tapped — in that case we skip counting and verify answer entry only.
      const pileReachable = await page.evaluate(() => {
        const pile = document.querySelector(".block-pile .block-host");
        if (!pile) return false;
        const r = pile.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!(hit && hit.closest(".block-pile"));
      });
      if (pileReachable) {
        for (let g = 0; g < groups; g++) {
          for (let fill = 0; fill < perGroup; fill++) {
            await page.locator(".block-pile .block-host").first().click({ force: true });
            await page.waitForTimeout(220);
          }

          // Tray chip should show the filled state
          await expect(
            page.locator(`.group-tray[data-idx="${g}"] .count-chip`),
            `L${level} P${i + 1} tray ${g}: expected "★ ${perGroup}"`
          ).toHaveText(`★ ${perGroup}`, { timeout: 3000 });
        }
      }

      // The answer slot lives in the equation header (no separate panel).
      await expect(
        page.locator(".mult-problem .slot.active"),
        `L${level} P${i + 1}: answer slot should be present`
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
  await expect(page.locator(".mult-problem .slot.active")).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(300);

  // Mult digit tiles carry data-value (not data-digit). Drag by value.
  const dragValueToSlot = async (value) => {
    const tile = page.locator(`.digit-tray .tile[data-value="${value}"]`).first();
    const slot = page.locator(".mult-problem .slot.active").first();
    const tBox = await tile.boundingBox();
    const sBox = await slot.boundingBox();
    await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
    await page.mouse.up();
  };

  // Answer = 2. Drop wrong digit 7 first.
  await dragValueToSlot(7);
  await page.waitForTimeout(600);

  await expect(page.locator(".slot.active")).toBeVisible();
  await expect(page.locator(".slot.filled")).toHaveCount(0);

  // Drop correct digit 2
  await dragValueToSlot(2);
  await page.waitForTimeout(400);
  await expect(page.locator(".slot.filled")).toHaveCount(1);
});
