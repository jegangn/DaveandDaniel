# Dave & Daniel — Design Spec

> Seeded by [`START-HERE.md`](../../../START-HERE.md) and the engine spec
> [`reference/jhanav-source/design.md`](../../../reference/jhanav-source/design.md).
> This file records the **confirmed decisions** and the **target design**. The HOW lives in the
> matching plan: [`docs/superpowers/plans/2026-06-02-dave-and-daniel.md`](../plans/2026-06-02-dave-and-daniel.md).

## 1. Goal

One single-file `index.html`: a **"Who's playing?"** picker → **Dave** (5) or **Daniel** (11). Each boy gets an
age-matched math game with its own saved progress, built on **one shared engine** (Jhanav's frozen engine).

- **Dave** = Jhanav's "Math Adventure", behaviourally identical (jungle theme, 2-digit add/sub, tap/drag multiply).
- **Daniel** = a new, harder **Secret-Agent / Code-Breaker** game on the same engine: the four operations at an
  11-year-old level, with new N-digit column logic and two brand-new screens (long multiplication, short division).

## 2. Confirmed decisions (this session)

| # | Decision | Choice |
|---|---|---|
| §4.1 | Division method | **Short "bus-stop", ÷1-digit** (2-digit÷1 → 3-digit÷1, remainders shown) |
| §4.2 | Long multiplication ceiling | **Up to 2-digit × 2-digit** (partial-product rows + sum) |
| §4.3 | Daniel's character | **Minimal AI "Handler"** (sleek drone/AI, no cartoon mascot) |
| §4.4 | World codenames | **Keep** OP: STOCKPILE / GETAWAY / OVERRIDE / SPLIT (trivially renameable) |
| Deploy | Target | Push to **`https://github.com/jegangn/DaveandDaniel`**; founder links **Vercel** to that repo later |

### Defaults adopted (flagged for approval at plan stage — easily reverted)

- **Splash titles:** Dave's splash → **"DAVE'S MATH"** (Banji + jungle, otherwise identical to Jhanav's splash);
  Daniel's splash → **"CODE BREAKERS"** (spy). Personalises each boy's home screen rather than literally keeping
  "JHANAV'S MATH". *(The only user-facing deviation from a literal copy of Dave's splash.)*
- **Daniel display font:** **Chakra Petch** (techy, supports tabular figures via `font-feature-settings:"tnum"`),
  with a tabular system fallback. UI text stays on Nunito. Digits keep `tnum` so columns align.
- **Switch player:** a small "⇄ PLAYERS" control on each splash returns to the picker (back button also works).
- **Unit tests:** `bun test` (built-in) for Daniel's column-math logic. e2e stays Playwright.

## 3. Locked architecture (from START-HERE §3, do not re-litigate)

- **One file, two profiles, separate save slots.** Storage namespaced per profile: `dave.stars.{world}.{level}`,
  `daniel.stars.{world}.{level}` (replacing Jhanav's hard-coded `bm.stars.*`). World list is **per-profile**.
- **Theme = config.** Keep all CSS token **NAMES** identical (`--bg-paper`, `--ink`, `--world-primary`, `--success`,
  `--gentle-no`, `--sh-*`, `--ease-*`, …). Swap **VALUES** per profile via `#stage[data-profile="daniel"]` (system
  palette) + `#stage[data-profile][data-world]` (per-world accent). The JS reads token values at runtime — renaming
  breaks it.
- **Dave's screens copied unchanged**; only the surrounding plumbing (router, profile state, storage prefix, world
  list, map/complete/settings) is generalised — and generalised so Dave's behaviour is provably identical
  (verified by the frozen e2e suite).
- **Daniel's screens are new** (N-digit column add/sub, long multiplication, short division) on the shared
  drag/audio/animate/layout infra.

## 4. Daniel — the math (4 worlds × 5 missions × 5 problems, stars 3/2/1, no-fail)

| World (codename) | Op | Builds from → to | Mechanic |
|---|---|---|---|
| **OP: STOCKPILE** | + | 3-digit no-carry → 4-digit multi-carry | column method, auto-carry, drag **right-to-left** |
| **OP: GETAWAY** | − | 3-digit no-borrow → 4-digit borrow across zeros | column method, auto-borrow, **right-to-left**, top ≥ bottom |
| **OP: OVERRIDE** | × | 2-digit×1 → 2-digit×2 long multiplication | new screen: partial-product rows + sum, **right-to-left** |
| **OP: SPLIT** | ÷ | 2-digit÷1 → 3-digit÷1 with remainders | new "bus-stop" screen, quotient **left-to-right**, remainder shown |

- Carry/borrow **auto-animate** (Daniel only places digits, exactly like Jhanav).
- **Seeded generators with difficulty bands** (deterministic per mission for testing via injectable RNG; varied per
  replay in-app). Tests assert **band properties** (operand ranges, carry/borrow counts), not exact values.

## 5. Daniel — the skin (Secret Agent / Code-Breaker)

- **Framing:** every problem = "crack the code". Answer slots = the code; digit tiles = cipher/keypad keys.
- **Palette (token VALUES):** deep charcoal-navy base, amber + cyan accents, **decrypt-green** correct,
  **alert-amber** wrong (never red), **manila-cream** worksheet cards. High-contrast, playful, not corporate.
- **Character:** minimal recon-drone / AI **"Handler"** (no mascot). Reuses the engine's celebration animations by
  exposing `.head` / `.wing-l` / `.wing-r` SVG groups.
- **Naming:** map → **Mission Board**; levels → **Missions**; locked nodes → **CLASSIFIED**. Stars kept.

## 6. Hard constraints (from root CLAUDE.md + START-HERE §6)

- **bun, never npm.** bun is off-PATH: `PATH="/c/Users/JeganGN/.bun/bin:$PATH" bun ./build.js`.
- **`index.html` builds to PROJECT ROOT** (gitignored build artifact).
- **All files stay in this project dir.** **Never edit** `C:\dev\projects\Maths For Jhanav` — copy only from the
  frozen `reference/jhanav-source/`.
- **Auto-commit + auto-push** after every change to `main` (remote = the GitHub repo above).
- e2e gotcha: confirm `http://localhost:5173/` serves **our** game (`#stage` present) before trusting a run.
  Screenshots via the Playwright `zz-capture` spec (Preview MCP `preview_screenshot` times out here).

## 7. Acceptance

- **Dave parity:** frozen reliable specs green against profile=dave (`portrait-reflow`, `math-audit-addition`,
  splash→map); Dave's screens structurally match Jhanav's.
- **Daniel correctness:** new math-audit e2e plays every mission and asserts correct answers / star counts; portrait
  reflow holds on the two new screens.
- Both profiles keep **separate** progress; build produces a single `index.html`; pushed to the GitHub remote.
