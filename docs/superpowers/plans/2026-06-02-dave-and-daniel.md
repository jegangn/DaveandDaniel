# Dave & Daniel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one single-file `index.html` with a "Who's playing?" picker → Dave (5, exact copy of Jhanav's
jungle game) or Daniel (11, new Secret-Agent game covering +−×÷ at N-digit level), both on Jhanav's shared engine,
with separate save slots, deployed to GitHub (`jegangn/DaveandDaniel`).

**Architecture:** Copy Jhanav's frozen engine to the project root. Add a thin **profile layer** (`profiles.js`,
`progress.js`) and a **picker** screen. Generalise the router, map, complete and settings to be profile-aware
**without changing Dave's gameplay** (verified by the frozen e2e suite). Dave's math screens and 2-digit logic are
copied verbatim. Daniel gets new N-digit column logic (`logic-daniel.js`, unit-tested with `bun test`) and four new
screens (column add, column sub, long multiplication, short division) plus a spy re-skin done purely as CSS token
VALUE swaps under `#stage[data-profile="daniel"]`.

**Tech Stack:** Vanilla JS (ES modules) bundled by esbuild via `bun ./build.js` into one inline-everything
`index.html`; Web Audio synth; pointer-events drag; CSS custom-property theming; Playwright e2e + `bun test` units.
**bun only, never npm.** bun off-PATH → prefix commands with `PATH="/c/Users/JeganGN/.bun/bin:$PATH"`.

**Spec:** [`docs/superpowers/specs/2026-06-02-dave-and-daniel-design.md`](../specs/2026-06-02-dave-and-daniel-design.md)

---

## File structure

**Copied verbatim from `reference/jhanav-source/` → project root (Phase 0):**
`build.js`, `dev.js`, `package.json`, `bun.lock`, `playwright.config.js`, `src/**`, `e2e/**`.

**New shared modules**
- `src/profiles.js` — `PROFILES` config (dave/daniel: label, prefix, title, worlds[], levelsPerWorld, mascot fns).
- `src/progress.js` — profile-namespaced storage: `levelKey`, `loadProgress`, `recordStars`, `isLevelUnlocked`,
  `totalStars`, `resetProfile`. (Extracted from `logic.js`.)

**Modified shared (plumbing only — Dave behaviour unchanged)**
- `src/game.js` — `picker` route + base; `state.profile`; profile-aware dispatch + `stage.dataset.profile`;
  `window.__setProfile`; `?profile/world/level` query hooks.
- `src/logic.js` — keep Dave's math verbatim (`SEEDS, getProblems, analyze, createAnswerState, dropDigit,
  dropCompound, starsFor, isComplete`); move progress fns to `progress.js` and re-export for back-compat.
- `src/screens/splash.js` — profile-aware title + mascot/handler + "⇄ PLAYERS" button.
- `src/screens/map.js` — data-driven from `profile.worlds` × `levelsPerWorld`; computed star denominator.
- `src/screens/complete.js` — profile-aware mascot/handler; `levelsPerWorld` last-level logic; profile-prefixed `recordStars`.
- `src/screens/settings.js` — reset/unlock keyed to active profile; parent gate unchanged.

**New screens**
- `src/screens/picker.js` — "WHO'S PLAYING?" Dave / Daniel.
- `src/screens/col-add.js` — Daniel N-digit column addition (auto-carry).
- `src/screens/col-sub.js` — Daniel N-digit column subtraction (auto-borrow, incl. across zeros).
- `src/screens/long-mult.js` — Daniel long multiplication (partial-product rows + sum), ≤ 2-digit × 2-digit.
- `src/screens/short-div.js` — Daniel short "bus-stop" division (÷1-digit, quotient left-to-right, remainder).

**New logic / assets / styles**
- `src/logic-daniel.js` — seeded PRNG + band generators + `createAnswerStateN`, column carry/borrow analysis,
  partial-product computation, bus-stop division steps. Unit-tested.
- `src/svg.js` — add `handler(state)` (spy AI/drone; `.head`/`.wing-l`/`.wing-r` groups for celebration reuse) and
  spy world icons. Existing exports untouched.
- `src/style.css` — add `#stage[data-profile="daniel"]` system-token overrides + per-world accents + Chakra Petch
  @import + picker/long-mult/short-div/handler styles + portrait reflow for new screens. **All token NAMES unchanged.**

**Tests**
- `test/logic-daniel.test.js` — `bun test` unit tests (TDD) for generators/analysis/drop.
- `e2e/helpers/math.js` — profile-aware `unlockAll`/`goToLevel`.
- `e2e/daniel-*.spec.js` — Daniel math-audit + portrait specs.

---

## PHASE 0 — Scaffold & green baseline

### Task 0.1: Copy the engine to the project root

**Files:** Create (copy) `build.js`, `dev.js`, `package.json`, `bun.lock`, `playwright.config.js`, `src/**`, `e2e/**`.

- [ ] **Step 1:** Copy from frozen reference (PowerShell):
```powershell
$src = "C:\dev\projects\Dave and Daniel\reference\jhanav-source"
$dst = "C:\dev\projects\Dave and Daniel"
Copy-Item "$src\build.js","$src\dev.js","$src\package.json","$src\bun.lock","$src\playwright.config.js" $dst
Copy-Item "$src\src" $dst -Recurse
Copy-Item "$src\e2e" $dst -Recurse
```
- [ ] **Step 2:** Install dev deps (Playwright + esbuild). Paid? No.
```bash
PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun install
```
- [ ] **Step 3:** Build and confirm output exists.
```bash
PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun ./build.js
```
Expected: `Wrote ./index.html (NN KB)`. Confirm `index.html` is at the project root and gitignored
(`.gitignore` already lists `/index.html` — verify, do not commit the artifact).
- [ ] **Step 4: Commit** (auto per CLAUDE.md rule 7): `chore: scaffold engine from frozen Jhanav source`.

