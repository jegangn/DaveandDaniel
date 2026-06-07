# Multiplication-Screen Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 issues on the multiplication screens — stuck tiles under multitouch, the group-count convention, where the answer is entered, and the per-landing counting sound.

**Architecture:** Vanilla JS, no framework. Shared drag manager (`src/drag.js`) becomes multi-pointer. Both mult screens (`src/screens/mult-tap.js`, `src/screens/mult-drag.js`) swap their group loops and move the answer slot into the equation header. The portrait layout engine (`src/layout.js`) drops the separate answer-box anchoring. Audio synth (`src/audio.js`) reused for the landing tone. `src/logic.js` is NOT changed.

**Tech Stack:** Vanilla ES modules, esbuild bundle (`build.js` → root `index.html`), Playwright e2e (`bun run e2e`), bun unit tests (`bun test ./test`).

**Conventions / gotchas (from project memory):**
- e2e: app boots to a profile picker. Navigate via `goToLevel(page, world, level, profile)` from `e2e/helpers/math.js` (after `page.goto('/')` + `unlockAll`), or `.splash-play` + world-panel for Dave. Don't rely on `goto('/')` alone.
- Kill any stale `:5173` dev server before running Playwright; verify you're on the rebuilt bundle.
- After src/ edits, the live site only updates once `build.js` regenerates the root `index.html`. Rebuild before committing the final change.
- Auto-commit + push to `main` after each task (project Rule 7).

---

## File Structure

- `src/drag.js` — MODIFY: replace single `dragging` with a `pointerId`-keyed Map; per-pointer move/end.
- `src/screens/mult-tap.js` — MODIFY: swap group loop (b groups of a); move answer slot into equation; drop `.total-reveal`.
- `src/screens/mult-drag.js` — MODIFY: swap group loop; move answer slot into equation; drop `.ans-host`; add landing counting tone + landed counter.
- `src/layout.js` — MODIFY: `layoutMultTap` / `layoutMultDrag` no longer anchor a separate answer box; play band spans header→tray.
- `src/style.css` — MODIFY: add `.mult-problem .slot` sizing (both orientations); remove dead `.total-reveal` / `.ans-host` rules.
- `src/audio.js` — (reuse `sfx.blockTap`; no change unless a dedicated `landCount` is preferred).
- `e2e/03-multiplication.spec.js` — MODIFY: group counts + equation-slot expectations.
- `e2e/mult-tap-layout.spec.js` — MODIFY: no `.total-reveal` panel.
- `e2e/touch-drag.spec.js` — ADD: two-finger no-stuck regression.
- `e2e/mult-grouping.spec.js` — CREATE: asserts b groups of a on both screens.

---

## Task 1: Per-finger drag tracking (item 1)

**Files:**
- Modify: `src/drag.js`
- Test: `e2e/touch-drag.spec.js` (add a test)

- [ ] **Step 1: Add failing two-finger regression test** to `e2e/touch-drag.spec.js` (append at end):

