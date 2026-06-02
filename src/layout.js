// ===== Portrait adaptive layout engine =====
//
// Landscape (tablet, 1280×800) is laid out entirely by CSS and is left
// untouched here. Portrait fixes the stage WIDTH at 720 logical px and
// stretches HEIGHT to the phone, so the bug we keep hitting is: a
// bottom-anchored digit tray that grows UPWARD as tiles wrap, colliding with
// whatever sits above it (the answer box / worksheet), and big empty voids on
// tall phones because everything is pinned with hardcoded magic numbers.
//
// This module replaces those magic numbers with a measured, content-aware
// pass that runs after every render and on resize:
//   1. fitTray  — shrink the option tiles just enough that the tray fits a
//                 bounded height (no scroll), tiles stay ≥ ~44px tap targets.
//   2. anchor   — pin the answer box directly above the *measured* tray.
//   3. centerPlay — drop the counting/worksheet area into the leftover band,
//                 centred, scaled down only if it would otherwise overflow.
// Drop-target hit-testing reads live getBoundingClientRect, so moving/scaling
// elements here needs no changes in the drag code.

const TRAY_BOTTOM = 16; // CSS: portrait tray is pinned bottom:16
const BOX_GAP = 20; // gap between the answer box and the tray top
const BAND_PAD = 14; // breathing room around the centred play band
const MAX_W = 112; // biggest option-tile width (logical px)
const MIN_W = 84; // smallest — 84 × 0.444 (iPhone SE scale) ≈ 37px; most phones larger
const RATIO = 0.87; // tile height / width

function isPortrait(stage) {
  return stage.dataset.orient === "portrait";
}

function stageScale(stage) {
  const r = stage.getBoundingClientRect();
  return r.width / (stage.offsetWidth || 720);
}

// Element geometry in stage-LOGICAL pixels (undoes the stage transform).
function logicalRect(stage, el) {
  const s = stageScale(stage) || 1;
  const sr = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    top: (r.top - sr.top) / s,
    bottom: (r.bottom - sr.top) / s,
    height: r.height / s,
  };
}

function maxTrayHeight(H) {
  // Tray never eats more than ~42% of the phone, capped at 420 logical px so
  // it stays a comfortable strip on tall phones too.
  return Math.min(H * 0.42, 420);
}

function setTileSizes(tiles, w) {
  const h = Math.round(w * RATIO);
  for (const t of tiles) {
    t.style.width = `${w}px`;
    t.style.height = `${h}px`;
    // Two-digit (compound) tiles need a smaller glyph to fit the same box.
    const compound = t.classList.contains("compound");
    t.style.fontSize = `${Math.round(w * (compound ? 0.43 : 0.5))}px`;
  }
}

function clearTileSizes(tiles) {
  for (const t of tiles) {
    t.style.width = "";
    t.style.height = "";
    t.style.fontSize = "";
  }
}

// Shrink the tray's option tiles until the tray fits `maxH`. Returns the
// resulting tray height in logical px (so callers can stack above it).
function fitTray(stage, tray, maxH) {
  const tiles = tray.querySelectorAll(".tile");
  if (!tiles.length) return 0;
  tray.style.height = "auto";
  let w = MAX_W;
  for (; w > MIN_W; w -= 2) {
    setTileSizes(tiles, w);
    // Reading offsetHeight forces the sync reflow we need to measure wrap.
    if (tray.offsetHeight <= maxH) break;
  }
  setTileSizes(tiles, w); // w is the first that fit, or MIN_W if none did
  const h = tray.offsetHeight;
  tray.style.height = `${h}px`;
  return h;
}

// Centre `el` vertically inside [bandTop, bandBottom]; scale down (mult only)
// if its natural height would overflow the band.
function centerPlay(stage, el, bandTop, bandBottom, scaleToFit) {
  if (!el) return;
  el.style.position = "absolute";
  el.style.left = "50%";
  el.style.transform = "none";
  el.style.top = "";
  const natH = el.offsetHeight; // measured at scale 1
  const bandH = Math.max(0, bandBottom - bandTop);
  let s = 1;
  if (scaleToFit && natH > bandH && natH > 0) s = bandH / natH;
  const center = (bandTop + bandBottom) / 2;
  el.style.top = `${center}px`;
  el.style.transform = `translate(-50%, -50%) scale(${s})`;
}

function clearInline(el, props) {
  if (!el) return;
  for (const p of props) el.style[p] = "";
}

// The play band must start below BOTH the equation and the (now larger) corner
// mascot, since the mascot sits top-right over the full-width counting area.
function headerBottom(stage, sec) {
  const problem = sec.querySelector(".mult-problem");
  const mascot = sec.querySelector(".corner-mascot");
  return Math.max(
    problem ? logicalRect(stage, problem).bottom : 0,
    mascot ? logicalRect(stage, mascot).bottom : 0
  );
}