### Task 0.2: Confirm dev server + e2e baseline (port :5173 gotcha)

- [ ] **Step 1:** Start dev server in background: `PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun ./dev.js`.
- [ ] **Step 2:** Probe it serves OUR game, not another app on :5173:
```bash
curl -s http://localhost:5173/ | grep -c 'id="stage"'
```
Expected: `1`. If 0 (e.g. a stray Vite app — look for `/@react-refresh`), free the port first.
- [ ] **Step 3:** Run two reliable frozen specs as the baseline:
```bash
PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun run e2e portrait-reflow math-audit-addition
```
Expected: PASS. (Per START-HERE §7, `full-playthrough` and mult/sub math-audits are pre-existing-broken — ignore.)
- [ ] **Step 4: Commit:** `test: confirm frozen e2e baseline (portrait-reflow + add audit) green`.

---

## PHASE 1 — Profile plumbing (Dave still works)

### Task 1.1: Extract `progress.js` (profile-namespaced storage)

**Files:** Create `src/progress.js`; Modify `src/logic.js` (remove the 4 progress fns + `KEY_PREFIX`, re-export from progress.js).

- [ ] **Step 1: Write failing test** `test/progress.test.js`:
```js
import { test, expect } from "bun:test";
import { levelKey, loadProgress, recordStars, isLevelUnlocked, totalStars } from "../src/progress.js";

const mem = () => { const m = new Map();
  return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k) }; };

test("levelKey namespaces per profile", () => {
  expect(levelKey("dave","add",2)).toBe("dave.stars.add.2");
  expect(levelKey("daniel","ndiv",5)).toBe("daniel.stars.ndiv.5");
});
test("record + load round-trips and keeps best", () => {
  const s = mem();
  recordStars(s,"daniel","nadd",1,2);
  recordStars(s,"daniel","nadd",1,1); // worse → ignored
  const p = loadProgress("daniel",["nadd","nsub"],5,s);
  expect(p.nadd[1]).toBe(2);
});
test("isLevelUnlocked: L1 always; later needs prior star", () => {
  const p = { nadd:{1:3}, nsub:{}, unlockAll:false };
  expect(isLevelUnlocked(p,"nadd",1)).toBe(true);
  expect(isLevelUnlocked(p,"nadd",2)).toBe(true);
  expect(isLevelUnlocked(p,"nadd",3)).toBe(false);
});
test("totalStars sums across given worlds", () => {
  const p = { a:{1:3,2:2}, b:{1:1}, unlockAll:false };
  expect(totalStars(p,["a","b"])).toBe(6);
});
```
- [ ] **Step 2: Run, verify fail:** `PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun test test/progress.test.js` → FAIL (module missing).
- [ ] **Step 3: Implement** `src/progress.js`:
```js
export function levelKey(prefix, world, level) { return `${prefix}.stars.${world}.${level}`; }
export function unlockKey(prefix) { return `${prefix}.unlockAll`; }

export function loadProgress(prefix, worlds, levelsPerWorld, storage = globalThis.localStorage) {
  const out = { unlockAll: storage?.getItem(unlockKey(prefix)) === "1" };
  for (const w of worlds) {
    out[w] = {};
    for (let l = 1; l <= levelsPerWorld; l++) {
      const v = storage?.getItem(levelKey(prefix, w, l));
      if (v) out[w][l] = parseInt(v, 10);
    }
  }
  return out;
}
export function recordStars(storage, prefix, world, level, stars) {
  if (!storage) return;
  const k = levelKey(prefix, world, level);
  const prior = parseInt(storage.getItem(k) || "0", 10);
  if (stars > prior) storage.setItem(k, String(stars));
}
export function isLevelUnlocked(progress, world, level) {
  if (progress.unlockAll) return true;
  if (level === 1) return true;
  return (progress[world]?.[level - 1] || 0) > 0;
}
export function totalStars(progress, worlds) {
  let n = 0;
  for (const w of worlds) for (const k in (progress[w] || {})) n += progress[w][k];
  return n;
}
export function resetProfile(storage, prefix) {
  for (let i = storage.length - 1; i >= 0; i--) {
    const k = storage.key(i);
    if (k && (k.startsWith(`${prefix}.stars.`) || k === unlockKey(prefix))) storage.removeItem(k);
  }
}
```
- [ ] **Step 4:** In `src/logic.js` delete `KEY_PREFIX`, `loadProgress`, `recordStars`, `isLevelUnlocked`, `totalStars`
  and append: `export { loadProgress, recordStars, isLevelUnlocked, totalStars } from "./progress.js";` (temporary
  back-compat so existing imports resolve until callers are updated in 1.3).
- [ ] **Step 5: Run, verify pass:** `bun test test/progress.test.js` → PASS.
- [ ] **Step 6: Commit:** `refactor: extract profile-namespaced progress.js from logic.js`.

### Task 1.2: Add `profiles.js`

**Files:** Create `src/profiles.js`.

