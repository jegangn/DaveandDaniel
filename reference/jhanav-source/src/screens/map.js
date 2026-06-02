import { home, star, padlock } from "../svg.js";
import { loadProgress, isLevelUnlocked, totalStars } from "../logic.js";
import { sfx } from "../audio.js";

const WORLDS = [
  { id: "add",  name: "BANANA HILLS"    },
  { id: "sub",  name: "MISTY RIVER"     },
  { id: "mult", name: "FIREFLY MEADOW"  },
];

export function mount(stage, state, router) {
  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-map";

  const progress = loadProgress();

  const homeBtn = document.createElement("button");
  homeBtn.className = "home-btn";
  homeBtn.insertAdjacentHTML("beforeend", home());
  homeBtn.addEventListener("pointerup", () => router.go("splash"));
  sec.appendChild(homeBtn);

  const meter = document.createElement("div");
  meter.className = "star-meter total display";
  meter.insertAdjacentHTML("beforeend", `STARS: ${star(true)} ${totalStars(progress)} / 54`);
  sec.appendChild(meter);

  const grid = document.createElement("div");
  grid.className = "world-grid";
  sec.appendChild(grid);

  WORLDS.forEach((w) => {
    const panel = document.createElement("div");
    panel.className = `world-panel world-${w.id}`;
    const worldTitle = document.createElement("h2");
    worldTitle.className = "world-title display";
    worldTitle.textContent = w.name;
    panel.appendChild(worldTitle);
    const path = document.createElement("div");
    path.className = "level-path";
    panel.appendChild(path);

    for (let l = 1; l <= 6; l++) {
      const stars = progress[w.id][l] || 0;
      const unlocked = isLevelUnlocked(progress, w.id, l);
      const node = document.createElement("button");
      node.className = `level-node ${unlocked ? "unlocked" : "locked"} stars-${stars}`;
      node.dataset.world = w.id;
      node.dataset.level = String(l);

      if (!unlocked) {
        node.insertAdjacentHTML("beforeend", padlock());
      } else {
        const numEl = document.createElement("span");
        numEl.className = "display";
        numEl.textContent = String(l);
        node.appendChild(numEl);
        if (stars > 0) {
          const ribbon = document.createElement("div");
          ribbon.className = "node-ribbon";
          for (let s = 0; s < 3; s++) ribbon.insertAdjacentHTML("beforeend", star(s < stars));
          node.appendChild(ribbon);
        }
      }
      node.addEventListener("pointerup", () => {
        if (!unlocked) {
          sfx.lockedTap();
          node.animate(
            [{transform:"rotate(0)"},{transform:"rotate(6deg)"},{transform:"rotate(-6deg)"},{transform:"rotate(0)"}],
            { duration: 300 }
          );
          return;
        }
        sfx.transition();
        router.go("level", { world: w.id, level: l });
      });
      path.appendChild(node);
    }
    grid.appendChild(panel);
  });

  stage.dataset.world = "add";
  stage.appendChild(sec);
  return () => sec.remove();
}
