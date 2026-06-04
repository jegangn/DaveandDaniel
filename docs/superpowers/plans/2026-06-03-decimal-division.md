# Decimal Division (OP: SPLIT) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace remainder notation in Daniel's short-division screen with exact decimal answers (≤ 2 places), e.g. `764 ÷ 5 = 152.8` instead of `152 r4`.

**Architecture:** Three layers change. (1) The pure analyzer `analyzeShortDiv` continues the bus-stop walk past the integer part into the decimal part (bring down zeros until the remainder clears, capped at 2 places). (2) The problem generator restricts divisors to {2,4,5} — the only single-digit divisors whose results terminate in ≤2 places — and forces non-integer results. (3) The screen renders an auto-placed decimal point plus decimal slots, and drops the `r N` reveal. All math is unit-tested (bun:test); the screen is covered by Playwright e2e.

**Tech Stack:** Vanilla ES modules, `bun:test` (unit), Playwright (e2e), plain CSS grid. No framework.

---

## Environment setup (READ FIRST)

`bun` is **not** on this machine's PATH. Use the full paths in every command below:
- Unit tests: `"/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
- E2E: `"/c/Users/JeganGN/.bun/bin/bunx.exe" playwright test <file>`

**Before any e2e step**, ensure a *fresh* dev server is serving current `src/` (a stale `bun ./dev.js` on :5173 serves old code and Playwright reuses it):
```bash
netstat -ano | grep 5173                 # find stale PID if any
powershell -NoProfile -Command "Stop-Process -Id <PID> -Force"   # kill it
cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" ./dev.js   # start fresh (run in background)
curl -s http://localhost:5173/game.js | grep -c col-sub          # expect >0 (current code)
```

Spec: `docs/superpowers/specs/2026-06-03-decimal-division-design.md`

---

## File structure

- `src/logic-daniel.js` — analyzer (`analyzeShortDiv`), answer-state (`createAnswerStateN`), generator (`genDiv`, `BANDS.ndiv`, new `pick` helper). Pure functions.
- `src/screens/short-div.js` — render the worksheet with decimal point + decimal slots; remove the remainder reveal.
- `src/style.css` — decimal-point cell + muted decimal styling; remove dead `.div-rem`.
- `test/logic-daniel.test.js` — unit tests for the three logic changes.
- `e2e/daniel-div.spec.js` — solve decimal problems; assert decimal point + no remainder.

---

## Task 1: Extend `analyzeShortDiv` for decimal expansion

**Files:**
- Modify: `src/logic-daniel.js` (function `analyzeShortDiv`, currently ~lines 133-147)
- Test: `test/logic-daniel.test.js` (replace the two `analyzeShortDiv` tests, currently ~lines 139-151)

- [ ] **Step 1: Replace the old analyzer unit tests with decimal cases**

In `test/logic-daniel.test.js`, delete these two existing tests:

```js
test("analyzeShortDiv: bus-stop quotient, remainder, carried remainders", () => {
  const r = analyzeShortDiv(416, 3); // 138 r2
  expect(r.quotientDigits).toEqual([1, 3, 8]);
  expect(r.remainder).toBe(2);
  expect(r.steps.map((s) => s.remainder)).toEqual([1, 2, 2]);
  expect(r.steps.map((s) => s.carryIn)).toEqual([0, 1, 2]);
});

test("analyzeShortDiv: exact division with an internal zero in the quotient", () => {
  const r = analyzeShortDiv(618, 6); // 103 r0
  expect(r.quotientDigits).toEqual([1, 0, 3]);
  expect(r.remainder).toBe(0);
});
```

and replace them with:

```js
test("analyzeShortDiv: decimal expansion, 1 place (764 ÷ 5 = 152.8)", () => {
  const r = analyzeShortDiv(764, 5);
  expect(r.quotientIntDigits).toEqual([1, 5, 2]);
  expect(r.quotientDecDigits).toEqual([8]);
  expect(r.decimalPlaces).toBe(1);
  expect(r.answer).toBe(152.8);
  expect(r.remainder).toBe(0);
  // last step brings down a zero against the integer remainder (4): 40 / 5 = 8
  expect(r.steps.at(-1)).toMatchObject({ digit: 0, carryIn: 4, value: 40, q: 8, remainder: 0, decimal: true });
});

