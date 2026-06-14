# Design: Long-mult layout overlap + either-order carries + responsive fit

Date: 2026-06-14
Status: Approved — built (OP: CARRYORDER)

Three fixes to Daniel's long-multiplication screen (`screens/long-mult.js`,
`logic-daniel.js`, `layout.js`, `style.css`). The math is untouched.

---

## 1. Either-order carry entry (the headline change)

**Want.** When a child works one single-digit product — e.g. 9×6=54 — they say
"fifty-four" and naturally write the **5** (carry) and the **4** (result). Today
the screen forces result-first (4 then 5). The child should be free to drop
**either digit first**.

**Today.** `buildSequence` (`logic-daniel.js`) emits a strict step list (each
result digit, then the carry it produces). The screen tracks a single `seqIdx`
cursor and marks exactly one box `active`; the drag engine only accepts the
active box. So the order is locked.

**Fix.** A result digit and the carry it produces are emitted back-to-back by
`buildSequence` (result first, carry second) and are the two halves of one mental
step. Group them:

- New pure helper `buildGroups(steps)` → array of groups. A result immediately
  followed by a carry forms a 2-step group (either order); every other step is
  its own 1-step group. Applies to **all** rows — both partial products and the
  final addition (every write-and-carry pair).
- The screen tracks `groupIdx` + a `filled` set instead of `seqIdx`. **Every
  unfilled step in the current group is `active` at once**, so two boxes pulse
  together. A drop is accepted if it matches any unfilled step in the group
  (right digit in the right box); when all steps in the group are filled, the
  next group opens.
- A wrong digit in the wrong box still rejects — only the *order within the pair*
  opens up. The drag engine is unchanged: `findDropTarget` already snaps to the
  nearest **active** target, so two active boxes just work.

## 2. Carry / answer-box overlap

**Today.** The carry circles sit 4px above the answer boxes, and the active-box
pulse is a 16px expanding box-shadow ring — it bridges the gap, so the carry and
its box read as one blob (worse now that two boxes of a pair pulse at once).

**Fix (`style.css`, `.lm-ws`).** More row air (`gap: 12px`), a slightly smaller
carry circle (40/38px), and a tighter worksheet-only pulse (`slotPulseTight`,
6px ring) so the halo stays snug to each box. Carries now float clearly above the
boxes on every size.

## 3. Responsive fit (phone / tablet / iPad / laptop)

Two real layout bugs surfaced while verifying across sizes:

- **Landscape overflow.** Long mult stacks many rows; in landscape the card is
  CSS-positioned (top-anchored, never scaled), so a 2×2-with-sum problem ran past
  the digit tray. Fix: `layout.js` `fitLandscapeLongMult` scales the card down
  from its top edge to clear the tray — fits any landscape height.
- **Portrait horizontal overlap.** `#stage[portrait] .slot { width:120px }` (the
  big single add/sub answer box) leaked into the worksheet via specificity,
  forcing every result box to 120px inside ~64–72px grid columns → columns
  overlapped on phones (landscape was unaffected — the rule is portrait-only).
  Fix: `#stage[portrait] .col-ws .slot { width:100% }` so worksheet slots fill
  their grid track. Also repairs col-add / col-sub on phones (same latent bug).

---

## Tests

- Unit (`test/logic-daniel.test.js`): `buildGroups` pairs each result with its
  carry; sum rows and no-carry rows group correctly; empty → `[]`.
- E2E (`e2e/daniel-mult.spec.js`): new `CARRYORDER` test drops the carry **before**
  its result and asserts both boxes were active at once and the pair completes;
  full-solve tests updated to target each box by `data-col` (two-active aware).
- Layout verified with Playwright measurement + screenshots across 8 device
  sizes: every carry→box gap and column gap positive; card clears the tray in
  both orientations.