```js
test('two fingers drag two tiles at once; neither gets stuck', async ({ page }) => {
  test.setTimeout(45_000);
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  // Mult tap L1 (Dave world panel 3) — single-digit answers, tiles 0–9 present.
  await page.locator('.splash-play').tap();
  await page.locator('.world-panel').nth(2).locator('.level-node').first().tap();
  await page.waitForTimeout(700);

  const a = await page.locator('.tile[data-value="3"]').first().boundingBox();
  const b = await page.locator('.tile[data-value="5"]').first().boundingBox();

  // Two simultaneous touch pointers, each on a different tile.
  await page.evaluate(({ a, b }) => {
    function fire(target, type, x, y, id) {
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerType: 'touch',
        pointerId: id, clientX: x, clientY: y, isPrimary: id === 1,
      }));
    }
    const ax = a.x + a.width / 2, ay = a.y + a.height / 2;
    const bx = b.x + b.width / 2, by = b.y + b.height / 2;
    fire(document.elementFromPoint(ax, ay), 'pointerdown', ax, ay, 1);
    fire(document.elementFromPoint(bx, by), 'pointerdown', bx, by, 2);
    fire(window, 'pointermove', ax + 100, ay - 200, 1);
    fire(window, 'pointermove', bx - 100, by - 200, 2);
  }, { a, b });
  await page.waitForTimeout(100);

  // BOTH clones present and dragging at the same time.
  await expect(page.locator('.tile.drag-clone.dragging')).toHaveCount(2);

  // Release both.
  await page.evaluate(() => {
    function fire(type, x, y, id) {
      window.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerType: 'touch',
        pointerId: id, clientX: x, clientY: y, isPrimary: id === 1,
      }));
    }
    fire('pointerup', 200, 200, 1);
    fire('pointerup', 300, 200, 2);
  });
  await page.waitForTimeout(200);

  // No clones left on the stage, and no source tile stuck hidden.
  await expect(page.locator('.drag-clone')).toHaveCount(0);
  const hidden = await page.locator('.tile').evaluateAll(
    (els) => els.filter((e) => e.style.visibility === 'hidden').length);
  expect(hidden).toBe(0);
});
```

- [ ] **Step 2: Run it, verify it FAILS** (only 1 clone today; second overwrites first):

Run: `bun run e2e -- touch-drag.spec.js -g "two fingers"`
Expected: FAIL at `toHaveCount(2)` (single global `dragging`).

- [ ] **Step 3: Rewrite `createDragManager` in `src/drag.js`** to track per-pointer drags in a Map. Replace the whole `createDragManager` function (lines 36–107) with:

```js
export function createDragManager({ getTargets, onPickup, onDrop }) {
  const drags = new Map(); // pointerId -> drag state

  function start(e, sourceEl, payload) {
    e.preventDefault();
    const tileRect = sourceEl.getBoundingClientRect();
    const { stage, rect: sRect, scale } = stageInfo();
    const tileLocalLeft = (tileRect.left - sRect.left) / scale;
    const tileLocalTop  = (tileRect.top  - sRect.top)  / scale;
    const pointerLocal = toStageLocal(e.clientX, e.clientY);
    const offsetX = pointerLocal.x - tileLocalLeft;
    const offsetY = pointerLocal.y - tileLocalTop;
    const origin = { x: tileLocalLeft, y: tileLocalTop };

    const dragEl = sourceEl.cloneNode(true);
    dragEl.classList.add("drag-clone");
    dragEl.classList.remove("dim", "hint-dim", "hint-target");
    dragEl.style.position = "absolute";
    dragEl.style.left = `${origin.x}px`;
    dragEl.style.top  = `${origin.y}px`;
    dragEl.style.margin = "0";
    dragEl.style.pointerEvents = "none";
    stage.appendChild(dragEl);

    sourceEl.style.visibility = "hidden";

    drags.set(e.pointerId, { dragEl, sourceEl, payload, origin, offsetX, offsetY });
    sourceEl.setPointerCapture?.(e.pointerId);
    onPickup?.(payload, dragEl);

    dragEl.classList.add("dragging");
    // Listeners are attached once and dispatch by pointerId, so concurrent
    // drags each get their own move/end without clobbering one another.
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function move(e) {
    const d = drags.get(e.pointerId);
    if (!d) return;
    const p = toStageLocal(e.clientX, e.clientY);
    d.dragEl.style.left = `${p.x - d.offsetX}px`;
    d.dragEl.style.top  = `${p.y - d.offsetY}px`;
  }

  function end(e) {
    const d = drags.get(e.pointerId);
    if (!d) return;
    drags.delete(e.pointerId);
    const { dragEl, sourceEl, payload, origin } = d;
    const targets = getTargets();
    const target = findDropTarget(targets, e.clientX, e.clientY, 40);
    dragEl.classList.remove("dragging");
    sourceEl.style.visibility = "";
    if (drags.size === 0) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    }
    onDrop?.(payload, target, dragEl, origin, { sourceEl });
  }

  return { start };
}
```