- [ ] **Step 1:** Implement (screen keys resolved by the router in 1.3):
```js
import { banji, mo, pip, handler } from "./svg.js";
export const PROFILES = {
  dave: {
    id: "dave", label: "DAVE", age: 5, prefix: "dave", title: "DAVE'S MATH",
    levelsPerWorld: 6,
    worlds: [
      { id: "add",  name: "BANANA HILLS",   screen: "add"  },
      { id: "sub",  name: "MISTY RIVER",    screen: "sub"  },
      { id: "mult", name: "FIREFLY MEADOW", screen: "mult" }, // tap (L1-3) / drag (L4-6) split by router
    ],
    splashMascot: banji,
    completeMascot: (world) => (world === "add" ? banji : world === "sub" ? mo : pip),
  },
  daniel: {
    id: "daniel", label: "DANIEL", age: 11, prefix: "daniel", title: "CODE BREAKERS",
    levelsPerWorld: 5,
    worlds: [
      { id: "nadd", name: "OP: STOCKPILE", screen: "col-add"   },
      { id: "nsub", name: "OP: GETAWAY",   screen: "col-sub"   },
      { id: "nmul", name: "OP: OVERRIDE",  screen: "long-mult" },
      { id: "ndiv", name: "OP: SPLIT",     screen: "short-div" },
    ],
    splashMascot: handler,
    completeMascot: () => handler,
  },
};
export const worldIdsOf = (p) => p.worlds.map((w) => w.id);
export const worldOf = (p, id) => p.worlds.find((w) => w.id === id);
```
- [ ] **Step 2:** (No standalone test; exercised by router + screen tasks.) **Commit:** `feat: add PROFILES config`.

### Task 1.3: Profile-aware router + picker hooks (`game.js`)

**Files:** Modify `src/game.js`; Create `src/screens/picker.js`.

- [ ] **Step 1:** `picker.js` — "WHO'S PLAYING?" two cards; tap sets profile and routes to that profile's splash:
```js
import { banji, handler } from "../svg.js";
export function mount(stage, state, router) {
  const sec = document.createElement("section");
  sec.className = "screen active"; sec.id = "screen-picker";
  sec.innerHTML = `
    <h1 class="picker-title display">WHO'S PLAYING?</h1>
    <div class="picker-cards">
      <button class="picker-card" data-profile="dave"  data-world="add">
        <div class="picker-art"></div><div class="picker-name display">DAVE</div><div class="picker-age">age 5</div></button>
      <button class="picker-card" data-profile="daniel" data-world="nadd">
        <div class="picker-art"></div><div class="picker-name display">DANIEL</div><div class="picker-age">age 11</div></button>
    </div>`;
  sec.querySelector('[data-profile="dave"]  .picker-art').insertAdjacentHTML("beforeend", banji("idle"));
  sec.querySelector('[data-profile="daniel"] .picker-art').insertAdjacentHTML("beforeend", handler("idle"));
  sec.addEventListener("pointerup", (e) => {
    const card = e.target.closest(".picker-card"); if (!card) return;
    router.setProfile(card.dataset.profile);
    router.go("splash");
  });
  stage.dataset.profile = ""; stage.appendChild(sec);
  return () => sec.remove();
}
```
- [ ] **Step 2:** In `game.js`: import `PROFILES`, `worldOf`, `worldIdsOf` and `picker`, `colAdd`, `colSub`,
  `longMult`, `shortDiv` (add imports as those screens land — stub-safe). Replace state + router:
```js
import { PROFILES, worldOf, worldIdsOf } from "./profiles.js";
import { loadProgress } from "./progress.js";
import * as picker from "./screens/picker.js";
// ...existing screen imports, plus Daniel screens when present...

const SCREENS = { add, sub, "mult-tap": multTap, "mult-drag": multDrag,
                  "col-add": colAdd, "col-sub": colSub, "long-mult": longMult, "short-div": shortDiv };

const state = { profile: "dave", progress: {} };
function activeProfile() { return PROFILES[state.profile]; }
function reloadProgress() {
  const p = activeProfile();
  state.progress = loadProgress(p.prefix, worldIdsOf(p), p.levelsPerWorld);
}

const router = {
  current: null, lastRoute: null,
  setProfile(id) {
    if (!PROFILES[id]) return;
    state.profile = id;
    document.getElementById("stage").dataset.profile = id;
    reloadProgress();
  },
  go(name, ctx = {}, opts = {}) {
    if (ctx.profile && ctx.profile !== state.profile) this.setProfile(ctx.profile);
    if (this.current) this.current();
    this.lastRoute = { name, ctx };
    const stageEl = document.getElementById("stage");
    stageEl.dataset.profile = state.profile;
    let unmount;
    switch (name) {
      case "picker":  unmount = picker.mount(stageEl, state, this); break;
      case "splash":  unmount = splash.mount(stageEl, state, this); break;
      case "map":     reloadProgress(); unmount = map.mount(stageEl, state, this); break;
      case "level": {
        const prof = activeProfile();
        const w = worldOf(prof, ctx.world);
        let key = w.screen;
        if (key === "mult") key = ctx.level <= 3 ? "mult-tap" : "mult-drag";
        unmount = SCREENS[key].mount(stageEl, { ...ctx, profile: state.profile }, this);
        break;
      }
      case "complete": unmount = complete.mount(stageEl, ctx, this); break;
      case "settings": unmount = settings.mount(stageEl, state, this); break;
      default: console.warn("Unknown route:", name);
    }
    this.current = unmount;
    if (!opts.fromPop) { /* history push/replace — unchanged from Jhanav */ }
  },
};
window.__router = router;
window.__setProfile = (id) => router.setProfile(id);
```
- [ ] **Step 3:** Keep `fitStage`, history `popstate`, resize listeners as in Jhanav. Change the **base entry** from
  `splash` to `picker`: `router.go("picker", {}, { replace: true });`. Parse `?profile`/`?world`/`?level` (test +
  deep-link): if `profile` present → `setProfile`; if `world`+`level` present → `go("level", {world,level})`,
  else `go("splash")`, else `go("picker")`.
