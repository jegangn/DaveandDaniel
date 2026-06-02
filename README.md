# Dave & Daniel — Math Game

A single-file HTML math game for two brothers. Opens to a **"Who's playing?"** picker:

- **Dave (5)** — an exact copy of *Jhanav's Math Adventure*: jungle theme, 2-digit
  add/subtract (auto carry/borrow), tap-count & drag-group multiplication.
- **Daniel (11)** — a **Secret-Agent / Code-Breaker** game on the same engine, covering the
  four operations at an 11-year-old level:
  - **OP: STOCKPILE** — N-digit column **addition** (auto-carry)
  - **OP: GETAWAY** — N-digit column **subtraction** (auto-borrow, incl. across zeros)
  - **OP: OVERRIDE** — **long multiplication** up to 2-digit × 2-digit (partial products + sum)
  - **OP: SPLIT** — short "bus-stop" **division** (÷ 1 digit, remainders)

Each boy has his own saved progress (`dave.stars.*` / `daniel.stars.*` in `localStorage`).
Stars: 3 (0–1 wrong) / 2 (2–4) / 1 (5+), no-fail. Sounds are synthesized (Web Audio); everything
is inline (no external assets except Google Fonts), so it works offline after first load.

## Develop

Uses **bun** (not npm). On this machine bun is off-PATH — prefix commands:
`PATH="/c/Users/JeganGN/.bun/bin:$PATH"`.

```bash
bun install            # dev deps (esbuild + Playwright)
bun ./dev.js           # dev server on http://localhost:5173 (serves src/ live)
bun ./build.js         # bundle everything → ./index.html (the deployable artifact)
bun test ./test        # unit tests (Daniel's column-math logic + progress)
bunx playwright test   # end-to-end tests
```

`index.html` is a **build artifact** (gitignored) — run `bun ./build.js` to (re)generate it at the
project root.

### Handy URLs (deep-links / testing)

- `/` → the picker
- `/?profile=daniel` → Daniel's splash
- `/?profile=daniel&world=nadd&level=1` → straight into a level
  (worlds: Dave `add` `sub` `mult`; Daniel `nadd` `nsub` `nmul` `ndiv`)

## Deploy (Vercel)

`vercel.json` is set up so linking this GitHub repo to Vercel builds and serves it with no extra
config: install `bun install`, build `bun build.js`, output the project root (the generated
`index.html`). Pushes to `main` auto-deploy.

## Layout

- `src/` — engine source (ES modules, bundled by `build.js`)
  - `game.js` router · `profiles.js` per-profile config · `progress.js` save slots
  - `logic.js` (Dave's 2-digit math) · `logic-daniel.js` (Daniel's N-digit column math)
  - `screens/` — picker, splash, map, complete, settings + per-game level screens
  - `style.css` (themes as CSS token-value swaps) · `svg.js` · `drag.js` · `audio.js` · `animate.js` · `layout.js`
- `test/` — `bun test` unit tests · `e2e/` — Playwright tests
- `reference/jhanav-source/` — frozen original engine (read-only; do not edit)
- `docs/superpowers/` — design spec + implementation plan