- [ ] **Step 4: Run the test, verify PASS:**

Run: `bun run e2e -- touch-drag.spec.js`
Expected: all touch-drag tests PASS (existing single-drag ones still green; new two-finger test green).

- [ ] **Step 5: Commit**

```bash
git add src/drag.js e2e/touch-drag.spec.js
git commit -m "fix(drag): track each finger independently so tiles never stick (OP: MULTFIX)"
```

---

## Task 2: Group convention — b groups of a (item 2)

**Files:**
- Modify: `src/screens/mult-tap.js:81-100`, `src/screens/mult-drag.js:125-140` (and per-group counts)
- Test: `e2e/mult-grouping.spec.js` (create), `e2e/03-multiplication.spec.js` (update)

- [ ] **Step 1: Create failing test `e2e/mult-grouping.spec.js`:**

```js
import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

// "a × b" means a items per group, shown b times → b groups of a.
test('tap screen: 2×1 renders 1 group of 2', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 1); // first problem 2×1
  await expect(page.locator('#screen-mult-tap')).toBeVisible();
  await expect(page.locator('.lily-group')).toHaveCount(1);      // b = 1 group
  await expect(page.locator('.lily-group .block-host')).toHaveCount(2); // a = 2 each
});

test('drag screen: 4×2 renders 2 trays of 4 ghosts', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 4); // L4 problems are drag; first is 2×3
  await expect(page.locator('#screen-mult-drag')).toBeVisible();
  // First problem 2×3 → 3 groups of 2.
  await expect(page.locator('.group-tray')).toHaveCount(3);
  await expect(page.locator('.group-tray').first().locator('.ghost')).toHaveCount(2);
});
```

- [ ] **Step 2: Run, verify FAIL:**

Run: `bun run e2e -- mult-grouping.spec.js`
Expected: FAIL — today 2×1 → 2 groups, 2×3 → 2 trays of 3.

- [ ] **Step 3a: `src/screens/mult-tap.js`** — swap the group loop. Replace lines 81–100 (`for (let g = 0; g < p.a; g++) { … }`) so groups = `p.b`, items = `p.a`:

```js
    for (let g = 0; g < p.b; g++) {
      const pad = document.createElement("div");
      pad.className = "lily-group";
      pad.insertAdjacentHTML("beforeend", lilypad());
      const blocks = document.createElement("div");
      blocks.className = "block-grid";
      blocks.dataset.count = String(p.a);
      for (let i = 0; i < p.a; i++) {
        const wrap = document.createElement("div");
        wrap.className = "block-host untapped";
        wrap.dataset.groupIndex = String(g);
        wrap.dataset.blockIndex = String(i);
        wrap.insertAdjacentHTML("beforeend", firefly());
        wrap.addEventListener("pointerup", () => onBlockTap(wrap));
        blocks.appendChild(wrap);
        blockEls.push(wrap);
      }
      pad.appendChild(blocks);
      area.appendChild(pad);
    }
```

- [ ] **Step 3b: `src/screens/mult-drag.js`** — swap the group loop. Replace lines 125–140 so groups = `p.b`, slots-per-group = `p.a`:

```js
    for (let g = 0; g < p.b; g++) {
      const tray = document.createElement("div");
      tray.className = "group-tray";
      tray.dataset.idx = String(g);
      for (let i = 0; i < p.a; i++) {
        const ghost = document.createElement("div");
        ghost.className = "ghost";
        tray.appendChild(ghost);
      }
      const chip = document.createElement("div");
      chip.className = "count-chip";
      chip.textContent = `0 / ${p.a}`;
      tray.appendChild(chip);
      groupRow.appendChild(tray);
      groupContents.push({ filled: 0, needed: p.a });
    }
```

