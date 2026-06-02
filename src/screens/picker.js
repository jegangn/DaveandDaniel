// Entry screen: "WHO'S PLAYING?" — sets the active profile, then routes to that
// boy's own splash. Each card previews its profile palette via data-profile +
// data-world (so the spy card reads dark/cyan, the jungle card reads warm).
import { banji, handler } from "../svg.js";
import { unlockAudio, sfx } from "../audio.js";

export function mount(stage, state, router) {
  const sec = document.createElement("section");
  sec.className = "screen active";
  sec.id = "screen-picker";
  sec.innerHTML = `
    <h1 class="picker-title display">WHO'S PLAYING?</h1>
    <div class="picker-cards">
      <button class="picker-card jungle" data-profile="dave" data-world="add">
        <div class="picker-art"></div>
        <div class="picker-name display">DAVE</div>
        <div class="picker-age">age 5</div>
      </button>
      <button class="picker-card spy" data-profile="daniel" data-world="nadd">
        <div class="picker-art"></div>
        <div class="picker-name display">DANIEL</div>
        <div class="picker-age">age 11</div>
      </button>
    </div>`;

  sec.querySelector('.picker-card[data-profile="dave"] .picker-art').insertAdjacentHTML("beforeend", banji("idle"));
  sec.querySelector('.picker-card[data-profile="daniel"] .picker-art').insertAdjacentHTML("beforeend", handler("idle"));

  sec.addEventListener("pointerup", (e) => {
    const card = e.target.closest(".picker-card");
    if (!card) return;
    unlockAudio();
    sfx.transition();
    router.setProfile(card.dataset.profile);
    router.go("splash");
  });

  // Picker is profile-neutral; clear any prior profile tint on the stage.
  stage.dataset.profile = "";
  stage.appendChild(sec);
  return () => sec.remove();
}
