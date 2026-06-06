# OP: CARRYOVER — Child-Filled Carries (Long Multiplication)

**Date:** 2026-06-06
**Status:** Approved (design) — implementation pending
**Screen:** Daniel · long-multiplication · `src/screens/long-mult.js`

## Problem

Long multiplication makes the child drag in each **result** digit of every partial
product (e.g. `56 × 7 → 3 9 2`) and the final sum. But the **carries inside those
steps** — the heart of the method — are invisible:

- `6 × 7 = 42` → write **2**, carry **4** … the 4 is never shown or entered.
- The one place a carry *does* appear (the final addition row) **auto-animates** a
  flying "1"; the child never writes it.

An 11-year-old can't see *why* `5 × 7` becomes `39` (it's `35 + 4`). The carry is
the step they most need to practise, and it's the one step the app does for them.

## Goal

The child **writes every carry themselves**, on every row, by dragging a digit
tile into a carry box — exactly as they would pencil a small carry digit on paper.
Nothing about the carry is automatic anymore.

Decisions locked in brainstorming:

- **Full carries.** A carry box appears for *every* carry that occurs, including
  the final "bring-down" carry that becomes a leading digit (so `56 × 7` shows
  carries **3** and **4**, and the leading `3` sits above the result `3`).
- **All rows.** Both partial-product rows *and* the final addition row are
  child-filled. The old auto-flying "1" on the sum row is removed.