(`onPileTap` already reads `gc.needed` / `groupContents`, so the chip text `${gc.filled} / ${gc.needed}` and `★ ${gc.needed}` stay correct with no further change.)

- [ ] **Step 4: Update `e2e/03-multiplication.spec.js`** to the new convention:
  - First test: `await expect(page.locator('.lily-group')).toHaveCount(1);` and update the comment to "2×1 = 2 per group, 1 group".
  - "tap all blocks" test: total fireflies is still `a*b = 2`, so `expect(total).toBe(2)` is unchanged — leave it.

- [ ] **Step 5: Run both specs, verify PASS:**

Run: `bun run e2e -- mult-grouping.spec.js 03-multiplication.spec.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/mult-tap.js src/screens/mult-drag.js e2e/mult-grouping.spec.js e2e/03-multiplication.spec.js
git commit -m "fix(mult): 'a × b' renders b groups of a (a per group, b times) (OP: MULTFIX)"
```

---

## Task 3: Answer goes in the box after "=" (item 3)

**Files:**
- Modify: `src/screens/mult-tap.js`, `src/screens/mult-drag.js`, `src/layout.js`, `src/style.css`
- Test: `e2e/mult-tap-layout.spec.js` (update), plus an assertion in `e2e/mult-grouping.spec.js` or a new check.

### 3a — CSS: equation answer slot sizing

- [ ] **Step 1:** In `src/style.css`, after the `.op-chip.q` rule (line ~663), add a slot variant for the equation, sized for two digits:

```css
/* The "= ?" answer is dropped directly into this slot in the equation header.
   Sized to fit a two-digit answer (e.g. "20") in both orientations. */
.mult-problem .slot {
  width: 120px; height: 130px;
  font-size: 76px;
  border-radius: var(--r-lg);
}
```

- [ ] **Step 2:** In the portrait block (near line 1050, after `.op-chip` portrait rule), add:

```css
#stage[data-orient="portrait"] .mult-problem .slot {
  width: 80px; height: 90px;
  font-size: 44px;
  border-width: 3px;
}
```

- [ ] **Step 3:** Remove the now-dead answer-panel CSS: delete the `.total-reveal` block (lines ~717–726), the shared `.total-reveal .slot, .ans-host .slot` rule (~731–736), `.ans-host .display` (~738), `.ans-host` (~797–803), and their portrait counterparts (`#stage[data-orient="portrait"] .total-reveal …` ~1084–1090, `… .total-reveal .slot, … .ans-host .slot` ~1092–1097, `… .ans-host .display` ~1098–1100, `… .ans-host` ~1150–1157). Keep `.ans-slot-host` only if still referenced — after Task 3b/3c it is not, so remove it too (~739).

### 3b — mult-tap.js: slot in equation, drop the reveal panel

- [ ] **Step 4:** Edit `src/screens/mult-tap.js`:
  - In the `sec.innerHTML` template (lines 33–43), change the problem line's `?` chip to a slot and delete the `.total-reveal` line:

```js
  sec.innerHTML = `
    <div class="topbar">
      <button class="home-btn small"></button>
      <div class="progress-dots"></div>
    </div>
    <div class="mult-problem"></div>
    <div class="firefly-area"></div>
    <div class="digit-tray"></div>
    <div class="corner-mascot"></div>
  `;
```

  - In `renderProblem`, build the equation with a live slot instead of the `?` chip:

```js
    probEl.innerHTML = `
      <div class="op-chip display">${p.a}</div>
      <div class="op-sym display">×</div>
      <div class="op-chip display">${p.b}</div>
      <div class="op-sym display">=</div>
      <div class="slot active" data-index="0"></div>
    `;
```

  - In `showReveal()`, delete everything that touches `.total-reveal` (the `reveal`/`host` lookup, `host.innerHTML`, `reveal.classList.remove('hidden')`, and the `reveal.animate(...)` call). Keep the digit-tray build and the trailing `setupDrag()`. The function now only builds the tray + drag.

