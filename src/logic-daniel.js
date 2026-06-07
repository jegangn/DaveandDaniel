// Daniel's N-digit column maths. Pure functions, unit-tested (test/logic-daniel.test.js).
// Dave's 2-digit engine in logic.js is untouched — this is a separate module.

// ----- Seeded PRNG -----------------------------------------------------------
// mulberry32: tiny deterministic RNG. Injected into the generators so tests are
// reproducible (fixed seed) while gameplay varies (a fresh seed each mount).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const digitsOfN = (n) => String(n).split("").map(Number);

// Place a value's digits across N grid columns, shifted left by `shift`.
// Returns an N-length array, col -> { digit, di } (di = MSB-first index) or null.
export function placeDigits(value, shift, N) {
  const D = String(value).split("").map(Number);
  const cells = new Array(N).fill(null);
  for (let k = 0; k < D.length; k++) {
    const col = (N - 1) - shift - k;
    if (col >= 0) cells[col] = { digit: D[D.length - 1 - k], di: D.length - 1 - k };
  }
  return cells;
}

// Answer state for column entry. dir "rtl" (add/sub/mult) starts at the ones;
// dir "ltr" (division quotient) starts at the most-significant digit.
export function createAnswerStateN(answer, dir = "rtl") {
  const expected = Array.isArray(answer) ? answer.slice() : digitsOfN(answer);
  return {
    expected,
    slots: expected.map(() => null),
    activeIndex: dir === "ltr" ? 0 : expected.length - 1,
    dir,
    wrongCount: 0,
    lastDropCorrect: null,
  };
}

// Right-to-left single-digit drop (identical semantics to logic.dropDigit, but
// works on N-length answers). Advances the active slot leftward.
export function dropDigit(state, digit, targetIndex = state.activeIndex) {
  if (targetIndex !== state.activeIndex || state.slots[targetIndex] !== null || digit !== state.expected[targetIndex]) {
    return { ...state, lastDropCorrect: false, wrongCount: state.wrongCount + 1 };
  }
  const slots = state.slots.slice();
  slots[targetIndex] = digit;
  const next = targetIndex - 1;
  return { ...state, slots, activeIndex: next >= 0 ? next : -1, lastDropCorrect: true };
}

// Left-to-right drop for division quotient entry. Advances rightward.
export function dropDigitLTR(state, digit, targetIndex = state.activeIndex) {
  if (targetIndex !== state.activeIndex || state.slots[targetIndex] !== null || digit !== state.expected[targetIndex]) {
    return { ...state, lastDropCorrect: false, wrongCount: state.wrongCount + 1 };
  }
  const slots = state.slots.slice();
  slots[targetIndex] = digit;
  const next = targetIndex + 1;
  return { ...state, slots, activeIndex: next < state.expected.length ? next : -1, lastDropCorrect: true };
}

// ----- Column add / subtract analysis ---------------------------------------
// RTL digit array (index 0 = ones), zero-padded to `width`.
function rtlPad(n, width) {
  const r = digitsOfN(n).reverse();
  while (r.length < width) r.push(0);
  return r;
}

// Addition: walk columns right-to-left, flagging which produce a carry. The
// screen flies a "1" from column i to column i+1 wherever carryOut[i] is true.
export function analyzeColumnsAdd(a, b) {
  const answer = a + b;
  const width = Math.max(digitsOfN(a).length, digitsOfN(b).length, digitsOfN(answer).length);
  const aR = rtlPad(a, width), bR = rtlPad(b, width);
  const carryOut = [];
  let carry = 0;
  for (let i = 0; i < width; i++) {
    const sum = aR[i] + bR[i] + carry;
    carryOut[i] = sum >= 10;
    carry = sum >= 10 ? 1 : 0;
  }
  return { answer, width, aDigits: digitsOfN(a), bDigits: digitsOfN(b), carryOut };
}

