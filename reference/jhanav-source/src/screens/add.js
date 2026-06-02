import { getProblems, analyze, createAnswerState, dropDigit, dropCompound, isComplete } from "../logic.js";
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn, flyCarry } from "../animate.js";
import { sfx } from "../audio.js";
import { home, banji } from "../svg.js";
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
  sec.id = "screen-add";

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
  sec.querySelector(".corner-mascot").insertAdjacentHTML("beforeend", banji("idle"));

  const relayout = () => layoutAddSub(stage, sec);

  renderProgressDots();
  renderTray();
  renderProblem();
  setupDrag();

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

    const a = analyze(problems[idx]);
    const useCompound = a.carry;

    tray.classList.toggle("two-row", useCompound);
    sec.classList.toggle("two-row-active", useCompound);

    if (useCompound) {
      // Row 1: single digits 0-9
      const row1 = document.createElement("div");
      row1.className = "tile-row";
      for (let n = 0; n <= 9; n++) {
        const t = document.createElement("div");
        t.className = "tile";
        t.dataset.digit = String(n);
        t.textContent = String(n);
        row1.appendChild(t);
      }
      tray.appendChild(row1);

      // Row 2: compound tiles 10-18
      const row2 = document.createElement("div");
      row2.className = "tile-row";
      for (let n = 10; n <= 18; n++) {
        const t = document.createElement("div");
        t.className = "tile compound";
        t.dataset.compound = String(n);
        t.textContent = String(n);
        row2.appendChild(t);
      }
      tray.appendChild(row2);
    } else {
      // Single row: 0-9
      for (let n = 0; n <= 9; n++) {
        const t = document.createElement("div");
        t.className = "tile";
        t.dataset.digit = String(n);
        t.textContent = String(n);
        tray.appendChild(t);
      }
    }
    relayout();
  }

  function renderProblem() {
    trayWrongOnCurrentSlot = 0;
    const p = problems[idx];
    const a = analyze(p);
    activeState = createAnswerState(p.answer);
    const ws = sec.querySelector(".worksheet");
    ws.innerHTML = `
      <div class="carry-slot ${a.carry ? "" : "hidden"}"></div>
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

    // Position carry slot directly above the tens cell of the top row.
    // Use bounding rects + the stage's actual scale (read from getBoundingClientRect
    // vs. offsetWidth, which gives the rendered:logical ratio even when an outer
    // flex container shrinks the stage before its own transform is applied).
    if (a.carry) {
      requestAnimationFrame(() => {
        const tensCell = ws.querySelector(".row.top .cell:nth-child(1)");
        const carrySlot = ws.querySelector(".carry-slot");
        if (tensCell && carrySlot) {
          const stageEl = document.getElementById("stage");
          const stageRect = stageEl.getBoundingClientRect();
          const stageLogicalW = stageEl.offsetWidth || (stageEl.dataset.orient === "portrait" ? 720 : 1280);
          const scale = stageRect.width / stageLogicalW;
          const tensRect = tensCell.getBoundingClientRect();
          const wsRect = ws.getBoundingClientRect();
          const tensLeftLocal = (tensRect.left - wsRect.left) / scale;
          const tensWidthLocal = tensRect.width / scale;
          const tensCenter = tensLeftLocal + tensWidthLocal / 2;
          // Carry slot is 60px wide in CSS; subtract half-width to center it.
          carrySlot.style.left = `${tensCenter - 30}px`;
          carrySlot.style.top = "-72px";
          carrySlot.style.right = "auto";
        }
      });
    }

    syncTrayDim();
    relayout();
  }

  function syncTrayDim() {
    sec.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("dim", "hint-dim", "hint-target");
    });
    // Dim single-digit tiles when at tens slot (ones already filled)
    if (activeState.slots.length === 2 && activeState.activeIndex === 0) {
      const expected = activeState.expected[activeState.activeIndex];
      sec.querySelectorAll(".tile:not(.compound)").forEach((tile) => {
        if (parseInt(tile.dataset.digit, 10) !== expected) tile.classList.add("dim");
      });
      // Dim all compound tiles — not needed at tens stage
      sec.querySelectorAll(".tile.compound").forEach((tile) => {
        tile.classList.add("dim");
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
        const a = analyze(problems[idx]);

        // ── COMPOUND TILE DROP ──────────────────────────────────────────────
        if (payload.kind === "compound") {
          // Only valid on the ones slot of a carry problem
          if (!a.carry || targetIndex !== activeState.slots.length - 1) {
            totalWrong++;
            trayWrongOnCurrentSlot++;
            await tileBounceBack(sourceEl, origin, parentInfo);
            target.el.classList.add("flash-no");
            setTimeout(() => target.el.classList.remove("flash-no"), 200);
            if (trayWrongOnCurrentSlot >= 2) applyHint();
            return;
          }

          const expectedSum = a.aOnes + a.bOnes;
          const next = dropCompound(activeState, payload.value, expectedSum);
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

          // Accept: show ones digit in slot, fly carry chip to carry slot
          activeState = next;
          // Change tile text to the ones digit before snap animation
          sourceEl.textContent = String(payload.value % 10);
          await tileSnapIn(sourceEl, target.el);

          // Fly the carry chip (always "1" for compound 10-18) to carry slot
          const carrySlot = sec.querySelector(".carry-slot");
          if (carrySlot) {
            carrySlot.classList.remove("hidden");
            await flyCarry(carrySlot, target.el);
          }

          // Activate tens slot
          sec.querySelectorAll(".slot").forEach((el) => {
            const i = parseInt(el.dataset.index, 10);
            el.classList.remove("active", "inactive");
            if (i === activeState.activeIndex) el.classList.add("active");
            else if (!el.classList.contains("filled")) el.classList.add("inactive");
          });
          trayWrongOnCurrentSlot = 0;
          syncTrayDim();
          renderTray();
          setupDrag();
          attachTileListeners();
          return;
        }

        // ── SINGLE-DIGIT TILE DROP ──────────────────────────────────────────
        // In carry problems, single-digit tiles are rejected on the ones slot
        if (a.carry && targetIndex === activeState.slots.length - 1) {
          totalWrong++;
          trayWrongOnCurrentSlot++;
          await tileBounceBack(sourceEl, origin, parentInfo);
          target.el.classList.add("flash-no");
          setTimeout(() => target.el.classList.remove("flash-no"), 200);
          if (trayWrongOnCurrentSlot >= 2) applyHint();
          return;
        }

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
            else if (!el.classList.contains("filled")) el.classList.add("inactive");
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
        if (tile.dataset.compound) {
          const value = parseInt(tile.dataset.compound, 10);
          dragMgr.start(e, tile, { kind: "compound", value });
        } else {
          const digit = parseInt(tile.dataset.digit, 10);
          dragMgr.start(e, tile, { kind: "digit", digit });
        }
      };
    });
  }

  function applyHint() {
    const a = analyze(problems[idx]);
    const isOnesSlot = activeState.slots.length === 2 && activeState.activeIndex === 1;

    if (a.carry && isOnesSlot) {
      // Hint: highlight the correct compound tile; dim everything else
      const expectedSum = a.aOnes + a.bOnes;
      sec.querySelectorAll(".tile").forEach((tile) => {
        if (tile.dataset.compound && parseInt(tile.dataset.compound, 10) === expectedSum) {
          tile.classList.remove("dim");
          tile.classList.add("hint-target");
        } else {
          tile.classList.add("hint-dim");
        }
      });
    } else {
      const expected = activeState.expected[activeState.activeIndex];
      sec.querySelectorAll(".tile:not(.compound)").forEach((tile) => {
        if (parseInt(tile.dataset.digit, 10) === expected) {
          tile.classList.remove("dim");
          tile.classList.add("hint-target");
        } else {
          tile.classList.add("hint-dim");
        }
      });
    }
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

  stage.appendChild(sec);
  window.__activeRelayout = relayout;
  relayout();
  return () => {
    if (window.__activeRelayout === relayout) window.__activeRelayout = null;
    sec.remove();
  };
}
