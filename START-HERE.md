# Dave & Daniel — Math Game · BUILD HANDOFF / MASTER PROMPT

> **You (the next session) are picking up a half-designed project. Read this whole file first.**
> Brainstorm is done; the design below is agreed in principle. Nothing has been built yet.
> You are working in `C:\dev\projects\Dave and Daniel` — build everything here. The root
> `C:\dev\CLAUDE.md` rules still apply (bun never npm, auto-commit+push, files stay in project dir, Superpowers workflow).

---

## 1. What this is

A **gift** for a friend's two sons. ONE single-file `index.html` that opens to a **"Who's playing?"**
picker → **Dave** or **Daniel**. Each boy gets an age-matched game with its own saved progress.

| Player | Age | Their game |
|---|---|---|
| **Dave** | 5 | An **exact copy** of "Jhanav's Math Adventure" (the founder's son's game). Jungle theme, 2-digit add/sub/multiply, drag-a-digit tiles. Do not redesign it — copy it. |
| **Daniel** | 11 | A **new, harder** game on the **same engine**, re-skinned **Secret-Agent / Code-Breaker** style, covering the **four operations** at an 11-year-old level. |

This is the founder's own description: *"the game for dave can be exactly like the one for my son,
feel free to copy what is needed to the new folder. Do not edit anything in [the Jhanav] project directory."*

---

## 2. Decisions already locked (do not re-litigate)

- **Folder name:** `Dave and Daniel`. The younger boy is **Dave** (5) — the founder first typed "Dev", then corrected to **Dave**.
- **Structure:** one HTML file, player-picker → two profiles, **separate save slots**.
- **Dave's half:** copy of Jhanav's game, **behaviorally identical**. Verify with the existing e2e suite before shipping.
- **Daniel's theme:** **Secret Agent / Code-Breaker.**
- **Daniel's math:** **four operations (+ − × ÷)** at 11yo difficulty.

---

## 3. The design (proposed — confirm §4 with the founder, then build)

