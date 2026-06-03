# OP: SPLIT — Decimal Division (replace remainders)

**Date:** 2026-06-03
**Status:** Approved (design) — pending spec review
**Screen:** Daniel · `ndiv` world · `src/screens/short-div.js`

## Problem

Short ("bus-stop") division currently ends with a remainder: `764 ÷ 5 = 152 r4`.
A remainder *is* a complete, exact answer (`5 × 152 + 4 = 764`), but it reads as
"unfinished" to the player/parent. We want division answers expressed as exact
decimals instead.

## Goal

Every division answer is an **exact decimal with ≤ 2 places**, completed by the
bus-stop method (append a decimal point + zeros to the dividend, keep dividing).
No remainders, no rounding, no recurring decimals.

Examples: `764 ÷ 5 = 152.8`, `765 ÷ 4 = 191.25`, `47 ÷ 2 = 23.5`.

## Core math constraint (why this is safe)

A fraction terminates in ≤ 2 decimal places only when its reduced denominator
divides 100. Among single-digit divisors that means **2, 4, 5 only**:

| Divisor | Places | Note |
|--------:|:------:|------|
| 2 | 1 | always `.5` when not exact |
| 5 | 1 | `.2 / .4 / .6 / .8` |
| 4 | 1 or 2 | `.5` when dividend ≡ 2 (mod 4); `.25 / .75` when dividend is odd |
| 8 | 3 | **excluded** (needs 3 places) |
| 3, 6, 7, 9 | ∞ | **excluded** (never terminate) |

Every generated problem is also forced to be **non-integer** (`a % b ≠ 0`) so the
decimal point is always exercised.

## What is removed

- Divisors **3, 6, 7, 8, 9** leave the division world.
- Remainder notation (`r N`) and the `info.remainder` reveal.
- The `exact: true/false` band semantics.

Daniel's existing division progress/stars stay valid — same world, same 5 levels,
new problem content. No data migration.

## Components

### 1. Analyzer — `analyzeShortDiv(dividend, divisor)` (logic-daniel.js)

Extend to continue past the integer part into the decimal expansion.

Algorithm: run the existing MSB-first column walk over the dividend digits
(integer part). Then, while `carry > 0` and fewer than `MAX_PLACES = 2` decimal
digits have been produced, "bring down a zero": `value = carry*10 + 0`,
`q = floor(value/divisor)`, `carry = value % divisor`, emit a **decimal** step.

New return shape:

```js
{
  dividend, divisor,
  intDigits,            // [Number] dividend digits, MSB-first (e.g. [7,6,4])
  decimalPlaces,        // 0 | 1 | 2  (appended-zero count)
  quotientIntDigits,    // [Number] quotient digits above the integer dividend digits
  quotientDecDigits,    // [Number] quotient digits after the point (length === decimalPlaces)
  steps: [ { digit, carryIn, value, q, remainder, decimal: Boolean } ],
  remainder,            // final remainder (0 for all generated problems)
  answer,               // Number, e.g. 152.8
}
```

- Integer steps have `decimal: false` and `digit` = the real dividend digit.
- Decimal steps have `decimal: true` and `digit: 0` (the brought-down zero).
- `carryIn` of the first decimal step = the integer-part remainder (the value the
  old code surfaced as `r N`) — it now shows as a carry superscript on the first
  appended zero.

Backward-compat note: callers must migrate from `quotientDigits` to
`quotientIntDigits` + `quotientDecDigits`. There are no callers outside
`short-div.js`, the generator, and the unit tests.

### 2. Generator — `genDiv` + `BANDS.ndiv` (logic-daniel.js)

Band fields: `dA` (dividend digit count), `divisors` (allowed set), `places`
(`1`, `2`, or `"any"`).

```js
ndiv: {
  1: { kind: "div", dA: 2, divisors: [2, 5],    places: 1 },
  2: { kind: "div", dA: 3, divisors: [2, 5],    places: 1 },
  3: { kind: "div", dA: 2, divisors: [4],       places: 2 },
  4: { kind: "div", dA: 3, divisors: [4],       places: 2 },
  5: { kind: "div", dA: 3, divisors: [2, 4, 5], places: "any" },
}
```