// ---- Per-screen orchestrators ------------------------------------------------

export function layoutAddSub(stage, sec) {
  if (!sec || !sec.isConnected) return; // measuring needs the screen in the DOM
  const tray = sec.querySelector(".digit-tray");
  const ws = sec.querySelector(".worksheet");
  if (!isPortrait(stage)) {
    if (tray) {
      clearTileSizes(tray.querySelectorAll(".tile"));
      tray.style.height = "";
    }
    clearInline(ws, ["position", "left", "top", "transform"]);
    return;
  }
  const H = stage.offsetHeight;
  if (H < 400 || !tray || !ws) return;
  const trayH = fitTray(stage, tray, maxTrayHeight(H));
  const bandTop = logicalRect(stage, sec.querySelector(".topbar")).bottom + BAND_PAD;
  const bandBottom = H - TRAY_BOTTOM - trayH - BAND_PAD;
  // Worksheet holds the answer slots, which the carry-slot JS positions in
  // worksheet-local px — so we never SCALE it (only re-centre), keeping that
  // math valid. It fits the band un-scaled on every phone ≥ iPhone SE.
  centerPlay(stage, ws, bandTop, bandBottom, false);
}

export function layoutMultTap(stage, sec) {
  if (!sec || !sec.isConnected) return;
  const tray = sec.querySelector(".digit-tray");
  const reveal = sec.querySelector(".total-reveal");
  const firefly = sec.querySelector(".firefly-area");
  if (!isPortrait(stage)) {
    if (tray) {
      clearTileSizes(tray.querySelectorAll(".tile"));
      tray.style.height = "";
    }
    clearInline(reveal, ["bottom", "top"]);
    clearInline(firefly, ["position", "left", "top", "transform"]);
    return;
  }
  const H = stage.offsetHeight;
  if (H < 400 || !tray) return;
  const trayH = fitTray(stage, tray, maxTrayHeight(H));
  if (reveal && !reveal.classList.contains("hidden")) {
    reveal.style.top = "auto";
    reveal.style.bottom = `${TRAY_BOTTOM + trayH + BOX_GAP}px`;
  }
  const bandTop = headerBottom(stage, sec) + BAND_PAD;
  const boxTop = reveal ? logicalRect(stage, reveal).top : H - TRAY_BOTTOM - trayH;
  centerPlay(stage, firefly, bandTop, boxTop - BAND_PAD, true);
}

export function layoutMultDrag(stage, sec) {
  if (!sec || !sec.isConnected) return;
  const tray = sec.querySelector(".digit-tray");
  const ansHost = sec.querySelector(".ans-host");
  const playCol = sec.querySelector(".play-col");
  if (!isPortrait(stage)) {
    if (tray) {
      clearTileSizes(tray.querySelectorAll(".tile"));
      tray.style.height = "";
    }
    clearInline(ansHost, ["bottom", "top"]);
    clearInline(playCol, ["position", "left", "top", "transform"]);
    return;
  }
  const H = stage.offsetHeight;
  if (H < 400 || !tray) return;
  const trayHidden = tray.classList.contains("hidden");
  const trayH = trayHidden ? 0 : fitTray(stage, tray, maxTrayHeight(H));
  let boxTop = H - TRAY_BOTTOM - trayH;
  if (ansHost && !ansHost.classList.contains("hidden")) {
    ansHost.style.top = "auto";
    ansHost.style.bottom = `${TRAY_BOTTOM + trayH + BOX_GAP}px`;
    boxTop = logicalRect(stage, ansHost).top;
  }
  const bandTop = headerBottom(stage, sec) + BAND_PAD;
  centerPlay(stage, playCol, bandTop, boxTop - BAND_PAD, true);
}

// Daniel's column worksheet (col-add / col-sub). Landscape is pure CSS; portrait
// fits the tray then centres + scales the worksheet in the leftover band. The
// worksheet uses a CSS grid and flyCarry reads live rects, so scaling is safe.
export function layoutColMath(stage, sec) {
  if (!sec || !sec.isConnected) return;
  const tray = sec.querySelector(".digit-tray");
  const ws = sec.querySelector(".col-ws");
  if (!isPortrait(stage)) {
    if (tray) { clearTileSizes(tray.querySelectorAll(".tile")); tray.style.height = ""; }
    clearInline(ws, ["position", "left", "top", "transform"]);
    return;
  }
  const H = stage.offsetHeight;
  if (H < 400 || !tray || !ws) return;
  const trayH = fitTray(stage, tray, maxTrayHeight(H));
  const bandTop = logicalRect(stage, sec.querySelector(".topbar")).bottom + BAND_PAD;
  const bandBottom = H - TRAY_BOTTOM - trayH - BAND_PAD;
  centerPlay(stage, ws, bandTop, bandBottom, true);
}