### How it's built — one file, two profiles, shared plumbing
- A new entry screen: **"Who's playing?"** → Dave / Daniel. Sets the active **profile**.
- **Shared plumbing** (reused for both): stage/viewport fit + portrait/landscape (`game.js`), drag engine (`drag.js`), Web-Audio sounds (`audio.js`), animation helpers (`animate.js`), the **world-map** screen (made data-driven by a per-profile world list), the **level-complete** screen, the parent-gated settings.
- **Dave's screens** = Jhanav's screens **copied unchanged** (splash, add, sub, mult-tap, mult-drag) with the **jungle** CSS tokens. Lowest risk — keep his code as-is so behavior is provably identical.
- **Daniel's screens** = **new** (built fresh for N-digit + the new mechanics): spy splash, multi-digit add, multi-digit sub, long multiplication, short division — with the **spy** CSS tokens.
- **Theme = config:** the engine reads CSS custom-property **token VALUES** (e.g. `--bg-paper`, `--world-primary`, `--ink`, `--success`, `--gentle-no`, `--star`, `--sh-*`, `--ease-*`). **Keep token NAMES identical** and only swap VALUES per profile — the JS does live `getComputedStyle` lookups, so renaming tokens breaks it. (Hard-won lesson from Jhanav's UI refresh.)
- **Save slots:** generalize the storage keys. Jhanav uses `bm.stars.{world}.{level}`. Namespace per profile: `dave.stars.{world}.{level}` and `daniel.stars.{world}.{level}` (and the world list must be per-profile, not the hard-coded `["add","sub","mult"]`).

### ⚠️ Why Daniel's half is real work, not a re-paint
The current engine (`reference/jhanav-source/src/logic.js`) is **hard-coded to 2 digits**:
- `analyze(p)` only computes tens/ones.
- `createAnswerState(answer)` only handles 1–2 digit answers.
- `dropCompound(...)` is specific to a 2-digit answer.
- Multiplication is the **conceptual** tap-count / drag-groups mechanic (max 5×5), **not** column math.
- **No division exists at all.**
- Progress assumes 3 worlds × 6 levels.

So Daniel needs: N-digit column logic (3–4 digits, carry/borrow chains), a **new column-multiplication** screen, a **new short-division** screen, and generalized progress/world config. Budget accordingly.

### Daniel's skin — Secret Agent / Code-Breaker
- **Framing:** every problem = **"crack the code"** to advance the mission. The answer slots are the code; the draggable digit tiles become **cipher / keypad keys**.
- **Palette (token VALUES):** late-night HQ — deep charcoal-navy base, warm **amber + cyan** accents, **decrypt-green** for correct, **alert-amber (never red)** for wrong, **manila-dossier cream** cards for the worksheet. High-contrast, playful, not corporate (per founder's aesthetic rules + `ui-ux-pro-max`).
- **Type:** a techy display face for the big numbers — **must keep tabular figures** (`font-feature-settings:"tnum"`) so the columns align — plus a clean UI font. (Jhanav uses Lilita One + Nunito; pick a spy-appropriate display like Chakra Petch/Orbitron/Audiowent **only if** it has tabular figures, else keep digits on a tnum-safe face.)
- **Character:** **no cartoon mascot.** Use a sleek recon-drone / AI **"Handler"** that briefs missions (lighter SVG, grown-up feel). The founder may instead want a spy-fox character — that's §4 item 3.
- **Naming:** world map → **Mission Board**; levels → **Missions**; locked nodes read **CLASSIFIED**. Stars kept (or styled as clearance ranks).

### Daniel's four worlds (the math)

| World (codename) | Op | Builds from → to | Mechanic |
|---|---|---|---|
| **OP: STOCKPILE** | + | 3-digit no-carry → 4-digit multi-carry | column method, auto-carry animation, drag digits **right-to-left** |
| **OP: GETAWAY** | − | 3-digit no-borrow → 4-digit multi-borrow (incl. across zeros) | column method, auto-borrow animation, **right-to-left** |
| **OP: OVERRIDE** | × | 2–3 digit × 1 digit → 2-digit × 2-digit long multiplication | new column-multiply screen (partial-product rows + sum), **right-to-left** |
| **OP: SPLIT** | ÷ | 2-digit ÷ 1 digit → 3-digit ÷ 1 digit, with remainders | new short "bus-stop" division, quotient filled **left-to-right**, remainder shown |

- **5 missions per world, 5 problems each.** Carry/borrow **auto-animate** (Daniel only places digits, like Jhanav's).
- **Stars unchanged:** 3 (0–1 wrong) / 2 (2–4) / 1 (5+), **no-fail**.
- **Problem generation:** prefer **seeded generators with difficulty bands** per mission (more replay variety than Jhanav's fixed seed tables), e.g. "two 4-digit numbers with exactly 2 carries." Keep it deterministic enough that difficulty climbs cleanly.

---

## 4. Open calls — CONFIRM WITH THE FOUNDER before/at the plan stage
The founder was shown these and can veto any. Defaults below if no objection:
1. **Division = short "bus-stop" method**, divisor capped at **one digit** (authentic long-division with bring-downs is a much bigger build; bus-stop is the standard 11yo method and fits the engine).
2. **Long multiplication goes up to 2-digit × 2-digit** (two partial-product rows + a sum). This is the most complex screen — founder can cap it at **×1-digit** for a faster build.
3. **No cartoon mascot** — minimal drone/AI handler. Founder may want an actual spy character (e.g. a fox) = more art.
4. **Codename world names** (OP: STOCKPILE etc.) — easy to rename to anything Daniel would like.

---

## 5. Source to build from
- **Frozen reference (in this folder):** `reference/jhanav-source/` — the complete, frozen engine source (`src/`, `e2e/`, `build.js`, `dev.js`, `package.json`, `bun.lock`, `playwright.config.js`, `design.md`). **Read `design.md` first** — it's the full 900-line spec of the engine (themes, tokens, screens, components, animations, sounds). `reference/jhanav-built-index.html` is the known-good built output — **byte-compare Dave's built screens against it to prove parity.**
- **Live original (DO NOT EDIT):** `C:\dev\projects\Maths For Jhanav`. The founder forbade editing it. Only ever read/copy **out** of it. The frozen copy here means you shouldn't need to touch it at all.

### Key engine files (in `reference/jhanav-source/src/`)
- `game.js` — router + stage-fit + history/back-button. Router hard-codes world→screen and the `["add","sub","mult"]` world list — **generalize this per profile**.
- `logic.js` — `SEEDS`, `getProblems`, `analyze`, `createAnswerState`, `dropDigit`, `dropCompound`, `starsFor`, progress load/record/unlock. **2-digit-bound — Daniel needs N-digit equivalents.**
- `screens/` — `splash, map, add, sub, mult-tap, mult-drag, complete, settings` (`mount(stage, ctx, router) → unmount`).
- `style.css` — the design-token system + per-world tints via `#stage[data-world="…"]`.
- `drag.js`, `audio.js`, `animate.js`, `layout.js`, `svg.js` — reusable infra.

---

## 6. Hard constraints (from root CLAUDE.md + this project)
- **bun, never npm.** bun is **not on the Bash PATH** — full path `C:/Users/JeganGN/.bun/bin/bun.exe`. `build.js` spawns `bunx esbuild`, so prefix: `PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun ./build.js`.
- **`index.html` lives at the PROJECT ROOT**, not in a subfolder (founder's rule). It's a build artifact → gitignored (`.gitignore` already set). `bun ./build.js` should output `./index.html`.
- **All files stay in this project directory.** Never copy deliverables to the Desktop or elsewhere.
- **Do NOT edit `C:\dev\projects\Maths For Jhanav`.**
- **Auto-commit + auto-push** after every change (default branch `main`, no branching, no asking). **Caveat:** this repo is local-only right now (initial commit made, **no git remote yet**). Set up the remote / deploy target with the founder before the first push (the founder mentioned wanting **Vercel** earlier, vs Jhanav's GitHub Pages — confirm the deploy choice).
- **Paid API calls = ask first.** Secrets in per-project `.env` only.

---

## 7. Build & verify workflow (gotchas already learned)
- **Build:** `PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun ./build.js` → writes `./index.html`. (Bun on Windows throws `EEXIST` on `mkdirSync('.')`; `build.js` guards with `if (OUT !== ".")` — keep that.)
- **Dev server:** `bun ./dev.js` on **:5173**, serves `src/`. Reads files fresh per request (edits show on reload).
- **e2e gotcha — port :5173 reuse:** `playwright.config.js` sets `reuseExistingServer: !CI`. If any OTHER server is already on :5173 (e.g. another project's Vite/React app — look for `/@react-refresh`), Playwright silently tests the WRONG app and EVERY test fails with a `#stage` timeout. **Before trusting an e2e run, probe `http://localhost:5173/` and confirm it serves OUR game (`id="stage"` present).** Free the port or start our `bun ./dev.js` first.
- **Screenshots:** the Preview MCP `preview_screenshot` **times out** here (perpetual idle/celebrate animations never let it go idle). The standalone `chromium.launch()` from a bun script also **hangs** (180s). Use the **Playwright test runner** (`e2e/zz-capture.spec.js`, run via `SHOT_TAG=after bun run e2e zz-capture`) for screenshots. `preview_eval` (geometry/console assertions) **does** work.
- **Verify Dave's parity:** build, then byte-compare Dave's screen output against `reference/jhanav-built-index.html`, and/or run the frozen `e2e/` specs against Dave's profile. (Note: some Jhanav specs were pre-existing-broken — `full-playthrough`, `math-audit` mult/sub; reliable oracles are `portrait-reflow` and the add-audit. Don't trust a red suite blindly.)

---

## 8. Recommended next steps (Superpowers)
1. Re-orient: read this file + `reference/jhanav-source/design.md`.
2. Confirm §4 open calls + the **deploy target** (Vercel vs GitHub Pages) with the founder.
3. **`writing-plans`** → produce the implementation plan. **Wait for founder approval** at the plan stage (founder's rule: approve at spec and plan before execution).
4. **`executing-plans`** / TDD → build: scaffold project (copy `src/` + build/dev/config from `reference/jhanav-source/`), add the profile picker + per-profile config, copy Dave's screens unchanged, build Daniel's new screens, generalize progress/world-list, apply the spy skin.
5. Verify (Dave parity + Daniel correctness), build `index.html`, set up remote, push/deploy.

> A full design spec should be written to `docs/superpowers/specs/2026-06-02-dave-and-daniel-design.md` as part of the Superpowers flow — this file is the brief to seed it.
