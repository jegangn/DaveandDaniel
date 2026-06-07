// Daniel · OP: OVERRIDE + CARRYOVER — long multiplication, up to 2-digit × 2-digit,
// with child-filled carries on every row. Phases: partial 0 → partial 1 (shifted)
// → sum. Within each phase the child fills an ordered sequence of result digits AND
// the carries between them (right-to-left, paper method); the drag engine only
// accepts the single `active` box, so each carry must be filled before the next
// digit. ×1-digit missions have a single partial that IS the product.
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn } from "../animate.js";
import { getProblemsDaniel, mulberry32, analyzeLongMult, placeDigits } from "../logic-daniel.js";
import { sfx } from "../audio.js";
import { home, handler } from "../svg.js";
import { layoutColMath } from "../layout.js";

const pick = (src) => ({ cells: src.cells, carries: src.carries, steps: src.steps });

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
  let phases = [];       // [{ key, opSym, cells, carries, steps }]
  let phaseIdx = 0;
  let seqIdx = 0;        // index into the current phase's step sequence
  const lockedPhases = new Set();

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
    N = info.N;
    phases = info.needsSum
      ? [
          { key: "p0", opSym: " ", ...pick(info.partials[0]) },
          { key: "p1", opSym: "+", ...pick(info.partials[1]) },
          { key: "sum", opSym: " ", ...pick(info.sum) },
        ]
      : [{ key: "p0", opSym: " ", ...pick(info.partials[0]) }];
    phaseIdx = 0;
    seqIdx = 0;
    lockedPhases.clear();
    sec.dataset.problem = `${p.a}×${p.b}`;
    renderWorksheet();
  }

  // "filled" | "active" | "inactive" for a step of the CURRENT phase.
  function stepState(ph, kind, col) {
    let s = -1;
    for (let i = 0; i < ph.steps.length; i++) {
      if (ph.steps[i].kind === kind && ph.steps[i].col === col) { s = i; break; }
    }
    if (s < seqIdx) return "filled";
    if (s === seqIdx) return "active";
    return "inactive";
  }

  function staticRowHTML(opSym, cells) {
    let html = `<div class="ws-op${opSym !== " " ? " op" : ""}">${opSym !== " " ? opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = cells[col];
      html += c ? `<div class="cell">${c.digit}</div>` : `<div class="cell"></div>`;
    }
    return html;
  }

  function carryStripHTML(ph) {
    const isCur = ph.key === phases[phaseIdx].key;
    const locked = lockedPhases.has(ph.key);
    let html = `<div class="ws-op"></div>`;
    for (let col = 0; col < N; col++) {
      const cv = ph.carries[col];
      if (cv == null) { html += `<div class="carry-cell"></div>`; continue; }   // spacer
      if (locked) { html += `<div class="carry-cell fillable filled">${cv}</div>`; continue; }
      if (!isCur) { html += `<div class="carry-cell"></div>`; continue; }        // future: hidden
      const st = stepState(ph, "carry", col);
      const val = st === "filled" ? cv : "";
      html += `<div class="carry-cell fillable ${st}" data-col="${col}" data-phase="${ph.key}">${val}</div>`;
    }
    return html;
  }

  function resultRowHTML(ph) {
    const isCur = ph.key === phases[phaseIdx].key;
    const locked = lockedPhases.has(ph.key);
    let html = `<div class="ws-op${ph.opSym !== " " ? " op" : ""}">${ph.opSym !== " " ? ph.opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = ph.cells[col];
      if (!c) { html += `<div class="cell"></div>`; continue; }
      if (locked) { html += `<div class="cell">${c.digit}</div>`; continue; }
      if (!isCur) { html += `<div class="slot inactive" data-index="${c.di}" data-col="${col}" data-phase="${ph.key}"></div>`; continue; }
      const st = stepState(ph, "result", col);
      const val = st === "filled" ? c.digit : "";
      html += `<div class="slot ${st}" data-index="${c.di}" data-col="${col}" data-phase="${ph.key}">${val}</div>`;
    }
    return html;
  }

  function renderWorksheet() {
    const p = problems[idx];
    const ws = sec.querySelector(".col-ws");
    ws.style.gridTemplateColumns = `44px repeat(${N}, var(--col-w))`;
    const p0 = phases.find((x) => x.key === "p0");
    let html = "";
    html += staticRowHTML(" ", placeDigits(p.a, 0, N));
    html += staticRowHTML("×", placeDigits(p.b, 0, N));
    html += `<div class="ws-line"></div>`;
    html += carryStripHTML(p0);
    html += resultRowHTML(p0);
    if (info.needsSum) {
      const p1 = phases.find((x) => x.key === "p1");
      const sum = phases.find((x) => x.key === "sum");
      html += carryStripHTML(p1);
      html += resultRowHTML(p1);
      html += `<div class="ws-line"></div>`;
      html += carryStripHTML(sum);
      html += resultRowHTML(sum);
    }
    ws.innerHTML = html;
    relayout();
  }

  function setupDrag() {
    dragMgr = createDragManager({
      getTargets() {
        return Array.from(sec.querySelectorAll(".lm-ws .slot, .lm-ws .carry-cell.fillable")).map((el) => ({
          el, rect: el.getBoundingClientRect(),
          active: el.classList.contains("active"),
          kind: el.classList.contains("carry-cell") ? "carry" : "result",
          col: parseInt(el.dataset.col, 10),
        }));
      },
      onPickup(payload, el) { tilePickup(el); },
      async onDrop(payload, target, sourceEl, origin, parentInfo) {
        if (!target) return tileBounceBack(sourceEl, origin, parentInfo);
        const step = phases[phaseIdx].steps[seqIdx];
        const ok = target.kind === step.kind && target.col === step.col && payload.digit === step.value;
        if (!ok) {
          totalWrong++; trayWrong++;
          await tileBounceBack(sourceEl, origin, parentInfo);
          target.el.classList.add("flash-no");
          setTimeout(() => target.el.classList.remove("flash-no"), 200);
          if (trayWrong >= 2) applyHint();
          return;
        }
        await tileSnapIn(sourceEl, target.el);
        seqIdx++;
        if (seqIdx >= phases[phaseIdx].steps.length) {
          lockedPhases.add(phases[phaseIdx].key);
          if (phaseIdx < phases.length - 1) {
            phaseIdx++; seqIdx = 0;
            sfx.slotFill();
            setTimeout(() => { renderWorksheet(); renderTray(); setupDrag(); attachTileListeners(); }, 350);
          } else {
            sfx.correctYay();
            await advanceProblem();
          }
        } else {
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
    const expected = phases[phaseIdx].steps[seqIdx].value;
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
