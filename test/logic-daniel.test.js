import { test, expect } from "bun:test";
import {
  mulberry32, digitsOfN, createAnswerStateN, dropDigit, dropDigitLTR,
  analyzeColumnsAdd, analyzeColumnsSub, analyzeLongMult, analyzeShortDiv,
  getProblemsDaniel,
  placeDigits, partialCarries, sumCarries, buildSequence,
} from "../src/logic-daniel.js";

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const addCarries = (a, b) => analyzeColumnsAdd(a, b).carryOut.filter(Boolean).length;
const subBorrows = (a, b) => analyzeColumnsSub(a, b).borrow.filter(Boolean).length;

// ===== 3.1 PRNG + N-digit answer state =====================================

test("mulberry32 is deterministic for a given seed; differs across seeds", () => {
  const a = mulberry32(42), b = mulberry32(42);
  expect(a()).toBe(b());
  expect(mulberry32(42)()).not.toBe(mulberry32(43)());
});

test("mulberry32 returns floats in [0,1)", () => {
  const r = mulberry32(7);
  for (let i = 0; i < 200; i++) {
    const v = r();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test("digitsOfN splits MSB-first", () => {
  expect(digitsOfN(1234)).toEqual([1, 2, 3, 4]);
  expect(digitsOfN(5)).toEqual([5]);
  expect(digitsOfN(100)).toEqual([1, 0, 0]);
});

test("createAnswerStateN (rtl) expects MSB-first digits, active at the ones", () => {
  const s = createAnswerStateN(1234);
  expect(s.expected).toEqual([1, 2, 3, 4]);
  expect(s.slots).toEqual([null, null, null, null]);
  expect(s.activeIndex).toBe(3);
  expect(s.wrongCount).toBe(0);
});

test("dropDigit (rtl) accepts ones then tens, advancing leftward", () => {
  let s = createAnswerStateN(42);
  s = dropDigit(s, 2);
  expect(s.lastDropCorrect).toBe(true);
  expect(s.slots).toEqual([null, 2]);
  expect(s.activeIndex).toBe(0);
  s = dropDigit(s, 4);
  expect(s.slots).toEqual([4, 2]);
  expect(s.activeIndex).toBe(-1);
});

test("dropDigit rejects a wrong digit and increments wrongCount", () => {
  let s = createAnswerStateN(42);
  s = dropDigit(s, 9);
  expect(s.lastDropCorrect).toBe(false);
  expect(s.wrongCount).toBe(1);
  expect(s.slots).toEqual([null, null]);
});

test("createAnswerStateN (ltr) + dropDigitLTR fills left-to-right (division quotient)", () => {
  let s = createAnswerStateN(138, "ltr");
  expect(s.activeIndex).toBe(0);
  s = dropDigitLTR(s, 1);
  expect(s.slots).toEqual([1, null, null]);
  expect(s.activeIndex).toBe(1);
  s = dropDigitLTR(s, 3);
  s = dropDigitLTR(s, 8);
  expect(s.slots).toEqual([1, 3, 8]);
  expect(s.activeIndex).toBe(-1);
});

test("createAnswerStateN accepts an explicit digit array (decimal quotient)", () => {
  const s = createAnswerStateN([1, 5, 2, 8], "ltr");
  expect(s.expected).toEqual([1, 5, 2, 8]);
  expect(s.slots).toEqual([null, null, null, null]);
  expect(s.activeIndex).toBe(0);
});

// ===== 3.2 column add / sub analysis (carry & borrow chains) ===============

test("analyzeColumnsAdd: carries flagged per column (RTL, index 0 = ones)", () => {
  const r = analyzeColumnsAdd(168, 54); // 222
  expect(r.answer).toBe(222);
  expect(r.carryOut).toEqual([true, true, false]); // ones, tens, hundreds
  expect(r.width).toBe(3);
});

test("analyzeColumnsAdd: no carries", () => {
  const r = analyzeColumnsAdd(234, 512); // 746
  expect(r.answer).toBe(746);
  expect(r.carryOut).toEqual([false, false, false]);
});

test("analyzeColumnsAdd: carry into a new most-significant column", () => {
  const r = analyzeColumnsAdd(950, 80); // 1030
  expect(r.answer).toBe(1030);
  expect(r.width).toBe(4);
});

test("analyzeColumnsSub: borrow across zeros (regroup chain)", () => {
  const r = analyzeColumnsSub(4003, 1567); // 2436
  expect(r.answer).toBe(2436);
  expect(r.borrow[0]).toBe(true);
  expect(r.topRegrouped).toEqual([13, 9, 9, 3]); // RTL: ones..thousands
  expect(r.steps.length).toBeGreaterThan(0);
});

test("analyzeColumnsSub: multiple separate borrows", () => {
  const r = analyzeColumnsSub(8352, 2587); // 5765
  expect(r.answer).toBe(5765);
  expect(r.borrow.filter(Boolean).length).toBeGreaterThanOrEqual(3);
});

test("analyzeColumnsSub: no borrow leaves steps empty", () => {
  const r = analyzeColumnsSub(789, 123); // 666
  expect(r.answer).toBe(666);
  expect(r.borrow.every((v) => v === false)).toBe(true);
  expect(r.steps.length).toBe(0);
});

// ===== 3.3 long multiplication + short division ============================

test("analyzeLongMult: 2-digit × 2-digit → two shifted partials + sum carries", () => {
  const r = analyzeLongMult(47, 38); // 376 + 1410 = 1786
  expect(r.partials.map((p) => p.value)).toEqual([376, 1410]);
  expect(r.partials.map((p) => p.rowDigits)).toEqual([376, 141]);
  expect(r.partials[0].shift).toBe(0);
  expect(r.partials[1].shift).toBe(1);
  expect(r.needsSum).toBe(true);
  expect(r.product).toBe(1786);
  expect(r.sum.value).toBe(1786);
  expect(r.sum.carryOut.length).toBe(r.sum.width);
});

test("analyzeLongMult: ×1-digit → single partial, no sum row", () => {
  const r = analyzeLongMult(234, 7); // 1638
  expect(r.partials).toHaveLength(1);
  expect(r.partials[0].rowDigits).toBe(1638);
  expect(r.needsSum).toBe(false);
  expect(r.sum).toBeNull();
  expect(r.product).toBe(1638);
});

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

test("analyzeShortDiv: exact division → no decimal digits, integer answer (618 ÷ 6 = 103)", () => {
  const r = analyzeShortDiv(618, 6);
  expect(r.quotientIntDigits).toEqual([1, 0, 3]);
  expect(r.quotientDecDigits).toEqual([]);
  expect(r.decimalPlaces).toBe(0);
  expect(r.answer).toBe(103);
  expect(r.remainder).toBe(0);
  expect(r.steps.every((s) => s.decimal === false)).toBe(true);
});

// ===== 3.4 band generators =================================================

test("getProblemsDaniel: every mission yields exactly 5 problems", () => {
  for (const w of ["nadd", "nsub", "nmul", "ndiv"]) {
    for (let m = 1; m <= 5; m++) {
      expect(getProblemsDaniel(w, m, mulberry32(m * 13 + 1))).toHaveLength(5);
    }
  }
});

test("STOCKPILE (nadd): M1 two 3-digit 0-carry; M5 two 4-digit >=3 carries", () => {
  for (const seed of SEEDS) {
    for (const p of getProblemsDaniel("nadd", 1, mulberry32(seed))) {
      expect(p.a).toBeGreaterThanOrEqual(100); expect(p.a).toBeLessThan(1000);
      expect(p.b).toBeGreaterThanOrEqual(100); expect(p.b).toBeLessThan(1000);
      expect(addCarries(p.a, p.b)).toBe(0);
    }
    for (const p of getProblemsDaniel("nadd", 5, mulberry32(seed))) {
      expect(p.a).toBeGreaterThanOrEqual(1000); expect(p.a).toBeLessThan(10000);
      expect(addCarries(p.a, p.b)).toBeGreaterThanOrEqual(3);
    }
  }
});

test("STOCKPILE (nadd): M2 exactly 1 carry; M3 exactly 2 carries", () => {
  for (const seed of SEEDS) {
    for (const p of getProblemsDaniel("nadd", 2, mulberry32(seed))) expect(addCarries(p.a, p.b)).toBe(1);
    for (const p of getProblemsDaniel("nadd", 3, mulberry32(seed))) expect(addCarries(p.a, p.b)).toBe(2);
  }
});

test("GETAWAY (nsub): never negative; M1 0 borrows; M2 exactly 1; M5 across a zero", () => {
  for (const seed of SEEDS) {
    for (let m = 1; m <= 5; m++) {
      for (const p of getProblemsDaniel("nsub", m, mulberry32(seed))) {
        expect(p.a).toBeGreaterThanOrEqual(p.b);
      }
    }
    for (const p of getProblemsDaniel("nsub", 1, mulberry32(seed))) expect(subBorrows(p.a, p.b)).toBe(0);
    for (const p of getProblemsDaniel("nsub", 2, mulberry32(seed))) expect(subBorrows(p.a, p.b)).toBe(1);
    for (const p of getProblemsDaniel("nsub", 5, mulberry32(seed))) {
      expect(analyzeColumnsSub(p.a, p.b).steps.some((s) => s.kind === "through")).toBe(true);
    }
  }
});

test("OVERRIDE (nmul): M1/M2 ×1-digit; M3-M5 2-digit × 2-digit (no trivial ×10)", () => {
  for (const seed of SEEDS) {
    for (const p of getProblemsDaniel("nmul", 1, mulberry32(seed))) {
      expect(p.a).toBeGreaterThanOrEqual(10); expect(p.a).toBeLessThan(100);
      expect(p.b).toBeGreaterThanOrEqual(2); expect(p.b).toBeLessThan(10);
    }
    for (const p of getProblemsDaniel("nmul", 2, mulberry32(seed))) {
      expect(p.a).toBeGreaterThanOrEqual(100); expect(p.a).toBeLessThan(1000);
      expect(p.b).toBeLessThan(10);
    }
    for (const m of [3, 4, 5]) {
      for (const p of getProblemsDaniel("nmul", m, mulberry32(seed))) {
        expect(p.a).toBeGreaterThanOrEqual(10); expect(p.a).toBeLessThan(100);
        expect(p.b).toBeGreaterThanOrEqual(10); expect(p.b).toBeLessThan(100);
        expect(p.b % 10).not.toBe(0); // both partial rows non-trivial
      }
    }
  }
});

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

// ===== OP: CARRYOVER — pure helpers =========================================

test("placeDigits: right-aligns digits into N columns, shifted left by `shift`", () => {
  expect(placeDigits(392, 1, 4)).toEqual([
    { digit: 3, di: 0 }, { digit: 9, di: 1 }, { digit: 2, di: 2 }, null,
  ]);
  expect(placeDigits(224, 0, 4)).toEqual([
    null, { digit: 2, di: 0 }, { digit: 2, di: 1 }, { digit: 4, di: 2 },
  ]);
});

test("partialCarries: carries of a single-digit multiply, keyed by the grid column they feed", () => {
  expect(partialCarries(56, 7, 1, 4)).toEqual({ 1: 4, 0: 3 });
  expect(partialCarries(56, 4, 0, 4)).toEqual({ 2: 2, 1: 2 });
  expect(partialCarries(8, 6, 0, 2)).toEqual({ 0: 4 });
  expect(partialCarries(234, 7, 0, 4)).toEqual({ 2: 2, 1: 2, 0: 1 });
  expect(partialCarries(12, 4, 0, 2)).toEqual({});
});

test("sumCarries: carries (always 1) of adding two partials, keyed by grid column", () => {
  expect(sumCarries(224, 3920)).toEqual({ 0: 1 });
  expect(sumCarries(99, 99)).toEqual({ 1: 1, 0: 1 });
  expect(sumCarries(12, 13)).toEqual({});
});

test("buildSequence: interleaves carries between result digits, right-to-left", () => {
  const cells392 = placeDigits(392, 1, 4);
  expect(buildSequence(cells392, { 1: 4, 0: 3 })).toEqual([
    { kind: "result", col: 2, di: 2, value: 2 },
    { kind: "carry",  col: 1, value: 4 },
    { kind: "result", col: 1, di: 1, value: 9 },
    { kind: "carry",  col: 0, value: 3 },
    { kind: "result", col: 0, di: 0, value: 3 },
  ]);
  const cells4144 = placeDigits(4144, 0, 4);
  expect(buildSequence(cells4144, { 0: 1 })).toEqual([
    { kind: "result", col: 3, di: 3, value: 4 },
    { kind: "result", col: 2, di: 2, value: 4 },
    { kind: "result", col: 1, di: 1, value: 1 },
    { kind: "carry",  col: 0, value: 1 },
    { kind: "result", col: 0, di: 0, value: 4 },
  ]);
  const cells48 = placeDigits(48, 0, 2);
  expect(buildSequence(cells48, {})).toEqual([
    { kind: "result", col: 1, di: 1, value: 8 },
    { kind: "result", col: 0, di: 0, value: 4 },
  ]);
});

test("analyzeLongMult: attaches N + per-phase cells/carries/steps (56 × 74)", () => {
  const r = analyzeLongMult(56, 74); // 224 + 3920 = 4144
  expect(r.N).toBe(4);
  expect(r.partials[0].carries).toEqual({ 2: 2, 1: 2 });
  expect(r.partials[1].carries).toEqual({ 1: 4, 0: 3 });
  expect(r.sum.carries).toEqual({ 0: 1 });
  expect(r.partials[1].steps).toEqual([
    { kind: "result", col: 2, di: 2, value: 2 },
    { kind: "carry",  col: 1, value: 4 },
    { kind: "result", col: 1, di: 1, value: 9 },
    { kind: "carry",  col: 0, value: 3 },
    { kind: "result", col: 0, di: 0, value: 3 },
  ]);
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
