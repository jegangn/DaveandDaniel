// Daniel · OP: BUILDSUM — long multiplication. The child builds each partial-
// product column as a little sum: product = topDigit×mult, plus the carried
// number, = total; the total's ones digit drops into the partial-answer row and
// its tens digit carries left. The final addition of the two partials is entered
// the old way (result digits + carries, either order). ×1-digit missions have a
// single partial that IS the product.
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn } from "../animate.js";
import { getProblemsDaniel, mulberry32, analyzeLongMult, placeDigits, buildGroups, analyzePartialWork } from "../logic-daniel.js";
import { sfx } from "../audio.js";
import { home, handler } from "../svg.js";
import { layoutColMath } from "../layout.js";

const stepKey = (s) => `${s.kind}:${s.col}`;

export function mount(stage, ctx, router) {
  const { world, level } = ctx;
  stage.dataset.world = world;
  const problems = getProblemsDaniel(world, level, mulberry32((Date.now() ^ (level * 2246822519)) >>> 0));
  let idx = 0, totalWrong = 0, dragMgr = null, trayWrong = 0;

  let info = null, N = 0;
  let phases = [];
  let phaseIdx = 0;
  const lockedPhases = new Set();

  // build-phase (partial) state
  let colIdx = 0;   // index into curPhase().work.cols; === cols.length ⇒ done
  let cur = null;   // active-column working state (see startColumn)
  // groups-phase (sum) state
  let groups = [], groupIdx = 0, filled = new Set();

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

  const relayout = () => { layoutColMath(stage, sec); positionCard(); };
  const curPhase = () => phases[phaseIdx];

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
    const buildPhase = (src, key, opSym) => ({
      key, opSym, mode: "build",
      cells: src.cells,
      work: analyzePartialWork(p.a, src.digit, src.shift, N),
    });
    phases = info.needsSum
      ? [
          buildPhase(info.partials[0], "p0", " "),
          buildPhase(info.partials[1], "p1", "+"),
          { key: "sum", opSym: " ", mode: "groups", cells: info.sum.cells, carries: info.sum.carries, steps: info.sum.steps },
        ]
      : [buildPhase(info.partials[0], "p0", " ")];
    phaseIdx = 0;
    enterPhase();
    lockedPhases.clear();
    sec.dataset.problem = `${p.a}×${p.b}`;
    renderWorksheet();
  }

  function enterPhase() {
    const ph = curPhase();
    if (ph.mode === "build") { colIdx = 0; startColumn(); }
    else { groups = buildGroups(ph.steps); groupIdx = 0; filled = new Set(); }
  }

  function startColumn() {
    const ph = curPhase();
    if (colIdx >= ph.work.cols.length) { cur = null; return; }
    const c = ph.work.cols[colIdx];
    cur = {
      col: c.col, topDigit: c.topDigit, mult: c.mult, carryIn: c.carryIn,
      hasCarry: c.carryIn > 0,
      product: String(c.product), total: String(c.total),
      prod: new Set(), tot: new Set(),  // filled box indices
    };
  }

  // "product" while the product still has empty boxes (carry columns only),
  // otherwise "total".
  function buildStage() {
    if (!cur) return null;
    if (cur.hasCarry && cur.prod.size < cur.product.length) return "product";
    return "total";
  }

  // ----- groups (sum row) cell state -----
  function stepState(kind, col) {
    for (let g = 0; g < groups.length; g++) {
      const s = groups[g].find((x) => x.kind === kind && x.col === col);
      if (!s) continue;
      if (g < groupIdx) return "filled";
      if (g > groupIdx) return "inactive";
      return filled.has(stepKey(s)) ? "filled" : "active";
    }
    return "inactive";
  }

  // ----- rendering -----
  function staticRowHTML(opSym, cells) {
    let html = `<div class="ws-op${opSym !== " " ? " op" : ""}">${opSym !== " " ? opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = cells[col];
      html += c ? `<div class="cell">${c.digit}</div>` : `<div class="cell"></div>`;
    }
    return html;
  }

  // Partial-product answer row (build mode). Columns left of the active one show
  // their digit; the active column is highlighted (its digits are filled via the
  // floating working card, not by dropping here); the rest wait.
  function buildAnswerRowHTML(ph) {
    const isCur = ph.key === curPhase().key;
    const locked = lockedPhases.has(ph.key);
    const done = new Set();
    if (isCur && !locked) {
      for (let k = 0; k < colIdx; k++) done.add(ph.work.cols[k].col);
      if (colIdx >= ph.work.cols.length && ph.work.bringDown) done.add(ph.work.bringDown.col);
    }
    let html = `<div class="ws-op${ph.opSym !== " " ? " op" : ""}">${ph.opSym !== " " ? ph.opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = ph.cells[col];
      if (!c) { html += `<div class="cell"></div>`; continue; }
      if (locked) { html += `<div class="cell">${c.digit}</div>`; continue; }
      if (!isCur) { html += `<div class="slot inactive" data-col="${col}"></div>`; continue; }
      if (done.has(col)) { html += `<div class="slot filled" data-col="${col}">${c.digit}</div>`; continue; }
      if (cur && col === cur.col) { html += `<div class="slot active-col" data-col="${col}"></div>`; continue; }
      html += `<div class="slot inactive" data-col="${col}"></div>`;
    }
    return html;
  }

  function carryStripHTML(ph) {
    const isCur = ph.key === curPhase().key;
    const locked = lockedPhases.has(ph.key);
    let html = `<div class="ws-op"></div>`;
    for (let col = 0; col < N; col++) {
      const cv = ph.carries[col];
      if (cv == null) { html += `<div class="carry-cell"></div>`; continue; }
      if (locked) { html += `<div class="carry-cell fillable filled">${cv}</div>`; continue; }
      if (!isCur) { html += `<div class="carry-cell"></div>`; continue; }
      const st = stepState("carry", col);
      html += `<div class="carry-cell fillable ${st}" data-col="${col}">${st === "filled" ? cv : ""}</div>`;
    }
    return html;
  }

  function sumResultRowHTML(ph) {
    const isCur = ph.key === curPhase().key;
    const locked = lockedPhases.has(ph.key);
    let html = `<div class="ws-op${ph.opSym !== " " ? " op" : ""}">${ph.opSym !== " " ? ph.opSym : ""}</div>`;
    for (let col = 0; col < N; col++) {
      const c = ph.cells[col];
      if (!c) { html += `<div class="cell"></div>`; continue; }
      if (locked) { html += `<div class="cell">${c.digit}</div>`; continue; }
      if (!isCur) { html += `<div class="slot inactive" data-col="${col}"></div>`; continue; }
      const st = stepState("result", col);
      html += `<div class="slot ${st}" data-col="${col}">${st === "filled" ? c.digit : ""}</div>`;
    }
    return html;
  }

  // The floating "build the sum" card for the active partial column. Laid out
  // horizontally ("9×6 = [5][4] + 4 = [5][8]") so it stays short and sits in the
  // reserved gap above the partial row without overlapping the rows above.
  function renderCard() {
    const ws = sec.querySelector(".col-ws");
    ws.querySelectorAll(".lm-work").forEach((el) => el.remove());
    if (curPhase().mode !== "build" || !cur) return;
    const stage = buildStage();
    const boxes = (numStr, kind, set) => `<span class="lw-row">` + numStr.split("").map((d, i) => {
      const f = set.has(i);
      const active = stage === kind && !f;
      return `<span class="lwbox ${f ? "filled" : active ? "active" : ""}" data-kind="${kind}" data-i="${i}">${f ? d : ""}</span>`;
    }).join("") + `</span>`;

    const card = document.createElement("div");
    card.className = "lm-work";
    let h = `<span class="lw-eq">${cur.topDigit}×${cur.mult}</span><span class="lw-eqs">=</span>`;
    if (cur.hasCarry) {
      h += boxes(cur.product, "product", cur.prod)
        + `<span class="lw-add">+${cur.carryIn}</span><span class="lw-eqs">=</span>`
        + boxes(cur.total, "total", cur.tot);
    } else {
      h += boxes(cur.total, "total", cur.tot);
    }
    card.innerHTML = h;
    ws.appendChild(card);
  }

  // Pin the card centred above the active partial-answer box.
  function positionCard() {
    const ws = sec.querySelector(".col-ws");
    const card = ws && ws.querySelector(".lm-work");
    const slot = ws && ws.querySelector(".slot.active-col");
    if (!card || !slot) return;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let left = slot.offsetLeft + slot.offsetWidth / 2 - cw / 2;
    left = Math.max(4, Math.min(left, ws.clientWidth - cw - 4));
    let top = slot.offsetTop - ch - 6;
    if (top < 2) top = 2;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function renderWorksheet() {
    const p = problems[idx];
    const ws = sec.querySelector(".col-ws");
    ws.style.gridTemplateColumns = `44px repeat(${N}, var(--col-w))`;
    // Reserve a gap row above whichever partial row is the active build phase,
    // so the floating working card has clear space and never overlaps the rows
    // above it.
    const gap = (ph) => (curPhase().mode === "build" && ph.key === curPhase().key) ? `<div class="lm-work-gap"></div>` : "";
    let html = "";
    html += staticRowHTML(" ", placeDigits(p.a, 0, N));
    html += staticRowHTML("×", placeDigits(p.b, 0, N));
    html += `<div class="ws-line"></div>`;
    html += gap(phases.find((x) => x.key === "p0")) + buildAnswerRowHTML(phases.find((x) => x.key === "p0"));
    if (info.needsSum) {
      html += gap(phases.find((x) => x.key === "p1")) + buildAnswerRowHTML(phases.find((x) => x.key === "p1"));
      html += `<div class="ws-line"></div>`;
      const sum = phases.find((x) => x.key === "sum");
      html += carryStripHTML(sum);
      html += sumResultRowHTML(sum);
    }
    ws.innerHTML = html;
    renderCard();
    relayout();
  }

  function rerender() { renderWorksheet(); renderTray(); setupDrag(); attachTileListeners(); }

  // ----- drag -----
  function setupDrag() {
    dragMgr = createDragManager({
      getTargets() {
        if (curPhase().mode === "build") {
          return Array.from(sec.querySelectorAll(".lm-work .lwbox.active")).map((el) => ({
            el, rect: el.getBoundingClientRect(), active: true,
            kind: el.dataset.kind, i: parseInt(el.dataset.i, 10),
          }));
        }
        return Array.from(sec.querySelectorAll(".lm-ws .slot, .lm-ws .carry-cell.fillable")).map((el) => ({
          el, rect: el.getBoundingClientRect(),
          active: el.classList.contains("active"),
          kind: el.classList.contains("carry-cell") ? "carry" : "result",
          col: parseInt(el.dataset.col, 10),
        }));
      },
      onPickup(payload, el) { tilePickup(el); },
      async onDrop(payload, target, sourceEl, origin, parentInfo) {
        if (curPhase().mode === "build") return onDropBuild(payload, target, sourceEl, origin, parentInfo);
        return onDropGroups(payload, target, sourceEl, origin, parentInfo);
      },
    });
    attachTileListeners();
  }

  async function onDropBuild(payload, target, sourceEl, origin, parentInfo) {
    if (!target) return tileBounceBack(sourceEl, origin, parentInfo);
    const numStr = target.kind === "product" ? cur.product : cur.total;
    const set = target.kind === "product" ? cur.prod : cur.tot;
    const ok = target.kind === buildStage() && !set.has(target.i) && payload.digit === Number(numStr[target.i]);
    if (!ok) {
      totalWrong++; trayWrong++;
      await tileBounceBack(sourceEl, origin, parentInfo);
      target.el.classList.add("flash-no");
      setTimeout(() => target.el.classList.remove("flash-no"), 200);
      if (trayWrong >= 2) applyHint();
      return;
    }
    await tileSnapIn(sourceEl, target.el);
    set.add(target.i);
    trayWrong = 0;
    if (set.size < numStr.length) { rerender(); return; }       // same number, more boxes
    if (target.kind === "product") { rerender(); return; }      // product done → total stage
    await completeColumn();                                     // total done → column done
  }

  async function completeColumn() {
    const ph = curPhase();
    colIdx++;
    sfx.slotFill();
    if (colIdx < ph.work.cols.length) {
      startColumn();
      setTimeout(rerender, 260);
      return;
    }
    // Last column done — bring down the leading carry (if any) and finish phase.
    cur = null;
    lockedPhases.add(ph.key);
    renderWorksheet();
    if (phaseIdx < phases.length - 1) {
      phaseIdx++;
      enterPhase();
      setTimeout(rerender, 420);
    } else {
      sfx.correctYay();
      await advanceProblem();
    }
  }

  async function onDropGroups(payload, target, sourceEl, origin, parentInfo) {
    if (!target) return tileBounceBack(sourceEl, origin, parentInfo);
    const grp = groups[groupIdx];
    const match = grp.find(
      (s) => !filled.has(stepKey(s)) &&
             target.kind === s.kind && target.col === s.col && payload.digit === s.value
    );
    if (!match) {
      totalWrong++; trayWrong++;
      await tileBounceBack(sourceEl, origin, parentInfo);
      target.el.classList.add("flash-no");
      setTimeout(() => target.el.classList.remove("flash-no"), 200);
      if (trayWrong >= 2) applyHint();
      return;
    }
    await tileSnapIn(sourceEl, target.el);
    filled.add(stepKey(match));
    trayWrong = 0;
    if (!grp.every((s) => filled.has(stepKey(s)))) { rerender(); return; }
    groupIdx++;
    filled = new Set();
    if (groupIdx >= groups.length) {
      lockedPhases.add(curPhase().key);
      sfx.correctYay();
      await advanceProblem();
    } else {
      rerender();
    }
  }

  function attachTileListeners() {
    sec.querySelectorAll(".tile").forEach((tile) => {
      tile.onpointerdown = (e) => dragMgr.start(e, tile, { kind: "digit", digit: parseInt(tile.dataset.digit, 10) });
    });
  }

  function applyHint() {
    const wanted = new Set();
    if (curPhase().mode === "build" && cur) {
      const stage = buildStage();
      const numStr = stage === "product" ? cur.product : cur.total;
      const set = stage === "product" ? cur.prod : cur.tot;
      numStr.split("").forEach((d, i) => { if (!set.has(i)) wanted.add(Number(d)); });
    } else {
      groups[groupIdx].filter((s) => !filled.has(stepKey(s))).forEach((s) => wanted.add(s.value));
    }
    sec.querySelectorAll(".tile").forEach((tile) => {
      if (wanted.has(parseInt(tile.dataset.digit, 10))) {
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
    setTimeout(() => { startProblem(); renderTray(); setupDrag(); attachTileListeners(); }, 500);
  }

  setupDrag();

  return () => {
    if (window.__activeRelayout === relayout) window.__activeRelayout = null;
    sec.remove();
  };
}
