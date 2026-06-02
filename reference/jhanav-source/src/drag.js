export function withinTolerance(rect, x, y, tol = 0) {
  return x >= rect.left - tol && x <= rect.right + tol
      && y >= rect.top  - tol && y <= rect.bottom + tol;
}

function rectCenter(r) { return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; }

export function findDropTarget(targets, x, y, tol = 0) {
  let best = null, bestD = Infinity;
  for (const t of targets) {
    if (!t.active) continue;
    if (!withinTolerance(t.rect, x, y, tol)) continue;
    const c = rectCenter(t.rect);
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

function stageInfo() {
  const stage = document.getElementById("stage");
  const rect = stage.getBoundingClientRect();
  const logicalW = stage.offsetWidth || 1280;
  const scale = rect.width / logicalW;
  return { stage, rect, scale };
}

function toStageLocal(clientX, clientY) {
  const { rect, scale } = stageInfo();
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

export function createDragManager({ getTargets, onPickup, onDrop }) {
  let dragging = null;

  function start(e, sourceEl, payload) {
    e.preventDefault();
    const tileRect = sourceEl.getBoundingClientRect();
    const { stage, rect: sRect, scale } = stageInfo();
    // Tile origin in stage-local coords
    const tileLocalLeft = (tileRect.left - sRect.left) / scale;
    const tileLocalTop  = (tileRect.top  - sRect.top)  / scale;
    // Pointer in stage-local coords
    const pointerLocal = toStageLocal(e.clientX, e.clientY);
    // Offset from pointer to tile origin, in stage-local coords
    const offsetX = pointerLocal.x - tileLocalLeft;
    const offsetY = pointerLocal.y - tileLocalTop;
    const origin = { x: tileLocalLeft, y: tileLocalTop };

    // Drag a CLONE and keep the ORIGINAL tile in its tray slot, just hidden, so
    // the palette never reflows. The original "disappears" for the duration of
    // the drag (its space is reserved) and reappears the moment the drag ends —
    // whether the value lands in the answer or bounces back. Digits stay
    // reusable and the tray layout is perfectly stable.
    const dragEl = sourceEl.cloneNode(true);
    dragEl.classList.add("drag-clone");
    dragEl.classList.remove("dim", "hint-dim", "hint-target");
    dragEl.style.position = "absolute";
    dragEl.style.left = `${origin.x}px`;
    dragEl.style.top  = `${origin.y}px`;
    dragEl.style.margin = "0";
    dragEl.style.pointerEvents = "none";
    stage.appendChild(dragEl);

    sourceEl.style.visibility = "hidden";

    dragging = { dragEl, sourceEl, payload, origin, offsetX, offsetY, pointerId: e.pointerId };
    sourceEl.setPointerCapture?.(e.pointerId);
    onPickup?.(payload, dragEl);

    dragEl.classList.add("dragging");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function move(e) {
    if (!dragging || e.pointerId !== dragging.pointerId) return;
    const { dragEl, offsetX, offsetY } = dragging;
    const p = toStageLocal(e.clientX, e.clientY);
    dragEl.style.left = `${p.x - offsetX}px`;
    dragEl.style.top  = `${p.y - offsetY}px`;
  }

  function end(e) {
    if (!dragging || e.pointerId !== dragging.pointerId) return;
    const { dragEl, sourceEl, payload, origin } = dragging;
    const targets = getTargets();
    // Targets use viewport-pixel rects (from getBoundingClientRect on slots).
    // Pointer event is in viewport pixels too. Hit-test stays in viewport space.
    const target = findDropTarget(targets, e.clientX, e.clientY, 40);
    dragEl.classList.remove("dragging");
    // Reveal the original tile again — it never left its tray slot.
    sourceEl.style.visibility = "";
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    dragging = null;
    // The clone carries the snap-in / bounce-back animation, then removes itself.
    onDrop?.(payload, target, dragEl, origin, { sourceEl });
  }

  return { start };
}
