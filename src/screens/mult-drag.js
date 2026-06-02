import { getProblems } from "../logic.js";
import { createDragManager } from "../drag.js";
import { tilePickup, tileBounceBack, tileSnapIn } from "../animate.js";
import { home, pip, mango } from "../svg.js";
import { sfx } from "../audio.js";
import { layoutMultDrag } from "../layout.js";

function compoundOptions(correct) {
  const max = Math.max(20, correct);
  const tiles = [];
  for (let n = 10; n <= max; n++) tiles.push(n);
  return tiles;
}

export function mount(stage, ctx, router) {
  const { world, level } = ctx;
  stage.dataset.world = "mult";
  const problems = getProblems(world, level);
  let idx = 0;
  let totalWrong = 0;
  let dragMgr = null;
  let trayWrongOnCurrentSlot = 0;
  const groupContents = [];
  let groupRowFade = null;

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-mult-drag";

  const topbar = document.createElement("div");
  topbar.className = "topbar";
  const homeBtn = document.createElement("button");
  homeBtn.className = "home-btn small";
  homeBtn.insertAdjacentHTML("beforeend", home());
  homeBtn.addEventListener("pointerup", () => router.go("map"));
  const progressDots = document.createElement("div");
  progressDots.className = "progress-dots";
  topbar.appendChild(homeBtn);
  topbar.appendChild(progressDots);

  const multProblem = document.createElement("div");
  multProblem.className = "mult-problem";

  const groupRow = document.createElement("div");
  groupRow.className = "group-row";

  const blockPile = document.createElement("div");
  blockPile.className = "block-pile";

  const ansHost = document.createElement("div");
  ansHost.className = "ans-host hidden";
  const ansLabel = document.createElement("span");
  ansLabel.className = "display";
  ansLabel.textContent = "HOW MANY TOTAL?";
  const ansSlotHost = document.createElement("div");
  ansSlotHost.className = "ans-slot-host";
  ansHost.appendChild(ansLabel);
  ansHost.appendChild(ansSlotHost);

  const digitTray = document.createElement("div");
  digitTray.className = "digit-tray hidden";

  const cornerMascot = document.createElement("div");
  cornerMascot.className = "corner-mascot";
  cornerMascot.insertAdjacentHTML("beforeend", pip("idle"));

  // In portrait the counting trays + mango pile are stacked and centred as a
  // single unit (scaled to fit short phones); in landscape `.play-col` is
  // transparent (display:contents) so the children keep their absolute layout.
  const playCol = document.createElement("div");
  playCol.className = "play-col";
  playCol.appendChild(groupRow);
  playCol.appendChild(blockPile);

  sec.appendChild(topbar);
  sec.appendChild(multProblem);
  sec.appendChild(playCol);
  sec.appendChild(ansHost);
  sec.appendChild(digitTray);
  sec.appendChild(cornerMascot);

  const relayout = () => layoutMultDrag(stage, sec);

  renderProgressDots();
  renderProblem();

  function renderProgressDots() {
    progressDots.textContent = "";
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (i < idx ? " filled" : i === idx ? " current" : "");
      progressDots.appendChild(dot);
    }
  }

  function renderProblem() {
    trayWrongOnCurrentSlot = 0;
    const p = problems[idx];
    groupContents.length = 0;

    multProblem.textContent = "";
    const chipA = document.createElement("div");
    chipA.className = "op-chip display";
    chipA.textContent = String(p.a);
    const symMult = document.createElement("div");
    symMult.className = "op-sym display";
    symMult.textContent = "×";
    const chipB = document.createElement("div");
    chipB.className = "op-chip display";
    chipB.textContent = String(p.b);
    const symEq = document.createElement("div");
    symEq.className = "op-sym display";
    symEq.textContent = "=";
    const chipQ = document.createElement("div");
    chipQ.className = "op-chip q display";
    chipQ.textContent = "?";
    multProblem.appendChild(chipA);
    multProblem.appendChild(symMult);
    multProblem.appendChild(chipB);
    multProblem.appendChild(symEq);
    multProblem.appendChild(chipQ);

    if (groupRowFade) { groupRowFade.cancel(); groupRowFade = null; }
    groupRow.textContent = "";
    for (let g = 0; g < p.a; g++) {
      const tray = document.createElement("div");
      tray.className = "group-tray";
      tray.dataset.idx = String(g);
      for (let i = 0; i < p.b; i++) {
        const ghost = document.createElement("div");
        ghost.className = "ghost";
        tray.appendChild(ghost);
      }
      const chip = document.createElement("div");
      chip.className = "count-chip";
      chip.textContent = `0 / ${p.b}`;
      tray.appendChild(chip);
      groupRow.appendChild(tray);
      groupContents.push({ filled: 0, needed: p.b });
    }

    blockPile.textContent = "";
    // A small fixed cluster of pile mangoes — tapping any of them flies a
    // copy into the next empty group slot. The pile itself never shrinks,
    // so 6 visible mangoes is enough for counting practice without the
    // crowded/overlapping look we had with p.a*p.b+3 mangoes.
    const pileCount = 6;
    for (let i = 0; i < pileCount; i++) {
      const wrap = document.createElement("div");
      wrap.className = "block-host idle-wobble";
      wrap.style.transform = `rotate(${(Math.random()-0.5)*16}deg)`;
      wrap.insertAdjacentHTML("beforeend", mango());
      wrap.addEventListener("pointerup", () => onPileTap(wrap));
      blockPile.appendChild(wrap);
    }

    // Show the answer panel + digit tray immediately so the kid can drag the
    // answer right away if they already know it. Filling group trays with
    // blocks is still available for counting practice but no longer gates
    // the answer reveal.
    setupAnswerArea();

    dragMgr = createDragManager({
      getTargets() {
        return Array.from(sec.querySelectorAll(".slot")).map((el) => ({
          el, rect: el.getBoundingClientRect(),
          active: el.classList.contains("active"),
          id: "slot-" + el.dataset.index,
        }));
      },
      onPickup(_p, el) { tilePickup(el); },
      async onDrop(payload, target, sourceEl, origin, parentInfo) {
        if (!target || !String(target.id || "").startsWith("slot-")) return tileBounceBack(sourceEl, origin, parentInfo);
        const correct = problems[idx].answer;
        if (payload.value !== correct) {
          totalWrong++;
          trayWrongOnCurrentSlot++;
          await tileBounceBack(sourceEl, origin, parentInfo);
          target.el.classList.add("flash-no");
          setTimeout(() => target.el.classList.remove("flash-no"), 200);
          return;
        }
        await tileSnapIn(sourceEl, target.el);
        sfx.correctYay();
        idx++; renderProgressDots();
        if (idx >= problems.length) {
          router.go("complete", { world, level, wrongCount: totalWrong });
        } else {
          sfx.transition();
          setTimeout(renderProblem, 500);
        }
      },
    });
    relayout();
  }

  // Tapping a pile mango flies a copy into the next empty group slot.
  // The original mango stays in the pile, so the pile never shrinks.
  function onPileTap(srcMango) {
    const gIdx = groupContents.findIndex((g) => g.filled < g.needed);
    if (gIdx === -1) return; // all groups already filled
    const gc = groupContents[gIdx];
    // Reserve the slot index and bump the counter SYNCHRONOUSLY so quick
    // back-to-back taps don't race to fill the same slot (which produced
    // "5/4" overflow counts).
    const slotIdx = gc.filled;
    gc.filled++;
    const tray = groupRow.querySelector(`.group-tray[data-idx="${gIdx}"]`);
    const ghosts = tray.querySelectorAll(".ghost");
    const slot = ghosts[slotIdx];
    const chip = tray.querySelector(".count-chip");
    const isLast = gc.filled === gc.needed;
    chip.textContent = isLast ? `★ ${gc.needed}` : `${gc.filled} / ${gc.needed}`;
    if (isLast) {
      tray.classList.add("full");
      sfx.trayFull();
    }

    const srcRect = srcMango.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const stage = document.getElementById("stage");
    const stageRect = stage.getBoundingClientRect();
    const logicalW = stage.offsetWidth || 1280;
    const scale = stageRect.width / logicalW;

    const clone = document.createElement("div");
    clone.className = "block-host";
    clone.insertAdjacentHTML("beforeend", mango());
    clone.style.position = "absolute";
    clone.style.left = `${(srcRect.left - stageRect.left) / scale}px`;
    clone.style.top = `${(srcRect.top - stageRect.top) / scale}px`;
    stage.appendChild(clone);
    sfx.tilePickup();
    const dx = (slotRect.left - srcRect.left) / scale;
    const dy = (slotRect.top - srcRect.top) / scale;
    clone.animate(
      [{ transform: "translate(0,0) scale(1.05)" }, { transform: `translate(${dx}px, ${dy}px) scale(1)` }],
      { duration: 380, easing: "cubic-bezier(0.34,1.6,0.5,1)", fill: "forwards" }
    ).onfinish = () => {
      clone.remove();
      const planted = document.createElement("div");
      planted.className = "block-host in-group";
      planted.insertAdjacentHTML("beforeend", mango());
      planted.style.position = "absolute";
      planted.style.left = `${slot.offsetLeft}px`;
      planted.style.top = `${slot.offsetTop}px`;
      tray.appendChild(planted);
      if (groupContents.every((g) => g.filled === g.needed)) {
        setTimeout(showAnswerPhase, 600);
      }
    };
  }

  // Build the answer slot + digit tray. Called at the start of every
  // problem. Single slot whether the answer is one digit or two — the kid
  // drags one tile (digit for <10, compound for ≥10).
  function setupAnswerArea() {
    const p = problems[idx];
    ansSlotHost.textContent = "";
    const slot = document.createElement("div");
    slot.className = "slot active";
    slot.dataset.index = "0";
    ansSlotHost.appendChild(slot);
    ansHost.classList.remove("hidden");

    digitTray.classList.remove("hidden", "two-row");
    digitTray.textContent = "";
    if (p.answer >= 10) {
      const values = compoundOptions(p.answer);
      const buildTile = (n) => {
        const t = document.createElement("div");
        t.className = "tile compound mult-option";
        t.dataset.value = String(n);
        t.textContent = String(n);
        t.onpointerdown = (e) => dragMgr.start(e, t, { kind: "digit", value: n });
        return t;
      };
      if (values.length > 11) {
        digitTray.classList.add("two-row");
        const half = Math.ceil(values.length / 2);
        const row1 = document.createElement("div"); row1.className = "tile-row";
        const row2 = document.createElement("div"); row2.className = "tile-row";
        values.forEach((n, i) => (i < half ? row1 : row2).appendChild(buildTile(n)));
        digitTray.appendChild(row1); digitTray.appendChild(row2);
      } else {
        values.forEach((n) => digitTray.appendChild(buildTile(n)));
      }
    } else {
      for (let n = 0; n <= 9; n++) {
        const t = document.createElement("div");
        t.className = "tile";
        t.dataset.value = String(n);
        t.textContent = String(n);
        t.onpointerdown = (e) => dragMgr.start(e, t, { kind: "digit", value: n });
        digitTray.appendChild(t);
      }
    }
  }

  // Fade the group row when all groups have been filled — a visual cue
  // that the counting step is done. The answer slots / tiles are already
  // visible (created in setupAnswerArea at problem start).
  function showAnswerPhase() {
    groupRowFade = groupRow.animate(
      [{ opacity: 1 }, { opacity: 0.4 }],
      { duration: 400, fill: "forwards" }
    );
  }

  stage.appendChild(sec);
  window.__activeRelayout = relayout;
  relayout();
  return () => {
    if (window.__activeRelayout === relayout) window.__activeRelayout = null;
    sec.remove();
  };
}
