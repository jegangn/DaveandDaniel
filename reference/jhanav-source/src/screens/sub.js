import { getProblems, analyze, createAnswerState, dropDigit, isComplete } from "../logic.js";
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn, animateBorrow } from "../animate.js";
import { sfx } from "../audio.js";
import { home, mo } from "../svg.js";
import { layoutAddSub } from "../layout.js";

export function mount(stage, ctx, router) {
  const { world, level } = ctx;
  stage.dataset.world = world;
  const problems = getProblems(world, level);
  let idx = 0;
  let totalWrong = 0;
  let activeState = null;
  let dragMgr = null;
  let trayWrongOnCurrentSlot = 0;

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-sub";

  sec.innerHTML = `
    <div class="topbar">
      <button class="home-btn small"></button>
      <div class="progress-dots"></div>
      <div class="star-meter run"></div>
    </div>
    <div class="worksheet"></div>
    <div class="digit-tray"></div>
    <div class="corner-mascot"></div>
  `;
  sec.querySelector(".home-btn").insertAdjacentHTML("beforeend", home());
  sec.querySelector(".home-btn").addEventListener("pointerup", () => router.go("map"));
  sec.querySelector(".corner-mascot").insertAdjacentHTML("beforeend", mo("idle"));

  const relayout = () => layoutAddSub(stage, sec);

  renderProgressDots();
  renderTray();
  // IMPORTANT: append the section to the stage BEFORE running renderProblem.
  // animateBorrow reads offsetLeft/offsetWidth on the worksheet cells, which
  // both return 0 if the section isn't yet attached to the DOM.
  stage.appendChild(sec);
  window.__activeRelayout = relayout;
  renderProblem().then(() => { setupDrag(); relayout(); });

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

  async function renderProblem() {
    trayWrongOnCurrentSlot = 0;
    const p = problems[idx];
    const a = analyze(p);
    activeState = createAnswerState(p.answer);
    const ws = sec.querySelector(".worksheet");
    ws.innerHTML = `
      <div class="row top">
        <div class="cell ${a.aTens === 0 ? "empty" : ""}">${a.aTens || ""}</div>
        <div class="cell">${a.aOnes}</div>
      </div>
      <div class="row bot">
        <div class="op">${p.op}</div>
        <div class="cell ${a.bTens === 0 ? "empty" : ""}">${a.bTens || ""}</div>
        <div class="cell">${a.bOnes}</div>
      </div>
      <div class="line"></div>
      <div class="row ans">
        ${activeState.slots.length === 2 ? '<div class="slot inactive" data-index="0"></div>' : ""}
        <div class="slot active" data-index="${activeState.slots.length - 1}"></div>
      </div>
    `;
    sec.dataset.problem = `${p.a}${p.op}${p.b}`;

    if (a.borrow) {
      const tensTopEl = ws.querySelector(".row.top .cell:nth-child(1)");
      const onesTopEl = ws.querySelector(".row.top .cell:nth-child(2)");
      await animateBorrow({
        tensTopEl,
        onesTopEl,
        newTensDigit: a.borrowFromTens,
        newOnesValue: a.borrowedOnes,
      });
    }

    syncTrayDim();
    relayout();
  }

  function syncTrayDim() {
    sec.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("dim", "hint-dim", "hint-target");
    });
    // Only dim when working on the tens column (ones already filled)
    if (activeState.slots.length === 2 && activeState.activeIndex === 0) {
      const expected = activeState.expected[activeState.activeIndex];
      sec.querySelectorAll(".tile").forEach((tile) => {
        if (parseInt(tile.dataset.digit, 10) !== expected) tile.classList.add("dim");
      });
    }
  }

  function setupDrag() {
    dragMgr = createDragManager({
      getTargets() {
        return Array.from(sec.querySelectorAll(".slot")).map((el) => ({
          el,
          rect: el.getBoundingClientRect(),
          active: el.classList.contains("active"),
          id: el.dataset.index,
        }));
      },
      onPickup(payload, el) { tilePickup(el); },
      async onDrop(payload, target, sourceEl, origin, parentInfo) {
        if (!target) return tileBounceBack(sourceEl, origin, parentInfo);
        const targetIndex = parseInt(target.id, 10);
        const next = dropDigit(activeState, payload.digit, targetIndex);
        if (!next.lastDropCorrect) {
          totalWrong++;
          activeState = next;
          trayWrongOnCurrentSlot++;
          await tileBounceBack(sourceEl, origin, parentInfo);
          target.el.classList.add("flash-no");
          setTimeout(() => target.el.classList.remove("flash-no"), 200);
          if (trayWrongOnCurrentSlot >= 2) applyHint();
          return;
        }
        activeState = next;
        await tileSnapIn(sourceEl, target.el);

        if (!isComplete(activeState)) {
          sec.querySelectorAll(".slot").forEach((el) => {
            const i = parseInt(el.dataset.index, 10);
            el.classList.remove("active", "inactive");
            if (i === activeState.activeIndex) el.classList.add("active");
            else if (el.classList.contains("filled")) {} else el.classList.add("inactive");
          });
          trayWrongOnCurrentSlot = 0;
          syncTrayDim();
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
      tile.onpointerdown = (e) => {
        const digit = parseInt(tile.dataset.digit, 10);
        dragMgr.start(e, tile, { digit });
      };
    });
  }

  function applyHint() {
    const expected = activeState.expected[activeState.activeIndex];
    sec.querySelectorAll(".tile").forEach((tile) => {
      if (parseInt(tile.dataset.digit, 10) === expected) {
        tile.classList.remove("dim");
        tile.classList.add("hint-target");
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
      renderProblem().then(() => {
        renderTray();
        setupDrag();
        attachTileListeners();
      });
    }, 500);
  }

  return () => {
    if (window.__activeRelayout === relayout) window.__activeRelayout = null;
    sec.remove();
  };
}