// Subtraction (a >= b): walk right-to-left, regrouping where the top digit is
// too small. Borrowing across zeros chains automatically — each 0 en route
// becomes 9 and passes the borrow on. Returns the regrouped top row plus an
// ordered step list the screen animates.
export function analyzeColumnsSub(a, b) {
  const width = Math.max(digitsOfN(a).length, digitsOfN(b).length);
  const aR = rtlPad(a, width), bR = rtlPad(b, width);
  const work = aR.slice();
  const borrow = new Array(width).fill(false);
  const steps = [];
  for (let i = 0; i < width; i++) {
    if (work[i] < bR[i]) {
      borrow[i] = true;
      let j = i + 1;
      while (work[j] === 0) { work[j] = 9; steps.push({ col: j, from: 0, to: 9, kind: "through" }); j++; }
      const fromBefore = work[j];
      work[j] -= 1;
      steps.push({ col: j, from: fromBefore, to: work[j], kind: "lend" });
      const wasReceiving = work[i];
      work[i] += 10;
      steps.push({ col: i, from: wasReceiving, to: work[i], kind: "receive" });
    }
  }
  return { answer: a - b, width, aDigits: digitsOfN(a), bDigits: digitsOfN(b), topRegrouped: work, borrow, steps };
}

// ----- Long multiplication carry helpers ------------------------------------

// Carries produced when multiplying `a` by one `digit`, LSB-first. Each non-zero
// carry is recorded at the grid column it feeds INTO (incl. the final bring-down
// carry that becomes the leading digit). Carry per single-digit step is one digit.
export function partialCarries(a, digit, shift, N) {
  const aR = digitsOfN(a).reverse();
  const carries = {};
  let carry = 0;
  for (let k = 0; k < aR.length; k++) {
    const prod = aR[k] * digit + carry;
    carry = Math.floor(prod / 10);
    if (carry > 0) {
      const col = (N - 1) - shift - (k + 1);
      if (col >= 0) carries[col] = carry;
    }
  }
  return carries;
}

// Carries of adding two addends, keyed by the grid column they feed INTO. Two-addend
// addition always carries 0 or 1; `analyzeColumnsAdd(...).width` === answer length.
export function sumCarries(addA, addB) {
  const { carryOut, width } = analyzeColumnsAdd(addA, addB);
  const carries = {};
  for (let i = 0; i < width; i++) {
    if (carryOut[i]) {
      const col = (width - 1) - (i + 1);
      if (col >= 0) carries[col] = 1;
    }
  }
  return carries;
}

// Ordered fill steps for one row: walk result columns right-to-left (di high->low),
// emitting a column's incoming carry (if any) just before that column's result.
// The ones column never has an incoming carry, so a row always starts AND ends
// with a result step.
export function buildSequence(cells, carries = {}) {
  const steps = [];
  const len = cells.filter(Boolean).length; // number of result digits
  for (let di = len - 1; di >= 0; di--) {
    const col = cells.findIndex((c) => c && c.di === di);
    if (carries[col] != null) steps.push({ kind: "carry", col, value: carries[col] });
    steps.push({ kind: "result", col, di, value: cells[col].digit });
  }
  return steps;
}

// ----- Long multiplication ---------------------------------------------------
// One partial product per multiplier digit (LSB-first → shift = its place).
// `rowDigits` is what the kid writes for that row (a × digit); `value` is the
// true partial (a × digit × 10^shift) used for the sum. The sum of exactly two
// partials carries 0/1 per column, so the sum row reuses the engine's flyCarry.
export function analyzeLongMult(a, b) {
  const bR = digitsOfN(b).reverse(); // LSB-first
  const partials = bR.map((digit, shift) => {
    const rowDigits = a * digit;
    return { digit, rowDigits, value: rowDigits * Math.pow(10, shift), shift };
  });
  const needsSum = partials.length > 1;
  const product = a * b;
  let sum = null;
  if (needsSum) {
    const add = analyzeColumnsAdd(partials[0].value, partials[1].value);
    sum = { value: product, width: add.width, carryOut: add.carryOut };
  }
  return { a, b, product, partials, needsSum, sum };
}

