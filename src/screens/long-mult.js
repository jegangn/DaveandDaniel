// Daniel · OP: OVERRIDE — long multiplication, up to 2-digit × 2-digit.
// Phases: fill partial product 0 (a × ones of b) → partial 1 (a × tens of b,
// shifted one place) → the sum row (with auto-carry). ×1-digit missions have a
// single partial that IS the product, so they finish after phase 0.
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn, flyCarry } from "../animate.js";
import { isComplete } from "../logic.js";
import {
  getProblemsDaniel, mulberry32, analyzeLongMult, createAnswerStateN, dropDigit,
} from "../logic-daniel.js";
import { sfx } from "../audio.js";
import { home, handler } from "../svg.js";
import { layoutColMath } from "../layout.js";

export function mount(stage, ctx, router) {
  const { world, level } = ctx;
  stage.dataset.world = world;
  const problems = getProblemsDaniel(world, level, mulberry32((Date.now() ^ (level * 2246822519)) >>> 0));
  let idx = 0;
  let totalWrong = 0;
  let dragMgr = null;
  let trayWrong = 0;

  let info = null;       // analyzeLongMult result
  let N = 0;             // grid width
  let phases = [];       // [{ key, value, shift }]
  let phaseIdx = 0;
  let activeState = null;
  const locked = {};     // phaseKey -> entered value (for re-render of past rows)

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-long-mult";
  sec.innerHTML = `
    <div class="topbar">
      <button class="home-btn small"></button>
      <div class="progress-dots"></div>
      <div class="star-meter run"></div>
    </div>
    <div class="col-ws lm-ws"></div>
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
    info = analyzeLongMult(p.a, p.b);
    N = String(info.product).length;
    phases = info.needsSum
      ? [
          { key: "p0", value: info.partials[0].rowDigits, shift: 0 },
          { key: "p1", value: info.partials[1].rowDigits, shift: 1 },
          { key: "sum", value: info.product, shift: 0 },
        ]
      : [{ key: "p0", value: info.product, shift: 0 }];
    phaseIdx = 0;
    for (const k of Object.keys(locked)) delete locked[k];
    activeState = createAnswerStateN(phases[0].value);
    sec.dataset.problem = `${p.a}×${p.b}`;
    renderWorksheet();
  }

  // Place a value's digits across N grid columns, shifted left by `shift`.
  // Returns col -> { digit, di } (di = answer-state index, MSB-first).
  function placeValue(value, shift) {
    const D = String(value).split("").map(Number);
    const cells = new Array(N).fill(null);
    for (let k = 0; k < D.length; k++) {
      const col = (N - 1) - shift - k;
      if (col >= 0) cells[col] = { digit: D[D.length - 1 - k], di: D.length - 1 - k };
    }
    return cells;
  }

  function rowHTML(opSym, cells, mode, st, phaseKey) {
    let html = `<div class="ws-op${opSym && opSym !== " " ? " op" : ""}">${opSym && opSym !== " " ? opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = cells[col];
      if (!c) { html += `<div class="cell"></div>`; continue; }
      if (mode === "static") {
        html += `<div class="cell">${c.digit}</div>`;
      } else {
        const filled = st ? st.slots[c.di] : null;
        const cls = filled != null ? "slot filled"
          : (st && c.di === st.activeIndex) ? "slot active" : "slot inactive";
        html += `<div class="${cls}" data-index="${c.di}" data-phase="${phaseKey}">${filled != null ? filled : ""}</div>`;
      }
    }
    return html;
  }

  function carryRowHTML() {
    let html = `<div class="ws-op"></div>`;
    for (let col = 0; col < N; col++) html += `<div class="carry-cell" data-col="${col}"></div>`;
    return html;
  }

  function phaseRow(ph) {
    // How to render a given phase row: static (locked/done), slots (current), or future (dashed).
    const cur = phases[phaseIdx];
    if (ph.key === cur.key) return rowHTML(ph.opSym, placeValue(ph.value, ph.shift), "slots", activeState, ph.key);
    if (locked[ph.key] != null) return rowHTML(ph.opSym, placeValue(ph.value, ph.shift), "static");
    return rowHTML(ph.opSym, placeValue(ph.value, ph.shift), "slots", null, ph.key); // future: dashed
  }

  function renderWorksheet() {
    const p = problems[idx];
    const ws = sec.querySelector(".col-ws");
    ws.style.gridTemplateColumns = `44px repeat(${N}, var(--col-w))`;
    const aCells = placeValue(p.a, 0);
    const bCells = placeValue(p.b, 0);

    const p0 = { ...phases.find((x) => x.key === "p0"), opSym: " " };
    let html = "";
    html += rowHTML(" ", aCells, "static");
    html += rowHTML("×", bCells, "static");
    html += `<div class="ws-line"></div>`;
    html += phaseRow(p0);

    if (info.needsSum) {
      const p1 = { ...phases.find((x) => x.key === "p1"), opSym: "+" };
      const sum = { ...phases.find((x) => x.key === "sum"), opSym: " " };
      html += phaseRow(p1);
      html += `<div class="ws-line"></div>`;
      html += carryRowHTML();
      html += phaseRow(sum);
    }
    ws.innerHTML = html;
    relayout();
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

        // Sum row carries (adding two partials → carry is 0/1, reuse flyCarry).
        const cur = phases[phaseIdx];
        if (cur.key === "sum" && info.sum) {
          const ci = (N - 1) - filledIndex;
          if (info.sum.carryOut[ci] && filledIndex - 1 >= 0) {
            const carryCell = sec.querySelector(`.carry-cell[data-col="${filledIndex - 1}"]`);
            if (carryCell) await flyCarry(carryCell, target.el);
          }
        }

        if (isComplete(activeState)) {
          locked[cur.key] = cur.value;
          if (phaseIdx < phases.length - 1) {
            phaseIdx++;
            activeState = createAnswerStateN(phases[phaseIdx].value);
            sfx.slotFill();
            setTimeout(() => { renderWorksheet(); renderTray(); setupDrag(); attachTileListeners(); }, 350);
          } else {
            sfx.correctYay();
            await advanceProblem();
          }
        } else {
          // Same phase, next column: just refresh active highlighting + tray.
          renderWorksheet();
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

  setupDrag();

  return () => {
    if (window.__activeRelayout === relayout) window.__activeRelayout = null;
    sec.remove();
  };
}
