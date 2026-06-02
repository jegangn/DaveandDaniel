// Daniel · OP: STOCKPILE — N-digit column addition.
// Kid places the result digit of each column right-to-left; a "1" auto-flies to
// the carry cell above the next column wherever a column sums >= 10 (exactly
// like Jhanav's add, generalised to N columns). Reuses the engine's drag /
// snap / flyCarry infra — all of which hit-test live rects, so the new grid
// layout needs no changes there.
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn, flyCarry } from "../animate.js";
import { isComplete } from "../logic.js";
import {
  getProblemsDaniel, mulberry32, analyzeColumnsAdd, createAnswerStateN, dropDigit,
} from "../logic-daniel.js";
import { sfx } from "../audio.js";
import { home, handler } from "../svg.js";
import { layoutColMath } from "../layout.js";

export function mount(stage, ctx, router) {
  const { world, level } = ctx;
  stage.dataset.world = world;
  const problems = getProblemsDaniel(world, level, mulberry32((Date.now() ^ (level * 2654435761)) >>> 0));
  let idx = 0;
  let totalWrong = 0;
  let activeState = null;
  let dragMgr = null;
  let trayWrong = 0;

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-col-add";
  sec.innerHTML = `
    <div class="topbar">
      <button class="home-btn small"></button>
      <div class="progress-dots"></div>
      <div class="star-meter run"></div>
    </div>
    <div class="col-ws"></div>
    <div class="digit-tray"></div>
    <div class="corner-mascot"></div>
  `;
  sec.querySelector(".home-btn").insertAdjacentHTML("beforeend", home());
  sec.querySelector(".home-btn").addEventListener("pointerup", () => router.go("map"));
  sec.querySelector(".corner-mascot").insertAdjacentHTML("beforeend", handler("idle"));

  const relayout = () => layoutColMath(stage, sec);

  renderProgressDots();
  renderTray();
  renderProblem();
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

  // Right-align a digit array into N columns (leading columns blank).
  function padLeft(digits, n) {
    const out = new Array(n).fill("");
    for (let i = 0; i < digits.length; i++) out[n - digits.length + i] = digits[i];
    return out;
  }

  function renderProblem() {
    trayWrong = 0;
    const p = problems[idx];
    const a = analyzeColumnsAdd(p.a, p.b);
    activeState = createAnswerStateN(p.answer);
    const N = a.width;
    const aTop = padLeft(a.aDigits, N);
    const bBot = padLeft(a.bDigits, N);

    const ws = sec.querySelector(".col-ws");
    ws.style.gridTemplateColumns = `52px repeat(${N}, var(--col-w))`;
    let carry = "", top = "", bot = "", ans = "";
    for (let c = 0; c < N; c++) {
      carry += `<div class="carry-cell" data-col="${c}"></div>`;
      top += `<div class="cell">${aTop[c]}</div>`;
      bot += `<div class="cell">${bBot[c]}</div>`;
      ans += `<div class="slot ${c === N - 1 ? "active" : "inactive"}" data-index="${c}"></div>`;
    }
    ws.innerHTML = `
      <div class="ws-op"></div>${carry}
      <div class="ws-op"></div>${top}
      <div class="ws-op op">+</div>${bot}
      <div class="ws-line"></div>
      <div class="ws-op"></div>${ans}
    `;
    sec.dataset.problem = `${p.a}+${p.b}`;
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
        const next = dropDigit(activeState, payload.digit, targetIndex);
        if (!next.lastDropCorrect) {
          totalWrong++; activeState = next; trayWrong++;
          await tileBounceBack(sourceEl, origin, parentInfo);
          target.el.classList.add("flash-no");
          setTimeout(() => target.el.classList.remove("flash-no"), 200);
          if (trayWrong >= 2) applyHint();
          return;
        }
        const filledIndex = targetIndex;
        activeState = next;
        await tileSnapIn(sourceEl, target.el);

        // Auto-carry: column sum >= 10 → fly a "1" to the carry cell above the
        // next column to the left.
        const a = analyzeColumnsAdd(problems[idx].a, problems[idx].b);
        const ci = (a.width - 1) - filledIndex; // RTL column index
        if (a.carryOut[ci] && filledIndex - 1 >= 0) {
          const carryCell = sec.querySelector(`.carry-cell[data-col="${filledIndex - 1}"]`);
          if (carryCell) await flyCarry(carryCell, target.el);
        }

        if (!isComplete(activeState)) {
          updateActiveSlots();
          trayWrong = 0;
          renderTray();
          setupDrag();
          attachTileListeners();
        } else {
          sfx.correctYay();
          await advanceProblem();
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
      renderProblem();
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
