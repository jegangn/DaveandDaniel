/**
 * Shared helpers for the math-correctness audit tests.
 */

export const SEEDS = {
  add: {
    1: [[12, 3], [21, 4], [13, 5], [32, 6], [41, 5]],
    2: [[12, 13], [21, 34], [25, 22], [41, 15], [33, 24]],
    3: [[15, 6], [18, 4], [23, 8], [27, 5], [19, 7]],
    4: [[16, 25], [27, 18], [35, 27], [48, 23], [56, 27]],
    5: [[14, 22], [17, 8], [36, 27], [25, 13], [48, 19]],
    6: [[47, 38], [56, 24], [39, 27], [65, 18], [49, 36]],
  },
  sub: {
    1: [[15, 3], [24, 2], [19, 4], [38, 5], [47, 3]],
    2: [[45, 23], [38, 17], [76, 34], [59, 26], [88, 45]],
    3: [[22, 7], [31, 4], [24, 9], [32, 5], [43, 8]],
    4: [[32, 15], [41, 23], [52, 28], [65, 37], [81, 44]],
    5: [[45, 23], [32, 15], [56, 28], [67, 45], [82, 47]],
    6: [[51, 28], [73, 46], [84, 37], [92, 58], [65, 29]],
  },
  multTap: {
    1: [[2, 1], [2, 2], [2, 3], [2, 4], [2, 5]],
    2: [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5]],
    3: [[4, 1], [4, 2], [4, 3], [4, 4], [4, 5]],
  },
  multDrag: {
    4: [[2, 3], [3, 2], [3, 3], [4, 2], [2, 4]],
    5: [[3, 4], [4, 3], [3, 5], [5, 3], [4, 4]],
    6: [[5, 4], [4, 5], [5, 5], [3, 5], [4, 4]],
  },
};

export function computeAnswer(world, a, b) {
  if (world === "add") return a + b;
  if (world === "sub") return a - b;
  return a * b;
}

export function digitsOf(n) {
  return n < 10 ? [n] : [Math.floor(n / 10), n % 10];
}

/** Unlock all of a profile's levels by writing 3 stars per level into
 *  localStorage (profile-namespaced) and setting that profile active. */
export async function unlockAll(page, profile = "dave") {
  await page.evaluate((prof) => {
    if (window.__setProfile) window.__setProfile(prof);
    const worlds = prof === "dave" ? ["add", "sub", "mult"] : ["nadd", "nsub", "nmul", "ndiv"];
    const L = prof === "dave" ? 6 : 5;
    for (const w of worlds) {
      for (let l = 1; l <= L; l++) {
        localStorage.setItem(`${prof}.stars.${w}.${l}`, "3");
      }
    }
  }, profile);
}

/**
 * Navigate directly to a level by calling the router (profile-aware).
 * Requires the page to already be loaded (after page.goto('/') + unlockAll).
 */
export async function goToLevel(page, world, level, profile = "dave") {
  await page.evaluate(({ w, l, p }) => {
    if (window.__setProfile) window.__setProfile(p);
    window.__router.go("level", { world: w, level: l });
  }, { w: world, l: level, p: profile });
  await page.waitForTimeout(300);
}

/**
 * Drag a digit tile onto the active answer slot.
 * Uses mouse events with 8 steps — matches Chromium pointer dispatch.
 */
export async function dragDigitToSlot(page, digit, slotLocator) {
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  const tBox = await tile.boundingBox();
  const sBox = await slotLocator.boundingBox();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350); // snap-in animation
}

/**
 * Drag a compound tile (10-18) onto the active answer slot.
 * Used for carry addition problems — the ones slot only accepts compound tiles.
 */
export async function dragCompoundToSlot(page, value, slotLocator) {
  const tile = page.locator(`.tile.compound[data-compound="${value}"]`).first();
  const tBox = await tile.boundingBox();
  const sBox = await slotLocator.boundingBox();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350); // snap-in animation
}

/**
 * Enter a full answer (ones-first, then tens if 2-digit).
 * hasCarry: set true for addition problems where onesA + onesB >= 10.
 *   In carry mode the ones slot requires the compound tile (onesSum), not a single digit.
 * hasBorrow: ignored for answer-entry (borrow fires before player touches tiles).
 */
export async function enterAnswer(page, answer, { hasCarry = false, onesSum = null } = {}) {
  if (answer < 10) {
    await dragDigitToSlot(page, answer, page.locator('.slot.active[data-index="0"]'));
  } else {
    const ones = answer % 10;
    const tens = Math.floor(answer / 10);
    if (hasCarry && onesSum !== null) {
      // Use compound tile for the ones slot
      await dragCompoundToSlot(page, onesSum, page.locator(".slot.active"));
      // flyCarry animation: ~1400ms total (snap + carry fly)
      await page.waitForTimeout(1400);
    } else {
      await dragDigitToSlot(page, ones, page.locator(".slot.active"));
    }
    await dragDigitToSlot(page, tens, page.locator(".slot.active"));
  }
}

/**
 * Read the operands displayed in the add/sub worksheet.
 * Returns { a, b } as integers based on what the worksheet cells show.
 *
 * For subtraction with borrow the tens cell may show the replacement digit
 * and the ones cell shows (aOnes+10), so the raw join won't equal seedA.
 * We return the raw joined values so callers can compare as needed.
 */
export async function readWorksheetOperands(page) {
  const topCells = await page.locator(".worksheet .row.top .cell").allTextContents();
  const botCells = await page.locator(".worksheet .row.bot .cell").allTextContents();
  const aText = topCells.map((c) => c.trim()).join("") || "0";
  const bText = botCells.map((c) => c.trim()).join("") || "0";
  return {
    a: parseInt(aText, 10),
    b: parseInt(bText, 10),
  };
}

/**
 * Read the a/b operands from the multiplication problem chips.
 * The chip order is: a × b = ?
 */
export async function readMultOperands(page) {
  const chips = await page.locator(".op-chip:not(.q)").allTextContents();
  return {
    a: parseInt(chips[0].trim(), 10),
    b: parseInt(chips[1].trim(), 10),
  };
}