// ----- Short ("bus-stop") division, single-digit divisor --------------------
// Walk the dividend digits MSB-first. Each column: value = carryIn*10 + digit,
// quotient digit = floor(value / divisor), remainder carries into the next
// column. Quotient digits align 1:1 with dividend digits (the generator keeps
// the leading dividend digit >= divisor, so there is never an awkward leading
// zero to drag; internal zeros are still possible and are good practice).
// After the integer part, the walk continues into the decimal part by bringing
// down zeros until the remainder is 0 (capped at 2 places); generated divisors
// (2/4/5) always terminate within that cap.
export function analyzeShortDiv(dividend, divisor) {
  const MAX_PLACES = 2;
  const intDigits = digitsOfN(dividend); // MSB-first
  const steps = [];
  const quotientIntDigits = [];
  const quotientDecDigits = [];
  let carry = 0;

  // Integer part: one column per dividend digit.
  for (let i = 0; i < intDigits.length; i++) {
    const carryIn = carry;
    const value = carryIn * 10 + intDigits[i];
    const q = Math.floor(value / divisor);
    carry = value % divisor;
    quotientIntDigits.push(q);
    steps.push({ digit: intDigits[i], carryIn, value, q, remainder: carry, decimal: false });
  }

  // Decimal part: bring down zeros until the remainder clears (capped at MAX_PLACES).
  while (carry > 0 && quotientDecDigits.length < MAX_PLACES) {
    const carryIn = carry;
    const value = carryIn * 10; // brought-down zero
    const q = Math.floor(value / divisor);
    carry = value % divisor;
    quotientDecDigits.push(q);
    steps.push({ digit: 0, carryIn, value, q, remainder: carry, decimal: true });
  }

  const answer = Number(
    quotientIntDigits.join("") +
    (quotientDecDigits.length ? "." + quotientDecDigits.join("") : "")
  );

  return {
    dividend, divisor,
    intDigits,
    decimalPlaces: quotientDecDigits.length,
    quotientIntDigits,
    quotientDecDigits,
    steps,
    remainder: carry, // 0 for all generated problems (2/4/5 divisors terminate within MAX_PLACES)
    answer,
  };
}

// ----- Seeded problem generators (difficulty bands) -------------------------
// Each mission generates 5 problems from an injected RNG, retrying until the
// band constraint holds (operand sizes + carry/borrow/remainder shape). Tests
// assert these PROPERTIES across many seeds, not exact values — so gameplay can
// vary every replay while difficulty still climbs cleanly.

function randInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function nDigit(rng, n) { return randInt(rng, Math.pow(10, n - 1), Math.pow(10, n) - 1); }
function genUntil(make, ok, cap = 8000) {
  let last;
  for (let i = 0; i < cap; i++) { last = make(); if (ok(last)) return last; }
  return last; // fallback — bands above are chosen so this is effectively never hit
}
const carriesOf = (a, b) => analyzeColumnsAdd(a, b).carryOut.filter(Boolean).length;
const borrowsOf = (a, b) => analyzeColumnsSub(a, b).borrow.filter(Boolean).length;
function carryMatch(spec, n) {
  if (Array.isArray(spec)) return n >= spec[0] && n <= spec[1];
  if (spec && typeof spec === "object") return n >= spec.min;
  return n === spec;
}

