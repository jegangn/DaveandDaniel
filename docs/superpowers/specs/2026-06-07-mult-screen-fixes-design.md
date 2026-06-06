# Design: Multiplication-screen fixes (5 items)

Date: 2026-06-07
Status: Approved (pending spec review)

Five fixes to the multiplication world (Daniel/Dave shared screens). Affects the
tap screen (`mult-tap.js`, "Firefly Meadow"), the drag screen (`mult-drag.js`,
"Mango Orchard"), the shared drag manager (`drag.js`), the audio synth
(`audio.js`), and the portrait layout engine (`layout.js`). `logic.js` is
untouched — the math (answer = a×b) does not change.

---

## 1. Stuck number tiles → per-finger drag tracking

**Problem.** `drag.js` keeps a single module-level `dragging` variable
(`drag.js:37`). When a second finger touches down it calls `start()`, which
overwrites `dragging` with the new drag. The first drag's clone is orphaned
(left frozen on the stage) and its source tile stays `visibility:hidden`
forever — the "stuck number" bug.

**Fix.** Replace the single `dragging` with a `Map` keyed by `pointerId`.
- `start(e, …)` adds an entry `drags.set(e.pointerId, {…})`.
- `move(e)` / `end(e)` look up `drags.get(e.pointerId)`; return early if none.
- `end(e)` deletes its own entry and removes its listeners only when the map is
  empty (or scope listeners per-pointer — see plan).
- Each finger drags its own clone. **Two tiles can move at once** (confirmed
  desired behavior).

**Edge case (accepted).** If two fingers race the same answer slot, the first
correct drop advances the problem; the second drop finds a stale/removed slot
and bounces back. Acceptable for a counting game.

## 2. "4 × 2" shows 4 boxes, 2 times (grouping convention flip)

**Problem.** Both screens render `a` groups of `b` items
(`mult-drag.js:125`, `mult-tap.js:81`). So "4 × 2" wrongly shows 4 groups of 2.

**Desired.** First number = items **per group**; second = **number of groups**.
"4 × 2" = 4 items per group, shown 2 times = **2 groups of 4**.

**Fix.** Swap the loops on **both** screens: outer loop runs `p.b` times (groups),
inner loop runs `p.a` times (items per group). Per-group counters/chips
(`count-chip`, `block-grid[data-count]`, `groupContents` needed/filled) use
`p.a` as the per-group count. Displayed equation stays "a × b = ?".
`logic.js` and the answer are unchanged.

**Scaling.** `layout.js centerPlay(..., scaleToFit=true)` already shrinks the
play band to fit. The ×5 levels (e.g. 5×5 = 5 groups of 5 = 25 items) must still
fit on a phone in portrait and on tablet in landscape — verify and tune the
band/min-scale if any group row clips. The user note "the ×5 ones shrink a
little" is satisfied by this scale-to-fit path.

## 3. Answer goes in the box after "="

**Problem.** A separate panel below the play area holds the answer slot, labelled
"HOW MANY TOTAL?" (drag: `ans-host`, `mult-drag.js:50`) / "TOTAL"
(tap: `total-reveal`, `mult-tap.js:40`).

**Fix.**
- Delete the `ans-host` / `total-reveal` panels and their labels entirely.
- In the equation header (`.mult-problem`), replace the trailing "?" chip
  (`chipQ` / `op-chip q`) with the live answer drop target: a
  `<div class="slot active" data-index="0">`. The drag manager's `getTargets()`
  already queries `.slot`, so hit-testing works unchanged.
- Size the in-equation slot to fit a **two-digit** number in **both** portrait
  and landscape (CSS `.mult-problem .slot`).
- Single slot accepts one tile per answer (digit tile for <10, compound tile for
  ≥10) — unchanged drop logic.
- **layout.js:** `layoutMultDrag` / `layoutMultTap` no longer anchor a separate
  box above the tray. The play band now spans `headerBottom → trayTop`
  (`boxTop` = tray top). Remove the `ans-host` / `total-reveal` anchoring code.

## 4. Counting sound when a unit lands (drag screen)

**Problem.** The drag screen plays a pickup blip on launch (`sfx.tilePickup()`,
`mult-drag.js:233`) and a group-complete ding (`sfx.trayFull()`), but **no sound
at the moment a fruit lands** in its slot.

**Fix.**
- Add a running landed-count for the current problem on the drag screen.
- In the clone animation's `onfinish` (`mult-drag.js:239`, where the mango
  plants into its slot), play a **rising-pitch counting tone** keyed to the
  landed-count — mirroring the tap screen's `sfx.blockTap(count)` ladder
  (`audio.js:91`, `freq = min(2093, 523 + count*60)`). Reuse `blockTap` or add a
  parallel `landCount(n)` in `audio.js`.
- **Keep** the existing pickup blip on launch (confirmed) and the group-complete
  ding.
- Reset the landed-count in `renderProblem`.
- **Tap screen is untouched** — it already plays a rising tone per tap.

## 5. Process / build / deploy

- **TDD** per Superpowers: write/adjust failing tests first where practical.
- **e2e specs to update** (`e2e/`): `touch-drag.spec.js` (multitouch — add a
  two-finger no-stuck regression), `03-multiplication.spec.js` (group counts now
  `b` groups of `a`; answer slot in equation), `mult-tap-layout.spec.js`
  (no separate TOTAL panel; band spans header→tray). Respect the e2e gotchas in
  memory (kill stale :5173 server; boot via `?profile=…`/`goToLevel`, not
  `goto('/')`).
- **Deploy:** src/ edits do not reach the live Vercel site until `build.js`
  regenerates the root `index.html`. After tests pass: run build, then
  `git add` + `commit` + `push` (Rule 7).

## Decisions (confirmed with user)
- Multitouch: **both tiles drag at once** (independent per-finger).
- Pickup blip: **keep it**, plus the new rising landing tone.
- Grouping flip and in-equation answer box apply to **both** tap and drag screens.