test("analyzeShortDiv: decimal expansion, 2 places (765 ÷ 4 = 191.25)", () => {
  const r = analyzeShortDiv(765, 4);
  expect(r.quotientIntDigits).toEqual([1, 9, 1]);
  expect(r.quotientDecDigits).toEqual([2, 5]);
  expect(r.decimalPlaces).toBe(2);
  expect(r.answer).toBe(191.25);
  expect(r.remainder).toBe(0);
  expect(r.steps.length).toBe(5); // 3 integer + 2 decimal
});

test("analyzeShortDiv: 2-digit ÷ 2 → one decimal place (47 ÷ 2 = 23.5)", () => {
  const r = analyzeShortDiv(47, 2);
  expect(r.quotientIntDigits).toEqual([2, 3]);
  expect(r.quotientDecDigits).toEqual([5]);
  expect(r.answer).toBe(23.5);
  expect(r.steps.filter((s) => s.decimal).length).toBe(1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
Expected: FAIL — `r.quotientIntDigits` is undefined (analyzer still returns `quotientDigits`/`remainder` only).

- [ ] **Step 3: Rewrite `analyzeShortDiv`**

In `src/logic-daniel.js`, replace the whole `analyzeShortDiv` function (the block starting `export function analyzeShortDiv(dividend, divisor) {`) with:

```js
export function analyzeShortDiv(dividend, divisor) {
  const MAX_PLACES = 2;
  const intDigits = digitsOfN(dividend); // MSB-first
  const steps = [];
  const quotientIntDigits = [];
  const quotientDecDigits = [];
  let carry = 0;

  // Integer part: one column per dividend digit.
  for (let i = 0; i < intDigits.length; i++) {
    const carryIn = carry;
    const value = carryIn * 10 + intDigits[i];
    const q = Math.floor(value / divisor);
    carry = value % divisor;
    quotientIntDigits.push(q);
    steps.push({ digit: intDigits[i], carryIn, value, q, remainder: carry, decimal: false });
  }

  // Decimal part: bring down zeros until the remainder clears (capped at MAX_PLACES).
  while (carry > 0 && quotientDecDigits.length < MAX_PLACES) {
    const carryIn = carry;
    const value = carryIn * 10; // brought-down zero
    const q = Math.floor(value / divisor);
    carry = value % divisor;
    quotientDecDigits.push(q);
    steps.push({ digit: 0, carryIn, value, q, remainder: carry, decimal: true });
  }

  const answer = Number(
    quotientIntDigits.join("") +
    (quotientDecDigits.length ? "." + quotientDecDigits.join("") : "")
  );

  return {
    dividend, divisor,
    intDigits,
    decimalPlaces: quotientDecDigits.length,
    quotientIntDigits,
    quotientDecDigits,
    steps,
    remainder: carry,
    answer,
  };
}
```

Also update the function's doc comment above it (the block starting `// ----- Short ("bus-stop") division`) — append one sentence: `After the integer part, the walk continues into the decimal part by bringing down zeros until the remainder is 0 (capped at 2 places); generated divisors (2/4/5) always terminate within that cap.`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
Expected: the 3 new `analyzeShortDiv` tests PASS. (The `SPLIT (ndiv)` band test and the screen will still be on old contracts — the ndiv band test may fail here; that's fixed in Task 3. If it fails, proceed; do not fix it in this task.)

- [ ] **Step 5: Commit**

```bash
cd "C:\dev\projects\Dave and Daniel"
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): analyzeShortDiv computes decimal quotient (no remainder)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `createAnswerStateN` accepts a digit array

The decimal answer `152.8` cannot be passed as a number (its digit list must be `[1,5,2,8]`, and `digitsOfN(152.8)` would choke on the `.`). Let `createAnswerStateN` accept an explicit digit array.

**Files:**
- Modify: `src/logic-daniel.js` (function `createAnswerStateN`, currently ~lines 21-31)
- Test: `test/logic-daniel.test.js`

- [ ] **Step 1: Write the failing test**

In `test/logic-daniel.test.js`, add after the existing `createAnswerStateN (ltr)` test (~line 72):

```js
test("createAnswerStateN accepts an explicit digit array (decimal quotient)", () => {
  const s = createAnswerStateN([1, 5, 2, 8], "ltr");
  expect(s.expected).toEqual([1, 5, 2, 8]);
  expect(s.slots).toEqual([null, null, null, null]);
  expect(s.activeIndex).toBe(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
Expected: FAIL — `digitsOfN([1,5,2,8])` does `String([1,5,2,8])` → `"1,5,2,8"` → wrong `expected`.

- [ ] **Step 3: Implement the array overload**

In `src/logic-daniel.js`, in `createAnswerStateN`, change the first line of the body from:

```js
  const expected = digitsOfN(answer);
```

to:

```js
  const expected = Array.isArray(answer) ? answer.slice() : digitsOfN(answer);
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
Expected: the new test PASSES; the existing `createAnswerStateN` number tests still PASS.

- [ ] **Step 5: Commit**

```bash
cd "C:\dev\projects\Dave and Daniel"
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): createAnswerStateN accepts a digit array for decimal answers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Decimal division generator bands

**Files:**
- Modify: `src/logic-daniel.js` (`BANDS.ndiv` ~lines 192-198; `genDiv` ~lines 248-257; add `pick` helper near `randInt` ~line 155)
- Test: `test/logic-daniel.test.js` (replace the `SPLIT (ndiv)` test ~lines 219-235)

- [ ] **Step 1: Replace the ndiv band test**

In `test/logic-daniel.test.js`, delete the existing test that starts:

```js
test("SPLIT (ndiv): divisor 1-digit; first dividend digit >= divisor; M1 exact 2-digit; M4 3-digit", () => {
```

(through its closing `});` at ~line 235) and replace with:

```js
const divPlaces = (a, b) => analyzeShortDiv(a, b).decimalPlaces;

test("SPLIT (ndiv): decimals only — divisors 2/4/5, non-integer, no leading zero, exact <=2 places", () => {
  const allowed = { 1: [2, 5], 2: [2, 5], 3: [4], 4: [4], 5: [2, 4, 5] };
  const places  = { 1: 1, 2: 1, 3: 2, 4: 2, 5: "any" };
  const nDigits = { 1: 2, 2: 3, 3: 2, 4: 3, 5: 3 };
  for (const seed of SEEDS) {
    for (let m = 1; m <= 5; m++) {
      for (const p of getProblemsDaniel("ndiv", m, mulberry32(seed))) {
        expect(allowed[m]).toContain(p.b);                      // divisor in band set
        expect(p.a % p.b).not.toBe(0);                          // forces a decimal
        expect(digitsOfN(p.a)[0]).toBeGreaterThanOrEqual(p.b);  // quotient has no leading zero
        expect(p.answer).toBe(p.a / p.b);                       // exact decimal value
        expect(String(p.a).length).toBe(nDigits[m]);            // dividend size
        const pl = divPlaces(p.a, p.b);
        expect(pl).toBeGreaterThanOrEqual(1);
        expect(pl).toBeLessThanOrEqual(2);
        if (places[m] !== "any") expect(pl).toBe(places[m]);
      }
    }
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
Expected: FAIL — current generator still emits divisors 3/6/7/9 and exact (remainder-0) problems, and `p.b` won't always be in `[2,4,5]`.

- [ ] **Step 3: Add `pick`, rewrite the band table and `genDiv`**

(a) In `src/logic-daniel.js`, just after the `randInt` helper (`function randInt(rng, lo, hi) { ... }`), add:

```js
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
```

(b) Replace the entire `ndiv: { ... }` block inside `BANDS` with:

```js
  ndiv: {
    1: { kind: "div", dA: 2, divisors: [2, 5], places: 1 },
    2: { kind: "div", dA: 3, divisors: [2, 5], places: 1 },
    3: { kind: "div", dA: 2, divisors: [4], places: 2 },
    4: { kind: "div", dA: 3, divisors: [4], places: 2 },
    5: { kind: "div", dA: 3, divisors: [2, 4, 5], places: "any" },
  },
```

(c) Replace the entire `genDiv` function with:

```js
function genDiv(rng, band) {
  const { a, b } = genUntil(
    () => ({ a: nDigit(rng, band.dA), b: pick(rng, band.divisors) }),
    ({ a, b }) => {
      if (a % b === 0) return false;                 // must leave a real decimal
      if (digitsOfN(a)[0] < b) return false;         // quotient has no leading zero
      const places = analyzeShortDiv(a, b).decimalPlaces;
      return band.places === "any" ? true : places === band.places;
    }
  );
  return { op: "÷", a, b, answer: a / b };
}
```

- [ ] **Step 4: Run to verify all unit tests pass**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
Expected: PASS — all logic tests green (analyzer, answer-state, bands, and the unchanged add/sub/mul tests).

- [ ] **Step 5: Commit**

```bash
cd "C:\dev\projects\Dave and Daniel"
git add src/logic-daniel.js test/logic-daniel.test.js
git commit -m "feat(daniel): division bands generate clean decimals (divisors 2/4/5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Render decimals in the short-division screen

**Files:**
- Modify: `src/screens/short-div.js` (`startProblem` ~lines 77-84; `renderWorksheet` ~lines 86-109; completion block in `onDrop` ~lines 158-165)
- Modify: `e2e/daniel-div.spec.js`

- [ ] **Step 1: Update the e2e to solve decimals + assert no remainder (failing test)**

Replace the whole contents of `e2e/daniel-div.spec.js` with:

```js
import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';
import { analyzeShortDiv } from '../src/logic-daniel.js';

// Daniel · OP: SPLIT — decimal short division. Drops the quotient digits
// LEFT-to-RIGHT including the decimal digits (the auto-placed point is not a tile).

async function dragDigit(page, digit, slotSel) {
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  const tBox = await tile.boundingBox();
  const sBox = await page.locator(slotSel).first().boundingBox();
  if (!tBox || !sBox) throw new Error(`missing tile ${digit} or active slot`);
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function solveShortDiv(page) {
  const prob = await page.locator('#screen-short-div').getAttribute('data-problem'); // "764÷5"
  const [a, b] = prob.split('÷').map(Number);
  const info = analyzeShortDiv(a, b);
  const digits = info.quotientIntDigits.concat(info.quotientDecDigits); // LTR incl. decimals
  for (const d of digits) {
    await dragDigit(page, d, '.div-ws .slot.active');
    await page.waitForTimeout(900); // snap + carried-remainder reveal
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('SPLIT shows an auto-placed decimal point and no remainder', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');
  await goToLevel(page, 'ndiv', 2, 'daniel'); // 3-digit ÷ 2/5 → 1 decimal place
  await expect(page.locator('#screen-short-div')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);
  await expect(page.locator('.div-ws .div-point').first()).toBeVisible();
  await expect(page.locator('.div-ws')).not.toContainText('r ');
  await solveShortDiv(page); // decimal slots are functional
});

for (let level = 1; level <= 5; level++) {
  test(`SPLIT M${level}: solve all 5 problems → 3 stars`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?profile=daniel');
    await unlockAll(page, 'daniel');
    await goToLevel(page, 'ndiv', level, 'daniel');
    await expect(page.locator('#screen-short-div')).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(i === 0 ? 300 : 700);
      await solveShortDiv(page);
    }

    await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('.star-meter.big .star.earned'),
      `M${level}: expected 3 stars`
    ).toHaveCount(3, { timeout: 5000 });
  });
}
```

- [ ] **Step 2: Run the new assertion test to verify it fails**

Ensure a fresh dev server is running (see Environment setup), then:
Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bunx.exe" playwright test e2e/daniel-div.spec.js -g "auto-placed decimal point"`
Expected: FAIL — the screen still renders the old layout (no `.div-point`, shows `r N`), and `solveShortDiv` can't fill decimal slots.

- [ ] **Step 3: Update `startProblem` to build a digit-array answer state**

In `src/screens/short-div.js`, replace the `startProblem` function with:

```js
  function startProblem() {
    const p = problems[idx];
    info = analyzeShortDiv(p.a, p.b);
    N = info.steps.length; // total columns: integer digits + brought-down decimal zeros
    activeState = createAnswerStateN(info.quotientIntDigits.concat(info.quotientDecDigits), "ltr");
    sec.dataset.problem = `${p.a}÷${p.b}`;
    renderWorksheet();
  }
```

- [ ] **Step 4: Rewrite `renderWorksheet` for the decimal layout**

In `src/screens/short-div.js`, replace the entire `renderWorksheet` function with:

```js
  function renderWorksheet() {
    const p = problems[idx];
    const ws = sec.querySelector(".col-ws");
    const nInt = info.intDigits.length;
    const nDec = info.decimalPlaces;

    // Columns: divisor | integer digits | decimal point | decimal digits.
    ws.style.gridTemplateColumns =
      `64px repeat(${nInt}, var(--col-w)) var(--point-w) repeat(${nDec}, var(--col-w))`;

    // Quotient row: blank divisor col, integer slots, point cell, decimal slots.
    let q = `<div class="ws-op"></div>`;
    for (let c = 0; c < nInt; c++) {
      q += `<div class="slot ${c === activeState.activeIndex ? "active" : "inactive"}" data-index="${c}"></div>`;
    }
    q += `<div class="cell div-point">.</div>`;
    for (let k = 0; k < nDec; k++) {
      const i = nInt + k;
      q += `<div class="slot ${i === activeState.activeIndex ? "active" : "inactive"}" data-index="${i}"></div>`;
    }

    // Dividend row: divisor, integer digits (carry sups), point, brought-down zeros (carry sups).
    let d = `<div class="cell div-divisor">${p.b}</div>`;
    for (let c = 0; c < nInt; c++) {
      const carryIn = info.steps[c].carryIn;
      const sup = (c > 0 && carryIn > 0) ? `<span class="div-carry" data-col="${c}">${carryIn}</span>` : "";
      d += `<div class="cell div-dividend${c === 0 ? " first" : ""}">${sup}${info.steps[c].digit}</div>`;
    }
    d += `<div class="cell div-dividend div-point div-muted">.</div>`;
    for (let k = 0; k < nDec; k++) {
      const i = nInt + k;
      const carryIn = info.steps[i].carryIn;
      const sup = carryIn > 0 ? `<span class="div-carry" data-col="${i}">${carryIn}</span>` : "";
      d += `<div class="cell div-dividend div-muted">${sup}0</div>`;
    }

    ws.innerHTML = `${q}${d}`;
    relayout();
  }
```

(Note: `N = info.steps.length` still equals the number of quotient slots, because every step — integer or decimal — maps to exactly one slot. The carry-reveal in `onDrop` tags superscripts with `data-col = step index = slot index`, so it now reveals the decimal carries too, unchanged.)

- [ ] **Step 5: Remove the `r N` reveal on completion**

In `src/screens/short-div.js`, in `onDrop`, replace this block:

```js
        if (isComplete(activeState)) {
          const rem = sec.querySelector(".div-rem");
          if (rem) {
            rem.textContent = `r ${info.remainder}`;
            rem.classList.add("show");
          }
          sfx.correctYay();
          await advanceProblem();
        } else {
```

with:

```js
        if (isComplete(activeState)) {
          sfx.correctYay();
          await advanceProblem();
        } else {
```

- [ ] **Step 6: Run the assertion test to verify it passes**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bunx.exe" playwright test e2e/daniel-div.spec.js -g "auto-placed decimal point"`
Expected: PASS — decimal point visible, no `r `, problem solves.

- [ ] **Step 7: Run all 5 solve-through levels**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bunx.exe" playwright test e2e/daniel-div.spec.js`
Expected: PASS — all 6 tests (assertion + M1–M5) green.

- [ ] **Step 8: Commit**

```bash
cd "C:\dev\projects\Dave and Daniel"
git add src/screens/short-div.js e2e/daniel-div.spec.js
git commit -m "feat(daniel): short-division screen renders decimal answers (drops r N)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Style the decimal point + muted decimal zeros

**Files:**
- Modify: `src/style.css` (the `.div-ws` block ~lines 1420-1442)

- [ ] **Step 1: Add the point width var, point/muted styles; remove dead `.div-rem`**

In `src/style.css`, change the `.div-ws` declaration from:

```css
.div-ws { --col-w: 88px; top: 150px; gap: 6px 4px; }
```

to:

```css
.div-ws { --col-w: 88px; --point-w: 34px; top: 150px; gap: 6px 4px; }
```

Delete these now-unused rules:

```css
.div-rem {
  display: flex; align-items: center; justify-content: flex-start; padding-left: 8px;
  font-size: 52px; color: var(--ink-soft); opacity: 0; white-space: nowrap;
  transition: opacity .3s var(--ease-pop);
}
.div-rem.show { opacity: 1; }
```

and in their place add:

```css
/* Auto-placed decimal point (both rows) + the brought-down decimal zeros, shown muted. */
.div-point { text-align: center; }
.div-ws .div-muted { color: var(--ink-soft); }
```

Then change the portrait rule from:

```css
#stage[data-orient="portrait"] .div-ws { --col-w: 74px; top: 50%; }
```

to:

```css
#stage[data-orient="portrait"] .div-ws { --col-w: 74px; --point-w: 28px; top: 50%; }
```

- [ ] **Step 2: Capture a screenshot to verify the layout**

Create `e2e/_capture-div.spec.js`:

```js
import { test } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

test('capture decimal division', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/?profile=daniel');
  await unlockAll(page, 'daniel');
  await goToLevel(page, 'ndiv', 4, 'daniel'); // 3-digit ÷ 4 → 2 decimal places
  await page.locator('#screen-short-div').waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.locator('.div-ws').screenshot({ path: 'test-results/decimal-division.png' });
});
```

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bunx.exe" playwright test e2e/_capture-div.spec.js`
Then open `test-results/decimal-division.png` and confirm: the quotient shows `int . dec` aligned over the dividend's `int . 0 0`, the point and zeros read muted, the bracket extends over the decimal columns, and there is no `r N`.

- [ ] **Step 3: Delete the capture spec**

```bash
cd "C:\dev\projects\Dave and Daniel" && rm -f e2e/_capture-div.spec.js
```

- [ ] **Step 4: Commit**

```bash
cd "C:\dev\projects\Dave and Daniel"
git add src/style.css
git commit -m "style(daniel): decimal point + muted brought-down zeros for division

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Full verification + push

- [ ] **Step 1: Run the whole unit suite**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bun.exe" test ./test`
Expected: all tests PASS, 0 fail.

- [ ] **Step 2: Run the division e2e suite**

Run: `cd "C:\dev\projects\Dave and Daniel" && "/c/Users/JeganGN/.bun/bin/bunx.exe" playwright test e2e/daniel-div.spec.js`
Expected: all 6 tests PASS. (Note: pre-existing failures in Dave's `borrow-*` / `math-audit-subtraction` specs are unrelated to this change — do not treat them as regressions.)

- [ ] **Step 3: Mark the spec done and push**

Edit `docs/superpowers/specs/2026-06-03-decimal-division-design.md`: change `**Status:** Approved (design) — pending spec review` to `**Status:** Implemented`.

```bash
cd "C:\dev\projects\Dave and Daniel"
git add docs/superpowers/specs/2026-06-03-decimal-division-design.md
git commit -m "docs(daniel): mark decimal-division spec implemented

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

---

## Self-review

**Spec coverage:**
- Exact decimals ≤2 places → Task 1 (analyzer) + Task 3 (bands). ✓
- Divisors limited to 2/4/5, forced non-integer, no leading zero → Task 3. ✓
- Auto-placed decimal point, decimal slots, drag 0–9 only → Task 4. ✓
- Carries animate across the appended zeros → Task 4 (unchanged reveal, `data-col = step index`). ✓
- Remove `r N` and dead styles → Task 4 (logic) + Task 5 (CSS). ✓
- Muted decimal point/zeros, aligned, bracket extends → Task 4 (markup) + Task 5 (CSS). ✓
- Unit + e2e tests → Tasks 1–4. ✓
- Removed divisors 3/6/7/8/9; progress stays valid (same 5 levels) → Task 3 (no migration needed). ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `analyzeShortDiv` returns `intDigits`, `decimalPlaces`, `quotientIntDigits`, `quotientDecDigits`, `steps[].decimal`, `remainder`, `answer`. These exact names are used in the band test (Task 3), `startProblem`/`renderWorksheet` (Task 4), and the e2e `solveShortDiv` (Task 4). `createAnswerStateN(array, "ltr")` (Task 2) is consumed in Task 4. `pick(rng, arr)` defined and used in Task 3. `--point-w` / `.div-point` / `.div-muted` defined in Task 5, emitted in Task 4. Consistent.
