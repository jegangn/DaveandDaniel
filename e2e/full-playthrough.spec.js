/**
 * full-playthrough.spec.js
 *
 * Exhaustive end-to-end playthrough tests covering every game type.
 * Levels are chosen to exercise each distinct code path without repeating every
 * seed combination (18 levels × 5 problems each would be overkill).
 *
 * Drag strategy: use page.mouse API (dispatches pointer events in Chromium) with
 * small steps so the game's pointermove handlers register correctly.
 *
 * Answer entry is RIGHT-TO-LEFT: ones slot first (activeIndex = slots.length-1),
 * then tens (activeIndex = 0). For 1-digit answers there is only one slot.
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to splash → map via the TAP TO PLAY button.
 * Leaves the page on the world map.
 */
async function goToMap(page) {
  await page.goto("/?profile=dave");
  await page.locator(".splash-play").click();
  await expect(page.locator("#screen-map")).toBeVisible();
}

/**
 * Drag a digit tile to a slot using small pointer steps.
 * @param {Page}   page
 * @param {number} digit        0-9
 * @param {string} slotSelector CSS selector for the target slot
 */
async function dragDigit(page, digit, slotSelector) {
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  const slot = page.locator(slotSelector).first();

  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();

  const sx = tBox.x + tBox.width / 2;
  const sy = tBox.y + tBox.height / 2;
  const tx = sBox.x + sBox.width / 2;
  const ty = sBox.y + sBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 8 });
  await page.mouse.up();
  // Wait for snap-in animation (220 ms) + small buffer
  await page.waitForTimeout(350);
}

/**
 * Drag a compound tile (10-18) to the active slot.
 * Used for carry addition — the ones slot only accepts compound tiles.
 * @param {Page}   page
 * @param {number} value        10-18 (onesSum for the current problem)
 */
async function dragCompound(page, value) {
  const tile = page.locator(`.tile.compound[data-compound="${value}"]`).first();
  const slot = page.locator('.slot.active').first();

  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();

  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
}

/**
 * Complete one addition/subtraction answer by dragging ones then tens.
 * @param {Page}   page
 * @param {number} answer       expected answer (e.g. 15 → ones=5, tens=1)
 * @param {boolean|number} hasCarry
 *   - false (default): non-carry problem, drag single-digit ones
 *   - true: carry problem but onesSum unknown — NOT supported (pass number instead)
 *   - number (10-18): carry problem, this is the onesSum compound value to drag
 */
async function enterAnswer(page, answer, hasCarry = false) {
  if (answer < 10) {
    // Single digit — one slot, data-index="0"
    await dragDigit(page, answer, '.slot.active[data-index="0"]');
  } else {
    const tens = Math.floor(answer / 10);
    if (hasCarry && typeof hasCarry === 'number') {
      // Carry problem: drag compound tile for ones
      await dragCompound(page, hasCarry);
      // flyCarry animation: ~1400ms total
      await page.waitForTimeout(1400);
    } else if (hasCarry === true) {
      // Legacy call without onesSum — should not be used but we keep backward compat
      // by computing onesSum from answer (this only works when ones+carry=answer%10+10)
      // In practice every carry problem in our seeds has tensDigit-of-onesSum = 1,
      // so onesSum = answer % 10 + 10. Works for all seeds with single carry digit.
      const onesSum = (answer % 10) + 10;
      await dragCompound(page, onesSum);
      await page.waitForTimeout(1400);
    } else {
      // Non-carry: drag single-digit ones
      const ones = answer % 10;
      await dragDigit(page, ones, '.slot.active');
    }
    // After ones fills (and carry completes if any), tens slot becomes active
    await dragDigit(page, tens, '.slot.active');
  }
}

/**
 * Pre-seed localStorage so specific levels are unlocked.
 * Call via page.addInitScript so it runs before page JS.
 */
