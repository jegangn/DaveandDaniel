import { banji, cog } from "../svg.js";
import { unlockAudio, sfx } from "../audio.js";

export function mount(stage, state, router) {
  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-splash";

  const cogWrap = document.createElement("div");
  cogWrap.className = "cog-corner";
  const cogLabel = document.createElement("span");
  cogLabel.className = "cog-label display";
  cogLabel.textContent = "PARENTS";
  cogWrap.appendChild(cogLabel);
  cogWrap.insertAdjacentHTML("beforeend", cog());
  sec.appendChild(cogWrap);

  const title = document.createElement("h1");
  title.className = "splash-title display";
  title.textContent = "JHANAV'S MATH";
  sec.appendChild(title);

  const mascot = document.createElement("div");
  mascot.className = "splash-mascot";
  mascot.insertAdjacentHTML("beforeend", banji("idle"));
  sec.appendChild(mascot);

  const btn = document.createElement("button");
  btn.className = "btn pill splash-play";
  btn.textContent = "TAP TO PLAY ▶";
  sec.appendChild(btn);

  // Parent-gate lock-out: if a previous gate attempt failed twice, the
  // splash is locked for 5 seconds — block all interaction and show a
  // countdown message so the parent (and not the kid) knows to wait.
  const lockUntil = parseInt(localStorage.getItem("bm.parentLockUntil") || "0", 10);
  const lockRemaining = Math.max(0, lockUntil - Date.now());
  let lockBanner = null;
  let lockTimer = null;
  if (lockRemaining > 0) {
    lockBanner = document.createElement("div");
    lockBanner.className = "parent-lock-banner display";
    // Block any pointer/click reaching the underlying splash so the parent
    // can't accidentally start the game or re-open the gate while locked.
    const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
    lockBanner.addEventListener("pointerdown", swallow);
    lockBanner.addEventListener("pointerup", swallow);
    lockBanner.addEventListener("click", swallow);
    sec.appendChild(lockBanner);
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      if (left <= 0) {
        localStorage.removeItem("bm.parentLockUntil");
        lockBanner.remove();
        lockBanner = null;
        clearInterval(lockTimer);
      } else {
        lockBanner.textContent = `PARENTS: PLEASE WAIT ${left}s`;
      }
    };
    tick();
    lockTimer = setInterval(tick, 250);
  }

  function isLocked() { return lockBanner !== null; }

  function go() {
    if (isLocked()) return;
    unlockAudio();
    sfx.transition();
    router.go("map");
  }
  btn.addEventListener("pointerup", go);
  sec.addEventListener("pointerup", (e) => {
    if (e.target.closest(".cog-corner")) return;
    if (!e.target.closest("button")) go();
  });

  cogWrap.addEventListener("pointerup", () => {
    if (isLocked()) return;
    router.go("settings");
  });

  stage.appendChild(sec);
  return () => {
    if (lockTimer) clearInterval(lockTimer);
    sec.remove();
  };
}