- [ ] **Step 5:** Edit `src/layout.js` `layoutMultTap` (lines 149–173): remove the `reveal` variable, its `clearInline`, and the `reveal.style.bottom` block. The band bottom is the tray top:

```js
export function layoutMultTap(stage, sec) {
  if (!sec || !sec.isConnected) return;
  const tray = sec.querySelector(".digit-tray");
  const firefly = sec.querySelector(".firefly-area");
  if (!isPortrait(stage)) {
    if (tray) { clearTileSizes(tray.querySelectorAll(".tile")); tray.style.height = ""; }
    clearInline(firefly, ["position", "left", "top", "transform"]);
    return;
  }
  const H = stage.offsetHeight;
  if (H < 400 || !tray) return;
  const trayH = fitTray(stage, tray, maxTrayHeight(H));
  const bandTop = headerBottom(stage, sec) + BAND_PAD;
  const boxTop = H - TRAY_BOTTOM - trayH;
  centerPlay(stage, firefly, bandTop, boxTop - BAND_PAD, true);
}
```

### 3c — mult-drag.js: slot in equation, drop the ans-host panel

- [ ] **Step 6:** Edit `src/screens/mult-drag.js`:
  - Delete the `ansHost` / `ansLabel` / `ansSlotHost` creation (lines 50–58) and the `sec.appendChild(ansHost)` (line 78).
  - In `renderProblem`, replace `chipQ` (lines 114–116, 121) with a slot appended after `symEq`:

```js
    const ansSlot = document.createElement("div");
    ansSlot.className = "slot active";
    ansSlot.dataset.index = "0";
    multProblem.appendChild(chipA);
    multProblem.appendChild(symMult);
    multProblem.appendChild(chipB);
    multProblem.appendChild(symEq);
    multProblem.appendChild(ansSlot);
```

  - Replace `setupAnswerArea()` so it only builds the digit tray (no `ansHost`/`ansSlotHost`). Rename references: drop the `ansSlotHost.textContent = ""`, slot creation, and `ansHost.classList.remove("hidden")` lines (258–264); keep the digit-tray build (266–297).
  - `showAnswerPhase()` fades `groupRow` only — unchanged, still valid.

- [ ] **Step 7:** Edit `src/layout.js` `layoutMultDrag` (lines 175–201): remove the `ansHost` variable, its `clearInline`, and the `ansHost.style.bottom` block. Band bottom is the tray top:

```js
export function layoutMultDrag(stage, sec) {
  if (!sec || !sec.isConnected) return;
  const tray = sec.querySelector(".digit-tray");
  const playCol = sec.querySelector(".play-col");
  if (!isPortrait(stage)) {
    if (tray) { clearTileSizes(tray.querySelectorAll(".tile")); tray.style.height = ""; }
    clearInline(playCol, ["position", "left", "top", "transform"]);
    return;
  }
  const H = stage.offsetHeight;
  if (H < 400 || !tray) return;
  const trayHidden = tray.classList.contains("hidden");
  const trayH = trayHidden ? 0 : fitTray(stage, tray, maxTrayHeight(H));
  const boxTop = H - TRAY_BOTTOM - trayH;
  const bandTop = headerBottom(stage, sec) + BAND_PAD;
  centerPlay(stage, playCol, bandTop, boxTop - BAND_PAD, true);
}
```

### 3d — tests

- [ ] **Step 8:** Add an equation-slot assertion to `e2e/mult-grouping.spec.js` (or a small new spec):

```js
test('answer slot lives in the equation, no separate panel', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 1);
  await expect(page.locator('.mult-problem .slot.active')).toHaveCount(1);
  await expect(page.locator('.total-reveal')).toHaveCount(0);
  await expect(page.locator('.op-chip.q')).toHaveCount(0);
});
```