- **Only where it carries.** No box on the ones column (nothing carries in) and
  none where a step stays under 10 (e.g. `2 × 4 = 8`). This matches how the
  existing sum row already behaves (a mark only where there's a carry).
- **Paper order, right-to-left.** Within a row: result digit, then the carry it
  produces, then the next result digit that consumes it. For `56 × 7`:
  `2 → carry 4 → 9 → carry 3 → 3`.

### What the child sees (`56 × 74`)

```
              5   6
    ×         7   4
   ──────────────────
           2   2          ← carries for 56 × 4   (child fills)
           2   2   4      ← 56 × 4
       3   4              ← carries for 56 × 7   (child fills)
       3   9   2          ← 56 × 7
   ──────────────────
       1                  ← carry for the addition (child fills)
       4   1   4   4      ← 4144  (answer)
```

Each result row gets a **carry strip** directly above it. Because the app prints
each partial as its own complete number on its own row, a row's carries attach to
**that partial's** digits (not pencilled above the shared `56` as on paper) — the
only layout that can show both partials' carries at once.

## Core mechanic (why the gating is simple)

The drag engine (`drag.js:11`, `findDropTarget`) **only drops onto a target whose
`active` flag is true.** So the entire "fill the carry before you may fill the next
digit" rule reduces to: **mark exactly one box `active` at a time** and walk a
pre-computed ordered list of steps. No new locking logic in the drag engine.

## Components

### 1. Pure carry + sequence functions — `logic-daniel.js`

All carry math and fill order live here (tested), so the screen stays a renderer.

**`partialCarries(a, digit, shift, N)` → `{ [gridCol]: carryValue }`**
Multiply `a` (the multiplicand) by a single `digit`, LSB-first, tracking the carry.
Each non-zero carry is recorded at the grid column it feeds *into*:

```js
// gridCol of position p (0 = ones of this partial) = (N-1) - shift - p
// carry produced at position k feeds position k+1 → gridCol (N-1)-shift-(k+1)
const aR = digitsOfN(a).reverse();
let carry = 0; const carries = {};
for (let k = 0; k < aR.length; k++) {
  const prod = aR[k] * digit + carry;
  carry = Math.floor(prod / 10);
  if (carry > 0) {
    const col = (N - 1) - shift - (k + 1);
    if (col >= 0) carries[col] = carry;   // includes the final bring-down carry
  }
}
return carries;
```
- `56,7,1,4 → {1:4, 0:3}` · `56,4,0,4 → {2:2, 1:2}` · `12,4,0,2 → {}` · `8,6,0,2 → {0:4}`.
- The carry per single-digit step is always one digit (`9×9+8 = 89` → carry 8), so
  the child always drags a single tile.

**`sumCarries(addA, addB, N)` → `{ [gridCol]: 1 }`**
Reuse `analyzeColumnsAdd(addA, addB)`; for each RTL column `i` where `carryOut[i]`,
record a carry of **1** into `gridCol = (N-1) - (i+1)`. Two-addend addition always
carries 0 or 1. `224, 3920, 4 → {0:1}`.

**`buildSequence(cells, carries)` → ordered `[{ kind:'result'|'carry', col, di?, value }]`**
`cells` is the `placeValue(value, shift)` array (`col → {digit, di}`). Walk the
result columns in fill order (di high→low = right→left); before each result, emit
its incoming carry if any:

```js
for (let di = len - 1; di >= 0; di--) {        // len = digits in this row's value
  const col = colOfDi(cells, di);
  if (carries[col] != null) steps.push({ kind: "carry",  col, value: carries[col] });
  steps.push({ kind: "result", col, di, value: cells[col].digit });
}
```
- `56×7`: `R(2,c2) C(4,c1) R(9,c1) C(3,c0) R(3,c0)`.
- The ones column never has an incoming carry, so a row always **starts with a
  result** and (since the leading carry sits at the leftmost result column) always
  **ends with a result** — `isComplete` can key off the last step.

**Extend `analyzeLongMult(a, b)`** (additive — existing fields/tests untouched):
attach `N` (product length) and, to each partial and the sum, a `carries` map:
```js
partial.carries = partialCarries(a, partial.digit, partial.shift, N);
sum.carries     = sumCarries(partials[0].value, partials[1].value, N);
```

### 2. Screen — `src/screens/long-mult.js`

Replace the per-phase `createAnswerStateN`/`dropDigit` result-only state with a
**sequence walker** that covers results *and* carries.

- **Per-phase state:** `seq = buildSequence(placeValue(phase.value, phase.shift), phase.carries)`
  and `seqIdx = 0`. The active step is `seq[seqIdx]`; `phase complete` when
  `seqIdx === seq.length`. Hint expected digit = `seq[seqIdx].value`.
- **Render carry strips.** Emit a carry-strip row *above every result row* (today
  only the sum has one). For the **current** phase, a column in `phase.carries`
  renders a **fillable** carry cell (`.carry-cell.fillable`), `active` iff it's the
  current step, else `inactive`/`filled`; columns with no carry render an empty
  spacer cell (keeps grid alignment). **Locked** phases render their carries static
  (filled). **Future** phases render carry strips empty (don't reveal carries ahead).
- **Active marking.** Exactly one element carries `active`: the current step's
  result slot *or* carry cell. Everything else is inactive — so the drag engine
  permits only the intended box.
- **Drag targets.** `getTargets()` returns
  `.lm-ws .slot, .lm-ws .carry-cell.fillable`, each `{ el, rect, active, kind, col/di }`.
  `onDrop` branches on `kind`: validate `digit === seq[seqIdx].value` **and** the
  target matches `seq[seqIdx]` (kind + col). Correct → `tileSnapIn`, mark filled,
  `seqIdx++`, re-render, advance. Wrong → reuse today's `tileBounceBack` +
  `flash-no` + hint-after-2-wrong (`applyHint` reads `seq[seqIdx].value`).
- **Remove** the sum-row `flyCarry` auto-animation (the carry is now a real step).
  `flyCarry` stays in `animate.js` for `col-add.js`/`col-sub.js`.
- Phase advance, problem advance, progress dots, tray, relayout: unchanged.

### 3. Styles — `src/style.css`

Make carry cells fillable mini-slots (today `.col-ws .carry-cell` is display-only:
`opacity:0` → `.filled` reveals it).

- `.carry-cell.fillable` — a small dashed box (~half a result slot; current carry
  cell sizing is 46px / lm 36px). States mirror `.slot`: `.active` (solid border +
  pulse, "fill here now"), `.inactive` (dashed, dim), `.filled` (solid, value
  shown), `.flash-no` (shake on wrong). Tint toward the carry orange already used
  for division carries (`#EE6A00` / `--world-accent`) so a carry box reads as
  visually distinct from a result slot.
- Portrait parity under `#stage[data-orient="portrait"] .lm-ws`.
- Final visual polish (exact size, ring, spacing) via a **`ui-ux-pro-max`** pass —
  per project convention for all UI work.

## Testing

**Unit — `test/logic-daniel.test.js`**
- `partialCarries`: `(56,7,1,4)→{1:4,0:3}`, `(56,4,0,4)→{2:2,1:2}`, `(12,4,0,2)→{}`,
  `(8,6,0,2)→{0:4}`.
- `sumCarries`: `(224,3920,4)→{0:1}`; a both-columns case `(99,99,3)→{1:1,0:1}`.
- `buildSequence`: exact ordered steps for `56×7` and the `4144` sum (assert the
  result/carry interleave above), and that a no-carry row (`12×4`) is all results.
- `analyzeLongMult`: `.N` set; `.carries` present on each partial and the sum;
  existing assertions still pass.

**E2E — `test/*long-mult*.spec.js` (+ `math-audit-*` if they drive mult)**
- Drive one full `2×2` problem: for each row drag result digits R-to-L and the
  carry tiles when prompted; assert (a) a carry box becomes active between digits,
  (b) a wrong carry bounces and flashes, (c) the run completes to 3 stars.
- Assert the sum row no longer auto-shows the "1" before the child places it.
- Determinism per project memory: **bun isn't on PATH**; kill any stale `:5173`
  dev server and start a fresh one before Playwright; use `?profile=daniel` /
  `goToLevel`, not `goto('/')`.

## Deploy

`src/` edits don't reach the live Vercel site until **`build.js`** re-bundles the
root `index.html`. After implementation: run the build, verify the bundled root
`index.html` updated, then commit + push (auto-deploy).

## Non-goals

- Carries pencilled above the shared multiplicand (paper style) — incompatible
  with the row-per-partial layout; carries attach to each partial's own digits.
- Carry boxes on columns that don't carry, or a forced "0" carry.
- 3-digit multiplicands / `>2 × 2` digit problems; changes to Dave's screens or
  Daniel's other worlds (add / sub / div untouched, including their `flyCarry`).
