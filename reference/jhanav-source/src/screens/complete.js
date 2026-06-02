import { starsFor, recordStars } from "../logic.js";
import { revealStars, burstConfetti, mascotCelebrate } from "../animate.js";
import { sfx } from "../audio.js";
import { star, banji, mo, pip } from "../svg.js";

export function mount(stage, ctx, router) {
  const { world, level, wrongCount } = ctx;
  stage.dataset.world = world;
  const stars = starsFor(wrongCount);
  recordStars(localStorage, world, level, stars);

  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-complete";

  const title = document.createElement("h1");
  title.className = "complete-title display";
  title.textContent = "LEVEL CLEAR!";
  sec.appendChild(title);

  const meter = document.createElement("div");
  meter.className = "star-meter big";
  meter.insertAdjacentHTML("beforeend", star(false));
  meter.insertAdjacentHTML("beforeend", star(false));
  meter.insertAdjacentHTML("beforeend", star(false));
  sec.appendChild(meter);

  const mascotEl = document.createElement("div");
  mascotEl.className = "complete-mascot";
  const m = world === "add" ? banji : world === "sub" ? mo : pip;
  mascotEl.insertAdjacentHTML("beforeend", m("idle"));
  sec.appendChild(mascotEl);

  const buttons = document.createElement("div");
  buttons.className = "complete-buttons";

  const againBtn = document.createElement("button");
  againBtn.className = "btn ghost";
  againBtn.dataset.act = "again";
  againBtn.textContent = "↻ AGAIN";

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn success";
  nextBtn.dataset.act = "next";
  // On the last level NEXT becomes a return-to-map shortcut so the kid
  // isn't stuck looking at a disabled button.
  const isLastLevel = level >= 6;
  nextBtn.textContent = isLastLevel ? "▶ MAP" : "▶ NEXT";

  buttons.appendChild(againBtn);
  buttons.appendChild(nextBtn);
  // On the last level the NEXT button already returns to the map, so the
  // explicit MAP button is redundant. Show it only when there's a next
  // level to play.
  if (!isLastLevel) {
    const mapBtn = document.createElement("button");
    mapBtn.className = "btn ghost";
    mapBtn.dataset.act = "map";
    mapBtn.textContent = "🏠 MAP";
    buttons.appendChild(mapBtn);
  }

  buttons.addEventListener("pointerup", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "again") { sfx.transition(); router.go("level", { world, level }); }
    else if (act === "next") {
      sfx.transition();
      if (isLastLevel) router.go("map");
      else router.go("level", { world, level: level + 1 });
    }
    else if (act === "map")  { sfx.transition(); router.go("map"); }
  });
  sec.appendChild(buttons);

  const confettiHost = document.createElement("div");
  confettiHost.className = "confetti-host";
  sec.appendChild(confettiHost);

  stage.appendChild(sec);

  burstConfetti(confettiHost, 80);
  sfx.levelComplete();
  const starEls = sec.querySelectorAll(".star-meter .star");
  starEls.forEach((s) => s.classList.remove("filled", "earned"));
  revealStars(starEls, stars).then(() => {
    const svg = mascotEl.querySelector("svg");
    if (svg) mascotCelebrate(svg);
  });

  return () => sec.remove();
}
