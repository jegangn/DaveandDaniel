# Design: long-mult — child builds "product + carry = total" per column

Date: 2026-06-14
Status: Approved — building (OP: BUILDSUM)

Rework of how the **partial-product rows** of Daniel's long multiplication are
entered. The child no longer drags the answer digit + a carry circle; instead
they build the column's little sum, so they see e.g. 9×6 = 54, **+ 4 (carried) =
58**. The final addition row (summing the two partials) is unchanged.

## Per-column model (`analyzePartialWork` in `logic-daniel.js`, pure + tested)

Walk a partial `a × d` (shifted) right-to-left. For each digit of `a`:
- `product = topDigit × d`
- `total   = product + carryIn`   (carryIn 0 for the ones column)
- `answer  = total % 10`          → the partial-product digit at that grid column
- `carryOut = ⌊total / 10⌋`       → the carry into the next column

A leading `carryOut` after the last digit is the partial's leading digit
(`bringDown`).

## Interaction (per partial column, right-to-left)

1. The working sum shows for the **active column only** (keeps it compact).
2. **No carry in** (e.g. 8×6=48): the child drags the one 2-digit number → its
   ones digit becomes the answer, its tens digit the carry.
3. **Carry in** (e.g. 9×6, +4): the child drags the **product** (54), the
   carried **+4** is shown (it flew in from the previous column), then the child
   drags the **total** (58).
4. On completion the total **splits automatically**: ones digit drops into the
   partial-answer box; tens digit flies left to the next column as its "+N"
   (or, after the last digit, becomes the brought-down leading digit).
5. Either-order is preserved — the two digits of a product/total can be dragged
   in any order.

## Rendering

A small floating "working sum" panel anchored above the active partial-answer
box (no CSS-grid restructure): product boxes, a small "+N" carried addend, a
rule, total boxes. Carry marks shrink. Shown for the active column only, so the
worksheet stays compact; re-verified on phone / tablet / iPad / laptop.

## Scope

- Replaces the partial-row entry (supersedes the either-order carry-circle entry
  on partials; that freedom now lives in dragging a product/total's two digits in
  any order).
- The sum (final addition) row keeps `buildGroups` / either-order untouched.
- `analyzeLongMult` unchanged; `analyzePartialWork` is additive.

## Tests

- Unit: `analyzePartialWork` column math (product/carry/total/answer/carryOut +
  bringDown), incl. no-carry and leading-carry cases.
- E2E: rewrite `daniel-mult.spec.js` to build the sums; assert a partial solves
  and the product appears; keep the sum-row flow.
- Layout verified with Playwright across device sizes.
