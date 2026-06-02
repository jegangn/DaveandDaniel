// Profile-namespaced progress storage.
//
// Jhanav's engine hard-coded `bm.stars.{world}.{level}` and a fixed
// ["add","sub","mult"] × 6 world list. Dave & Daniel needs SEPARATE save slots
// per boy, so every key is namespaced by a per-profile prefix:
//   dave.stars.add.2     daniel.stars.ndiv.5     {prefix}.unlockAll
// The world list and levels-per-world are passed in (they differ per profile),
// so this module is fully profile-agnostic.

export function levelKey(prefix, world, level) { return `${prefix}.stars.${world}.${level}`; }
export function unlockKey(prefix) { return `${prefix}.unlockAll`; }

export function loadProgress(prefix, worlds, levelsPerWorld, storage = globalThis.localStorage) {
  const out = { unlockAll: storage?.getItem(unlockKey(prefix)) === "1" };
  for (const w of worlds) {
    out[w] = {};
    for (let l = 1; l <= levelsPerWorld; l++) {
      const v = storage?.getItem(levelKey(prefix, w, l));
      if (v) out[w][l] = parseInt(v, 10);
    }
  }
  return out;
}

export function recordStars(storage, prefix, world, level, stars) {
  if (!storage) return;
  const k = levelKey(prefix, world, level);
  const prior = parseInt(storage.getItem(k) || "0", 10);
  if (stars > prior) storage.setItem(k, String(stars));
}

export function isLevelUnlocked(progress, world, level) {
  if (progress.unlockAll) return true;
  if (level === 1) return true;
  return (progress[world]?.[level - 1] || 0) > 0;
}

export function totalStars(progress, worlds) {
  let n = 0;
  for (const w of worlds) for (const k in (progress[w] || {})) n += progress[w][k];
  return n;
}

export function resetProfile(storage, prefix) {
  if (!storage) return;
  for (let i = storage.length - 1; i >= 0; i--) {
    const k = storage.key(i);
    if (k && (k.startsWith(`${prefix}.stars.`) || k === unlockKey(prefix))) storage.removeItem(k);
  }
}
