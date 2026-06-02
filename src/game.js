import { loadProgress } from "./progress.js";
import { PROFILES, worldOf, worldIdsOf } from "./profiles.js";
import * as picker from "./screens/picker.js";
import * as splash from "./screens/splash.js";
import * as map from "./screens/map.js";
import * as add from "./screens/add.js";
import * as sub from "./screens/sub.js";
import * as multTap from "./screens/mult-tap.js";
import * as multDrag from "./screens/mult-drag.js";
import * as complete from "./screens/complete.js";
import * as settings from "./screens/settings.js";
import * as colAdd from "./screens/col-add.js";
import * as colSub from "./screens/col-sub.js";
import * as longMult from "./screens/long-mult.js";
import * as shortDiv from "./screens/short-div.js";

const stage = document.getElementById("stage");
const viewport = document.getElementById("viewport");

// Logical canvas dimensions per orientation.
// Landscape stays fixed at 1280×800 (tablet target). Portrait fixes WIDTH at
// 720 and stretches HEIGHT to match the phone's aspect ratio — that way the
// stage fills the entire phone viewport with no letterbox bars on any device.
const LANDSCAPE = { w: 1280, h: 800 };
const PORTRAIT_W = 720;
// Aspect threshold: viewports wider than this (w/h > 1.2) use landscape.
const PORTRAIT_ASPECT_THRESHOLD = 1.2;

let lastOrient = null;

function fitStage() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  // A 0-sized viewport (can happen for one frame at load) would compute
  // scale(0) and blank the whole game until the next resize. Skip until the
  // viewport has real dimensions.
  if (!vw || !vh) return;
  const isPortrait = (vw / vh) < PORTRAIT_ASPECT_THRESHOLD;
  const nextOrient = isPortrait ? "portrait" : "landscape";
  stage.dataset.orient = nextOrient;

  let scale;
  if (isPortrait) {
    scale = vw / PORTRAIT_W;
    const logicalH = vh / scale;
    stage.style.width = `${PORTRAIT_W}px`;
    stage.style.height = `${logicalH}px`;
    stage.style.setProperty("--stage-h", `${logicalH}px`);
  } else {
    scale = Math.min(vw / LANDSCAPE.w, vh / LANDSCAPE.h);
    stage.style.width = `${LANDSCAPE.w}px`;
    stage.style.height = `${LANDSCAPE.h}px`;
    stage.style.setProperty("--stage-h", `${LANDSCAPE.h}px`);
  }
  stage.style.transform = `scale(${scale})`;

  // Re-render active screen when orientation flips so JS-positioned elements recompute.
  if (lastOrient !== null && lastOrient !== nextOrient && router.lastRoute) {
    router.go(router.lastRoute.name, router.lastRoute.ctx, { fromPop: true });
  }
  lastOrient = nextOrient;

  if (typeof window.__activeRelayout === "function") window.__activeRelayout();
}

// Screen modules dispatched by the router. Daniel's four screens
// (col-add / col-sub / long-mult / short-div) are registered in Phase 4.
const SCREENS = {
  add, sub, "mult-tap": multTap, "mult-drag": multDrag,
  "col-add": colAdd, "col-sub": colSub, "long-mult": longMult, "short-div": shortDiv,
};

const state = { profile: "dave", progress: {} };
function activeProfile() { return PROFILES[state.profile]; }
function reloadProgress() {
  const p = activeProfile();
  state.progress = loadProgress(p.prefix, worldIdsOf(p), p.levelsPerWorld);
}

// Friendly placeholder for a profile world whose screen module isn't built yet
// (Daniel's worlds before Phase 4) — never crash on a tapped node.
function mountComingSoon(stageEl, ctx, router) {
  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-coming-soon";
  sec.innerHTML = `
    <div class="coming-soon">
      <h2 class="display">MISSION COMING SOON</h2>
      <button class="btn ghost" data-act="map">◀ BACK</button>
    </div>`;
  sec.querySelector('[data-act="map"]').addEventListener("pointerup", () => router.go("map"));
  stageEl.appendChild(sec);
  return () => sec.remove();
}

const router = {
  current: null,
  lastRoute: null,
  setProfile(id) {
    if (!PROFILES[id]) return;
    state.profile = id;
    stage.dataset.profile = id;
    reloadProgress();
  },
  go(name, ctx = {}, opts = {}) {
    if (ctx.profile && ctx.profile !== state.profile) this.setProfile(ctx.profile);
    if (this.current) this.current();
    this.lastRoute = { name, ctx };
    if (name !== "picker") stage.dataset.profile = state.profile;

    let unmount;
    switch (name) {
      case "picker":
        unmount = picker.mount(stage, state, this);
        break;
      case "splash":
        unmount = splash.mount(stage, state, this);
        break;
      case "map":
        reloadProgress();
        unmount = map.mount(stage, state, this);
        break;
      case "level": {
        const prof = activeProfile();
        const w = worldOf(prof, ctx.world);
        let key = w ? w.screen : null;
        if (key === "mult") key = ctx.level <= 3 ? "mult-tap" : "mult-drag";
        const mod = key && SCREENS[key];
        unmount = mod
          ? mod.mount(stage, { ...ctx, profile: state.profile }, this)
          : mountComingSoon(stage, ctx, this);
        break;
      }
      case "complete":
        unmount = complete.mount(stage, { ...ctx, profile: state.profile }, this);
        break;
      case "settings":
        unmount = settings.mount(stage, state, this);
        break;
      default:
        console.warn("Unknown route:", name);
    }
    this.current = unmount;

    // Mirror navigation into browser history so the device/browser Back button
    // walks back THROUGH the game instead of leaving the site. Store the active
    // profile so Back restores the right boy.
    if (!opts.fromPop) {
      const entry = { mathRoute: { name, ctx: { ...ctx, profile: state.profile } } };
      try {
        if (opts.replace) history.replaceState(entry, "");
        else history.pushState(entry, "");
      } catch (_) { /* history unavailable — navigation still works */ }
    }
  },
};

window.addEventListener("popstate", (e) => {
  const r = e.state && e.state.mathRoute;
  if (r && r.name) {
    router.go(r.name, r.ctx || {}, { fromPop: true });
  } else {
    // Backed out past the first screen — keep the user on the picker instead of
    // letting Back fall through to a different page.
    router.go("picker", {}, { fromPop: true });
  }
});

window.addEventListener("resize", fitStage);
window.addEventListener("orientationchange", fitStage);
fitStage();

// Initial route. Query params allow deep-links / test entry:
//   ?profile=daniel                    → that boy's splash
//   ?profile=daniel&world=nadd&level=1 → straight into a level
// Default (no params) → the Who's-playing picker.
const params = new URLSearchParams(location.search);
const qpProfile = params.get("profile");
const qpWorld = params.get("world");
const qpLevel = params.get("level");
if (qpProfile && PROFILES[qpProfile]) {
  router.setProfile(qpProfile);
  if (qpWorld && qpLevel) router.go("level", { world: qpWorld, level: parseInt(qpLevel, 10) }, { replace: true });
  else router.go("splash", {}, { replace: true });
} else {
  router.go("picker", {}, { replace: true });
}

window.__router = router;
window.__setProfile = (id) => router.setProfile(id);
