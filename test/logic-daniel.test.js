import { test, expect } from "bun:test";
import {
  mulberry32, digitsOfN, createAnswerStateN, dropDigit, dropDigitLTR,
  analyzeColumnsAdd, analyzeColumnsSub, analyzeLongMult, analyzeShortDiv,
  getProblemsDaniel,
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

test("SPLIT (ndiv): divisor 1-digit; first dividend digit >= divisor; M1 exact 2-digit; M4 3-digit", () => {
  for (const seed of SEEDS) {
    for (let m = 1; m <= 5; m++) {
      for (const p of getProblemsDaniel("ndiv", m, mulberry32(seed))) {
        expect(p.b).toBeGreaterThanOrEqual(2); expect(p.b).toBeLessThan(10);
        expect(digitsOfN(p.a)[0]).toBeGreaterThanOrEqual(p.b);
      }
    }
    for (const p of getProblemsDaniel("ndiv", 1, mulberry32(seed))) {
      expect(p.a).toBeGreaterThanOrEqual(10); expect(p.a).toBeLessThan(100);
      expect(p.a % p.b).toBe(0);
    }
    for (const p of getProblemsDaniel("ndiv", 4, mulberry32(seed))) {
      expect(p.a).toBeGreaterThanOrEqual(100); expect(p.a).toBeLessThan(1000);
    }
  }
});
