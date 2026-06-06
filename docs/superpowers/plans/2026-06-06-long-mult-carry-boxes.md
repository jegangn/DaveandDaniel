# Long-Multiplication Child-Filled Carries (OP: CARRYOVER) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the child drag every carry digit themselves — on both partial-product rows and the final addition row — in long multiplication, instead of carries being hidden or auto-animated.

**Architecture:** All carry maths and the exact right-to-left fill order move into pure, unit-tested functions in `src/logic-daniel.js` (`placeDigits`, `partialCarries`, `sumCarries`, `buildSequence`), attached to each phase by `analyzeLongMult`. The screen `src/screens/long-mult.js` becomes a thin renderer that walks a pre-computed step sequence; the drag engine's existing "only drop onto the `active` target" rule (drag.js:11) provides the gating, so the child must fill each carry before the next digit. Carry cells gain fillable visual states in `style.css`.

**Tech Stack:** Vanilla ES modules, `bun test` (bun:test) for unit tests, Playwright for e2e, esbuild via `bun build.js` for the deployed single-file `index.html`.

---

## Conventions for every task

- **Run unit tests:** `bun test ./test/logic-daniel.test.js`
  - If `bun` is not found on PATH, use the absolute path (project memory: bun isn't always on PATH). Find it with `where bun` / `Get-Command bun` (Windows) or `~/.bun/bin/bun`.
- **TDD + green main:** write the failing test, run it to see it fail, implement, run to see it pass, then commit **test + source together** (so `main` is never pushed red). Auto-push per project Rule 7.
- **Do NOT rebuild `index.html` until Task 9.** Intermediate commits touch `src/`/`test/` only, so the live site stays on the last working bundle throughout. The feature goes live once, in Task 9.

---

## File Structure

- **Modify** `src/logic-daniel.js` — add pure helpers `placeDigits`, `partialCarries`, `sumCarries`, `buildSequence`; enrich `analyzeLongMult` to attach `N` + per-phase `cells`/`carries`/`steps`.
- **Modify** `test/logic-daniel.test.js` — unit tests for the four helpers and the enriched `analyzeLongMult`.
- **Modify** `src/style.css` — fillable carry-cell states (`.carry-cell.fillable` active/inactive/filled/flash-no) + portrait parity.
- **Modify** `src/screens/long-mult.js` — render a carry strip above every result row; replace the result-only answer state with a step-sequence walker covering results **and** carries; generalise drag targets to include active carry cells; remove the auto `flyCarry` on the sum row.
- **Modify** `e2e/daniel-mult.spec.js` — drive the interleaved carry steps and assert carry boxes are child-filled.
- **Build** root `index.html` via `bun build.js` (Task 9).

---

### Task 1: `placeDigits` — pure digit placement (extracted from the screen)

**Files:**
- Modify: `src/logic-daniel.js`
- Test: `test/logic-daniel.test.js`

- [ ] **Step 1: Write the failing test**

Add to `test/logic-daniel.test.js` (and add `placeDigits` to the import block at the top — line 2-6):

```js
test("placeDigits: right-aligns digits into N columns, shifted left by `shift`", () => {
  // 392 shifted one place in a 4-wide grid → cols 0,1,2 (col 3 empty)
  expect(placeDigits(392, 1, 4)).toEqual([
    { digit: 3, di: 0 }, { digit: 9, di: 1 }, { digit: 2, di: 2 }, null,
  ]);
  // 224 unshifted in a 4-wide grid → cols 1,2,3 (col 0 empty)
  expect(placeDigits(224, 0, 4)).toEqual([
    null, { digit: 2, di: 0 }, { digit: 2, di: 1 }, { digit: 4, di: 2 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test ./test/logic-daniel.test.js`
Expected: FAIL — `placeDigits is not a function` / `not exported`.

- [ ] **Step 3: Write minimal implementation**

In `src/logic-daniel.js`, add near the other helpers (after `digitsOfN`):

```js
// Place a value's digits across N grid columns, shifted left by `shift`.
// Returns an N-length array, col -> { digit, di } (di = MSB-first index) or null.
export function placeDigits(value, shift, N) {
  const D = String(value).split("").map(Number);
  const cells = new Array(N).fill(null);
  for (let k = 0; k < D.length; k++) {
    const col = (N - 1) - shift - k;
    if (col >= 0) cells[col] = { digit: D[D.length - 1 - k], di: D.length - 1 - k };
  }
  return cells;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test ./test/logic-daniel.test.js`
Expected: PASS (existing tests still pass).

- [ ] **Step 5: Commit**

```bash
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): add placeDigits pure helper for long-mult grid placement"
git push
```

---

### Task 2: `partialCarries` — per-column carries of `a × digit`

**Files:**
- Modify: `src/logic-daniel.js`
- Test: `test/logic-daniel.test.js`

- [ ] **Step 1: Write the failing test**

Add `partialCarries` to the import block, then:

```js
test("partialCarries: carries of a single-digit multiply, keyed by the grid column they feed", () => {
  // 56 × 7 in a 4-wide grid, shifted one place: 6×7=42 (carry 4), 5×7+4=39 (carry 3).
  expect(partialCarries(56, 7, 1, 4)).toEqual({ 1: 4, 0: 3 });
  // 56 × 4 unshifted: 6×4=24 (carry 2), 5×4+2=22 (carry 2 → leading digit).
  expect(partialCarries(56, 4, 0, 4)).toEqual({ 2: 2, 1: 2 });
  // 8 × 6 = 48: single bring-down carry of 4.
  expect(partialCarries(8, 6, 0, 2)).toEqual({ 0: 4 });
  // 234 × 7 = 1638: carries 2, 2, 1.
  expect(partialCarries(234, 7, 0, 4)).toEqual({ 2: 2, 1: 2, 0: 1 });
  // 12 × 4 = 48: no carries at all.
  expect(partialCarries(12, 4, 0, 2)).toEqual({});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test ./test/logic-daniel.test.js`
Expected: FAIL — `partialCarries is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/logic-daniel.js`, in the long-multiplication section:

```js
// Carries produced when multiplying `a` by one `digit`, LSB-first. Each non-zero
// carry is recorded at the grid column it feeds INTO (incl. the final bring-down
// carry that becomes the leading digit). Carry per single-digit step is one digit.
export function partialCarries(a, digit, shift, N) {
  const aR = digitsOfN(a).reverse();
  const carries = {};
  let carry = 0;
  for (let k = 0; k < aR.length; k++) {
    const prod = aR[k] * digit + carry;
    carry = Math.floor(prod / 10);
    if (carry > 0) {
      const col = (N - 1) - shift - (k + 1);
      if (col >= 0) carries[col] = carry;
    }
  }
  return carries;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test ./test/logic-daniel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): add partialCarries (per-column carries of a single-digit multiply)"
git push
```

---

### Task 3: `sumCarries` — the 0/1 carries of the final addition

**Files:**
- Modify: `src/logic-daniel.js`
- Test: `test/logic-daniel.test.js`

- [ ] **Step 1: Write the failing test**

Add `sumCarries` to the import block, then:

```js
test("sumCarries: carries (always 1) of adding two partials, keyed by grid column", () => {
  // 224 + 3920 = 4144 → carry of 1 into the thousands column (grid col 0).
  expect(sumCarries(224, 3920)).toEqual({ 0: 1 });
  // 99 + 99 = 198 → carries into both the tens (col 1) and hundreds (col 0).
  expect(sumCarries(99, 99)).toEqual({ 1: 1, 0: 1 });
  // 12 + 13 = 25 → no carries.
  expect(sumCarries(12, 13)).toEqual({});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test ./test/logic-daniel.test.js`
Expected: FAIL — `sumCarries is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/logic-daniel.js`, after `partialCarries` (reuses `analyzeColumnsAdd`, whose `width` already equals the answer length):

```js
// Carries of adding two addends, keyed by the grid column they feed INTO. Two-addend
// addition always carries 0 or 1; `analyzeColumnsAdd(...).width` === answer length.
export function sumCarries(addA, addB) {
  const { carryOut, width } = analyzeColumnsAdd(addA, addB);
  const carries = {};
  for (let i = 0; i < width; i++) {
    if (carryOut[i]) {
      const col = (width - 1) - (i + 1);
      if (col >= 0) carries[col] = 1;
    }
  }
  return carries;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test ./test/logic-daniel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): add sumCarries (final-addition carries for long mult)"
git push
```

---

### Task 4: `buildSequence` — the ordered result+carry fill steps

**Files:**
- Modify: `src/logic-daniel.js`
- Test: `test/logic-daniel.test.js`

- [ ] **Step 1: Write the failing test**

Add `buildSequence` to the import block, then:

```js
test("buildSequence: interleaves carries between result digits, right-to-left", () => {
  // 56 × 7 = 392 (shifted): 2 → carry 4 → 9 → carry 3 → 3.
  const cells392 = placeDigits(392, 1, 4);
  expect(buildSequence(cells392, { 1: 4, 0: 3 })).toEqual([
    { kind: "result", col: 2, di: 2, value: 2 },
    { kind: "carry",  col: 1, value: 4 },
    { kind: "result", col: 1, di: 1, value: 9 },
    { kind: "carry",  col: 0, value: 3 },
    { kind: "result", col: 0, di: 0, value: 3 },
  ]);

  // Sum 4144: only one carry, into the thousands column, just before its result.
  const cells4144 = placeDigits(4144, 0, 4);
  expect(buildSequence(cells4144, { 0: 1 })).toEqual([
    { kind: "result", col: 3, di: 3, value: 4 },
    { kind: "result", col: 2, di: 2, value: 4 },
    { kind: "result", col: 1, di: 1, value: 1 },
    { kind: "carry",  col: 0, value: 1 },
    { kind: "result", col: 0, di: 0, value: 4 },
  ]);

  // No-carry row (48): all results, no carry steps.
  const cells48 = placeDigits(48, 0, 2);
  expect(buildSequence(cells48, {})).toEqual([
    { kind: "result", col: 1, di: 1, value: 8 },
    { kind: "result", col: 0, di: 0, value: 4 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test ./test/logic-daniel.test.js`
Expected: FAIL — `buildSequence is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/logic-daniel.js`, after `sumCarries`:

```js
// Ordered fill steps for one row: walk result columns right-to-left (di high→low),
// emitting a column's incoming carry (if any) just before that column's result.
// The ones column never has an incoming carry, so a row always starts AND ends
// with a result step.
export function buildSequence(cells, carries = {}) {
  const steps = [];
  const len = cells.filter(Boolean).length; // number of result digits
  for (let di = len - 1; di >= 0; di--) {
    const col = cells.findIndex((c) => c && c.di === di);
    if (carries[col] != null) steps.push({ kind: "carry", col, value: carries[col] });
    steps.push({ kind: "result", col, di, value: cells[col].digit });
  }
  return steps;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test ./test/logic-daniel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): add buildSequence (ordered result+carry fill steps)"
git push
```

---

### Task 5: Enrich `analyzeLongMult` with `N`, `cells`, `carries`, `steps`

**Files:**
- Modify: `src/logic-daniel.js:111-125` (the existing `analyzeLongMult`)
- Test: `test/logic-daniel.test.js`

- [ ] **Step 1: Write the failing test**

Add these tests (the existing `analyzeLongMult` tests at lines 125-144 must keep passing — do not change them):

```js
test("analyzeLongMult: attaches N + per-phase cells/carries/steps (56 × 74)", () => {
  const r = analyzeLongMult(56, 74); // 224 + 3920 = 4144
  expect(r.N).toBe(4);
  expect(r.partials[0].carries).toEqual({ 2: 2, 1: 2 });   // 56 × 4
  expect(r.partials[1].carries).toEqual({ 1: 4, 0: 3 });   // 56 × 7 (shifted)
  expect(r.sum.carries).toEqual({ 0: 1 });
  expect(r.partials[1].steps).toEqual([
    { kind: "result", col: 2, di: 2, value: 2 },
    { kind: "carry",  col: 1, value: 4 },
    { kind: "result", col: 1, di: 1, value: 9 },
    { kind: "carry",  col: 0, value: 3 },
    { kind: "result", col: 0, di: 0, value: 3 },
  ]);
  // existing fields intact:
  expect(r.product).toBe(4144);
  expect(r.partials.map((p) => p.rowDigits)).toEqual([224, 392]);
});

test("analyzeLongMult: ×1-digit still has no sum, but the single partial carries", () => {
  const r = analyzeLongMult(234, 7); // 1638
  expect(r.N).toBe(4);
  expect(r.sum).toBeNull();
  expect(r.partials[0].carries).toEqual({ 2: 2, 1: 2, 0: 1 });
  expect(r.partials[0].steps.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test ./test/logic-daniel.test.js`
Expected: FAIL — `r.N` is undefined / `r.partials[0].carries` is undefined.

- [ ] **Step 3: Write minimal implementation**

Replace the body of `analyzeLongMult` in `src/logic-daniel.js` with (additive — every existing field stays):

```js
export function analyzeLongMult(a, b) {
  const bR = digitsOfN(b).reverse(); // LSB-first
  const partials = bR.map((digit, shift) => {
    const rowDigits = a * digit;
    return { digit, rowDigits, value: rowDigits * Math.pow(10, shift), shift };
  });
  const needsSum = partials.length > 1;
  const product = a * b;
  const N = String(product).length;
  let sum = null;
  if (needsSum) {
    const add = analyzeColumnsAdd(partials[0].value, partials[1].value);
    sum = { value: product, width: add.width, carryOut: add.carryOut };
  }
  // CARRYOVER: attach grid placement, per-column carries, and ordered fill steps.
  for (const p of partials) {
    p.cells = placeDigits(p.rowDigits, p.shift, N);
    p.carries = partialCarries(a, p.digit, p.shift, N);
    p.steps = buildSequence(p.cells, p.carries);
  }
  if (needsSum) {
    sum.cells = placeDigits(product, 0, N);
    sum.carries = sumCarries(partials[0].value, partials[1].value);
    sum.steps = buildSequence(sum.cells, sum.carries);
  }
  return { a, b, product, N, partials, needsSum, sum };
}
```

- [ ] **Step 4: Run the FULL unit suite to verify everything passes**

Run: `bun test ./test`
Expected: PASS — new tests green, all existing `logic-daniel` and `progress` tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): enrich analyzeLongMult with N + per-phase cells/carries/steps"
git push
```

---

### Task 6: Fillable carry-cell styles

**Files:**
- Modify: `src/style.css` (carry-cell rules ~line 1391-1396 and the `.lm-ws` block ~line 1409-1418; portrait block ~line 950)

- [ ] **Step 1: Add fillable carry-cell states**

After the existing `.col-ws .carry-cell.filled { opacity: 1; }` rule (around line 1396) in `src/style.css`, add:

```css
/* CARRYOVER — carry cells the child fills (long mult). A small dashed mini-slot
   that mirrors the result .slot states; orange-tinted so a carry reads as distinct
   from a result digit. (Plain .carry-cell with no .fillable stays an invisible spacer.) */
