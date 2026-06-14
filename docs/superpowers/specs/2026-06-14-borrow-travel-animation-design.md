# Design: animate the subtraction borrow travelling in from the left

Date: 2026-06-14
Status: Approved — built

Daniel's column-subtraction borrow pre-pass (`animateBorrowChain` in
`animate.js`). Pure-animation change — the math (`analyzeColumnsSub`) is
untouched.

## Problem

The pre-pass struck each changed digit and wrote its regrouped value above it in
raw step order (for 7022−4392 the marks popped in as 0→9, 7→6, 2→12 — middle,
left, right). The child saw the *end values* but never saw the borrowed 1 *move*,
so the regroup looked like magic.

## Change

For each borrow, a small "1" is **taken from the lender digit on the left and
travels right** to the column that needs it:

1. Split the flat step list into borrow chains (each `receive` step ends a chain).
2. Order each chain left-to-right (column descending): lender first, then any
   zeros it passes, then the borrower last.
3. The lender is struck and reduced (7 → 6) and a `.borrow-travel` "1" chip lifts
   off it.
4. The chip glides right; each 0 it crosses flips to 9 as it passes (it took ten,
   kept nine, passed one on).
5. It lands on the borrowing column, which becomes e.g. 2 → 12, and the chip
   fades into that mark.

Keeps the existing strikes + regroup marks (still reads like paper) and the
"one mark per column" rule for double-borrowed digits (each `markBorrowCell`
clears the column's prior strike/mark first). Per-step pacing (~lift-off 220ms,
hop 340ms + 110ms settle) keeps total duration at or below the previous version,
so the watch-only pre-pass still finishes before the child can act.

## Tests

- E2E `e2e/borrow-travel.spec.js` (new): a `.borrow-travel` "1" appears during the
  pre-pass.
- E2E `e2e/borrow-double-mark.spec.js` (unchanged, still green): the double-borrow
  digit (6060−4177 tens) shows exactly one mark, value 15.
- E2E `e2e/daniel-sub.spec.js` M5 (unchanged, still green): regroup finishes in
  time and the child can still solve.
- Verified visually with Playwright frame captures of the 1 mid-travel.