const BANDS = {
  nadd: {
    1: { kind: "add", dA: 3, dB: 3, carries: 0 },
    2: { kind: "add", dA: 3, dB: 3, carries: 1 },
    3: { kind: "add", dA: 3, dB: 3, carries: 2 },
    4: { kind: "add", dA: 4, dB: 3, carries: [1, 2] },
    5: { kind: "add", dA: 4, dB: 4, carries: { min: 3 } },
  },
  nsub: {
    1: { kind: "sub", dA: 3, dB: 3, borrows: 0 },
    2: { kind: "sub", dA: 3, dB: 3, borrows: 1 },
    3: { kind: "sub", dA: 3, dB: 3, borrows: 2 },
    4: { kind: "sub", dA: 4, dB: 3, borrows: [1, 2] },
    5: { kind: "sub", dA: 4, dB: 4, across: true },
  },
  nmul: {
    1: { kind: "mul", dA: 2, dB: 1 },
    2: { kind: "mul", dA: 3, dB: 1 },
    3: { kind: "mul", dA: 2, dB: 2, lo: 11, hi: 29 },
    4: { kind: "mul", dA: 2, dB: 2, lo: 23, hi: 79 },
    5: { kind: "mul", dA: 2, dB: 2, lo: 42, hi: 99 },
  },
  ndiv: {
    1: { kind: "div", dA: 2, divisors: [2, 5], places: 1 },
    2: { kind: "div", dA: 3, divisors: [2, 5], places: 1 },
    3: { kind: "div", dA: 2, divisors: [4], places: 2 },
    4: { kind: "div", dA: 3, divisors: [4], places: 2 },
    5: { kind: "div", dA: 3, divisors: [2, 4, 5], places: "any" },
  },
};

function genAdd(rng, band) {
  const { a, b } = genUntil(
    () => ({ a: nDigit(rng, band.dA), b: nDigit(rng, band.dB) }),
    ({ a, b }) => carryMatch(band.carries, carriesOf(a, b))
  );
  return { op: "+", a, b, answer: a + b };
}

function genSub(rng, band) {
  const { a, b } = genUntil(
    () => {
      let a = nDigit(rng, band.dA), b = nDigit(rng, band.dB);
      if (band.across) {
        // Force an interior 0 in the top number and a small ones digit so the
        // ones column borrows and the chain passes through the zero.
        const zeroTens = rng() < 0.5;
        const aDigits = digitsOfN(a);
        if (zeroTens) aDigits[aDigits.length - 2] = 0; else aDigits[aDigits.length - 3] = 0;
        aDigits[aDigits.length - 1] = randInt(rng, 0, 3); // small ones
        a = parseInt(aDigits.join(""), 10);
      }
      if (a < b) [a, b] = [b, a];
      return { a, b };
    },
    ({ a, b }) => {
      if (a < b) return false;
      if (band.across) return analyzeColumnsSub(a, b).steps.some((s) => s.kind === "through");
      return carryMatch(band.borrows, borrowsOf(a, b));
    }
  );
  return { op: "-", a, b, answer: a - b };
}

function genMul(rng, band) {
  const { a, b } = genUntil(
    () => {
      if (band.dB === 1) return { a: nDigit(rng, band.dA), b: randInt(rng, 2, 9) };
      return { a: randInt(rng, band.lo, band.hi), b: randInt(rng, band.lo, band.hi) };
    },
    ({ a, b }) => {
      if (band.dB === 1) return true;
      return a % 10 !== 0 && b % 10 !== 0; // both partial rows non-trivial
    }
  );
  return { op: "×", a, b, answer: a * b };
}

function genDiv(rng, band) {
  const { a, b } = genUntil(
    () => ({ a: nDigit(rng, band.dA), b: pick(rng, band.divisors) }),
    ({ a, b }) => {
      if (a % b === 0) return false;                 // must leave a real decimal
      if (digitsOfN(a)[0] < b) return false;         // quotient has no leading zero
      const places = analyzeShortDiv(a, b).decimalPlaces;
      return band.places === "any" ? true : places === band.places;
    }
  );
  return { op: "÷", a, b, answer: a / b };
}

export function getProblemsDaniel(world, level, rng = Math.random) {
  const band = BANDS[world][level];
  const gen = { add: genAdd, sub: genSub, mul: genMul, div: genDiv }[band.kind];
  const out = [];
  for (let i = 0; i < 5; i++) out.push(gen(rng, band));
  return out;
}
