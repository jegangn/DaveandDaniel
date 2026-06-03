import { sfx } from "./audio.js";
import { confettiShape } from "./svg.js";

// ===== TASK 16: Tile Animations =====

export function tilePickup(el) {
  el.classList.add("dragging");
  sfx.tilePickup();
}

export function tileBounceBack(el, origin, parentInfo) {
  return new Promise((resolve) => {
    const stage = document.getElementById("stage");
    const sRect = stage.getBoundingClientRect();
    const logicalW = stage.offsetWidth || 1280;
    const scale = sRect.width / logicalW;
    const elRect = el.getBoundingClientRect();
    const startLocalX = (elRect.left - sRect.left) / scale;
    const startLocalY = (elRect.top  - sRect.top)  / scale;
    const dx = origin.x - startLocalX;
    const dy = origin.y - startLocalY;
    const apex = -24;
    el.style.transition = "none";
    el.classList.remove("dragging");
    el.animate(
      [
        { transform: `translate(0,0) rotate(0)` },
        { transform: `translate(${dx/2}px, ${dy/2 + apex}px) rotate(-8deg)` },
        { transform: `translate(${dx}px, ${dy}px) rotate(0)` },
      ],
      { duration: 450, easing: "cubic-bezier(0.7,-0.5,0.3,1.5)" }
    ).onfinish = () => {
      // Clone-drag: the original tile is already visible back in its tray slot,
      // so the bounced clone simply removes itself. (The legacy re-parent path
      // is kept for any caller still passing originalParent.)
      if (el.classList.contains("drag-clone")) {
        el.remove();
        resolve();
        return;
      }
      el.style.position = "";
      el.style.left = "";
      el.style.top = "";
      el.style.transform = "";
      // Re-parent back to the original container (digit-tray) so the tile
      // re-joins the flex layout after a failed drop.
      if (parentInfo?.originalParent) {
        if (parentInfo.originalNextSibling) {
          parentInfo.originalParent.insertBefore(el, parentInfo.originalNextSibling);
        } else {
          parentInfo.originalParent.appendChild(el);
        }
      }
      resolve();
    };
    sfx.tileDropWrong();
  });
}

export function tileSnapIn(el, targetEl) {
  return new Promise((resolve) => {
    const start = el.getBoundingClientRect();
    const target = targetEl.getBoundingClientRect();
    const dx = target.left + (target.width - start.width)/2 - start.left;
    const dy = target.top  + (target.height - start.height)/2 - start.top;
    el.classList.remove("dragging");
    // Smooth glide into the slot: longer duration, gentle ease-in-out, no
    // mid-flight scale dip or bounce-at-the-end. The tile then cross-fades
    // out as the slot text fades in, so the hand-off feels seamless instead
    // of snapping/popping.
    el.animate(
      [
        { transform: `translate(0,0) scale(1.08)`, opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(1)`, opacity: 1, offset: 0.85 },
        { transform: `translate(${dx}px,${dy}px) scale(1)`, opacity: 0 },
      ],
      { duration: 360, easing: "cubic-bezier(0.33, 0, 0.2, 1)", fill: "forwards" }
    );
    // Reveal the slot text just before the tile fades out so there is no
    // visible gap or double-render of the digit. Sparkles + mascot cheer
    // fire at the SAME moment the slot fills — they accompany the visual
    // arrival of the answer instead of stuttering in after a delay.
    setTimeout(() => {
      targetEl.classList.remove("active");
      targetEl.classList.add("filled");
      targetEl.textContent = el.textContent;
      targetEl.classList.add("just-filled");
      correctBurst(targetEl);
      const mascot = document.querySelector(".corner-mascot svg");
      if (mascot) mascotCheer(mascot);
    }, 280);
    setTimeout(() => {
      el.remove();
      setTimeout(() => targetEl.classList.remove("just-filled"), 400);
      resolve();
    }, 380);
    sfx.correctDing();
  });
}

// Mini sparkle burst from a slot when a correct answer lands
export function correctBurst(slotEl) {
  const stage = document.getElementById("stage");
  if (!stage) return;
  const stageRect = stage.getBoundingClientRect();
  const slotRect = slotEl.getBoundingClientRect();
  const logicalW = stage.offsetWidth || 1280;
  const scale = stageRect.width / logicalW;
  const cx = (slotRect.left + slotRect.width / 2 - stageRect.left) / scale;
  const cy = (slotRect.top + slotRect.height / 2 - stageRect.top) / scale;

  const colors = ["#FFC83A", "#FFF1A8", "#4AD66D", "#FF7A40"];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const p = document.createElement("div");
    p.className = "spark-particle";
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = colors[i % colors.length];
    stage.appendChild(p);
    const angle = (Math.PI * 2 * i) / N + (Math.random() - 0.5) * 0.4;
    const dist = 90 + Math.random() * 50;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 20;
    p.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.6)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5}px)) scale(1.2)`, opacity: 1, offset: 0.4 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 200, easing: "cubic-bezier(0.34,1.6,0.5,1)", fill: "forwards" }
    ).onfinish = () => p.remove();
  }
}

export function mascotQuickHop(svgRoot) {
  svgRoot.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-16px) scale(1.06)", offset: 0.4 },
      { transform: "translateY(0) scale(1)" },
    ],
    { duration: 400, easing: "cubic-bezier(0.34,1.6,0.5,1)" }
  );
}