- [ ] **Step 9:** Update `e2e/mult-tap-layout.spec.js`: replace any `.total-reveal` reference with `.mult-problem .slot`. (Read the file first; adjust the overlap assertion to check the digit tray vs the equation slot, or simply assert the tray doesn't overlap `.mult-problem`.)

- [ ] **Step 10:** Run the affected specs, verify PASS:

Run: `bun run e2e -- mult-grouping.spec.js mult-tap-layout.spec.js 03-multiplication.spec.js`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/screens/mult-tap.js src/screens/mult-drag.js src/layout.js src/style.css e2e/
git commit -m "feat(mult): drop the answer straight into the box after '=' (OP: MULTFIX)"
```

---

## Task 4: Counting sound when a unit lands (item 4, drag screen)

**Files:**
- Modify: `src/screens/mult-drag.js`

- [ ] **Step 1:** In `src/screens/mult-drag.js`, add a landed counter alongside the other per-problem state (near `let idx = 0;`, line 19):

```js
  let landedCount = 0;
```

- [ ] **Step 2:** Reset it at the top of `renderProblem` (next to `groupContents.length = 0;`, line 99):

```js
    landedCount = 0;
```

- [ ] **Step 3:** In `onPileTap`, fire the rising counting tone at the landing moment. Inside the clone animation's `onfinish` (line 239), after `tray.appendChild(planted);`, add:

```js
      landedCount++;
      sfx.blockTap(landedCount); // rising-pitch counting tone as each fruit lands
```

(The launch blip `sfx.tilePickup()` at line 233 stays — confirmed keep. The group-complete `sfx.trayFull()` ding stays.)

- [ ] **Step 4: Manual verify in the running app** (audio can't be asserted in headless e2e). Run the dev server, open mult L4, tap pile mangoes, confirm a rising pitch on each *landing* plus the existing pickup blip:

Run: `bun run dev` then open `http://localhost:5173`, go to Mango Orchard L1 (mult L4), tap mangoes.
Expected: each mango plays a low pickup blip on launch and a higher-as-you-count tone the instant it lands; group-complete ding unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/screens/mult-drag.js
git commit -m "feat(mult): rising counting tone the moment each fruit lands (OP: MULTFIX)"
```

---

## Task 5: Full verification, rebuild, deploy

- [ ] **Step 1: Run the whole unit + e2e suite** (kill any stale :5173 first):

Run: `bun test ./test` then `bun run e2e`
Expected: all green. Investigate and fix any regression before proceeding.

- [ ] **Step 2: Rebuild the production bundle** (src edits don't reach the live site otherwise):

Run: `bun run build`
Expected: root `index.html` regenerated (~230 KB+).

- [ ] **Step 3: Smoke-check the built bundle** — `e2e/build-smoke.spec.js` exercises the root `index.html`:

Run: `bun run e2e -- build-smoke.spec.js`
Expected: PASS.

- [ ] **Step 4: Commit the rebuilt bundle and push**

```bash
git add index.html
git commit -m "build(mult): rebuild index.html for multiplication-screen fixes (OP: MULTFIX)"
git push
```

---

## Self-review notes

- **Spec coverage:** Item 1 → Task 1; item 2 → Task 2; item 3 → Task 3; item 4 → Task 4; process/deploy → Task 5. All five covered.
- **Convention:** `data-value` is the mult tile attribute (not `data-digit`, which addition uses) — Task 1's test selects `.tile[data-value="3"]`.
- **logic.js untouched:** answer stays `a*b`; only rendering swaps loops.
- **Layout:** both `layoutMultTap` and `layoutMultDrag` lose their separate-box anchoring; band bottom = tray top in each.
- **Audio:** reuses `sfx.blockTap(n)` (`audio.js:90`) — same ladder the tap screen uses, satisfying "rising in pitch as you count up."