.col-ws .carry-cell.fillable {
  opacity: 1;
  border: 3px dashed var(--ink-soft);
  border-radius: var(--r-md);
  color: #EE6A00;
  align-self: center; justify-self: center;
  display: inline-flex; align-items: center; justify-content: center;
}
.col-ws .carry-cell.fillable.inactive { opacity: .5; }
.col-ws .carry-cell.fillable.active   { border-style: solid; border-color: var(--world-primary); animation: slotPulse 1.8s var(--ease-soft) infinite; }
.col-ws .carry-cell.fillable.filled   { border-style: solid; border-color: #EE6A00; animation: none; }
.col-ws .carry-cell.fillable.flash-no { border-color: var(--gentle-no); animation: slotShake .3s var(--ease-elastic); }
```

- [ ] **Step 2: Size the fillable carry cell for the long-mult grid (landscape + portrait)**

In the `.lm-ws` section (after line 1414 `.lm-ws .carry-cell { ... }`), add:

```css
.lm-ws .carry-cell.fillable { width: 44px; height: 44px; font-size: 28px; }
#stage[data-orient="portrait"] .lm-ws .carry-cell.fillable { width: 40px; height: 40px; font-size: 26px; }
```

- [ ] **Step 3: Commit**

(No unit test — CSS is verified by the e2e in Task 8 (the `.active`/`.filled` classes drive the drag) and the visual `ui-ux-pro-max` pass in Task 10.)

```bash
git add src/style.css
git commit -m "style(daniel): fillable carry-cell states for long-mult carries"
git push
```

---

### Task 7: Update the long-mult e2e to drive carries (write the failing integration test)

**Files:**
- Modify: `e2e/daniel-mult.spec.js`

This test fails against the current screen (it tries to drop carry digits, which the old screen rejects → the run never completes). Task 8 makes it pass. **Do not commit until Task 8** (keeps `main` green).

- [ ] **Step 1: Rewrite the spec to fill results AND carries in sequence**

Replace the entire contents of `e2e/daniel-mult.spec.js` with:

```js
import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';
import { analyzeLongMult } from '../src/logic-daniel.js';

// Daniel · OP: OVERRIDE + CARRYOVER. The child fills every result digit AND every
// carry, right-to-left, on each partial row and the final sum. We compute the
// exact ordered drop values from the real analyzer and drop each onto whichever
// box is currently active (result slot OR fillable carry cell).

const ACTIVE = '.col-ws .slot.active, .col-ws .carry-cell.fillable.active';

function dropValues(a, b) {
  const info = analyzeLongMult(a, b);
  const phases = info.needsSum
    ? [info.partials[0], info.partials[1], info.sum]
    : [info.partials[0]];
  return phases.flatMap((ph) => ph.steps.map((s) => s.value));
}

async function dragDigit(page, digit, slotSel) {
  const slot = page.locator(slotSel).first();
  await slot.waitFor({ state: 'visible' });
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  await tile.waitFor({ state: 'visible' });
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  if (!tBox || !sBox) throw new Error(`missing tile ${digit} or active box`);
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function solveLongMult(page) {
  const prob = await page.locator('#screen-long-mult').getAttribute('data-problem'); // "56×74"
  const [a, b] = prob.split('×').map(Number);
  for (const v of dropValues(a, b)) {
    await dragDigit(page, v, ACTIVE);
    await page.waitForTimeout(1000); // snap + re-render (no auto carry-fly anymore)
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

  // After the first result digit, a carry box becomes the active target.
  const prob = await page.locator('#screen-long-mult').getAttribute('data-problem');
  const [a, b] = prob.split('×').map(Number);
  const first = dropValues(a, b)[0];
  await dragDigit(page, first, ACTIVE);
  await page.waitForTimeout(1000);
  await expect(page.locator('.col-ws .carry-cell.fillable.active')).toHaveCount(1);
});
```

- [ ] **Step 2: Run it to verify it FAILS against the current screen**

First avoid the stale-server trap (project memory): make sure nothing else is serving `:5173`. If a stale/wrong server is up, stop it, then let Playwright start a fresh one.

Run: `bun run e2e e2e/daniel-mult.spec.js`
Expected: FAIL — the current screen has no fillable carry cells; dropping a carry value is rejected so the run never reaches `#screen-complete` (timeouts / 0 carry cells found).

(No commit yet — proceed to Task 8.)

---

### Task 8: Rewrite the long-mult screen to walk result+carry steps

**Files:**
- Modify: `src/screens/long-mult.js` (full replacement)
- Test: `e2e/daniel-mult.spec.js` (from Task 7)

- [ ] **Step 1: Replace `src/screens/long-mult.js` entirely**

```js
// Daniel · OP: OVERRIDE + CARRYOVER — long multiplication, up to 2-digit × 2-digit,
// with child-filled carries on every row. Phases: partial 0 → partial 1 (shifted)
// → sum. Within each phase the child fills an ordered sequence of result digits AND
// the carries between them (right-to-left, paper method); the drag engine only
// accepts the single `active` box, so each carry must be filled before the next
// digit. ×1-digit missions have a single partial that IS the product.
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn } from "../animate.js";
import { getProblemsDaniel, mulberry32, analyzeLongMult, placeDigits } from "../logic-daniel.js";
import { sfx } from "../audio.js";
import { home, handler } from "../svg.js";
import { layoutColMath } from "../layout.js";

const pick = (src) => ({ cells: src.cells, carries: src.carries, steps: src.steps });

export function mount(stage, ctx, router) {
  const { world, level } = ctx;
  stage.dataset.world = world;
  const problems = getProblemsDaniel(world, level, mulberry32((Date.now() ^ (level * 2246822519)) >>> 0));
  let idx = 0;
  let totalWrong = 0;
  let dragMgr = null;
  let trayWrong = 0;

  let info = null;       // analyzeLongMult result
  let N = 0;             // grid width
  let phases = [];       // [{ key, opSym, cells, carries, steps }]
  let phaseIdx = 0;
  let seqIdx = 0;        // index into the current phase's step sequence
  const lockedPhases = new Set();

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-long-mult";
  sec.innerHTML = `
    <div class="topbar">
      <button class="home-btn small"></button>
      <div class="progress-dots"></div>
      <div class="star-meter run"></div>
    </div>
    <div class="col-ws lm-ws"></div>
    <div class="digit-tray"></div>
    <div class="corner-mascot"></div>
  `;
  sec.querySelector(".home-btn").insertAdjacentHTML("beforeend", home());
  sec.querySelector(".home-btn").addEventListener("pointerup", () => router.go("map"));
  sec.querySelector(".corner-mascot").insertAdjacentHTML("beforeend", handler("idle"));

  const relayout = () => layoutColMath(stage, sec);

  renderProgressDots();
  renderTray();
  startProblem();
  stage.appendChild(sec);
  window.__activeRelayout = relayout;
  relayout();

  function renderProgressDots() {
    const d = sec.querySelector(".progress-dots");
    d.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (i < idx ? " filled" : i === idx ? " current" : "");
      d.appendChild(dot);
    }
  }

  function renderTray() {
    const tray = sec.querySelector(".digit-tray");
    tray.innerHTML = "";
    for (let n = 0; n <= 9; n++) {
      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.digit = String(n);
      t.textContent = String(n);
      tray.appendChild(t);
    }
    relayout();
  }

  function startProblem() {
    const p = problems[idx];
    info = analyzeLongMult(p.a, p.b);
    N = info.N;
    phases = info.needsSum
      ? [
          { key: "p0", opSym: " ", ...pick(info.partials[0]) },
          { key: "p1", opSym: "+", ...pick(info.partials[1]) },
          { key: "sum", opSym: " ", ...pick(info.sum) },
        ]
      : [{ key: "p0", opSym: " ", ...pick(info.partials[0]) }];
    phaseIdx = 0;
    seqIdx = 0;
    lockedPhases.clear();
    sec.dataset.problem = `${p.a}×${p.b}`;
    renderWorksheet();
  }

  // "filled" | "active" | "inactive" for a step of the CURRENT phase.
  function stepState(ph, kind, col) {
    let s = -1;
    for (let i = 0; i < ph.steps.length; i++) {
      if (ph.steps[i].kind === kind && ph.steps[i].col === col) { s = i; break; }
    }
    if (s < seqIdx) return "filled";
    if (s === seqIdx) return "active";
    return "inactive";
  }

  function staticRowHTML(opSym, cells) {
    let html = `<div class="ws-op${opSym !== " " ? " op" : ""}">${opSym !== " " ? opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = cells[col];
      html += c ? `<div class="cell">${c.digit}</div>` : `<div class="cell"></div>`;
    }
    return html;
  }

  function carryStripHTML(ph) {
    const isCur = ph.key === phases[phaseIdx].key;
    const locked = lockedPhases.has(ph.key);
    let html = `<div class="ws-op"></div>`;
    for (let col = 0; col < N; col++) {
      const cv = ph.carries[col];
      if (cv == null) { html += `<div class="carry-cell"></div>`; continue; }   // spacer
      if (locked) { html += `<div class="carry-cell fillable filled">${cv}</div>`; continue; }
      if (!isCur) { html += `<div class="carry-cell"></div>`; continue; }        // future: hidden
      const st = stepState(ph, "carry", col);
      const val = st === "filled" ? cv : "";
      html += `<div class="carry-cell fillable ${st}" data-col="${col}" data-phase="${ph.key}">${val}</div>`;
    }
    return html;
  }

  function resultRowHTML(ph) {
    const isCur = ph.key === phases[phaseIdx].key;
    const locked = lockedPhases.has(ph.key);
    let html = `<div class="ws-op${ph.opSym !== " " ? " op" : ""}">${ph.opSym !== " " ? ph.opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = ph.cells[col];
      if (!c) { html += `<div class="cell"></div>`; continue; }
      if (locked) { html += `<div class="cell">${c.digit}</div>`; continue; }
      if (!isCur) { html += `<div class="slot inactive" data-index="${c.di}" data-col="${col}" data-phase="${ph.key}"></div>`; continue; }
      const st = stepState(ph, "result", col);
      const val = st === "filled" ? c.digit : "";
      html += `<div class="slot ${st}" data-index="${c.di}" data-col="${col}" data-phase="${ph.key}">${val}</div>`;
    }
    return html;
  }

  function renderWorksheet() {
    const p = problems[idx];
    const ws = sec.querySelector(".col-ws");
    ws.style.gridTemplateColumns = `44px repeat(${N}, var(--col-w))`;
    const p0 = phases.find((x) => x.key === "p0");
    let html = "";
    html += staticRowHTML(" ", placeDigits(p.a, 0, N));
    html += staticRowHTML("×", placeDigits(p.b, 0, N));
    html += `<div class="ws-line"></div>`;
    html += carryStripHTML(p0);
    html += resultRowHTML(p0);
    if (info.needsSum) {
      const p1 = phases.find((x) => x.key === "p1");
      const sum = phases.find((x) => x.key === "sum");
      html += carryStripHTML(p1);
      html += resultRowHTML(p1);
      html += `<div class="ws-line"></div>`;
      html += carryStripHTML(sum);
      html += resultRowHTML(sum);
    }
    ws.innerHTML = html;
    relayout();
  }

  function setupDrag() {
    dragMgr = createDragManager({
      getTargets() {
        return Array.from(sec.querySelectorAll(".lm-ws .slot, .lm-ws .carry-cell.fillable")).map((el) => ({
          el, rect: el.getBoundingClientRect(),
          active: el.classList.contains("active"),
          kind: el.classList.contains("carry-cell") ? "carry" : "result",
          col: parseInt(el.dataset.col, 10),
        }));
      },
      onPickup(payload, el) { tilePickup(el); },
      async onDrop(payload, target, sourceEl, origin, parentInfo) {
        if (!target) return tileBounceBack(sourceEl, origin, parentInfo);
        const step = phases[phaseIdx].steps[seqIdx];
        const ok = target.kind === step.kind && target.col === step.col && payload.digit === step.value;
        if (!ok) {
          totalWrong++; trayWrong++;
          await tileBounceBack(sourceEl, origin, parentInfo);
          target.el.classList.add("flash-no");
          setTimeout(() => target.el.classList.remove("flash-no"), 200);
          if (trayWrong >= 2) applyHint();
          return;
        }
        await tileSnapIn(sourceEl, target.el);
        seqIdx++;
        if (seqIdx >= phases[phaseIdx].steps.length) {
          lockedPhases.add(phases[phaseIdx].key);
          if (phaseIdx < phases.length - 1) {
            phaseIdx++; seqIdx = 0;
            sfx.slotFill();
            setTimeout(() => { renderWorksheet(); renderTray(); setupDrag(); attachTileListeners(); }, 350);
          } else {
            sfx.correctYay();
            await advanceProblem();
          }
        } else {
          renderWorksheet();
          trayWrong = 0;
          renderTray();
          setupDrag();
          attachTileListeners();
        }
      },
    });
    attachTileListeners();
  }

  function attachTileListeners() {
    sec.querySelectorAll(".tile").forEach((tile) => {
      tile.onpointerdown = (e) => dragMgr.start(e, tile, { kind: "digit", digit: parseInt(tile.dataset.digit, 10) });
    });
  }

  function applyHint() {
    const expected = phases[phaseIdx].steps[seqIdx].value;
    sec.querySelectorAll(".tile").forEach((tile) => {
      if (parseInt(tile.dataset.digit, 10) === expected) {
        tile.classList.remove("hint-dim"); tile.classList.add("hint-target");
      } else {
        tile.classList.add("hint-dim");
      }
    });
    sfx.hintHmm();
  }

  async function advanceProblem() {
    idx++;
    renderProgressDots();
    if (idx >= problems.length) {
      router.go("complete", { world, level, wrongCount: totalWrong });
      return;
    }
    sfx.transition();
    setTimeout(() => {
      startProblem();
      renderTray();
      setupDrag();
      attachTileListeners();
    }, 500);
  }

  setupDrag();

  return () => {
    if (window.__activeRelayout === relayout) window.__activeRelayout = null;
    sec.remove();
  };
}
```

- [ ] **Step 2: Run the long-mult e2e to verify it now PASSES**

Run: `bun run e2e e2e/daniel-mult.spec.js`
Expected: PASS — all 5 levels complete to 3 stars, and the "carries are child-filled" test passes.

- [ ] **Step 3: Run the full unit suite (no regressions in shared logic)**

Run: `bun test ./test`
Expected: PASS.

- [ ] **Step 4: Commit screen + e2e together**

```bash
git add src/screens/long-mult.js e2e/daniel-mult.spec.js
git commit -m "feat(daniel): child-filled carries on long-mult partials and sum (OP: CARRYOVER)"
git push
```

---

### Task 9: Verify the rest of the e2e suite, rebuild the bundle, deploy

**Files:**
- Possibly modify: `e2e/daniel-portrait.spec.js`, `e2e/zz-capture-profiles.spec.js` (only if they break on the new carry rows)
- Build: root `index.html`

- [ ] **Step 1: Run the full e2e suite**

Make sure `:5173` is clear of any stale server first (project memory). Then:
Run: `bun run e2e`
Expected: PASS. Two specs also touch long-mult — `daniel-portrait.spec.js` (portrait layout) and `zz-capture-profiles.spec.js` (screenshots). They navigate to `#screen-long-mult` but don't solve it, so they should pass unchanged. If either fails because the extra carry strips change layout/visibility:
  - For `daniel-portrait`: confirm `#screen-long-mult` and `.lm-ws` are still visible and the worksheet fits the play band; adjust the assertion only if it pinned an exact row count/position (do not weaken a real check).
  - For `zz-capture-profiles`: re-baseline the screenshot if it does golden-image comparison.

- [ ] **Step 2: If the worksheet overflows in portrait, tighten the long-mult grid**

The worksheet now has up to 3 extra carry strips. If Step 1 shows the worksheet clipped in portrait, reduce vertical gap in the `.lm-ws` rule in `src/style.css` (e.g. `gap: 2px 8px;`) and/or the carry-strip height — then re-run `bun run e2e e2e/daniel-portrait.spec.js`. (Final visual polish is Task 10.)

- [ ] **Step 3: Rebuild the deployed single-file bundle**

Run: `bun run build`
Expected: prints `Wrote ./index.html (NNN KB)`. This inlines the updated `src/` into the root `index.html` (project memory: src edits don't reach the live Vercel site until this runs).

- [ ] **Step 4: Smoke-test the built bundle**

Run: `bun run e2e e2e/build-smoke.spec.js`
Expected: PASS (the built `index.html` boots).

- [ ] **Step 5: Commit the rebuilt bundle + any e2e fixes, and push (goes live)**

```bash
git add index.html src/style.css e2e/
git commit -m "build(daniel): rebuild index.html with long-mult carry boxes; e2e for carries"
git push
```

---

### Task 10: Visual polish pass (ui-ux-pro-max)

**Files:**
- Modify: `src/style.css` (then rebuild)

- [ ] **Step 1: Run the UI/UX review on the carry boxes**

Invoke the `ui-ux-pro-max` skill to review/refine the carry-cell treatment in `src/screens/long-mult.js` + `src/style.css`: size relative to result slots, the active ring, the orange carry tint vs the cream paper, spacing between each carry strip and its row, and portrait fit. Keep the active-box pulse consistent with result slots so "fill here now" reads clearly.

- [ ] **Step 2: Apply, rebuild, re-verify**

Apply the refinements, then:
Run: `bun run build` then `bun run e2e e2e/daniel-mult.spec.js e2e/daniel-portrait.spec.js`
Expected: PASS.

- [ ] **Step 3: Commit + push**

```bash
git add src/style.css index.html
git commit -m "style(daniel): polish long-mult carry boxes (ui-ux-pro-max)"
git push
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-06-long-mult-carry-boxes-design.md`):
- Full carries incl. bring-down → `partialCarries` records the final carry (Task 2); `buildSequence` emits a carry before the leading result (Task 4). ✓
- All rows (partials + sum) → `analyzeLongMult` attaches steps to both partials and sum (Task 5); screen renders a carry strip above every result row (Task 8). ✓
- Carry only where it carries → `partialCarries`/`sumCarries` record non-zero carries only; no-carry columns render as empty spacers (Tasks 2, 3, 8). ✓
- Paper order RTL → `buildSequence` (Task 4), verified e2e (Tasks 7-8). ✓
- Drag-gating via `active` only → `getTargets`/`onDrop` (Task 8), relies on drag.js:11. ✓
- Remove sum-row auto `flyCarry` → not imported/used in the new screen (Task 8); e2e asserts no pre-filled carry (Task 7). ✓
- Fillable carry-cell styles → Task 6. ✓
- Unit + e2e tests → Tasks 1-5 (unit), 7-9 (e2e). ✓
- Rebuild `index.html` for deploy → Task 9. ✓
- ui-ux-pro-max polish → Task 10. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; every command has expected output. ✓

**3. Type consistency:** `placeDigits(value, shift, N)`, `partialCarries(a, digit, shift, N)`, `sumCarries(addA, addB)`, `buildSequence(cells, carries)` — signatures match between definition (Tasks 1-4), their use in `analyzeLongMult` (Task 5), and the screen/e2e (Tasks 7-8). Step shape `{ kind, col, di?, value }` is identical in `buildSequence`, the `analyzeLongMult` test, the screen's `stepState`/`onDrop`, and the e2e's `dropValues`. `carries` is a `{ [col]: value }` map throughout. ✓