// ===== Mascot celebration — 10 distinct animations, randomized per drop =====
//
// Each celebration choreographs body + appendages + sparkles in a different
// way so the kid sees a varied reaction stream. `mascotCheer` is the public
// entry — it picks one celebration uniformly at random while excluding the
// previous one so the same dance never plays twice in a row.

// Spawn sparkles around the mascot. Single helper, parameterised for the
// pattern each celebration wants.
function spawnSparkles(svgRoot, opts = {}) {
  const parent = svgRoot?.parentElement; // .corner-mascot
  if (!parent) return;
  const cs = getComputedStyle(parent);
  if (cs.position === "static") parent.style.position = "relative";

  const {
    count = 10,
    angleStart = -Math.PI,
    angleEnd = 0,
    distMin = 100,
    distRange = 50,
    duration = 900,
    durationRange = 250,
    gravity = 40,
    sizeScale = 1,
    color = null,
    delay = 0,
    delayStagger = 0,
    spread = 0.18,
  } = opts;

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const angle = angleStart + (angleEnd - angleStart) * t + (Math.random() - 0.5) * spread;
    const dist = distMin + Math.random() * distRange;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const rot = (180 + Math.random() * 360) * (i % 2 === 0 ? 1 : -1);
    const dur = duration + Math.random() * durationRange;

    const spawn = () => {
      const s = document.createElement("div");
      s.className = "mascot-sparkle";
      if (color) s.style.background = color;
      if (sizeScale !== 1) {
        const px = Math.round(28 * sizeScale);
        s.style.width = `${px}px`;
        s.style.height = `${px}px`;
      }
      s.style.left = "50%";
      s.style.top = "50%";
      parent.appendChild(s);
      s.animate(
        [
          { transform: "translate(-50%, -50%) scale(0) rotate(0deg)", opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.55}px)) scale(1.4) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.35 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + gravity}px)) scale(0.6) rotate(${rot}deg)`, opacity: 0 },
        ],
        { duration: dur, easing: "cubic-bezier(0.4,0,0.6,1)", fill: "forwards" }
      ).onfinish = () => s.remove();
    };

    const startDelay = delay + i * delayStagger;
    if (startDelay > 0) setTimeout(spawn, startDelay);
    else spawn();
  }
}

// Common helpers for selecting body parts
function flapLefts(svgRoot, frames, duration, easing = "ease-in-out") {
  svgRoot.querySelectorAll(".wing-l, .arm-l, .ear-l").forEach((el) => {
    el.style.transformOrigin = "70% 70%";
    el.animate(frames, { duration, easing });
  });
}
function flapRights(svgRoot, frames, duration, easing = "ease-in-out") {
  svgRoot.querySelectorAll(".wing-r, .arm-r, .ear-r").forEach((el) => {
    el.style.transformOrigin = "30% 70%";
    el.animate(frames, { duration, easing });
  });
}
function animatePart(svgRoot, selector, frames, duration, options = {}) {
  const el = svgRoot.querySelector(selector);
  if (!el) return;
  if (options.origin) el.style.transformOrigin = options.origin;
  el.animate(frames, { duration, easing: options.easing || "ease-in-out" });
}

// 1. BIG JUMP — anticipation crouch, high jump, land squash, settle
function cBigJump(svgRoot) {
  const D = 800;
  svgRoot.animate(
    [
      { transform: "translateY(0) scale(1, 1)" },
      { transform: "translateY(10px) scale(1.15, 0.82)", offset: 0.18 },
      { transform: "translateY(-50px) scale(0.94, 1.12)", offset: 0.5 },
      { transform: "translateY(-12px) scale(1.02, 0.98)", offset: 0.72 },
      { transform: "translateY(0) scale(1.12, 0.88)", offset: 0.88 },
      { transform: "translateY(0) scale(1, 1)" },
    ],
    { duration: D, easing: "cubic-bezier(0.34, 1.6, 0.5, 1)" }
  );
  flapLefts(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(45deg)", offset: 0.3 },
    { transform: "rotate(-20deg)", offset: 0.6 },
    { transform: "rotate(35deg)", offset: 0.8 },
    { transform: "rotate(0deg)" },
  ], D);
  flapRights(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(-45deg)", offset: 0.3 },
    { transform: "rotate(20deg)", offset: 0.6 },
    { transform: "rotate(-35deg)", offset: 0.8 },
    { transform: "rotate(0deg)" },
  ], D);
  animatePart(svgRoot, ".head", [
    { transform: "rotate(0deg)" },
    { transform: "rotate(-10deg)", offset: 0.3 },
    { transform: "rotate(10deg)", offset: 0.7 },
    { transform: "rotate(0deg)" },
  ], D, { origin: "50% 80%" });
  spawnSparkles(svgRoot, { count: 12, angleStart: -Math.PI, angleEnd: 0, distMin: 110, distRange: 50 });
}

// 2. SPIN 360 — body rotates a full turn while lifting and settling, sparkle spiral
function cSpin360(svgRoot) {
  const D = 850;
  svgRoot.animate(
    [
      { transform: "translateY(0) rotate(0deg) scale(1)" },
      { transform: "translateY(-8px) rotate(0deg) scale(1.08, 0.92)", offset: 0.12 },
      { transform: "translateY(-26px) rotate(180deg) scale(1)", offset: 0.5 },
      { transform: "translateY(-8px) rotate(360deg) scale(1.08, 0.92)", offset: 0.85 },
      { transform: "translateY(0) rotate(360deg) scale(1)" },
    ],
    { duration: D, easing: "cubic-bezier(0.5, 0, 0.4, 1)" }
  );
  // Spiral sparkles: 14 stars, staggered, sweeping full circle
  spawnSparkles(svgRoot, {
    count: 14, angleStart: -Math.PI, angleEnd: Math.PI,
    distMin: 90, distRange: 30, gravity: 20,
    delayStagger: 35, duration: 800, durationRange: 200,
  });
}

// 3. WIGGLE DANCE — side-to-side body shake with tail wag and head bob
function cWiggleDance(svgRoot) {
  const D = 800;
  svgRoot.animate(
    [
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(18px) rotate(8deg)", offset: 0.18 },
      { transform: "translateX(-18px) rotate(-8deg)", offset: 0.4 },
      { transform: "translateX(18px) rotate(8deg)", offset: 0.62 },
      { transform: "translateX(-12px) rotate(-6deg)", offset: 0.82 },
      { transform: "translateX(0) rotate(0deg)" },
    ],
    { duration: D, easing: "ease-in-out" }
  );
  animatePart(svgRoot, ".tail", [
    { transform: "rotate(0deg)" },
    { transform: "rotate(35deg)", offset: 0.18 },
    { transform: "rotate(-35deg)", offset: 0.4 },
    { transform: "rotate(35deg)", offset: 0.62 },
    { transform: "rotate(-25deg)", offset: 0.82 },
    { transform: "rotate(0deg)" },
  ], D, { origin: "30% 50%" });
  animatePart(svgRoot, ".head", [
    { transform: "rotate(0deg)" },
    { transform: "rotate(-12deg)", offset: 0.18 },
    { transform: "rotate(12deg)", offset: 0.4 },
    { transform: "rotate(-12deg)", offset: 0.62 },
    { transform: "rotate(8deg)", offset: 0.82 },
    { transform: "rotate(0deg)" },
  ], D, { origin: "50% 80%" });
  // Alternating side bursts
  spawnSparkles(svgRoot, { count: 5, angleStart: -Math.PI * 0.9, angleEnd: -Math.PI * 0.6, distMin: 100, distRange: 30, delay: 100 });
  spawnSparkles(svgRoot, { count: 5, angleStart: -Math.PI * 0.4, angleEnd: -Math.PI * 0.1, distMin: 100, distRange: 30, delay: 350 });
}

// 4. BACKFLIP — body rotates -360deg in an arc, sparkle trail
function cBackflip(svgRoot) {
  const D = 900;
  svgRoot.animate(
    [
      { transform: "translateY(0) rotate(0deg)" },
      { transform: "translateY(5px) rotate(0deg) scale(1.1, 0.85)", offset: 0.1 },
      { transform: "translateY(-55px) rotate(-180deg) scale(1)", offset: 0.5 },
      { transform: "translateY(0) rotate(-360deg) scale(1.08, 0.92)", offset: 0.88 },
      { transform: "translateY(0) rotate(-360deg) scale(1)" },
    ],
    { duration: D, easing: "cubic-bezier(0.4, 0.3, 0.4, 1)" }
  );
  // Sparkle trail follows the arc — 10 stars spawned over 500ms
  spawnSparkles(svgRoot, {
    count: 10, angleStart: -Math.PI * 0.9, angleEnd: -Math.PI * 0.1,
    distMin: 70, distRange: 40, gravity: 60,
    delayStagger: 50, duration: 700, durationRange: 150,
  });
}

// 5. TRIPLE BOUNCE — three increasing jumps, sparkles released per bounce
function cTripleBounce(svgRoot) {
  const D = 900;
  svgRoot.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(-15px) scale(1.04, 0.96)", offset: 0.12 },
      { transform: "translateY(0) scale(1.06, 0.92)", offset: 0.22 },
      { transform: "translateY(-30px) scale(1.04, 0.96)", offset: 0.38 },
      { transform: "translateY(0) scale(1.08, 0.9)", offset: 0.5 },
      { transform: "translateY(-55px) scale(1.02, 1.08)", offset: 0.7 },
      { transform: "translateY(0) scale(1.15, 0.85)", offset: 0.88 },
      { transform: "translateY(0) scale(1)" },
    ],
    { duration: D, easing: "cubic-bezier(0.5, 0, 0.5, 1)" }
  );
  // 3 small bursts, increasing in size, at each bounce peak
  spawnSparkles(svgRoot, { count: 3, angleStart: -Math.PI * 0.8, angleEnd: -Math.PI * 0.2, distMin: 70, distRange: 20, delay: 100, sizeScale: 0.8 });
  spawnSparkles(svgRoot, { count: 5, angleStart: -Math.PI * 0.85, angleEnd: -Math.PI * 0.15, distMin: 90, distRange: 30, delay: 320, sizeScale: 0.9 });
  spawnSparkles(svgRoot, { count: 8, angleStart: -Math.PI, angleEnd: 0, distMin: 110, distRange: 40, delay: 600, sizeScale: 1.1 });
}

// 6. YES-NOD — head nods rapidly, body bobs in sync
function cYesNod(svgRoot) {
  const D = 750;
  svgRoot.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(-6px)", offset: 0.2 },
      { transform: "translateY(0)", offset: 0.35 },
      { transform: "translateY(-8px)", offset: 0.55 },
      { transform: "translateY(0)", offset: 0.7 },
      { transform: "translateY(-6px)", offset: 0.85 },
      { transform: "translateY(0)" },
    ],
    { duration: D, easing: "cubic-bezier(0.5, 0.1, 0.5, 1)" }
  );
  animatePart(svgRoot, ".head", [
    { transform: "rotate(0deg) translateY(0)" },
    { transform: "rotate(-15deg) translateY(-3px)", offset: 0.15 },
    { transform: "rotate(0deg) translateY(0)", offset: 0.3 },
    { transform: "rotate(-15deg) translateY(-3px)", offset: 0.5 },
    { transform: "rotate(0deg) translateY(0)", offset: 0.65 },
    { transform: "rotate(-15deg) translateY(-3px)", offset: 0.85 },
    { transform: "rotate(0deg) translateY(0)" },
  ], D, { origin: "50% 90%" });
  spawnSparkles(svgRoot, { count: 8, angleStart: -Math.PI, angleEnd: 0, distMin: 90, distRange: 30, sizeScale: 0.85 });
}

// 7. FIST PUMP — jump up while wings slam DOWN ("YES!"), hold, release
function cFistPump(svgRoot) {
  const D = 800;
  svgRoot.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(5px) scale(1.1, 0.85)", offset: 0.12 },
      { transform: "translateY(-28px) scale(1)", offset: 0.32 },
      { transform: "translateY(-28px) scale(1)", offset: 0.62 },
      { transform: "translateY(0) scale(1.1, 0.9)", offset: 0.85 },
      { transform: "translateY(0) scale(1)" },
    ],
    { duration: D, easing: "cubic-bezier(0.4, 0, 0.4, 1)" }
  );
  // Wings/arms slam DOWN to a 'yes!' position, hold, release
  flapLefts(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(-60deg)", offset: 0.3 },
    { transform: "rotate(-55deg)", offset: 0.62 },
    { transform: "rotate(0deg)" },
  ], D);
  flapRights(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(60deg)", offset: 0.3 },
    { transform: "rotate(55deg)", offset: 0.62 },
    { transform: "rotate(0deg)" },
  ], D);
  // Two bursts: at peak (top) and at the fist-down moment (sides)
  spawnSparkles(svgRoot, { count: 6, angleStart: -Math.PI * 0.75, angleEnd: -Math.PI * 0.25, distMin: 100, distRange: 30, delay: 250 });
  spawnSparkles(svgRoot, { count: 4, angleStart: -Math.PI, angleEnd: -Math.PI * 0.85, distMin: 80, distRange: 30, delay: 350, sizeScale: 0.85 });
  spawnSparkles(svgRoot, { count: 4, angleStart: -Math.PI * 0.15, angleEnd: 0, distMin: 80, distRange: 30, delay: 350, sizeScale: 0.85 });
}

// 8. SHIMMY TWIST — body twists back and forth, appendages opposite
function cShimmyTwist(svgRoot) {
  const D = 850;
  svgRoot.animate(
    [
      { transform: "rotate(0deg) translateY(0)" },
      { transform: "rotate(25deg) translateY(-6px)", offset: 0.2 },
      { transform: "rotate(-25deg) translateY(-6px)", offset: 0.4 },
      { transform: "rotate(25deg) translateY(-6px)", offset: 0.6 },
      { transform: "rotate(-18deg) translateY(-3px)", offset: 0.8 },
      { transform: "rotate(0deg) translateY(0)" },
    ],
    { duration: D, easing: "ease-in-out" }
  );
  // Appendages counter-rotate
  flapLefts(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(-20deg)", offset: 0.2 },
    { transform: "rotate(30deg)", offset: 0.4 },
    { transform: "rotate(-20deg)", offset: 0.6 },
    { transform: "rotate(15deg)", offset: 0.8 },
    { transform: "rotate(0deg)" },
  ], D);
  flapRights(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(20deg)", offset: 0.2 },
    { transform: "rotate(-30deg)", offset: 0.4 },
    { transform: "rotate(20deg)", offset: 0.6 },
    { transform: "rotate(-15deg)", offset: 0.8 },
    { transform: "rotate(0deg)" },
  ], D);
  // Alternating left/right bursts following the twist
  spawnSparkles(svgRoot, { count: 4, angleStart: -Math.PI * 0.95, angleEnd: -Math.PI * 0.7, distMin: 100, distRange: 25, delay: 150 });
  spawnSparkles(svgRoot, { count: 4, angleStart: -Math.PI * 0.3, angleEnd: -Math.PI * 0.05, distMin: 100, distRange: 25, delay: 320 });
  spawnSparkles(svgRoot, { count: 4, angleStart: -Math.PI * 0.95, angleEnd: -Math.PI * 0.7, distMin: 100, distRange: 25, delay: 500 });
}

// 9. STAR POSE — jump up, arms stretch wide, hold, big ring sparkle around mascot
function cStarPose(svgRoot) {
  const D = 850;
  svgRoot.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(8px) scale(1.1, 0.82)", offset: 0.15 },
      { transform: "translateY(-40px) scale(1, 1.08)", offset: 0.4 },
      { transform: "translateY(-40px) scale(1, 1.08)", offset: 0.7 },
      { transform: "translateY(0) scale(1.1, 0.9)", offset: 0.9 },
      { transform: "translateY(0) scale(1)" },
    ],
    { duration: D, easing: "cubic-bezier(0.4, 0, 0.4, 1)" }
  );
  // Arms stretch WIDE and hold
  flapLefts(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(80deg)", offset: 0.4 },
    { transform: "rotate(75deg)", offset: 0.7 },
    { transform: "rotate(0deg)" },
  ], D);
  flapRights(svgRoot, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(-80deg)", offset: 0.4 },
    { transform: "rotate(-75deg)", offset: 0.7 },
    { transform: "rotate(0deg)" },
  ], D);
  // Big ring around mascot, fired at the peak
  spawnSparkles(svgRoot, {
    count: 14, angleStart: -Math.PI, angleEnd: Math.PI,
    distMin: 130, distRange: 30, gravity: 25,
    delay: 320, duration: 800, sizeScale: 1.1,
  });
}

// 10. POGO BOUNCE — huge stretch up, hard pancake landing, big sparkle puff
function cPogoBounce(svgRoot) {
  const D = 850;
  svgRoot.animate(
    [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(2px) scale(1.1, 0.85)", offset: 0.08 },
      { transform: "translateY(-70px) scale(0.85, 1.4)", offset: 0.3 },
      { transform: "translateY(-40px) scale(1, 1.1)", offset: 0.45 },
      { transform: "translateY(0) scale(1.3, 0.55)", offset: 0.6 },
      { transform: "translateY(-15px) scale(1, 1.1)", offset: 0.78 },
      { transform: "translateY(0) scale(1.06, 0.94)", offset: 0.92 },
      { transform: "translateY(0) scale(1)" },
    ],
    { duration: D, easing: "cubic-bezier(0.5, 0, 0.5, 1)" }
  );
  // BIG sparkle puff at the pancake moment
  spawnSparkles(svgRoot, {
    count: 16, angleStart: -Math.PI, angleEnd: 0,
    distMin: 130, distRange: 50, gravity: 30,
    delay: 480, duration: 900, sizeScale: 1.15,
  });
  // Small upward puff at the launch
  spawnSparkles(svgRoot, {
    count: 5, angleStart: -Math.PI * 0.7, angleEnd: -Math.PI * 0.3,
    distMin: 70, distRange: 20, gravity: 60,
    delay: 80, duration: 600, sizeScale: 0.7,
  });
}

const CELEBRATIONS = [
  cBigJump, cSpin360, cWiggleDance, cBackflip, cTripleBounce,
  cYesNod, cFistPump, cShimmyTwist, cStarPose, cPogoBounce,
];

let lastCelebrationIdx = -1;

// Public entry — picks one celebration at random, never the same as last time.
export function mascotCheer(svgRoot) {
  if (!svgRoot || CELEBRATIONS.length === 0) return;
  let i;
  if (CELEBRATIONS.length === 1) {
    i = 0;
  } else {
    do { i = Math.floor(Math.random() * CELEBRATIONS.length); }
    while (i === lastCelebrationIdx);
  }
  lastCelebrationIdx = i;
  CELEBRATIONS[i](svgRoot);
}

// ===== TASK 17: Carry Chip Animation =====

export function flyCarry(carrySlotEl, fromEl) {
  return new Promise((resolve) => {
    const chip = document.createElement("div");
    chip.className = "carry-chip";
    chip.textContent = "1";
    document.body.appendChild(chip);

    const start = fromEl.getBoundingClientRect();
    const end = carrySlotEl.getBoundingClientRect();
    const startX = start.left + start.width / 2;
    const startY = start.top + start.height / 2;
    const endX = end.left + end.width / 2;
    const endY = end.top + end.height / 2;
    const apexX = (startX + endX) / 2;
    const apexY = Math.min(startY, endY) - 80;

    chip.style.left = `${startX - 30}px`;
    chip.style.top = `${startY - 30}px`;
    chip.style.transform = "scale(0)";

    sfx.carryWhoosh();
    requestAnimationFrame(() => {
      chip.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }],
        { duration: 200, easing: "cubic-bezier(0.34,1.6,0.5,1)", fill: "forwards" });
      setTimeout(() => {
        chip.animate(
          [
            { left: `${startX - 30}px`, top: `${startY - 30}px`, transform: "scale(1) rotate(0)" },
            { left: `${apexX - 30}px`,  top: `${apexY - 30}px`,  transform: "scale(1.05) rotate(6deg)", offset: 0.5 },
            { left: `${endX - 30}px`,   top: `${endY - 30}px`,   transform: "scale(1) rotate(0)" },
          ],
          { duration: 500, easing: "cubic-bezier(0.4,0,0.6,1)", fill: "forwards" }
        ).onfinish = () => {
          chip.animate([{ transform: "scale(1.1)" }, { transform: "scale(1)" }],
            { duration: 200, easing: "cubic-bezier(0.25,0.9,0.3,1.4)", fill: "forwards" });
          carrySlotEl.textContent = "1";
          carrySlotEl.classList.add("filled");
          setTimeout(() => { chip.remove(); resolve(); }, 220);
        };
      }, 200);
    });
  });
}

// ===== TASK 18: Borrow Animation (descent with strikethrough and chip drop) =====

export function animateBorrow({ tensTopEl, onesTopEl, newTensDigit, newOnesValue }) {
  return new Promise((resolve) => {
    sfx.borrowWhoosh();

    // Phase A (0 - 1800ms): the strike line is DRAWN across the original tens
    // digit while the smaller new tens digit is WRITTEN IN above it — both at
    // exactly the same pace, with a gentle smooth ease that feels like a
    // teacher's pen, not a bouncy pop. They progress together so the kid
    // perceives them as one related action.
    const PHASE_A_MS = 1800;
    const SMOOTH = "cubic-bezier(0.45, 0.05, 0.25, 1)";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const strike = document.createElement("div");
    strike.className = "strike";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 120");
    svg.setAttribute("preserveAspectRatio", "none");
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", "14");
    line.setAttribute("y1", "100");
    line.setAttribute("x2", "86");
    line.setAttribute("y2", "20");
    line.setAttribute("stroke", "#FF7A40");
    line.setAttribute("stroke-width", "7");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);
    strike.appendChild(svg);
    tensTopEl.appendChild(strike);

    const newTens = document.createElement("div");
    newTens.className = "borrow-replacement";
    newTens.textContent = String(newTensDigit);
    tensTopEl.parentElement.appendChild(newTens);

    // Position the new-tens digit at upper-LEFT of the struck digit — same
    // offsets used for the carry "1" above the ones cell, so the two small
    // annotations sit in matching positions relative to their respective
    // cell digits.
    newTens.style.left = `${tensTopEl.offsetLeft - 20}px`;
    newTens.style.top  = `${tensTopEl.offsetTop - 25}px`;
    // Gentle fade + grow — no overshoot, matching the strike's pace.
    newTens.animate(
      [{ opacity: 0, transform: "scale(0.4)" },
       { opacity: 1, transform: "scale(1)" }],
      { duration: PHASE_A_MS, easing: SMOOTH, fill: "forwards" }
    );

    // Phase B (2300 - 4000ms): brief held pause, then the "10" chip fades
    // in at the tens column and drifts smoothly to a position just ABOVE
    // the ones cell. (Going ABOVE the cell, not left of it, avoids the
    // tens cell that already sits to the left of the ones cell.)
    setTimeout(() => {
      const chip = document.createElement("div");
      chip.className = "borrow-chip";
      chip.textContent = "10";
      document.body.appendChild(chip);

      const tens = tensTopEl.getBoundingClientRect();
      const ones = onesTopEl.getBoundingClientRect();
      const sx = tens.left + tens.width/2;
      const sy = tens.top + tens.height/2;
      // Chip's final CENTER: horizontally aligned with the ones cell.
      // Position the chip so that the chip + plus + cell-digit read as one
      // tight vertical equation with uniform ~8px gaps between each piece.
      // Cell line-height is 120px so the digit's visible top sits ~26px below
      // the cell border; placing plus center at the cell top edge puts the
      // "+" just above where the digit appears.
      const ex = ones.left + ones.width / 2;
      const ey = ones.top - 56;
      chip.style.left = `${sx - 30}px`;
      chip.style.top  = `${sy - 30}px`;

      chip.animate(
        [
          { left: `${sx - 30}px`, top: `${sy - 30}px`, transform: "scale(0.7)", opacity: 0 },
          { left: `${sx - 30}px`, top: `${sy - 30}px`, transform: "scale(1)", opacity: 1, offset: 0.18 },
          { left: `${(sx+ex)/2 - 30}px`, top: `${(sy+ey)/2 - 30}px`, transform: "scale(1.1)", opacity: 1, offset: 0.6 },
          { left: `${ex - 30}px`, top: `${ey - 30}px`, transform: "scale(1)", opacity: 1 },
        ],
        { duration: 1700, easing: SMOOTH, fill: "forwards" }
      ).onfinish = () => {
        // Phase C — explicit "10 + 4 = 14" reveal.
        // A "+" sign fades in between the chip and the ones digit (between
        // chip's bottom and the cell's top — vertically stacked equation).
        const plus = document.createElement("div");
        plus.className = "borrow-plus";
        plus.textContent = "+";
        document.body.appendChild(plus);
        plus.style.left = `${ex - 18}px`;
        plus.style.top  = `${ones.top - 18}px`;
        plus.animate(
          [{ opacity: 0, transform: "scale(0.4)" },
           { opacity: 1, transform: "scale(1)" }],
          { duration: 500, easing: SMOOTH, fill: "forwards" }
        );

        // Hold the equation so the child can read it: "10" (chip) + "4" (cell)
        setTimeout(() => {
          // The "+" and the "10" chip fade out together. The original ones
          // digit (e.g. "3") STAYS in its cell unchanged — we add a small
          // pencil-style "1" carry mark in the upper-LEFT of the ones cell,
          // at the same size as the new-tens digit above the struck "3", so
          // the kid reads the regrouped number as "1" + "3" = "13", which
          // is exactly how teachers write it on paper.
          plus.animate(
            [{ opacity: 1, transform: "scale(1)" },
             { opacity: 0, transform: "scale(0.5)" }],
            { duration: 500, easing: SMOOTH, fill: "forwards" }
          ).onfinish = () => plus.remove();

          chip.animate(
            [
              { left: `${ex - 30}px`, top: `${ey - 30}px`, transform: "scale(1)", opacity: 1 },
              { left: `${ex - 30}px`, top: `${ey - 30}px`, transform: "scale(0.7)", opacity: 0 },
            ],
            { duration: 600, easing: SMOOTH, fill: "forwards" }
          ).onfinish = () => chip.remove();

          // newOnesValue is e.g. 13 → the tens digit of that (always 1 for
          // borrow) is what we write as the carry mark.
          const carryDigit = Math.floor(newOnesValue / 10);
          const carry = document.createElement("div");
          carry.className = "borrow-replacement borrow-carry";
          carry.textContent = String(carryDigit);
          onesTopEl.parentElement.appendChild(carry);
          // Same size (60px) as the new-tens digit but positioned tighter:
          // the carry sits JUST above-LEFT of the ones digit so the eye
          // reads "1" + "4" together as "14" (the way a kid would mentally
          // combine them). Vertical placement: carry-bottom ~5px above the
          // visible top of the cell digit. Horizontal: carry-glyph centre
          // sits to the left of the cell digit's left edge.
          carry.style.left = `${onesTopEl.offsetLeft - 20}px`;
          carry.style.top  = `${onesTopEl.offsetTop - 25}px`;
          carry.animate(
            [{ opacity: 0, transform: "scale(0.4)" },
             { opacity: 1, transform: "scale(1)" }],
            { duration: 700, easing: SMOOTH, fill: "forwards" }
          ).onfinish = () => {
            // Final settle so the kid sees the regrouped state clearly
            setTimeout(resolve, 500);
          };
        }, 1500); // Equation "10 + 3" held for 1500ms so the kid can read it
      };
    }, 2300);
  });
}

// ===== Daniel: N-column borrow pre-pass =====
// Plays analyzeColumnsSub's ordered regroup steps across the top-operand cells:
// strike the digit that changes and write its new (regrouped) value above it.
// Runs right-to-left and chains through zeros (each 0 → 9). The kid then just
// reads the regrouped numbers and drops the answer digits — they never perform
// the borrow themselves (same contract as Jhanav's sub).
export function animateBorrowChain(sec, steps) {
  return new Promise((resolve) => {
    if (!steps || !steps.length) { resolve(); return; }
    sfx.borrowWhoosh();
    const SVG_NS = "http://www.w3.org/2000/svg";
    let i = 0;
    const playStep = () => {
      if (i >= steps.length) { setTimeout(resolve, 350); return; }
      const s = steps[i++];
      const cell = sec.querySelector(`.col-ws .cell[data-rtl="${s.col}"]`);
      if (cell) {
        // A digit can regroup twice: lent-from by a lower column (6→5), then
        // borrowed-into for itself (5→15). Clear any prior strike + mark first
        // so the column shows only its latest value — never two stacked at once.
        cell.querySelectorAll(".strike, .regroup-mark").forEach((el) => el.remove());

        const strike = document.createElement("div");
        strike.className = "strike";
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 100 120");
        svg.setAttribute("preserveAspectRatio", "none");
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", "16"); line.setAttribute("y1", "98");
        line.setAttribute("x2", "84"); line.setAttribute("y2", "22");
        line.setAttribute("stroke", "#E07B2E");
        line.setAttribute("stroke-width", "7");
        line.setAttribute("stroke-linecap", "round");
        svg.appendChild(line);
        strike.appendChild(svg);
        cell.appendChild(strike);

        const mark = document.createElement("div");
        mark.className = "regroup-mark";
        mark.textContent = String(s.to);
        cell.appendChild(mark);
        mark.animate(
          [{ opacity: 0, transform: "translateX(-50%) scale(0.4)" },
           { opacity: 1, transform: "translateX(-50%) scale(1)" }],
          { duration: 450, easing: "cubic-bezier(0.45,0.05,0.25,1)", fill: "forwards" }
        );
      }
      setTimeout(playStep, 560);
    };
    playStep();
  });
}

// ===== TASK 19: Block Tap-Count Badge + Fly-In Animation =====

export function tapBlock(blockEl, count) {
  blockEl.classList.remove("untapped");
  blockEl.classList.add("tapped");
  let badge = blockEl.querySelector(".count-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "count-badge";
    blockEl.appendChild(badge);
  }
  badge.textContent = String(count);
  requestAnimationFrame(() => badge.classList.add("show"));
  sfx.blockTap(count);
}

export function blockFlyIn(blocks) {
  blocks.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = `translate(${(Math.random()-0.5)*120}px, -200px) rotate(${(Math.random()-0.5)*40}deg)`;
    setTimeout(() => {
      el.animate(
        [
          { opacity: 0, transform: el.style.transform },
          { opacity: 1, transform: "translate(0,0) rotate(0)" },
        ],
        { duration: 600, easing: "cubic-bezier(0.34,1.6,0.5,1)", fill: "forwards" }
      ).onfinish = () => { el.classList.add("idle-wobble"); el.style.opacity = ""; el.style.transform = ""; };
    }, i * 40);
  });
}

// ===== TASK 20: Star Reveal with Escalating Ding =====

export function revealStars(starEls, earnedCount) {
  const delays = [400, 1100, 1900];
  const overshoots = [1.3, 1.5, 1.7];
  return new Promise((resolve) => {
    starEls.forEach((el, i) => {
      if (i >= earnedCount) {
        el.classList.add("empty");
        return;
      }
      setTimeout(() => {
        el.classList.remove("empty");
        el.classList.add("earned");
        sfx.starDing(i + 1);
        el.animate(
          [
            { transform: "translateY(-80px) scale(0)", opacity: 0 },
            { transform: `translateY(0) scale(${overshoots[i]})`, opacity: 1, offset: 0.6 },
            { transform: "translateY(0) scale(1)", opacity: 1 },
          ],
          { duration: 500 + i * 100, easing: "cubic-bezier(0.34,1.6,0.5,1)", fill: "forwards" }
        );
        if (i === earnedCount - 1) {
          setTimeout(resolve, 500 + i * 100 + 200);
        }
      }, delays[i]);
    });
    if (earnedCount === 0) setTimeout(resolve, 600);
  });
}

// ===== TASK 21: Mascot Idle (breathing, blinking) and Celebrate (jump & wings) =====

export function mascotIdle(svgRoot) {
  svgRoot.classList.add("idle");
  svgRoot.classList.remove("celebrate");
}

export function mascotCelebrate(svgRoot) {
  svgRoot.classList.remove("idle");
  svgRoot.classList.add("celebrate");
  setTimeout(() => mascotIdle(svgRoot), 2400);
}

// ===== TASK 22: Confetti Particle Burst (80 particles, 4 shapes, 6 colors) =====

const CONFETTI_COLORS = ["#FFC83A", "#FF7A40", "#4AAE3F", "#3DC5C5", "#E03E3E", "#FFB933"];
const CONFETTI_KINDS = ["rect", "tear", "circle", "zig"];

export function burstConfetti(container, count = 80) {
  for (let i = 0; i < count; i++) {
    const wrap = document.createElement("div");
    wrap.className = "confetti-particle";
    const kind = CONFETTI_KINDS[i % 4];
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    wrap.insertAdjacentHTML("beforeend", confettiShape(kind, color));
    const startX = container.clientWidth / 2 + (Math.random() - 0.5) * 200;
    const endX = startX + (Math.random() - 0.5) * 800;
    const endY = container.clientHeight + 100;
    wrap.style.left = `${startX}px`;
    wrap.style.top = "0px";
    wrap.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(wrap);
    wrap.animate(
      [
        { transform: `translate(0,0) rotate(0deg)` },
        { transform: `translate(${endX - startX}px, ${endY}px) rotate(${720 + Math.random()*720}deg)` },
      ],
      { duration: 2500 + Math.random()*500, easing: "cubic-bezier(0.4,0,0.6,1)", fill: "forwards" }
    ).onfinish = () => wrap.remove();
  }
}

// ===== TASK 23: Node Unlock with Padlock Break Animation =====

export function unlockNode(nodeEl) {
  return new Promise((resolve) => {
    nodeEl.classList.add("unlocking");
    sfx.nodeUnlockPop();
    setTimeout(() => {
      const padlock = nodeEl.querySelector(".padlock");
      if (padlock) {
        padlock.animate(
          [
            { transform: "rotate(0) translateY(0)", opacity: 1 },
            { transform: "rotate(40deg) translateY(80px)", opacity: 0 },
          ],
          { duration: 500, easing: "ease-in", fill: "forwards" }
        ).onfinish = () => padlock.remove();
      }
      sfx.starDing(1);
    }, 400);
    setTimeout(() => {
      nodeEl.classList.remove("locked", "unlocking");
      nodeEl.classList.add("unlocked");
      resolve();
    }, 1400);
  });
}