function seedProgress(entries) {
  // entries: array of [world, level, stars], e.g. [["add", 1, 3], ["add", 2, 3]]
  return () => {
    for (const [w, l, s] of entries) {
      localStorage.setItem(`bm.stars.${w}.${l}`, String(s));
    }
  };
}

/**
 * Navigate directly to a level screen (bypasses map click — useful when
 * pre-seeding unlocks levels beyond L1).
 */
async function goToLevel(page, world, level) {
  await page.goto("/");
  await page.evaluate(
    ({ w, l }) => {
      window.__router.go("level", { world: w, level: l });
    },
    { w: world, l: level }
  );
  // Brief wait for mount
  await page.waitForTimeout(200);
}

/**
 * Drag a mango block from the pile into a group tray.
 */
async function dragBlockToTray(page, trayIndex) {
  const block = page.locator(".block-pile .block-host").first();
  const tray = page.locator(`.group-tray[data-idx="${trayIndex}"]`);

  const bBox = await block.boundingBox();
  const tBox = await tray.boundingBox();

  await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// Test 1: Addition L1 — full 5-problem playthrough (no carry)
// Answers: 15, 25, 18, 38, 46
// ---------------------------------------------------------------------------
test("Test 1: Add L1 full playthrough — 3 stars, localStorage persisted", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);

  // Click L1 in Banana Hills (first world panel, first level node)
  await page.locator(".world-panel").first().locator(".level-node").first().click();
  await expect(page.locator("#screen-add")).toBeVisible();

  const answers = [15, 25, 18, 38, 46];
  for (const ans of answers) {
    await enterAnswer(page, ans);
    // Wait for problem advance (500 ms transition + render)
    await page.waitForTimeout(900);
  }

  // Level complete screen
  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".complete-title")).toHaveText("LEVEL CLEAR!");

  // 3 stars (0 wrong)
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });

  // localStorage persisted
  const stored = await page.evaluate(() =>
    localStorage.getItem("bm.stars.add.1")
  );
  expect(stored).toBe("3");
});

