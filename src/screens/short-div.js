// Daniel · OP: SPLIT — short ("bus-stop") division, single-digit divisor.
// Quotient is entered LEFT-to-RIGHT (one digit above each dividend digit). After
// each digit the carried remainder appears as a small superscript before the
// next dividend digit; the final remainder is revealed as "r N" at the end.
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn } from "../animate.js";
import { isComplete } from "../logic.js";
import {
  getProblemsDaniel, mulberry32, analyzeShortDiv, createAnswerStateN, dropDigitLTR,
} from "../logic-daniel.js";
import { sfx } from "../audio.js";
import { home, handler } from "../svg.js";
import { layoutColMath } from "../layout.js";

export function mount(stage, ctx, router) {
  const { world, level } = ctx;
  stage.dataset.world = world;
  const problems = getProblemsDaniel(world, level, mulberry32((Date.now() ^ (level * 22695477)) >>> 0));
  let idx = 0;
  let totalWrong = 0;
  let dragMgr = null;
  let trayWrong = 0;
  let activeState = null;
  let info = null;
  let N = 0;

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-short-div";
  sec.innerHTML = `
    <div class="topbar">
      <button class="home-btn small"></button>
      <div class="progress-dots"></div>
      <div class="star-meter run"></div>
    </div>
    <div class="col-ws div-ws"></div>
    <div class="digit-tray"></div>
    <div class="corner-mascot"></div>
  `;
  sec.querySelector(".home-btn").insertAdjacentHTML("beforeend", home());
  sec.querySelector(".home-btn").addEventListener("pointerup", () => router.go("map"));
  sec.querySelector(".corner-mascot").insertAdjacentHTML("beforeend", handler("idle"));

  const relayout = () => layoutColMath(stage, sec);

  renderProgressDots();
  renderTray();
  startProblem();
  setupDrag();
  stage.appendChild(sec);
  window.__activeRelayout = relayout;
  relayout();

  function renderProgressDots() {
    const d = sec.querySelector(".progress-dots");
    d.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (i < idx ? " filled" : i === idx ? " current" : "");
      d.appendChild(dot);
    }
  }

  function renderTray() {
    const tray = sec.querySelector(".digit-tray");
    tray.innerHTML = "";
    for (let n = 0; n <= 9; n++) {
      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.digit = String(n);
      t.textContent = String(n);
      tray.appendChild(t);
    }
    relayout();
  }

  function startProblem() {
    const p = problems[idx];
    info = analyzeShortDiv(p.a, p.b);
    N = info.steps.length; // dividend digit count
    activeState = createAnswerStateN(Number(info.quotientDigits.join("")), "ltr");
    sec.dataset.problem = `${p.a}÷${p.b}`;
    renderWorksheet();
  }

  function renderWorksheet() {
    const p = problems[idx];
    const ws = sec.querySelector(".col-ws");
    ws.style.gridTemplateColumns = `64px repeat(${N}, var(--col-w)) 110px`;

    // Quotient row: blank divisor col, N quotient slots, blank remainder col.
    let q = `<div class="ws-op"></div>`;
    for (let c = 0; c < N; c++) {
      const cls = c === activeState.activeIndex ? "slot active" : "slot inactive";
      q += `<div class="${cls}" data-index="${c}"></div>`;
    }
    q += `<div class="cell"></div>`;

    // Dividend row: divisor, bracket + dividend digits (with carry superscripts), remainder.
    let d = `<div class="cell div-divisor">${p.b}</div>`;
    for (let c = 0; c < N; c++) {
      const carryIn = info.steps[c].carryIn;
      const sup = (c > 0 && carryIn > 0) ? `<span class="div-carry" data-col="${c}">${carryIn}</span>` : "";
      d += `<div class="cell div-dividend${c === 0 ? " first" : ""}">${sup}${info.steps[c].digit}</div>`;
    }
    d += `<div class="cell div-rem"></div>`;
    ws.innerHTML = `${q}${d}`;
    relayout();
  }

  function updateActiveSlots() {
    sec.querySelectorAll(".col-ws .slot").forEach((el) => {
      const i = parseInt(el.dataset.index, 10);
      el.classList.remove("active", "inactive");
      if (i === activeState.activeIndex) el.classList.add("active");
      else if (!el.classList.contains("filled")) el.classList.add("inactive");
    });
  }

  function setupDrag() {
    dragMgr = createDragManager({
      getTargets() {
        return Array.from(sec.querySelectorAll(".col-ws .slot")).map((el) => ({
          el, rect: el.getBoundingClientRect(),
          active: el.classList.contains("active"), id: el.dataset.index,
        }));
      },
      onPickup(payload, el) { tilePickup(el); },
      async onDrop(payload, target, sourceEl, origin, parentInfo) {
        if (!target) return tileBounceBack(sourceEl, origin, parentInfo);
        const targetIndex = parseInt(target.id, 10);
        const next = dropDigitLTR(activeState, payload.digit, targetIndex);
        if (!next.lastDropCorrect) {
          totalWrong++; activeState = next; trayWrong++;
          await tileBounceBack(sourceEl, origin, parentInfo);
          target.el.classList.add("flash-no");
          setTimeout(() => target.el.classList.remove("flash-no"), 200);
          if (trayWrong >= 2) applyHint();
          return;
        }
        const placed = targetIndex;
        activeState = next;
        await tileSnapIn(sourceEl, target.el);

        // Reveal the carried remainder before the next dividend digit.
        if (placed + 1 < N) {
          const sup = sec.querySelector(`.div-carry[data-col="${placed + 1}"]`);
          if (sup) {
            sup.classList.add("show");
            sup.animate(
              [{ opacity: 0, transform: "scale(0.4)" }, { opacity: 1, transform: "scale(1)" }],
              { duration: 350, easing: "cubic-bezier(0.34,1.6,0.5,1)", fill: "forwards" }
            );
            sfx.slotFill();
          }
        }

        if (isComplete(activeState)) {
          const rem = sec.querySelector(".div-rem");
          if (rem) {
            rem.textContent = `r ${info.remainder}`;
            rem.classList.add("show");
          }
          sfx.correctYay();
          await advanceProblem();
        } else {
          updateActiveSlots();
          trayWrong = 0;
          renderTray();
          setupDrag();
          attachTileListeners();
        }
      },
    });
    attachTileListeners();
  }

  function attachTileListeners() {
    sec.querySelectorAll(".tile").forEach((tile) => {
      tile.onpointerdown = (e) => dragMgr.start(e, tile, { kind: "digit", digit: parseInt(tile.dataset.digit, 10) });
    });
  }

  function applyHint() {
    const expected = activeState.expected[activeState.activeIndex];
    sec.querySelectorAll(".tile").forEach((tile) => {
      if (parseInt(tile.dataset.digit, 10) === expected) {
        tile.classList.remove("hint-dim"); tile.classList.add("hint-target");
      } else {
        tile.classList.add("hint-dim");
      }
    });
    sfx.hintHmm();
  }

  async function advanceProblem() {
    idx++;
    renderProgressDots();
    if (idx >= problems.length) {
      router.go("complete", { world, level, wrongCount: totalWrong });
      return;
    }
    sfx.transition();
    setTimeout(() => {
      startProblem();
      renderTray();
      setupDrag();
      attachTileListeners();
    }, 500);
  }

  return () => {
    if (window.__activeRelayout === relayout) window.__activeRelayout = null;
    sec.remove();
  };
}
