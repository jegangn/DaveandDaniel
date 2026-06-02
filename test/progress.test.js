import { test, expect } from "bun:test";
import { levelKey, loadProgress, recordStars, isLevelUnlocked, totalStars, resetProfile } from "../src/progress.js";

const mem = () => {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i],
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};

test("levelKey namespaces per profile", () => {
  expect(levelKey("dave", "add", 2)).toBe("dave.stars.add.2");
  expect(levelKey("daniel", "ndiv", 5)).toBe("daniel.stars.ndiv.5");
});

test("record + load round-trips and keeps the best score", () => {
  const s = mem();
  recordStars(s, "daniel", "nadd", 1, 2);
  recordStars(s, "daniel", "nadd", 1, 1); // worse → ignored
  const p = loadProgress("daniel", ["nadd", "nsub"], 5, s);
  expect(p.nadd[1]).toBe(2);
  expect(p.nsub).toEqual({});
});

test("save slots are isolated per profile", () => {
  const s = mem();
  recordStars(s, "dave", "add", 1, 3);
  recordStars(s, "daniel", "nadd", 1, 1);
  const dave = loadProgress("dave", ["add", "sub", "mult"], 6, s);
  const daniel = loadProgress("daniel", ["nadd"], 5, s);
  expect(dave.add[1]).toBe(3);
  expect(daniel.nadd[1]).toBe(1);
  expect(daniel.nadd[1]).not.toBe(dave.add[1]);
});

test("isLevelUnlocked: L1 always; later needs a prior star; unlockAll overrides", () => {
  const p = { nadd: { 1: 3 }, nsub: {}, unlockAll: false };
  expect(isLevelUnlocked(p, "nadd", 1)).toBe(true);
  expect(isLevelUnlocked(p, "nadd", 2)).toBe(true);
  expect(isLevelUnlocked(p, "nadd", 3)).toBe(false);
  expect(isLevelUnlocked({ ...p, unlockAll: true }, "nadd", 3)).toBe(true);
});

test("totalStars sums across the given worlds only", () => {
  const p = { a: { 1: 3, 2: 2 }, b: { 1: 1 }, c: { 1: 3 }, unlockAll: false };
  expect(totalStars(p, ["a", "b"])).toBe(6);
});

test("resetProfile clears only that profile's keys", () => {
  const s = mem();
  recordStars(s, "dave", "add", 1, 3);
  recordStars(s, "daniel", "nadd", 1, 2);
  s.setItem("daniel.unlockAll", "1");
  resetProfile(s, "daniel");
  expect(loadProgress("daniel", ["nadd"], 5, s).nadd[1]).toBeUndefined();
  expect(loadProgress("daniel", ["nadd"], 5, s).unlockAll).toBe(false);
  expect(loadProgress("dave", ["add"], 6, s).add[1]).toBe(3); // dave untouched
});
