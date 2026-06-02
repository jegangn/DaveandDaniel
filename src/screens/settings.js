import { isEnabled, setEnabled } from "../audio.js";
import { resetProfile, unlockKey } from "../progress.js";
import { PROFILES } from "../profiles.js";

export function mount(stage, state, router) {
  const prof = PROFILES[state.profile];

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-settings";

  const card = document.createElement("div");
  card.className = "parent-gate-card";
  const h2 = document.createElement("h2");
  h2.className = "display";
  h2.textContent = "PARENTS ONLY";
  const p = document.createElement("p");
  const q = document.createElement("span");
  q.id = "pg-q";
  p.append("Tap the answer to ", q);
  const btnHost = document.createElement("div");
  btnHost.className = "pg-buttons";
  const err = document.createElement("div");
  err.className = "pg-error hidden";
  err.textContent = "Try again";
  card.append(h2, p, btnHost, err);
  sec.appendChild(card);

  const a = 2 + Math.floor(Math.random() * 7);
  const b = 1 + Math.floor(Math.random() * 6);
  const c = 1 + Math.floor(Math.random() * 5);
  const answer = a + b + c;
  q.textContent = `${a} + ${b} + ${c} = ?`;

  const options = new Set([answer]);
  while (options.size < 4) {
    const candidate = answer + (Math.floor(Math.random() * 7) - 3);
    if (candidate > 0 && candidate !== answer) options.add(candidate);
  }
  let wrongCount = 0;
  [...options].sort(() => Math.random() - 0.5).forEach((n) => {
    const b2 = document.createElement("button");
    b2.className = "btn ghost";
    b2.textContent = String(n);
    b2.addEventListener("pointerup", () => {
      if (n === answer) { showSettings(); return; }
      err.classList.remove("hidden");
      b2.classList.add("disabled");
      wrongCount++;
      if (wrongCount >= 2) {
        // Two wrong guesses → lock the parent area for 5 seconds and bounce
        // the user back to the splash so a kid can't keep brute-forcing.
        localStorage.setItem("bm.parentLockUntil", String(Date.now() + 5000));
        router.go("splash");
      }
    });
    btnHost.appendChild(b2);
  });

  function showSettings() {
    sec.innerHTML = "";
    const c2 = document.createElement("div");
    c2.className = "settings-card";
    const h = document.createElement("h2");
    h.className = "display";
    h.textContent = `SETTINGS · ${prof.label}`;

    const soundBtn = document.createElement("button");
    soundBtn.className = "btn";
    soundBtn.textContent = `SOUND: ${isEnabled() ? "ON" : "OFF"}`;
    soundBtn.addEventListener("pointerup", () => {
      setEnabled(!isEnabled());
      soundBtn.textContent = `SOUND: ${isEnabled() ? "ON" : "OFF"}`;
    });

    const unlockBtn = document.createElement("button");
    unlockBtn.className = "btn";
    const uKey = unlockKey(prof.prefix);
    const unlocked = localStorage.getItem(uKey) === "1";
    unlockBtn.textContent = unlocked ? "LOCK BACK" : "UNLOCK ALL LEVELS";
    unlockBtn.addEventListener("pointerup", () => {
      const nowOn = localStorage.getItem(uKey) !== "1";
      if (nowOn) localStorage.setItem(uKey, "1");
      else localStorage.removeItem(uKey);
      unlockBtn.textContent = nowOn ? "LOCK BACK" : "UNLOCK ALL LEVELS";
    });

    const resetBtn = document.createElement("button");
    resetBtn.className = "btn ghost";
    resetBtn.textContent = `RESET ${prof.label}'S PROGRESS`;
    resetBtn.addEventListener("pointerup", () => {
      if (confirm(`Reset ${prof.label}'s progress? This cannot be undone.`)) {
        resetProfile(localStorage, prof.prefix);
        router.go("splash");
      }
    });

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn ghost";
    closeBtn.textContent = "CLOSE";
    closeBtn.addEventListener("pointerup", () => router.go("splash"));

    c2.append(h, soundBtn, unlockBtn, resetBtn, closeBtn);
    sec.appendChild(c2);
  }

  stage.appendChild(sec);
  return () => sec.remove();
}