`genDiv(rng, band)` generates `a = nDigit(rng, dA)`, `b = pick(band.divisors)` and
retries (genUntil) until **all** hold:
- `a % b !== 0` — non-integer (forces a decimal).
- `digitsOfN(a)[0] >= b` — quotient has no leading zero (keeps the integer-part
  quotient the same length as the integer dividend, as today).
- decimal-place count matches `band.places` — computed via
  `analyzeShortDiv(a, b).decimalPlaces` (`"any"` accepts 1 or 2).

Returns `{ op: "÷", a, b, answer: a / b }`. (`answer` is now fractional.)

### 3. Screen — `short-div.js`

Render the dividend with its decimal extension and the quotient with a point:

```
            1 5 2 . 8            ← quotient: int slots, point cell, dec slots
          ┌───────────
     5    │ 7 6 4 . 0            ← dividend: divisor, int digits, point, zero(s)
```

- **Grid columns:** `64px  repeat(intDigits, col-w)  [point]  repeat(decimalPlaces, col-w)`.
  The point column is narrow (e.g. `28px`); both rows share it so the points align.
- **Dividend row:** divisor cell · integer digit cells (carry superscripts as
  today) · a `.` cell · `decimalPlaces` appended-zero cells (each shows `0`, with
  a carry superscript where `steps[c].carryIn > 0`). The decimal point and zeros
  are styled slightly muted to read as "added to finish the division." **No**
  remainder cell.
- **Quotient row:** blank divisor col · integer quotient slots · a `.` cell
  (auto-shown, not draggable) · decimal quotient slots.
- **Answer state:** `expected = quotientIntDigits.concat(quotientDecDigits)`,
  `dir = "ltr"`. The decimal point is purely visual — Daniel drags 0–9 tiles only,
  and the active slot advances left-to-right through integer then decimal slots.
- **Carry reveal:** unchanged mechanism — superscripts (`.div-carry[data-col]`)
  reveal as each slot fills, now including the columns for the appended zeros.
- **Completion:** when all digit slots are filled, play success and advance. Remove
  the `r N` reveal block entirely.

### 4. Styles — `style.css`

- `.div-point` cell for the `.` in both rows (sized, vertically aligned with digits).
- Muted styling for the appended decimal point + zeros in the dividend
  (e.g. reduced opacity / `--ink` tint) to distinguish from the original dividend.
- Portrait sizing parity with existing `.div-ws` rules.

## Testing

**Unit — `test/logic-daniel.test.js`**
- `analyzeShortDiv` decimal expansion for known cases: `764÷5 → {quotientIntDigits:[1,5,2], quotientDecDigits:[8], decimalPlaces:1, answer:152.8, remainder:0}`; `765÷4 → [1,9,1].[2,5]`, `191.25`; `47÷2 → [2,3].[5]`, `23.5`.
- Decimal steps carry correctly and `remainder === 0` for all generated problems.
- `getProblemsDaniel("ndiv", L)` across many seeds, per band: `divisor ∈ band.divisors`, `a % b !== 0`, leading digit ≥ divisor, `decimalPlaces` matches `band.places`, `answer === a / b`.

**E2E — `daniel-div.spec.js`** (and `math-audit-*` if they assert remainders)
- Drive a decimal problem: drag the integer then decimal quotient digits L-to-R;
  assert the worksheet shows a decimal point, shows **no** `r ` text, and the run
  completes to 3 stars.
- Determinism per the existing seed-freeze pattern (see project memory:
  bun isn't on PATH; kill any stale `:5173` dev server and start a fresh one first).

## Non-goals

- Rounding, recurring/repeating decimals, divisors > 1 digit.
- A draggable decimal-point tile (decided: auto-placed).
- Changes to Dave's screens or Daniel's other worlds.