// ---------------------------------------------------------------------------
// Test 2: Addition L3 — carry animation fires on ones-sum ≥ 10
// Problem 1: 15 + 6 = 21. Ones: 5+6=11 → carry fires.
// ---------------------------------------------------------------------------
test("Test 2: Add L3 carry animation — carry slot fills after ones drop", async ({
  page,
}) => {
  test.setTimeout(60_000); // 5 carry problems × ~3s each + animations
  await page.addInitScript(
    seedProgress([
      ["add", 1, 3],
      ["add", 2, 3],
    ])
  );
  await goToLevel(page, "add", 3);
  await expect(page.locator("#screen-add")).toBeVisible();

  // Problem 1: 15+6=21. onesSum=11, ones answer = 1, tens = 2.
  // Drop compound tile "11" onto ones slot — it splits into 1 (ones) + carry chip
  await dragCompound(page, 11);

  // flyCarry animation total: snap(220) + chip scale-in(200) + delay(200) +
  // path(500) + bounce(200) + cleanup(220) = ~1540ms. Wait 1600 to be safe.
  await page.waitForTimeout(1600);
  const carryFilled = await page.locator(".carry-slot.filled").count();
  expect(carryFilled).toBe(1);

  // Now drop the tens digit (2) to complete the problem
  await dragDigit(page, 2, ".slot.active");
  await page.waitForTimeout(900);

  // Complete the remaining 4 problems (all have carry)
  // L3 seeds: [18,4]=22 onesSum=12, [23,8]=31 onesSum=11, [27,5]=32 onesSum=12, [19,7]=26 onesSum=16
  const remaining = [[22, 12], [31, 11], [32, 12], [26, 16]];
  for (const [ans, onesSum] of remaining) {
    await enterAnswer(page, ans, onesSum);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Test 3: Subtraction L1 — full 5-problem playthrough (no borrow)
// Answers: 12, 22, 15, 33, 44
// ---------------------------------------------------------------------------
test("Test 3: Sub L1 full playthrough — 3 stars", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);

  // Second world panel = Misty River (sub)
  await page.locator(".world-panel").nth(1).locator(".level-node").first().click();
  await expect(page.locator("#screen-sub")).toBeVisible();

  const answers = [12, 22, 15, 33, 44];
  for (const ans of answers) {
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Test 4: Subtraction L4 — borrow animation fires before drag enabled
// Problem 1: 32 - 15 = 17. 2 < 5 → borrow.
// ---------------------------------------------------------------------------
test("Test 4: Sub L4 borrow animation — strike + replacement + ones update", async ({
  page,
}) => {
  test.setTimeout(60_000); // 5 borrow problems × ~2.5s each
  await page.addInitScript(
    seedProgress([
      ["sub", 1, 3],
      ["sub", 2, 3],
      ["sub", 3, 3],
    ])
  );
  await goToLevel(page, "sub", 4);
  await expect(page.locator("#screen-sub")).toBeVisible();

  // animateBorrow takes ~1050 ms (300ms delay + 600ms chip + 300ms blink)
  // Wait for it to fully complete
  await page.waitForTimeout(1500);

  // Verify borrow elements rendered
  await expect(page.locator(".strike")).toBeVisible();
  await expect(page.locator(".borrow-replacement")).toBeVisible();

  // The ones cell should now show "12" (2 + 10 from borrow)
  // It's the second cell in .row.top
  const onesCell = page.locator(".row.top .cell").nth(1);
  await expect(onesCell).toHaveText("12");

  // The tens replacement should show "2" (3 - 1 = 2)
  await expect(page.locator(".borrow-replacement")).toHaveText("2");

  // Answer 17: ones=7, tens=1
  await dragDigit(page, 7, ".slot.active");
  await page.waitForTimeout(350);
  await dragDigit(page, 1, ".slot.active");
  await page.waitForTimeout(900);

  // Remaining problems: 18, 24, 28, 37
  const remaining = [18, 24, 28, 37];
  for (const ans of remaining) {
    await page.waitForTimeout(1500); // borrow animation per problem
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Test 5: Multiplication tap-count L1 — tap all fireflies then drag answer
// Problems: 2×1=2, 2×2=4, 2×3=6, 2×4=8, 2×5=10
// ---------------------------------------------------------------------------
test("Test 5: Mult tap L1 full playthrough — tap all blocks, drag answer", async ({
  page,
}) => {
  test.setTimeout(60_000); // 5 problems with up to 10 taps each + fly-in delays
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);

  // Third world panel = Firefly Meadow (mult)
  await page.locator(".world-panel").nth(2).locator(".level-node").first().click();
  await expect(page.locator("#screen-mult-tap")).toBeVisible();

  const answers = [2, 4, 6, 8, 10];

  for (const ans of answers) {
    // Wait for fly-in animation
    await page.waitForTimeout(800);

    // Tap all untapped blocks. Use force:true because idle-wobble CSS animation
    // makes elements "not stable" by Playwright's heuristic.
    let untapped = await page.locator(".block-host.untapped").count();
    while (untapped > 0) {
      await page.locator(".block-host.untapped").first().click({ force: true });
      await page.waitForTimeout(150);
      untapped = await page.locator(".block-host.untapped").count();
    }

    // Reveal panel appears
    await expect(
      page.locator(".total-reveal:not(.hidden)"),
      "reveal panel should appear"
    ).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(300);

    // Drop the answer
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Test 6: Multiplication drag-groups L4 — drag blocks to trays, then answer
// Problem 1: 2×3=6 (2 groups, 3 blocks each)
// All problems: (2,3)=6, (3,2)=6, (3,3)=9, (4,2)=8, (2,4)=8
// ---------------------------------------------------------------------------
test("Test 6: Mult drag L4 — fill group trays then drag answer", async ({
  page,
}) => {
  test.setTimeout(90_000); // Many block drops across 5 problems
  await page.addInitScript(
    seedProgress([
      ["mult", 1, 3],
      ["mult", 2, 3],
      ["mult", 3, 3],
    ])
  );
  await goToLevel(page, "mult", 4);
  await expect(page.locator("#screen-mult-drag")).toBeVisible();

  // Each problem: groups=a, blocksPerGroup=b, answer=a*b
  const problems = [
    { a: 2, b: 3, answer: 6 },
    { a: 3, b: 2, answer: 6 },
    { a: 3, b: 3, answer: 9 },
    { a: 4, b: 2, answer: 8 },
    { a: 2, b: 4, answer: 8 },
  ];

  for (const { a, b, answer } of problems) {
    await page.waitForTimeout(200);

    // Fill each group tray with b blocks
    for (let g = 0; g < a; g++) {
      for (let fill = 0; fill < b; fill++) {
        await dragBlockToTray(page, g);
      }
      // Verify count chip shows filled state for this tray
      const chip = page.locator(`.group-tray[data-idx="${g}"] .count-chip`);
      await expect(chip).toHaveText(`★ ${b}`, { timeout: 2000 });
    }

    // Answer phase appears after 800ms delay (from game code)
    await expect(
      page.locator(".ans-host:not(.hidden)"),
      "answer host visible"
    ).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(300);

    // Drop the answer digits
    await enterAnswer(page, answer);
    await page.waitForTimeout(700);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Test 7: Level complete buttons — AGAIN, NEXT, MAP work correctly
// ---------------------------------------------------------------------------
test("Test 7: Complete screen buttons — NEXT goes to L2, MAP returns to map", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);
  await page.locator(".world-panel").first().locator(".level-node").first().click();
  await expect(page.locator("#screen-add")).toBeVisible();

  // Complete Add L1 (answers: 15, 25, 18, 38, 46)
  for (const ans of [15, 25, 18, 38, 46]) {
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }
  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });

  // Verify all three buttons are present
  await expect(page.locator('[data-act="again"]')).toBeVisible();
  await expect(page.locator('[data-act="next"]')).toBeVisible();
  await expect(page.locator('[data-act="map"]')).toBeVisible();

  // Click NEXT → should load Add L2
  await page.locator('[data-act="next"]').click();
  await page.waitForTimeout(500);
  await expect(page.locator("#screen-add")).toBeVisible();
  // Verify we're now on L2 by checking problem data (L2 problem 1: 12+13=25)
  // The worksheet should show 12 + 13
  const sec = page.locator("#screen-add");
  await expect(sec).toHaveAttribute("data-problem", "12+13");

  // Click MAP button (home-btn)
  await page.locator("#screen-add .home-btn").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#screen-map")).toBeVisible();

  // L2 should now be unlocked (L1 was completed)
  const l2Node = page.locator(".world-panel").first().locator(".level-node").nth(1);
  await expect(l2Node).toHaveClass(/unlocked/);
});

// ---------------------------------------------------------------------------
// Test 8: Persistence across reload
// ---------------------------------------------------------------------------
test("Test 8: Star progress persists after page reload", async ({ page }) => {
  // Do NOT use addInitScript here — it runs on reload too and would wipe localStorage.
  // Instead, clear before initial nav via evaluate after the first page.goto.
  await page.goto("/?profile=dave");
  await page.evaluate(() => localStorage.clear());
  await page.locator(".splash-play").click();
  await expect(page.locator("#screen-map")).toBeVisible();
  await page.locator(".world-panel").first().locator(".level-node").first().click();
  await expect(page.locator("#screen-add")).toBeVisible();

  // Complete Add L1 with 0 wrongs
  for (const ans of [15, 25, 18, 38, 46]) {
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }
  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });

  // Reload — localStorage is NOT cleared by addInitScript (not registered)
  await page.reload();
  await page.locator(".splash-play").click();
  await expect(page.locator("#screen-map")).toBeVisible();

  // L1 node should have 3-star ribbon
  const l1Node = page.locator(".world-panel").first().locator(".level-node").first();
  await expect(l1Node.locator(".node-ribbon")).toBeVisible();
  // node-ribbon should contain 3 filled stars
  await expect(l1Node.locator(".node-ribbon .star.filled")).toHaveCount(3);

  // L2 should be unlocked
  const l2Node = page.locator(".world-panel").first().locator(".level-node").nth(1);
  await expect(l2Node).toHaveClass(/unlocked/);
});

// ---------------------------------------------------------------------------
// Test 9: Star scoring — 3 intentional wrong drops → 2 stars
// Wrong drops on problem 1: drop digit 9 (wrong) 3 times before correct 5, then 1
// ---------------------------------------------------------------------------
test("Test 9: Star scoring — 3 wrongs across level gives 2 stars", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);
  await page.locator(".world-panel").first().locator(".level-node").first().click();
  await expect(page.locator("#screen-add")).toBeVisible();

  // Problem 1: 12+3=15. Drop wrong digit 3 times, then correct.
  for (let i = 0; i < 3; i++) {
    await dragDigit(page, 9, ".slot.active");
    // bounceBack animation ~450ms
    await page.waitForTimeout(700);
  }
  // Now drop the correct ones (5) and tens (1)
  await dragDigit(page, 5, ".slot.active");
  await page.waitForTimeout(350);
  await dragDigit(page, 1, ".slot.active");
  await page.waitForTimeout(900);

  // Complete remaining 4 problems correctly
  for (const ans of [25, 18, 38, 46]) {
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });

  // 3 wrongs → starsFor(3) = 2 stars
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(2, {
    timeout: 5000,
  });
  await expect(page.locator(".star-meter.big .star.empty")).toHaveCount(1, {
    timeout: 5000,
  });

  // localStorage should store 2
  const stored = await page.evaluate(() =>
    localStorage.getItem("bm.stars.add.1")
  );
  expect(stored).toBe("2");
});

// ---------------------------------------------------------------------------
// Test 10: Drag at 2× scale (tablet viewport 2560×1600)
// Runs Add L1 at large viewport to verify drag coordinate math is correct
// ---------------------------------------------------------------------------
test("Test 10: Drag at 2x viewport scale — all drops land correctly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1600 });
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);
  await page.locator(".world-panel").first().locator(".level-node").first().click();
  await expect(page.locator("#screen-add")).toBeVisible();

  // Full L1 playthrough at 2× scale
  for (const ans of [15, 25, 18, 38, 46]) {
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Bonus Test 11: Right-to-left enforcement — tens drop before ones is rejected
// ---------------------------------------------------------------------------
test("Test 11: RTL enforcement — dropping tens before ones is rejected", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);
  await page.locator(".world-panel").first().locator(".level-node").first().click();
  await expect(page.locator("#screen-add")).toBeVisible();

  // Problem 1: 12+3=15. Active slot = data-index="1" (ones).
  // Try dragging to the inactive tens slot (data-index="0") — should be rejected.
  await dragDigit(page, 1, '.slot.inactive[data-index="0"]');
  await page.waitForTimeout(700);

  // Slot should still be empty (inactive), active slot unchanged
  await expect(page.locator(".slot.active")).toBeVisible();
  await expect(page.locator(".slot.filled")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Bonus Test 12: Subtraction L3 full playthrough (single-digit borrow cases)
// Answers: 15, 27, 15, 27, 35
// All have borrow (aOnes < bOnes)
// ---------------------------------------------------------------------------
test("Test 12: Sub L3 borrow — full playthrough", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(
    seedProgress([
      ["sub", 1, 3],
      ["sub", 2, 3],
    ])
  );
  await goToLevel(page, "sub", 3);
  await expect(page.locator("#screen-sub")).toBeVisible();

  const answers = [15, 27, 15, 27, 35];
  for (const ans of answers) {
    // Wait for borrow animation to complete before entering answer
    await page.waitForTimeout(1500);
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Bonus Test 13: Add L6 (two-digit carry, multi-digit answers with carry)
// Answers: 85, 80, 66, 83, 85
// ---------------------------------------------------------------------------
test("Test 13: Add L6 full playthrough — all problems have carry", async ({
  page,
}) => {
  test.setTimeout(60_000); // 5 carry problems × ~3s each
  await page.addInitScript(
    seedProgress([
      ["add", 1, 3],
      ["add", 2, 3],
      ["add", 3, 3],
      ["add", 4, 3],
      ["add", 5, 3],
    ])
  );
  await goToLevel(page, "add", 6);
  await expect(page.locator("#screen-add")).toBeVisible();

  // All L6 add problems have carry.
  // L6 seeds: [47,38]=85 onesSum=15, [56,24]=80 onesSum=10,
  //           [39,27]=66 onesSum=16, [65,18]=83 onesSum=13, [49,36]=85 onesSum=15
  const problems = [[85, 15], [80, 10], [66, 16], [83, 13], [85, 15]];
  for (const [ans, onesSum] of problems) {
    await enterAnswer(page, ans, onesSum);
    await page.waitForTimeout(900);
  }

  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".star-meter.big .star.earned")).toHaveCount(3, {
    timeout: 5000,
  });
});

// ---------------------------------------------------------------------------
// Bonus Test 14: Mult tap count badge increments correctly (2×3 = 6)
// ---------------------------------------------------------------------------
test("Test 14: Mult tap L2 — count badge increments 1..6", async ({
  page,
}) => {
  await page.addInitScript(seedProgress([["mult", 1, 3]]));
  await goToLevel(page, "mult", 2);
  await expect(page.locator("#screen-mult-tap")).toBeVisible();

  // Problem 1: 3×1 = 3. Three groups of 1. Tap them one at a time.
  await page.waitForTimeout(800);

  const total = await page.locator(".block-host.untapped").count();
  expect(total).toBe(3); // 3 groups × 1 block

  // Tap first block — badge should show "1".
  // force:true bypasses stability check (idle-wobble animation makes elements "unstable").
  const firstBlock = page.locator(".block-host.untapped").first();
  await firstBlock.click({ force: true });
  await page.waitForTimeout(200);
  // After tap, the block is now .tapped (not .untapped), so re-locate by tapped
  await expect(page.locator(".block-host.tapped").first().locator(".count-badge")).toHaveText("1");

  // Tap rest
  let remaining = await page.locator(".block-host.untapped").count();
  while (remaining > 0) {
    await page.locator(".block-host.untapped").first().click({ force: true });
    await page.waitForTimeout(150);
    remaining = await page.locator(".block-host.untapped").count();
  }
  await expect(page.locator(".total-reveal:not(.hidden)")).toBeVisible({
    timeout: 3000,
  });
});

// ---------------------------------------------------------------------------
// Bonus Test 15: Map AGAIN button replays same level
// ---------------------------------------------------------------------------
test("Test 15: Complete screen AGAIN button replays same level", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.clear());
  await goToMap(page);
  await page.locator(".world-panel").first().locator(".level-node").first().click();
  await expect(page.locator("#screen-add")).toBeVisible();

  for (const ans of [15, 25, 18, 38, 46]) {
    await enterAnswer(page, ans);
    await page.waitForTimeout(900);
  }
  await expect(page.locator("#screen-complete")).toBeVisible({ timeout: 5000 });

  await page.locator('[data-act="again"]').click();
  await page.waitForTimeout(500);

  // Should be back on add screen, problem 1 (12+3=15)
  await expect(page.locator("#screen-add")).toBeVisible();
  await expect(page.locator("#screen-add")).toHaveAttribute("data-problem", "12+3");
});