- [ ] **Step 4:** Build + manual smoke: `bun ./build.js`; open via dev server; confirm picker → Dave → map → level works.
- [ ] **Step 5: Commit:** `feat: profile-aware router + Who's-playing picker`.

### Task 1.4: Make map / complete / settings profile-aware (Dave-identical)

**Files:** Modify `src/screens/map.js`, `src/screens/complete.js`, `src/screens/settings.js`.

- [ ] **Step 1: `map.js`** — replace the hard-coded `WORLDS`, `/54`, and `l<=6` with profile data:
```js
import { home, star, padlock } from "../svg.js";
import { isLevelUnlocked, totalStars } from "../progress.js";
import { PROFILES, worldIdsOf } from "../profiles.js";
import { sfx } from "../audio.js";
export function mount(stage, state, router) {
  const prof = PROFILES[state.profile];
  const worlds = prof.worlds, L = prof.levelsPerWorld;
  const maxStars = worlds.length * L * 3;
  // ...build grid from `worlds`; per world loop `for (let l=1; l<=L; l++)`...
  // meter text: `STARS: ${star(true)} ${totalStars(state.progress, worldIdsOf(prof))} / ${maxStars}`
  // node className keeps `level-node unlocked|locked stars-N`; panel className `world-panel world-${w.id}`
  // home button → router.go("splash"); node tap → router.go("level", { world:w.id, level:l })
  // set stage.dataset.world = worlds[0].id
}
```
  (Body mirrors Jhanav's `map.js` exactly; only the data source and loop bounds change. The CSS grid already
  supports 3 or 4 columns — verify Daniel's 4-wide in Phase 4.)
- [ ] **Step 2: `complete.js`** — profile mascot + levelsPerWorld:
```js
import { starsFor } from "../logic.js";
import { recordStars } from "../progress.js";
import { PROFILES } from "../profiles.js";
// ...
const prof = PROFILES[state?.profile ?? ctx.profile];  // complete is mounted with ctx incl. profile
recordStars(localStorage, prof.prefix, world, level, stars);
const mascotFn = prof.completeMascot(world);
const isLastLevel = level >= prof.levelsPerWorld;
```
  Pass `profile` into the complete ctx from each level screen (`router.go("complete",{world,level,wrongCount,profile})`).
- [ ] **Step 3: `settings.js`** — reset/unlock keyed to active profile:
```js
import { resetProfile, unlockKey } from "../progress.js";
import { PROFILES } from "../profiles.js";
// unlock toggle uses unlockKey(prof.prefix); reset uses resetProfile(localStorage, prof.prefix)
```
  Parent-gate math + `bm.parentLockUntil` lock key stay global (device-level). 
- [ ] **Step 4:** Update `src/screens/splash.js`: title `= prof.title`; mascot `= prof.splashMascot("idle")`; add a
  `⇄ PLAYERS` button (top-left) → `router.go("picker")`. Dave's tap-to-play / cog / lockout logic unchanged.
- [ ] **Step 5:** Update `e2e/helpers/math.js` for profile namespacing:
```js
export async function unlockAll(page, profile = "dave") {
  await page.evaluate((prof) => {
    window.__setProfile(prof);
    const worlds = prof === "dave" ? ["add","sub","mult"] : ["nadd","nsub","nmul","ndiv"];
    const L = prof === "dave" ? 6 : 5;
    for (const w of worlds) for (let l=1; l<=L; l++) localStorage.setItem(`${prof}.stars.${w}.${l}`, "3");
  }, profile);
}
export async function goToLevel(page, world, level, profile = "dave") {
  await page.evaluate(({w,l,p}) => { window.__setProfile(p); window.__router.go("level", {world:w, level:l}); },
    { w: world, l: level, p: profile });
  await page.waitForTimeout(300);
}
```
- [ ] **Step 6: Verify Dave parity** (the gate for this phase):
```bash
PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun ./build.js
# confirm dev server serves our game, then:
PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun run e2e portrait-reflow math-audit-addition 01-splash-to-map
```
  Expected: PASS (adapt `01-splash-to-map` only if it asserts the very first screen is splash — it now starts on
  picker; update that spec to click Dave first). **Do not proceed to Phase 3 until Dave's reliable specs are green.**
- [ ] **Step 7: Commit:** `feat: data-driven map/complete/settings/splash; Dave parity green`.

---

## PHASE 2 — Spy theme tokens + Handler (Daniel's look, no new screens yet)

### Task 2.1: Spy palette as token VALUE swaps

**Files:** Modify `src/style.css`.

- [ ] **Step 1:** Add the Chakra Petch font to the existing Google Fonts `@import`/`<link>` (in `src/index.html`):
  `family=Chakra+Petch:wght@500;600;700`. Add **after** the `:root` block (names identical, values swapped):
```css
/* ===== Daniel: Secret-Agent / Code-Breaker palette (token VALUES only) ===== */
#stage[data-profile="daniel"] {
  --bg-paper:#0E1726; --bg-card:#F4E6C8; /* manila-cream worksheet */
  --ink:#11202E; --ink-soft:#5A6B7B;
  --success:#3FE08F; --success-deep:#138A55;   /* decrypt-green */
  --gentle-no:#FFB23E;                          /* alert-amber (never red) */
  --star:#FFC02E; --star-glow:#FFE9A6; --lock:#36506A;
}
#stage[data-profile="daniel"][data-world="nadd"] { --world-primary:#37C2D6; --world-accent:#FFB23E; --world-sky:#16263A; --world-ground:#0B1622; }
#stage[data-profile="daniel"][data-world="nsub"] { --world-primary:#5AA0FF; --world-accent:#37C2D6; --world-sky:#152133; --world-ground:#0B1622; }
#stage[data-profile="daniel"][data-world="nmul"] { --world-primary:#FFB23E; --world-accent:#37C2D6; --world-sky:#1A2030; --world-ground:#0B1622; }
#stage[data-profile="daniel"][data-world="ndiv"] { --world-primary:#A98BFF; --world-accent:#3FE08F; --world-sky:#181a30; --world-ground:#0B1622; }
/* Daniel display face — keep tabular figures so columns align */
#stage[data-profile="daniel"] .display,
#stage[data-profile="daniel"] .worksheet,
#stage[data-profile="daniel"] .slot,
#stage[data-profile="daniel"] .tile { font-family:'Chakra Petch','Lilita One',system-ui; font-feature-settings:"tnum" 1,"lnum" 1; }
```
- [ ] **Step 2:** Verify with `preview_eval` (works here; `preview_screenshot` does not): load `?profile=daniel`,
  assert `getComputedStyle(stage).getPropertyValue('--bg-paper')` ≈ `#0E1726`. (Worksheet legibility judged in Phase 4 screenshots.)
- [ ] **Step 3: Commit:** `feat: spy palette via data-profile token values (names unchanged)`.

### Task 2.2: Handler SVG

**Files:** Modify `src/svg.js`.

- [ ] **Step 1:** Add `export const handler = (state="idle") => \`<svg class="mascot handler ${state}" viewBox="0 0 200 200" ...>\``
  — a sleek recon-drone / AI core: central `<g class="head">` (lens/eye that uses the engine's `.eye-state idle`
  expression hooks if convenient), two side fins `<g class="wing-l">`/`<g class="wing-r">`, a `<g class="tail">`
  thruster. Including those group class names lets `mascotCheer`/`mascotCelebrate` (animate.js) animate it unchanged.
  Amber/cyan on charcoal; no fur, no face — grown-up. ~80–120 nodes.
- [ ] **Step 2:** Verify it renders on Daniel's splash (build + dev server). **Commit:** `feat: add Handler (spy AI) SVG`.

---

## PHASE 3 — Daniel's column-math logic (TDD, pure functions)

> All in `src/logic-daniel.js`. RNG is **injectable** so tests are deterministic and gameplay varies per replay.
> Tests assert **band properties**, not exact values.

### Task 3.1: Seeded PRNG + N-digit answer state

**Files:** Create `src/logic-daniel.js`; Create `test/logic-daniel.test.js`.

- [ ] **Step 1: Failing test:**
```js
import { test, expect } from "bun:test";
import { mulberry32, createAnswerStateN, digitsOfN } from "../src/logic-daniel.js";
test("mulberry32 deterministic", () => {
  const a = mulberry32(42), b = mulberry32(42);
  expect(a()).toBe(b()); 
});
test("digitsOfN splits MSB-first", () => { expect(digitsOfN(1234)).toEqual([1,2,3,4]); });
test("answer state fills right-to-left", () => {
  const s = createAnswerStateN(1234);
  expect(s.expected).toEqual([1,2,3,4]);
  expect(s.activeIndex).toBe(3);          // ones first
});
```
- [ ] **Step 2: Run → fail.** **Step 3: Implement:**
```js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const digitsOfN = (n) => String(n).split("").map(Number);
export function createAnswerStateN(answer) {
  const expected = digitsOfN(answer);
  return { expected, slots: expected.map(() => null), activeIndex: expected.length - 1,
           wrongCount: 0, lastDropCorrect: null };
}
// Right-to-left single digit (reuse engine semantics; identical to logic.dropDigit)
export { dropDigit } from "./logic.js";
// Left-to-right variant for division quotient entry
export function dropDigitLTR(state, digit, targetIndex = state.activeIndex) {
  if (targetIndex !== state.activeIndex || state.slots[targetIndex] !== null || digit !== state.expected[targetIndex])
    return { ...state, lastDropCorrect: false, wrongCount: state.wrongCount + 1 };
  const slots = state.slots.slice(); slots[targetIndex] = digit;
  const next = targetIndex + 1;
  return { ...state, slots, activeIndex: next < state.expected.length ? next : -1, lastDropCorrect: true };
}
```
- [ ] **Step 4: Run → pass. Step 5: Commit:** `feat(daniel): seeded RNG + N-digit answer state`.

### Task 3.2: Column add/sub analysis (carry & borrow chains)

**Files:** Modify `src/logic-daniel.js`; `test/logic-daniel.test.js`.

- [ ] **Step 1: Failing tests:**
```js
import { analyzeColumnsAdd, analyzeColumnsSub } from "../src/logic-daniel.js";
test("add carries flagged per column (RTL index 0 = rightmost)", () => {
  const r = analyzeColumnsAdd(168, 54); // 168+54=222; ones 8+4=12 carry, tens 6+5+1=12 carry, hund 1+0+1=2
  expect(r.answer).toBe(222);
  expect(r.carryOut).toEqual([true, true, false]); // ones, tens, hundreds (RTL)
});
test("sub borrows incl. across zero", () => {
  const r = analyzeColumnsSub(4003, 1567); // = 2436, borrow chain through zeros
  expect(r.answer).toBe(2436);
  expect(r.borrow.some(Boolean)).toBe(true);
  expect(r.steps.length).toBeGreaterThan(0); // ordered RTL regroup steps for animation
});
```
- [ ] **Step 2: Run → fail. Step 3: Implement** `analyzeColumnsAdd(a,b)` and `analyzeColumnsSub(a,b)`:
  - Both pad operands to equal width (MSB-first arrays) and also expose RTL per-column arrays.
  - **Add:** walk RTL; `sum = aCol+bCol+carryIn`; `carryOut[i] = sum>=10`; produce `answer = a+b`,
    `carryOut[]` (RTL), and the carry target column index for each carry (for `flyCarry`).
  - **Sub:** walk RTL; when `top<bottom+borrowIn`, mark `borrow[i]=true`, add 10, propagate borrow left (this handles
    across-zeros automatically: a zero column that must lend becomes 9 and passes the borrow on). Produce ordered
    `steps[]` = `{ col, fromCol, newFromDigit, newColValue }` for the animation pre-pass; `answer = a-b`.
- [ ] **Step 4: Run → pass. Step 5: Commit:** `feat(daniel): column add/sub analysis with carry & borrow chains`.

### Task 3.3: Long-multiplication & short-division analysis

**Files:** Modify `src/logic-daniel.js`; `test/logic-daniel.test.js`.

- [ ] **Step 1: Failing tests:**
```js
import { analyzeLongMult, analyzeShortDiv } from "../src/logic-daniel.js";
test("long mult partial products + shift + sum", () => {
  const r = analyzeLongMult(47, 38); // 47*8=376, 47*30=1410(shown 141 shifted), sum 1786
  expect(r.partials.map(p=>p.value)).toEqual([376, 1410]);
  expect(r.partials[1].shift).toBe(1);
  expect(r.product).toBe(1786);
});
test("long mult x1-digit has single partial, no sum row", () => {
  const r = analyzeLongMult(234, 7);
  expect(r.partials).toHaveLength(1);
  expect(r.needsSum).toBe(false);
  expect(r.product).toBe(1638);
});
test("short division bus-stop steps + remainder", () => {
  const r = analyzeShortDiv(416, 3); // 138 r2
  expect(r.quotientDigits).toEqual([1,3,8]);
  expect(r.remainder).toBe(2);
  expect(r.steps.map(s=>s.carry)).toEqual([1,1,2]); // running remainders carried into each next column
});
```
- [ ] **Step 2: Run → fail. Step 3: Implement:**
  - `analyzeLongMult(a,b)`: `bDigits` LSB-first; for each → `partial = a * digit`, `shift = position`; `needsSum =
    partials.length > 1`; `product = a*b`. Each partial carries its own RTL `carryOut[]` for in-row animation.
    The sum row reuses `analyzeColumnsAdd`-style carry over the (shifted) partials.
  - `analyzeShortDiv(dividend, divisor)`: walk dividend digits MSB-first; `cur = carry*10 + digit`;
    `q = Math.floor(cur/divisor)`; `carry = cur % divisor`; push `step{ digit, cur, q, carry }`; final `carry` =
    remainder; `quotientDigits` left-to-right (drop a leading zero only if quotient length > 1).
- [ ] **Step 4: Run → pass. Step 5: Commit:** `feat(daniel): long-mult + short-div analysis`.

### Task 3.4: Band generators (`getProblemsDaniel`)

**Files:** Modify `src/logic-daniel.js`; `test/logic-daniel.test.js`.

- [ ] **Step 1: Failing property tests** (run each band across many seeds; assert ranges + carry/borrow counts):
```js
import { getProblemsDaniel } from "../src/logic-daniel.js";
import { analyzeColumnsAdd, analyzeColumnsSub } from "../src/logic-daniel.js";
test("STOCKPILE M1: two 3-digit, zero carries; M5: two 4-digit, >=3 carries", () => {
  for (let seed=1; seed<=50; seed++) {
    const m1 = getProblemsDaniel("nadd",1, mulberry32(seed));
    for (const p of m1) { expect(p.a).toBeGreaterThanOrEqual(100); expect(p.a).toBeLessThan(1000);
      expect(analyzeColumnsAdd(p.a,p.b).carryOut.filter(Boolean).length).toBe(0); }
    const m5 = getProblemsDaniel("nadd",5, mulberry32(seed));
    for (const p of m5) { expect(p.a).toBeGreaterThanOrEqual(1000);
      expect(analyzeColumnsAdd(p.a,p.b).carryOut.filter(Boolean).length).toBeGreaterThanOrEqual(3); }
  }
});
test("GETAWAY never negative; M5 borrows across a zero", () => {
  for (let seed=1; seed<=50; seed++) for (let m=1;m<=5;m++)
    for (const p of getProblemsDaniel("nsub",m, mulberry32(seed))) expect(p.a).toBeGreaterThanOrEqual(p.b);
});
test("OVERRIDE M1-2 are xN x1-digit; M3-5 are 2-digit x 2-digit", () => {
  for (let seed=1; seed<=30; seed++) {
    for (const p of getProblemsDaniel("nmul",1, mulberry32(seed))) expect(p.b).toBeLessThan(10);
    for (const p of getProblemsDaniel("nmul",4, mulberry32(seed))) { expect(p.b).toBeGreaterThanOrEqual(10);
      expect(p.b).toBeLessThan(100); expect(p.a).toBeLessThan(100); }
  }
});
test("SPLIT divisor 1-digit; M1/M3 exact, M2/M4/M5 may have remainder; dividend grows", () => {
  for (let seed=1; seed<=30; seed++) {
    for (const p of getProblemsDaniel("ndiv",1, mulberry32(seed))) { expect(p.b).toBeLessThan(10);
      expect(p.a % p.b).toBe(0); expect(p.a).toBeLessThan(100); }
    for (const p of getProblemsDaniel("ndiv",4, mulberry32(seed))) { expect(p.a).toBeGreaterThanOrEqual(100); expect(p.a).toBeLessThan(1000); }
  }
});
test("each mission yields exactly 5 problems", () => {
  for (const w of ["nadd","nsub","nmul","ndiv"]) for (let m=1;m<=5;m++)
    expect(getProblemsDaniel(w,m, mulberry32(7))).toHaveLength(5);
});
```
- [ ] **Step 2: Run → fail. Step 3: Implement** `getProblemsDaniel(world, level, rng = Math.random)`:
  - A `BANDS` table keyed `[world][level]` describing operand digit-counts and target carry/borrow/remainder
    constraints (per spec §4). Each problem: generate operands from `rng`, compute, **reject-and-retry** (bounded,
    e.g. 200 tries then relax) until the band constraint holds. Return `{ op, a, b, answer, mode }` (mode where
    relevant, e.g. mult `needsSum`). For nsub, generate then swap so `a ≥ b`.
- [ ] **Step 4: Run → pass.** Run the whole unit suite: `bun test`. **Step 5: Commit:** `feat(daniel): band generators for all four worlds`.

---

## PHASE 4 — Daniel's screens (build + verify each)

> Each screen mirrors the Jhanav screen pattern: `mount(stage, ctx, router) → unmount`, builds a
> `<section class="screen active" id="screen-…">`, wires `createDragManager({getTargets,onPickup,onDrop})`, uses
> `tilePickup`/`tileBounceBack`/`tileSnapIn` (animate.js), `sfx.*` (audio.js), `home()`/`handler()` (svg.js), and a
> `layout*` portrait pass (layout.js — extend with `layoutColMath`, `layoutLongMult`, `layoutShortDiv` modelled on
> `layoutAddSub`). After a level: `router.go("complete", { world, level, wrongCount, profile:"daniel" })`.

### Task 4.1: `col-add.js` (N-digit column addition, auto-carry)

**Files:** Create `src/screens/col-add.js`; Modify `src/layout.js` (+`layoutColMath`); Create `e2e/daniel-add.spec.js`.

- [ ] **Step 1:** Build the worksheet for N columns (reuse `.worksheet/.row/.cell/.line/.slot` classes). Top row =
  operand A digits, bottom row = `+` op + operand B digits, answer row = N `.slot`s, plus per-column `.carry-slot`s
  positioned above each column (reuse the `add.js` RAF carry-slot positioning, looped per column).
- [ ] **Step 2:** State via `createAnswerStateN(p.answer)`; drag via the **same `onDrop` logic as `add.js`** but
  single-digit per slot (no compound tiles — Daniel places the result digit; the carry "1" auto-flies). On each
  correct drop at column `i`, if `analyzeColumnsAdd(p.a,p.b).carryOut[i]` is true, call `flyCarry(carrySlotForColumn(i-1), filledSlot)`
  then activate the next slot. Right-to-left enforced by `dropDigit` advancing `activeIndex--`.
- [ ] **Step 3:** Tray = single digits 0–9 (`renderTray` from `sub.js`). Hint-after-2-wrong reuses `applyHint` from `sub.js`.
- [ ] **Step 4: e2e** `daniel-add.spec.js`: `unlockAll(page,"daniel")`; for each mission, `goToLevel(page,"nadd",m,"daniel")`,
  read operands, drag correct digits RTL (carry waits ~1400ms), assert `#screen-complete` + 3 `.star.earned`.
- [ ] **Step 5:** Run e2e → PASS. Screenshot via `SHOT_TAG=daniel-add bun run e2e zz-capture` (extend capture spec to
  visit a Daniel level); eyeball column alignment (tnum) + spy palette. **Commit:** `feat(daniel): column addition screen`.

### Task 4.2: `col-sub.js` (N-digit column subtraction, auto-borrow incl. across zeros)

**Files:** Create `src/screens/col-sub.js`; Modify `src/animate.js` (+`animateBorrowChain`); Create `e2e/daniel-sub.spec.js`.

- [ ] **Step 1:** Worksheet as 4.1 with `−` op. Before answer entry, run a **borrow pre-pass**: for each
  `analyzeColumnsSub(p.a,p.b).steps` (ordered RTL), animate the strike on `fromCol`, write the reduced digit, and the
  `+10` on the borrowing column — generalise the existing `animateBorrow` into `animateBorrowChain(cells, steps)`
  that runs the steps in sequence (awaiting each), so multi-borrow and across-zero chains read clearly.
- [ ] **Step 2:** Then entry identical to `col-add` minus carries: `createAnswerStateN`, `dropDigit` RTL, `applyHint`.
- [ ] **Step 3: e2e** `daniel-sub.spec.js` incl. an across-zero mission (M5). Assert correct answer + stars.
- [ ] **Step 4:** Run → PASS; screenshot the borrow chain + an across-zero case; eyeball. **Commit:** `feat(daniel): column subtraction with borrow chains`.

### Task 4.3: `long-mult.js` (partial products + sum, ≤ 2-digit × 2-digit)

**Files:** Create `src/screens/long-mult.js`; Modify `src/layout.js` (+`layoutLongMult`), `src/style.css` (partial-product rows); Create `e2e/daniel-mult.spec.js`.

- [ ] **Step 1:** Layout from `analyzeLongMult(p.a,p.b)`: multiplicand row, `×` multiplier row, line, one or two
  partial-product rows (2nd shifted left by `shift`), and — if `needsSum` — a line + sum row. Each entry row is a
  set of `.slot`s filled RTL with per-row auto-carry (reuse the `flyCarry` carry mechanic per partial row).
- [ ] **Step 2:** Sequence: fill partial row 1 → (if 2×2) fill partial row 2 → fill sum row → complete. Track
  `phase` (which row is active) + a fresh `createAnswerStateN` per row (expected = digits of that row's value;
  sum row expected = digits of `product`). ×1-digit missions skip straight to complete after the single partial row.
- [ ] **Step 3: e2e** `daniel-mult.spec.js`: drive M1 (×1) and M4 (2×2 with carries); assert each row then complete + stars.
- [ ] **Step 4:** Run → PASS; screenshot a 2×2 case; verify partial-product shift + sum alignment. **Commit:** `feat(daniel): long multiplication screen`.

### Task 4.4: `short-div.js` (bus-stop, ÷1-digit, quotient left-to-right, remainder)

**Files:** Create `src/screens/short-div.js`; Modify `src/layout.js` (+`layoutShortDiv`), `src/style.css` (bus-stop bracket); Create `e2e/daniel-div.spec.js`.

- [ ] **Step 1:** Layout the bus-stop: quotient `.slot` row on top (one per dividend digit), the "┌──" bracket
  (CSS border), divisor to the left, dividend digits inside. Use `analyzeShortDiv(p.a,p.b)`.
- [ ] **Step 2:** Entry **left-to-right** via `dropDigitLTR`: expected = `quotientDigits`. After each correct
  quotient digit at position `i`, animate the carried remainder `steps[i].carry` as a small superscript before the
  next dividend digit (reuse a small chip animation). After the last digit, reveal the remainder as `r {remainder}`.
- [ ] **Step 3: e2e** `daniel-div.spec.js`: M1 (exact) and M4 (remainder + carries); assert quotient + remainder shown + stars.
- [ ] **Step 4:** Run → PASS; screenshot exact + remainder cases. **Commit:** `feat(daniel): short bus-stop division screen`.

---

## PHASE 5 — Integration, portrait, polish

### Task 5.1: Wire Daniel into map/router + full playthroughs

- [ ] **Step 1:** Confirm `game.js` `SCREENS` imports the four new screens; Daniel map shows 4 worlds × 5 missions,
  CLASSIFIED locked nodes, "MISSION BOARD" framing (map header text per profile — add `mapTitle` to profiles or a
  CSS `::before`). Build.
- [ ] **Step 2: e2e** `daniel-playthrough.spec.js`: picker → Daniel → splash → map → play mission 1 of each world →
  back to map → confirm next mission unlocked + stars persisted under `daniel.stars.*` and Dave's `dave.stars.*` untouched.
- [ ] **Step 3:** Run full suite: `bun run e2e` (note pre-broken Jhanav specs from START-HERE §7 — judge against the
  reliable set + all `daniel-*`). **Commit:** `feat: integrate Daniel worlds; cross-profile isolation verified`.

### Task 5.2: Portrait reflow for the new screens

- [ ] **Step 1:** Add portrait `#stage[data-orient="portrait"]` rules for col-add/col-sub/long-mult/short-div
  (model on the existing worksheet portrait rules); ensure `layout*` passes set sizes so nothing collides with the
  bottom tray. 
- [ ] **Step 2: e2e** `daniel-portrait.spec.js` (model on `portrait-reflow.spec.js`): assert tray bottom < answer
  area top, worksheet centred, on iPhone-SE-ish viewport for each Daniel screen.
- [ ] **Step 3:** Run → PASS. Screenshot each Daniel screen in portrait. **Commit:** `fix(daniel): portrait reflow for new screens`.

### Task 5.3: Picker styling + final visual polish (ui-ux-pro-max)

- [ ] **Step 1:** Use the `ui-ux-pro-max` skill to polish the picker (split jungle/HQ cards), Daniel's mission board,
  and worksheet legibility (manila-cream card contrast on charcoal). No default-AI aesthetic.
- [ ] **Step 2:** Screenshot picker + both maps + one level each; review. **Commit:** `style: polish picker + spy skin`.

---

## PHASE 6 — Build & deploy

### Task 6.1: Final build + push to GitHub

- [ ] **Step 1:** Final `PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun ./build.js`; confirm one `index.html` at root,
  under the SVG/size budget, opens offline.
- [ ] **Step 2:** Set the remote and push (first push of this repo):
```bash
git remote add origin https://github.com/jegangn/DaveandDaniel.git
git push -u origin main
```
  (Founder links Vercel → this GitHub repo afterwards. `index.html` is a gitignored build artifact; Vercel build
  command = `PATH=... bun ./build.js`, output = repo root. Confirm Vercel build settings with founder if needed.)
- [ ] **Step 3: Commit** any remaining source; push. Done.

---

## Self-review notes

- **Spec coverage:** picker, two profiles, separate slots (1.1/1.3), Dave parity (1.4 gate), spy theme as VALUE swaps
  (2.1), Handler (2.2), all four Daniel ops incl. across-zero borrow + 2×2 mult + bus-stop division (3.x/4.x), stars
  3/2/1 no-fail (reuses `starsFor`), portrait (5.2), deploy to the named repo (6.1). ✔
- **Token NAMES unchanged** — only VALUES swapped under `[data-profile]`. ✔
- **Name consistency:** `createAnswerStateN`, `dropDigit` (reused), `dropDigitLTR`, `analyzeColumnsAdd/Sub`,
  `analyzeLongMult`, `analyzeShortDiv`, `getProblemsDaniel`, `mulberry32`, `loadProgress/recordStars/isLevelUnlocked/totalStars`,
  `resetProfile`, `levelKey/unlockKey`, `PROFILES/worldOf/worldIdsOf`, `handler`, `layoutColMath/layoutLongMult/layoutShortDiv`,
  `animateBorrowChain`. Used consistently across tasks. ✔
- **Risks:** (a) generalised plumbing subtly changing Dave — mitigated by the Phase-1 e2e gate; (b) borrow-across-zero
  animation is the trickiest — isolated in 4.2 with its own visual check; (c) tnum alignment under Chakra Petch —
  asserted in screenshots, fallback to a tabular system face if it drifts.
