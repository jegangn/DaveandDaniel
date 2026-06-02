# Jhanav's Math Adventure — Design Spec

A single-file HTML math-practice game for a 5-year-old on a Galaxy Tab S8 (landscape, 2560×1600 native, designed at **1280×800 logical** with `transform: scale()` to fill). Touch + S Pen. Offline after first load.

> Implementation note: all measurements below are in **logical CSS pixels** at the 1280×800 design size. The runtime scales the whole stage to fit the viewport with letterboxing.

---

## 1. Theme

### 🥇 Recommended: **Jungle Friends**
A sunny, leafy world of furry critters who share food, fix things, and climb trees. Concrete countable props (bananas, coconuts, mangoes, fireflies) make block-counting feel natural, and the climbing metaphor maps cleanly to carry/borrow. Warm, saturated, distinctly *not* corporate.

- **Mascot:** **Banji**, a young toucan with an oversized rainbow beak and a red bandana. Bright, plucky, gestures with wings. Pairs with two helpers — **Mo** the slow sloth (subtraction) and **Pip** the spotted mouse (multiplication).
- **Worlds (renamed):**
  - **Banana Hills** (Addition) — sunlit canopy, warm yellows + leaf greens
  - **Misty River** (Subtraction) — cool teal water with stepping stones
  - **Firefly Meadow** (Multiplication) — golden-hour grassland, glowing bugs
- **Vibe:** Sago Mini meets a children's-book illustration. Hand-drawn-feeling shapes, no neon, no glass, no gradients-into-white.

### Alternative 1: **Space Cadets**
A friendly cosmonaut tortoise named **Tito** in a bubble helmet, exploring planets. Carry/borrow as fuel pods rising/falling between stages of a rocket. Countables: stars, planets, asteroids. Palette: warm space — cream, ember, deep blueberry. *Risk: harder to make countable objects feel huggable than fruit.*

### Alternative 2: **Big Friendly Monsters**
**Glomp**, a fuzzy three-eyed lavender monster who eats snacks. Countables: cupcakes, donuts, chili peppers. Carry = a "big munch" sending 10 into a tens jar. Palette: cotton-candy primaries with high saturation. *Risk: monster-food aesthetic risks looking generic-app; mitigated with strong character poses.*

---

## 2. Color, Type, Spacing

### 2.1 Color tokens

**System (constant across worlds):**

| Token | Hex | Use |
|---|---|---|
| `--bg-paper` | `#FFF3DC` | Default surface (warm paper) |
| `--bg-card` | `#FFFAF0` | Raised card |
| `--ink` | `#2A1B0A` | Primary text & outlines |
| `--ink-soft` | `#6A4B28` | Secondary text |
| `--success` | `#4AD66D` | Correct flash |
| `--success-deep` | `#1F8A3E` | Slot glow shadow |
| `--gentle-no` | `#FF7A40` | Wrong feedback (warm coral, never red) |
| `--star` | `#FFC83A` | Earned stars |
| `--star-glow` | `#FFF1A8` | Star halo |
| `--lock` | `#A89878` | Locked-node grey-brown |

**World tints** (each world re-tints `--world-primary`, `--world-accent`, `--world-sky`, `--world-ground`):

| World | Primary | Accent | Sky | Ground |
|---|---|---|---|---|
| **Banana Hills** (Add) | `#FFB933` mango | `#FF7A40` papaya | `#7DD2F0` clear sky | `#4AAE3F` canopy green |
| **Misty River** (Sub) | `#3DC5C5` lagoon | `#4A9EFF` deep stream | `#A8E5E5` mist | `#5FAF9A` mossy bank |
| **Firefly Meadow** (Mult) | `#E89A2A` honey | `#7AB344` sage | `#F8D27A` golden sky | `#8A6A2E` warm earth |

**Block palettes (for tap-count / drag-groups):**
- Bananas — fill `#FFD13A`, outline `#7A4A08`, leaf `#4AAE3F`
- Coconuts — fill `#6A3A1A`, hairs `#3A1F08`, milk-dot `#FFF`
- Mangoes — fill `#FF7A1A`, blush `#FF3E6B`, outline `#7A2A04`
- Fireflies — fill `#FFE680`, glow `#FFF8C8`, outline `#6A4A08`

### 2.2 Typography

Two Google Fonts, embedded via single `@import` in the inline stylesheet. Both have generous x-height and rounded terminals — readable to an early reader, friendly to a non-reader who reads digit-glyphs only.

| Role | Font | Weight | Size scale |
|---|---|---|---|
| **Display** (titles, numbers in math problems, big buttons) | **Lilita One** | 400 (only weight) | 96 / 72 / 56 / 40 / 32 |
| **UI** (instructions, hints, label chips) | **Nunito** | 700, 900 | 28 / 22 / 18 |
| **Math digits in worksheet** | **Lilita One** | 400 | 120 (problem), 96 (answer slots), 64 (tray) |

**Digit tabular alignment**: math digits use `font-feature-settings: "tnum" 1, "lnum" 1;` so the column method aligns perfectly.

**Fallback stack:** `'Lilita One', 'Bungee', system-ui` for display; `'Nunito', 'Avenir Next', sans-serif` for UI. If web fonts fail to load, layout doesn't break — sizes still apply.

### 2.3 Spacing scale

Base unit **4px**. Tokens:

```
--s-0  : 0
--s-1  : 4
--s-2  : 8
--s-3  : 12
--s-4  : 16
--s-5  : 24
--s-6  : 32
--s-7  : 48
--s-8  : 64
--s-9  : 96
--s-10 : 128
--s-11 : 160
```

### 2.4 Radius

```
--r-sm : 12      buttons, small chips
--r-md : 20      digit tiles, answer slots
--r-lg : 32      cards, level panels
--r-xl : 48      mascot speech bubbles
--r-pill: 9999   pill buttons, world badges
```

### 2.5 Shadow (warm, never grey)

All shadows blend brown-orange, **never** flat black/grey. Two-layer for "chunky": a hard offset (depth) + a soft diffuse (ambient).

```
--sh-1  (lifted chip):
  0 3px 0 #C8985A,
  0 4px 10px rgba(120, 70, 20, 0.18)

--sh-2  (button rest):
  0 6px 0 #B07A40,
  0 8px 18px rgba(120, 70, 20, 0.24)

--sh-3  (card/tile rest):
  0 8px 0 #B07A40,
  0 14px 26px rgba(120, 70, 20, 0.28)

--sh-pressed:
  0 2px 0 #B07A40,
  0 3px 6px rgba(120, 70, 20, 0.2)
```

Pressed states reduce the hard offset (translateY simulates the button squishing down).

### 2.6 Animation easing tokens

```
--ease-pop    : cubic-bezier(0.34, 1.6, 0.5, 1)    chunky overshoot
--ease-soft   : cubic-bezier(0.45, 0.05, 0.25, 1)  gentle
--ease-snap   : cubic-bezier(0.25, 0.9, 0.3, 1.4)  magnetic
--ease-elastic: cubic-bezier(0.7, -0.5, 0.3, 1.5)  wrong-answer rebound
--ease-arc    : cubic-bezier(0.4, 0, 0.6, 1)       used WITH translateY trick for arcs
```

---

## 3. Screens

ASCII wireframes are roughly proportional, **not** to scale per character. Measurements are below each wireframe.

### 3.1 Splash / Home (`#screen-splash`)

```
┌──────────────────────────────────────────────────────────────┐
│                                                          ⚙   │
│                                                              │
│                         ╭───────────╮                        │
│                         │   BANJI   │  ← title in Lilita     │
│                         │   MATH    │     One, 96, 2-line    │
│                         ╰───────────╯                        │
│                                                              │
│                       (mascot illustration                   │
│                        540 × 540, breathing                  │
│                        idle, blinks every 4s)                │
│                                                              │
│                                                              │
│                ╭─────────────────────────────╮               │
│                │       TAP TO PLAY  ▶        │  ← 480 × 120  │
│                ╰─────────────────────────────╯               │
│                                                              │
│   (4 leaves drift across in 18s loop)                        │
└──────────────────────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| Title "BANJI MATH" | Lilita One 96, color `--ink`, drop-shadow `0 4px 0 #FFC83A` (yellow under-stroke). Top 80px, centered. |
| Mascot | 540 × 540 SVG centered. Idle: 4s cycle — slight `scale(1.02)` breathing + blink at 0/2.1s. |
| **TAP TO PLAY** button | 480 × 120, `--r-pill`, fill `--world-primary` (Banana Hills yellow), `--ink` text 56px, right-side play triangle (40px). Shadow `--sh-3`. Centered horizontally, bottom 120px. Animates a 2s pulse: outline ring expanding 1.0 → 1.18, fading out. |
| Settings cog ⚙ | 80 × 80, top-right 32px inset. Plain icon, `--ink-soft`. Long-press 1500ms opens parent-gated modal (3-digit "2+5+8 = ?" maths challenge). Tap-only does nothing (avoids accidental entry). |
| Background | `--world-sky` (#7DD2F0) flat upper, `--world-ground` (#4AAE3F) lower hill silhouette at y=540, 3 fluffy clouds drifting right→left over 30s loop. |

**Interaction:** Tap anywhere on the screen (not just the button) advances to World Map — kid-friendly fat hitbox. Mascot pose changes to "waving" during 0.4s transition.

---

### 3.2 World Map (`#screen-map`)

Three horizontally arranged world panels, with the path **continuing across** so it reads as one journey. Mascot stands on the current node.

```
┌────────────────────────────────────────────────────────────────────────┐
│  🏠                                            STARS: ★ 7 / 18  ━━━━━  │
│                                                                        │
│   ┌─ BANANA HILLS ─┐  ┌─ MISTY RIVER ─┐  ┌─ FIREFLY MEADOW ─┐         │
│   │                │  │                │  │                  │         │
│   │   ⑥           │  │   ⑥           │  │   ⑥             │         │
│   │     ◯─◯       │  │     ◯─◯       │  │     ◯─◯         │         │
│   │   ④─⑤         │  │   ④─⑤         │  │   ④─⑤           │         │
│   │  ◯  ◯          │  │  ◯  ◯          │  │  ◯  ◯           │         │
│   │ ②─③            │  │ ②─③            │  │ ②─③             │         │
│   │  🦜            │  │  🔒            │  │  🔒              │         │
│   │ ★★★            │  │                │  │                  │         │
│   └────────────────┘  └────────────────┘  └──────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| **Home button** 🏠 | 80 × 80 at top-left 32px inset. `--r-md`, fill `--bg-card`, icon `--ink`. Shadow `--sh-1`. |
| **Star meter** | Top-right. "STARS: ★ N / 18" in Nunito 900 28pt, star icon 32 × 32 `--star`. |
| **World panel** | 3 panels, each 380 × 660, gap 24px, centered. Header bar 88px tall with world name in Lilita One 40, world-tinted background. Body height 572px shows the path. |
| **Path** | Hand-drawn dashed line connecting 6 nodes in a meandering S-curve. Stroke `--ink` 6px, dash 14 / 10. Renders behind nodes. |
| **Node** | 100 × 100 circle, default `--r-pill`. States below. |
| **Mascot position** | 120 × 120, anchored to the current node with a tiny springy bob (1.5s loop). Pose: "thinking" — wing on chin. |
| **Path crossover** between worlds | When world 1 is complete, a vine bridges to world 2's first node (otherwise the bridge is rendered as a closed gate). |

**Node states (LevelNode component, see §4):**
- **locked** — `--lock` grey-brown, padlock 48px in centre, no number visible
- **unlocked-unplayed** — world-tinted, big white numeral, **pulsing outline** (4s ease-soft, outline expands 0 → 16px, opacity 0.6 → 0)
- **in-progress** (current) — slightly larger (110%), bouncy idle (0.5px translateY 1.2s loop)
- **complete-1★ / 2★ / 3★** — small star ribbon banner across the bottom of the node (60 × 24, fill `--star`)

**Interactions:**
- Tap unlocked node → 0.6s zoom transition into level (node scales to fill viewport, screen fades behind).
- Tap locked node → padlock shakes (3 × 6° in 0.3s) + soft "boing" sound. No text message.
- Tap home → return to splash.

---

### 3.3 Addition Level — Column Method (`#screen-add`)

5 problems per level. Right-to-left enforced answer entry. Carry animation when ones-sum ≥ 10.

```
┌──────────────────────────────────────────────────────────────┐
│ 🏠 ← MAP                          PROBLEM ●●○○○      ★ 2 / 3 │
│                                                              │
│                                                              │
│                         ╭───╮                                │
│                         │ 1 │  ← (carry digit, appears later)│
│                         ╰───╯                                │
│                                                              │
│              ┌─────┐  ┌─────┐                                │
│              │  4  │  │  7  │                                │
│              └─────┘  └─────┘                                │
│         ┌──┐ ┌─────┐  ┌─────┐                                │
│         │+ │ │  2  │  │  8  │                                │
│         └──┘ └─────┘  └─────┘                                │
│              ━━━━━━━━━━━━━━━                                 │
│              ┌─────┐  ┌─────┐                                │
│              │     │  │  5  │ ← filled / active glow         │
│              └─────┘  └─────┘                                │
│                                                              │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │  0   1   2   3   4   5   6   7   8   9            │     │
│   │ [_] [_] [1] [_] [_] [_] [_] [_] [_] [_]            │ ← tray
│   └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

**Layout dimensions (logical px):**

| Region | x | y | w | h |
|---|---|---|---|---|
| Top bar (home, progress, stars) | 0 | 0 | 1280 | 72 |
| Math worksheet area | 380 | 100 | 520 | 540 |
| Digit tray | 80 | 660 | 1120 | 120 |

**Math worksheet detail** (centered in worksheet area):

- **Digit cell size:** 100 × 120 (Lilita One 96).
- **Column gap:** 16px between tens and ones.
- **Operator** ("+" or "−"): 60 × 120 cell, left of the bottom number's tens column.
- **Horizontal line:** 280px wide, 6px thick `--ink`, drawn 16px below the bottom operand, 16px above the answer row.
- **Answer slots:** 100 × 120, `--r-md`, dashed outline 4px `--ink-soft`. When **active** (next to fill), outline becomes solid `--world-primary` with a 4s soft pulse halo (`box-shadow: 0 0 0 0 → 0 0 0 14px world-primary @ 0 → 0.5 → 0`).
- **Carry digit slot:** 60 × 60, positioned 8px above the tens column of the top operand. Hidden until carry animation completes.

**Digit tray:**

- Container: 1120 × 120, `--bg-card`, `--r-lg`, shadow `--sh-2`.
- 10 tiles (0–9), each 96 × 96, `--r-md`, gap 16px, centered.
- Each tile is a `DigitTile` (see §4) — fully draggable, with a soft glow halo (8px) in `--world-primary`.

**Smart tray subset (recommendation):** show all 0–9 initially. After the **active slot** becomes the answer's tens column, dim all tray digits to 0.3 opacity *except* the digit(s) that could be valid (only the answer-tens digit and the 0 if no carry); this is **never** explained, only shown. Wrong-twice hint (§3.8) intensifies the dimming further. (Alternative: only show valid candidates from the start. Rejected because it pre-solves the problem.)

**Right-to-left enforcement:**
- On level enter, the **ones** answer slot is active. Tens slot rejects drops (boing + bounce-back).
- After ones is filled (correctly), tens slot activates with a 0.3s `--ease-pop` highlight transition.
- If ones is wrong, slot wiggles (see §3.8) and tile flies back. Tens remains inactive.

**Carry animation:** see §5 — `CarryDigit` motion.

**Problem flow:**
1. Problem appears with a 0.4s fly-in (numbers drop from `y: -40` with `--ease-pop`, staggered 60ms each, left to right).
2. Kid fills ones slot. Correct → ones digit "settles" (0.2s scale 1.2→1).
3. If ones-sum ≥ 10, carry "1" animates up (see §5) — 0.9s total, ends with a satisfying "pop". Tens slot then becomes active.
4. Kid fills tens slot. Correct → full row of digits does a 0.4s celebration wiggle (3 × 4° in `--ease-elastic`).
5. **PROBLEM 1 of 5** dot fills. 0.5s pause. Next problem flies in from right.
6. After problem 5 correct → transition to Level Complete (§3.7).

**Star scoring (out of 3):**
- 3★: 0–1 wrong drops total across all 5 problems
- 2★: 2–4 wrong drops total
- 1★: 5+ wrong drops (completes the level regardless — no-fail)

---

### 3.4 Subtraction Level — Column Method (`#screen-sub`)

Same layout as Addition. World tint: Misty River (teal). Borrow animation when top-ones < bottom-ones.

```
                ╭───╮                        ← regrouped tens digit
                │ 3 │  (was "4", crossed out below)
                ╰───╯
                ┌─≋─┐ ┌─────┐
                │ 4ˣ│ │ 12  │  ← original 4 crossed; ones is now "12" (10 + 2)
                └───┘ └─────┘
           ┌──┐ ┌─────┐ ┌─────┐
           │ −│ │  2  │ │  8  │
           └──┘ └─────┘ └─────┘
                ━━━━━━━━━━━━━
                ┌─────┐ ┌─────┐
                │     │ │     │ ← right-to-left answer entry
                └─────┘ └─────┘
```

**Borrow animation:** see §5 — `BorrowTen` motion. Critically: this **always** plays automatically when needed; the kid is never asked to perform the borrow themselves. The role of the kid is to read the regrouped numbers and answer.

**Differences from Addition:**
- Operator cell shows "−" (Lilita One 96, `--ink`).
- World colors: panel background `--world-sky` (#A8E5E5), active slot `--world-primary` (#3DC5C5).
- Mascot in the corner is **Mo** the sloth, hanging from a branch, who slowly raises a thumbs-up on each correct answer.

---

### 3.5 Multiplication — Tap-Count (`#screen-mult-tap`)

Levels 1–3 of Firefly Meadow. Shows problem (e.g. **3 × 4**) and three grouped clusters of 4 fireflies. Tap each to "wake it up" and reveal its running count.

```
┌──────────────────────────────────────────────────────────────┐
│ 🏠 ← MAP                          PROBLEM ●●○○○      ★ 2 / 3 │
│                                                              │
│                                                              │
│              ┌───┐    ┌───┐    ┌───┐                         │
│              │ 3 │ ×  │ 4 │  = │ ? │                         │
│              └───┘    └───┘    └───┘                         │
│                                                              │
│                                                              │
│    ╭─────────────╮  ╭─────────────╮  ╭─────────────╮         │
│    │  ✶   ✶      │  │  ✶   ✶      │  │  ✶   ✶      │  ← 3 groups
│    │    ✶   ✶    │  │    ✶   ✶    │  │    ✶   ✶    │    of 4
│    ╰─────────────╯  ╰─────────────╯  ╰─────────────╯  fireflies
│                                                              │
│                  ╭──────────────────╮                        │
│                  │  TOTAL:  ┌──┐    │                        │
│                  │          │  │    │  ← appears after       │
│                  ╰──────────────────╯     all tapped         │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │  0  1  2  3  4  5  6  7  8  9                      │     │
│   └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

**Layout dimensions:**

| Region | x | y | w | h |
|---|---|---|---|---|
| Problem (a × b = ?) | 460 | 100 | 360 | 130 |
| 3 firefly groups | 80 | 270 | 1120 | 280 |
| Total slot reveal | 460 | 580 | 360 | 100 |
| Digit tray | 80 | 700 | 1120 | 80 |

**Problem display:**
- Each operand is a 120 × 130 chip with Lilita One 96 numeral, `--r-lg`, fill `--bg-card`, shadow `--sh-2`.
- × symbol: 60 × 130 Lilita One 80 in `--ink`.
- "=" then "?" tile (120 × 130, dashed outline, pulsing).

**Block clusters:**
- 3 group containers, each 320 × 280, gap 80px, `--r-xl` rounded "lily-pad" shapes filled `--world-sky` (#F8D27A pale yellow), faint outline.
- Within each pad, 4 fireflies arranged in 2-2 diamond. Each firefly is a 96 × 96 SVG (yellow body + wings + dim glow).
- **Untapped firefly** opacity 0.55, no glow, gentle 2s wing-flap loop.
- **Tapped firefly** opacity 1.0, **animated glow** halo (60px radial), and a 32 × 32 white circle appears above with the running count number (Lilita One 32, `--ink`). Stays lit for the rest of the problem.

**Tap interaction:**
- On tap: firefly scales 1.0 → 1.4 → 1.05 in 0.35s `--ease-pop`. Glow blooms. Count number flies in from the firefly's centre, 0.25s `--ease-pop`. Audio: short "ting" with pitch rising per count.
- Count is **global** — across all groups. So if you tap pads in any order, the counter increments 1, 2, 3, ... 12. Tap **order is not enforced** so the kid can count however they like — but if they re-tap a lit firefly, it just plays a soft `tip-tap` confirmation, doesn't increment.
- When the final firefly is tapped, "TOTAL: __" panel does a 0.4s scale-in. Digit tray fades in below.

**Answering:** drag digits into the total slot (one or two slots for 2-digit totals).

**No-fail variant:** if kid can't count, after 20s of inactivity past first tap, the mascot **Pip** flies in (180 × 180 SVG, top-right) and points at each unlit firefly in sequence with a 0.6s cadence. Tapping any continues the count.

---

### 3.6 Multiplication — Drag-Groups (`#screen-mult-drag`)

Levels 4–6 of Firefly Meadow. "Make 3 groups of 4." Empty group slots + a pile of single blocks (mangoes here). Drag blocks into slots; auto-arrange when they land; slot glows when count is correct.

```
┌──────────────────────────────────────────────────────────────┐
│ 🏠 ← MAP                          PROBLEM ●●○○○      ★ 2 / 3 │
│                                                              │
│              ┌───┐    ┌───┐    ┌───┐                         │
│              │ 3 │ ×  │ 4 │  = │ ? │                         │
│              └───┘    └───┘    └───┘                         │
│                                                              │
│  ╭───────────╮  ╭───────────╮  ╭───────────╮                 │
│  │           │  │           │  │           │  ← 3 empty      │
│  │           │  │           │  │           │    group trays  │
│  │     0     │  │     0     │  │     0     │                 │
│  ╰───────────╯  ╰───────────╯  ╰───────────╯                 │
│                                                              │
│   ╔═══════════════ PILE OF MANGOES ═══════════════╗          │
│   ║   🥭  🥭  🥭  🥭  🥭  🥭  🥭  🥭  🥭  🥭  🥭  🥭   ║          │
│   ║                                              ║          │
│   ╚══════════════════════════════════════════════╝          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout dimensions:**

| Region | x | y | w | h |
|---|---|---|---|---|
| Problem | 460 | 80 | 360 | 110 |
| 3 group trays | 100 | 220 | 1080 | 280 |
| Pile of blocks | 100 | 540 | 1080 | 200 |

**Group tray** (each 320 × 280, gap 60px):
- Background `--bg-card`, `--r-xl`, dashed outline 5px `--world-accent`. 
- Inside: 2×2 grid of "slot ghosts" (96 × 96 dashed circles, opacity 0.3) showing where blocks should go.
- Bottom-center: count chip `0 / 4` in Nunito 900 28, updates as blocks land. When full and correct, count chip flips to **★ 4** (Lilita One 36, `--star`).
- **States:** empty (ghost grid visible), partial (some ghosts filled), full-correct (glowing green outline + slot-fill anim), full-overflow (extra blocks bounce back out — not allowed).

**Block pile:**
- 12 mango blocks (more than needed — kid has to choose 3×4 = 12). 96 × 96 each. Arranged in a wavy row with slight rotation variance (`±8deg`), like fruit piled in a basket.
- Slight gentle wobble idle (1.5s, rotate `±2deg`).
- **Pickup:** see §5 — `Block.pickup`.

**Auto-arrange:** when a block is dropped into a tray, it snaps to the nearest empty ghost slot with 0.25s `--ease-snap` and "settles" with a 0.15s scale 1.1→1 bounce. Audio: soft "plonk".

**Magnetic drop:** if a block is released within 60px of a tray, it snaps in. Otherwise it bounces back to the pile.

**Completion flow:**
1. All 3 trays glow green at 4/4. Mascot Pip claps (0.6s loop, 3 times).
2. After 0.8s, the trays slide aside (translate 0 → ±260px x 0.5s `--ease-soft`) and a single "How many total?" answer panel rises from the bottom.
3. Digit tray fades in. Answer is the product (e.g. 12). Two-digit answer enforced right-to-left as in §3.3.

---

### 3.7 Level Complete (`#screen-complete`)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                        LEVEL CLEAR!                          │
│                                                              │
│                    ★          ★          ★                   │
│                  (reveal sequentially, with ding)            │
│                                                              │
│                                                              │
│                    (mascot doing victory pose                │
│                     with confetti behind)                    │
│                                                              │
│                                                              │
│      ┌─────────────┐   ┌─────────────┐   ┌────────────┐      │
│      │  ↻  AGAIN   │   │   ▶  NEXT   │   │  🏠  MAP   │      │
│      └─────────────┘   └─────────────┘   └────────────┘      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout:**
- Title "LEVEL CLEAR!" Lilita One 96, `--ink`, drop-shadow `0 4px 0 --world-primary`. y=80, centred.
- 3 star slots, each 160 × 160, gap 48px. Empty state: pale outline of star, opacity 0.25. Earned state: full `--star` fill with `--star-glow` halo, scale 1 with the reveal anim.
- Mascot: 360 × 360 SVG centered y=320, doing a triumphant pose (wings up, beak open).
- 3 buttons: each 280 × 110, `--r-pill`, Lilita One 36, evenly spaced. Colors:
  - **AGAIN** — `--bg-card` with `--ink` text
  - **NEXT** — `--success` (#4AD66D) with white text — *only enabled if next level exists in same world; otherwise gets a celebratory "world clear" style*
  - **MAP** — `--bg-card` with `--ink` text

**Star reveal animation:** see §5.

**Confetti:** 80 paper-shape particles (rect + tear-drop), colors drawn from world palette, falling 2.5s with rotation and physics. CSS-only is possible (keyframed translate + rotate per particle), but JS is cleaner — recommend a small particle JS routine (no library).

**Background:** flat `--world-sky` with 5 large abstract leaf shapes drifting up (CSS animation, opacity 0.25). World-themed.

---

### 3.8 Wrong-answer feedback (overlay state, no new screen)

Applies to all level screens.

**Wrong digit drop:**
1. Tile snaps to slot position over 0.08s.
2. Slot **flashes** `--gentle-no` (#FF7A40) outline for 0.2s.
3. Tile **bounces back** to tray along an arc — `--ease-elastic`, 0.45s. Source position +24px y at midpoint.
4. Slot wiggles after tile leaves: 4 wiggles ±5° over 0.4s, `--ease-elastic`.
5. Audio: warm low **"boing"** (~180 Hz down to 90 Hz, 0.25s).
6. **Never** show a red X, frown, or text. The kid sees "that tile didn't want to stay there".

**Two-wrongs hint (per slot, per problem):**
- Activates after 2 wrong drops on the same active slot.
- **Visual:** tray digits that are *not* the correct answer dim to 0.18 opacity over 0.6s and shrink slightly (`scale(0.92)`). The correct digit retains full size and gets a slow `--star-glow` pulse halo (2s loop, scale 1 → 1.05).
- **Mascot:** the in-corner mascot leans in and points at the tray with a wing — 0.6s pose change.
- **Audio:** very soft "hmm?" sustained note (E5, 0.6s, sine, low volume).
- Hint persists until the slot is filled correctly, then everything resets.

*(Alternative considered: highlight the active math column with a coloured wash. Rejected because it doesn't help the kid choose a digit — only locates the problem they already see. The dim-other-digits version teaches.)*

---

## 4. Components

State matrix format: `[default | hover | active/dragging | dropped-correct | dropped-wrong | disabled]`. "Hover" applies to S Pen proximity and is usually identical to default.

### 4.1 `DigitTile` (0–9 draggable digit)

| Spec | Value |
|---|---|
| Size | 96 × 96 |
| Radius | `--r-md` (20) |
| Fill | `--bg-card` |
| Text | Lilita One 64, `--ink`, centered |
| Border | 4px solid `--ink` |
| Shadow rest | `--sh-2` |
| Hit target | 116 × 116 (10px padding inflation) |

**States:**

| State | Spec |
|---|---|
| default | as above |
| dragging | `scale(1.15)`, shadow expands to `--sh-3` + drops down 8px (looks lifted), z-index 200, mouse-follow with 80ms lag damping |
| dropped-correct | tile **morphs into slot** — see Animation #3 |
| dropped-wrong | bounce-back animation #2 |
| disabled (dimmed by hint) | opacity 0.18, `scale(0.92)`, pointer-events still active but visually de-emphasized |

### 4.2 `AnswerSlot`

| Spec | Value |
|---|---|
| Size | 100 × 120 |
| Radius | `--r-md` (20) |
| Fill | transparent |
| Border | 4px dashed `--ink-soft` |
| Text size when filled | Lilita One 96 |

**States:**

| State | Spec |
|---|---|
| empty (inactive) | dashed `--ink-soft` |
| empty (active — next to fill) | solid 5px `--world-primary` border, halo pulse: `box-shadow: 0 0 0 0 var(--world-primary)` → `0 0 0 16px transparent`, 1.8s loop |
| filled-correct | solid `--ink` border, digit `--ink`, brief `--success` outline flash (0.3s) on landing |
| filled-wrong | NEVER reached — wrong drops are always rejected, tile flies back |
| wrong-flash (rejection) | `--gentle-no` border for 0.2s, then return to active |
| locked (right-to-left enforcement) | dashed `--ink-soft` at 0.5 opacity |

### 4.3 `Block` (countable object — banana, coconut, mango, firefly, …)

| Spec | Value |
|---|---|
| Size | 96 × 96 |
| Hit target | 116 × 116 |
| Idle | gentle 2s wobble (`rotate(±2deg)`) |

**States:**

| State | Spec |
|---|---|
| default | full opacity, idle wobble, soft shadow `--sh-1` |
| pre-tap (tap-count game) | opacity 0.55, no shadow, slow wing flutter / shimmer specific to block type |
| tapped (counted) | opacity 1.0, 60px radial glow halo `--star-glow`, count number badge above (32 × 32) |
| dragging | `scale(1.15)`, lifted shadow, rotate cleared to 0deg |
| in-group (settled in tray) | scale 1.0, no shadow, rotate cleared, fixed position in 2×2 grid |
| glow-correct (group complete) | green halo 80px, slow pulse 1.8s |

### 4.4 `GroupTray`

| Spec | Value |
|---|---|
| Size | 320 × 280 |
| Radius | `--r-xl` (48) |
| Fill | `--bg-card` |
| Border | 5px dashed `--world-accent` |
| Inner grid | 2 × 2 ghost slots (96 × 96 dashed circles, opacity 0.3) |

**States:**

| State | Spec |
|---|---|
| empty | all 4 ghosts visible, count "0 / 4" |
| partial | n ghosts visible, n filled, count "n / 4" |
| full-correct | green solid outline 5px `--success-deep`, halo 80px, count "★ 4" Lilita One 36, count chip fills `--star` |
| reject (overflow attempt) | tray shakes 4× 6° 0.3s, block bounces out |

### 4.5 `LevelNode`

| Spec | Value |
|---|---|
| Size | 100 × 100 (in-progress 110 × 110) |
| Radius | `--r-pill` (full circle) |
| Border | 5px solid `--ink` |

**States:**

| State | Spec |
|---|---|
| locked | fill `--lock`, padlock SVG 48 × 48 centered, no number |
| unlocked-unplayed | fill `--world-primary`, white numeral Lilita One 56, **pulsing halo** (1.6s ease-soft, box-shadow 0 → 16px `--world-primary` @ 0.6 → 0) |
| in-progress (current) | as unlocked but 110%, mascot stands here with 1.2s idle bob |
| 1-star | fill `--world-primary`, ribbon below with 1 `--star` icon |
| 2-star | as 1-star with 2 stars |
| 3-star | as 1-star with 3 stars + tiny rotating sparkle SVG above (loops 4s) |
| just-unlocked (transition) | padlock breaks (see Anim §5), then morphs to unlocked-unplayed |

### 4.6 `CarryDigit` / `BorrowTen` (animated overlays, see §5)

Both are 60 × 60 chips, Lilita One 40 numeral, fill `--world-primary` (carry) or `--world-accent` (borrow), `--r-md`. Appear from a source cell and animate to a target cell along an arc.

### 4.7 `PrimaryButton`

| Spec | Value |
|---|---|
| Size | 280 × 110 (chunky default); pill variant 480 × 120 |
| Radius | `--r-pill` |
| Text | Lilita One 36 (chunky) / 56 (pill) |
| Shadow | `--sh-3` rest, `--sh-pressed` active |

**States:**

| State | Spec |
|---|---|
| default | full color fill, rest shadow |
| active (pressed) | `translateY(6px)`, shadow → `--sh-pressed`, brief flash `--star-glow` overlay 0.15s |
| disabled | desaturated to `--ink-soft` fill, opacity 0.6, no shadow, ignore taps |

### 4.8 `StarMeter` (the 3-star indicator)

Used on the Level Complete screen and as a smaller version (32 × 32) on the world map for accumulated stars.

| Spec | Value |
|---|---|
| Star icon | 5-point classic, fill `--star`, outline 3px `--ink` |
| Halo | radial `--star-glow` 40% opacity, blur 12px |
| Empty | outline only, opacity 0.25, no halo |

### 4.9 `MathColumn`

Layout container for the worksheet (used in §3.3 and §3.4).

```
┌─────────┐  ┌─────────┐
│  TENS   │  │  ONES   │     row 1: top operand digits
└─────────┘  └─────────┘
     ↑           ↑
     │           │
┌──┐ ┌─────────┐  ┌─────────┐
│OP│ │  TENS   │  │  ONES   │ row 2: operator + bottom operand
└──┘ └─────────┘  └─────────┘
     ━━━━━━━━━━━━━━━━━━━━━━     row 3: solid line 6px --ink
┌─────────┐  ┌─────────┐
│  TENS?  │  │  ONES?  │     row 4: answer slots
└─────────┘  └─────────┘
```

**Alignment grid:**
- Column width 100, gap 16, operator 60. Total: 60 + 16 + 100 + 16 + 100 = 292px wide. Center on viewport.
- Row gap 16. Total height: 120 + 16 + 120 + 16 + 6 + 16 + 120 = 414px.
- Carry slot anchored: top of tens column −68px (12px gap above row 1).
- Borrow slot anchored: top of tens column −68px (replaces struck-out tens visually).
- All digits use tabular numerals so the columns are mathematically aligned, not visually approximated.

---

## 5. Animations

For each: trigger, duration, easing, motion description, implementation note. Default implementation: **CSS keyframes** unless the path involves geometry that depends on runtime element positions (then JS).

### 5.1 Tile pickup (DigitTile drag start)

| | |
|---|---|
| Trigger | `pointerdown` on a tile in the tray |
| Duration | 0.12s |
| Easing | `--ease-pop` |
| Motion | `scale(1.0 → 1.15)`, `translateY(0 → -8px)`, shadow grows from `--sh-2` to `--sh-3`, z-index → 200 |
| Audio | soft "click-up" (200 Hz blip, 60ms) |
| Implementation | CSS class `.dragging` |

### 5.2 Tile bounce-back (wrong drop)

| | |
|---|---|
| Trigger | drop on wrong/locked slot |
| Duration | 0.45s |
| Easing | `--ease-elastic` |
| Motion | tile flies from drop point back to tray slot along a parabolic arc. Apex 24px above midpoint. Implementation: JS computes start/end/midpoint and animates `left` + `top` + `transform: rotate(±8deg)`. Or CSS keyframes generated per-instance with `--apex-y` custom prop. |
| Audio | warm "boing" (180 Hz → 90 Hz, 250ms) |
| Implementation | JS (positions are runtime) |

### 5.3 Tile snap-in (correct drop)

| | |
|---|---|
| Trigger | drop on correct active slot |
| Duration | 0.22s |
| Easing | `--ease-snap` |
| Motion | tile snaps to slot position, scales 1.15 → 1.0 with brief overshoot to 0.96 at 0.18s. Slot border flashes `--success` outline (0.3s fade). |
| Audio | satisfying "click-down" (520 Hz, 80ms) + a soft chime 0.05s later (E6, 200ms triangle) |
| Implementation | JS to move, CSS for scale + outline flash |

### 5.4 Carry "1" float (addition, ones-sum ≥ 10)

| | |
|---|---|
| Trigger | Ones slot fills correctly AND ones-sum ≥ 10 |
| Duration | 0.9s total (broken into 3 phases) |
| Phases | (a) **birth** 0.0–0.2s — small "1" chip appears at center of ones-answer slot, scales 0 → 1.0, `--ease-pop`; (b) **arc** 0.2–0.7s — chip travels along a quadratic curve from ones-slot up to carry-slot above tens-top-digit. Apex offset: 80px above midpoint, slight 6° rotation at apex; (c) **settle** 0.7–0.9s — chip lands in carry slot, scales 1.1 → 1.0, brief glow halo |
| Easing | (a) `--ease-pop`; (b) `--ease-arc`; (c) `--ease-snap` |
| Audio | "whoosh" rising in pitch (300 Hz → 800 Hz, 500ms, lowpass) over the arc; tiny "tink" on landing |
| Visual extras | particles trail behind the chip (~6 small dots, fading) during the arc |
| Implementation | JS (computes start/end pixel positions); animates with a custom `requestAnimationFrame` loop using `t² → t` Bezier sampling |

### 5.5 Borrow "10" descent (subtraction, top-ones < bottom-ones)

| | |
|---|---|
| Trigger | After the tens-answer slot becomes active and top-ones < bottom-ones |
| Duration | 1.2s total |
| Phases | (a) 0.0–0.3s — tens digit of top operand gets a red diagonal strikethrough (drawn as an SVG line). Above it, a new digit (one less) fades in over 0.2s; (b) 0.3–0.9s — a "10" chip drops from the tens column down to the ones column along a slightly curved path (curl outward then back), `--ease-arc`. (c) 0.9–1.2s — chip merges with the ones digit; ones digit visually updates to "12" (or whatever new value) by morphing — old digit fades out 0.15s while new digit fades in. |
| Easing | (b) `--ease-arc` with downward gravity (slight acceleration at end) |
| Audio | "schwoop" descending (600 Hz → 200 Hz lowpass noise + tonal blend, 600ms); soft "thunk" on merge |
| Implementation | JS — runs automatically (kid is not asked to perform it). Mascot Mo in the corner does a slow nod during phase (b). |

### 5.6 Block tap-count light-up

| | |
|---|---|
| Trigger | tap on an untapped block (firefly, banana, etc.) |
| Duration | 0.35s |
| Easing | `--ease-pop` |
| Motion | block scales 1.0 → 1.4 → 1.05, opacity 0.55 → 1.0; radial glow halo blooms (0 → 60px radius, opacity 0 → 0.7 → 0.55 sustain); count number badge flies in above the block from `scale 0 + y+20` to `scale 1 + y 0` |
| Audio | "ting" with pitch rising per count (start C5 = 523 Hz, each tap +60 Hz, capped at C7) |
| Implementation | CSS class toggle for the glow + scale; JS to position and reveal the count badge |

### 5.7 Block fly-in (level intro)

| | |
|---|---|
| Trigger | Level screen entry, after layout settles |
| Duration | 0.6s (0.04s stagger per block) |
| Easing | `--ease-pop` |
| Motion | blocks fly in from `(rand x ±60, y -200)` to their target position; rotation `random ±20deg → 0` then settles to idle `±2deg`. Opacity 0 → 1 over first 0.2s. |
| Audio | soft "rustle" — a series of pizzicato blips (~30ms each, 600 Hz, 5% volume per block) |
| Implementation | JS staggered with `setTimeout` or `Web Animation API` keyframes |

### 5.8 Star reveal (Level Complete)

Three stars revealed sequentially with escalating intensity.

| Star # | Start delay | Duration | Motion | Audio |
|---|---|---|---|---|
| ★1 | 0.4s | 0.5s | star drops from y=-80 with `--ease-pop`, scales 0 → 1.3 → 1.0, halo blooms | "ding" (E5, 250ms) |
| ★2 | 1.1s | 0.6s | same with bigger overshoot (1.5 → 1.0), brighter halo, 3 sparkle particles burst | "ding-ding" (E5 + G5, 300ms) |
| ★3 | 1.9s | 0.8s | same with biggest overshoot (1.7 → 1.0), full radial particle burst (12 particles), screen-wide gentle white flash 6% opacity 0.2s | "TA-DA" 3-note rising (E5 → G5 → C6, 600ms, sustain on C6) |
| If only 2 stars | ★3 slot stays empty (pale outline only, no animation) | | | |
| If only 1 star | ★2 + ★3 empty | | | |

After all stars revealed, mascot 0.6s celebration pose change, then buttons fade in over 0.4s.

### 5.9 Mascot idle + celebration

**Idle (any screen, ambient):**
- 4s loop. Breathing: scale Y 1.0 → 1.015 → 1.0 with `--ease-soft`. Blink: at 0s and 2.4s, lids close for 90ms.
- Every ~7s: random secondary motion — wing-stretch (0.5s), head tilt (0.4s), tail-feather flick (0.3s). One at a time; the next idle frame is randomised.

**Celebration (level complete):**
- 0.8s loop, plays 3 times then settles.
- Wings up at 0.0s, head back at 0.2s, beak open at 0.3s, return at 0.6s. Body bobs up 6px at 0.2s and lands back at 0.6s with a brief squash-stretch.

**Implementation:** CSS keyframe animations on SVG groups (`<g>`s for wing, head, body, etc.). Total: ~8 named animations, swapped via class names on the mascot root.

### 5.10 Locked node unlock (transition into a new world or after a level completes that unlocks the next)

| | |
|---|---|
| Trigger | level complete, on return to map, if a level was just unlocked |
| Duration | 1.6s |
| Phases | (a) 0–0.4s — locked node grows slightly (scale 1 → 1.06) and shakes (4 × 6°). Padlock starts wobbling; (b) 0.4–0.9s — padlock splits in half along a diagonal, both halves fall away with gravity + rotation, fading at 0.8s; (c) 0.9–1.4s — node fill morphs from `--lock` to `--world-primary`, white numeral fades in, pulsing halo starts; (d) 1.4–1.6s — small confetti burst (8 particles) around the node |
| Audio | (a) build-up rumble (low noise rising, 400ms); (b) "POP" (220 Hz square, 60ms) + soft snap of the lock breaking; (c) ascending chime sequence (C5 → E5 → G5, 300ms each); (d) tinkle |
| Implementation | JS to handle the path morph / sequential animation. CSS for the steady-state pulsing afterward. |

---

## 6. Sound palette

All sounds are **synthesized via Web Audio API** (no audio files). Mostly short — under 600ms. Always warm and soft; never harsh saw/square at high volume.

| Moment | Character | Length | Synthesis notes |
|---|---|---|---|
| Tile pickup | soft "click-up" | 60ms | Triangle 200 Hz, quick attack/release; +tiny noise burst |
| Tile drop (correct) | "click-down" + chime | 280ms | Triangle 520 Hz (80ms) + sine 1318 Hz (E6, 200ms) layered |
| Tile drop (wrong) | warm "boing" | 250ms | Triangle freq sweep 180 → 90 Hz, lowpass 800 Hz |
| Slot fill (correct settle) | bright "tink" | 120ms | Sine 1568 Hz (G6), exponential decay |
| Carry "1" whoosh | swooping rising | 500ms | Noise → bandpass 300 → 800 Hz, slight gain swell at end |
| Borrow "10" whoosh | descending schwoop | 600ms | Noise → lowpass 600 → 200 Hz; layered triangle 440 → 220 Hz |
| Block tap (firefly etc.) | "ting" | 180ms | Sine, pitch = 523 + (count × 60) Hz, capped at 2093 |
| Group tray full | "doot-doot" | 220ms | Two sine notes C5 + E5 |
| Star ding (1) | single chime | 250ms | Sine E5 (659) + 3rd harmonic |
| Star ding (2) | two-note chime | 300ms | E5 + G5 in sequence |
| Star ding (3) — fanfare | "ta-da" | 600ms | E5 → G5 → C6, square + triangle layered, soft attack |
| Level complete (overall) | overlapping chimes | 1.6s | A short arpeggio C5-E5-G5-C6-E6-G6, triangle, with reverb-ish allpass shimmer |
| Node unlock pop | sub-pop | 80ms | Square 220 Hz, 30ms attack 50ms decay |
| Map node tap (locked) | soft "no" | 200ms | Same as boing but quieter and lower (110 Hz → 70 Hz) |
| Mascot acknowledge | tiny "chirp" | 100ms | Two quick triangle notes G6 + B6 |
| Hint activate (after 2 wrongs) | sustained "hmm?" | 600ms | Soft sine E5, slow attack 150ms / slow decay 300ms, very low volume (–18 dB) |
| Page transition | brief "swoosh" | 280ms | Lowpassed noise sweep, 1500 Hz → 200 Hz |

**Master:**
- All sounds routed through a master gain set to 0.7.
- A simple convolver-less reverb (1 allpass + 1 short delay) is applied to chimes/dings only, not to UI clicks.
- Parent settings cog has a single "Sounds On / Off" toggle (no volume slider — kid-safe).

---

## 7. Asset list

Everything is **inline SVG** in the HTML file. No external image files. No raster.

| Asset | Detail | Where |
|---|---|---|
| Mascot Banji (toucan) | 1 SVG with grouped parts: wing_left, wing_right, body, head, beak, bandana, tail. Each in its own `<g>` for animation. ~6 colors. Roughly 200 nodes. | Splash, Map, Add levels, Level Complete |
| Mascot Mo (sloth) | Smaller (90 × 120), grouped: body, arm, branch. | Subtraction levels |
| Mascot Pip (mouse) | 90 × 90, grouped: body, ears, tail. | Multiplication levels |
| Padlock | 48 × 48, grouped shackle + body (for break animation) | Locked level nodes |
| Star | 5-point, 80 × 80, with halo as a separate underlayer | Stars throughout |
| Block: banana | 96 × 96, 5 colors | Add level blocks if used as visualisers (optional); Mult tap-count alt set |
| Block: coconut | 96 × 96 | Sub level visualisers |
| Block: mango | 96 × 96 | Mult drag-groups |
| Block: firefly | 96 × 96, with separate glow layer | Mult tap-count |
| Group tray "lily-pad" | 320 × 280, simple rounded ovoid with leaf veins | Mult drag-groups |
| World icons | 3 tiny icons (banana, water-drop, sun) | World panel headers, map |
| Leaf particles | 1 SVG, drifted 3 ways via JS instances | Splash, Level Complete background |
| Confetti shapes | 4 SVGs (rect, tear, circle, zigzag), used by particle system | Level Complete |
| Path "dashes" + vine connector | drawn as an SVG `<path>` directly in the map; not a separate asset | World map |
| Speech bubble (for hint mascot) | rounded path with tail, generated in code | Hint moments |

**Total inline SVG budget:** aim for under **120 KB** of SVG markup in the single HTML file. The font CSS adds ~3 KB. JS for animations + audio synth + state: ~25 KB. Single file should fit comfortably under 200 KB total.

**Fonts:** Lilita One + Nunito loaded once via a single `@import url('https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@700;900&display=swap')`. Once cached by the browser, the game is offline-capable. (If strict offline is required pre-first-online-load, the engineer should self-host the WOFF2 files inline as base64 in `@font-face` data URIs — adds ~80 KB.)

---

## 8. Implementation outline (for engineer)

Brief — concrete enough to start.

- **State model**: single global `state` object with `world`, `level`, `problemIndex`, `wrongCount`, `starsByLevel: Map`, `currentMascotPose`, `dragSourceTile`, `activeSlot`.
- **Layout**: `#stage` is 1280 × 800 fixed; a `resize` handler computes `scale = min(vw/1280, vh/800)` and applies `transform: scale(scale)` + centers via flexbox. Letterbox on body.
- **Screens** are 5 siblings inside `#stage`, each absolutely positioned, with one `.active` class at a time. Transitions: 0.4s `opacity` + 0.4s `transform: scale(0.96 → 1)` on enter, reverse on leave.
- **Drag**: pointer-events API (`pointerdown` / `pointermove` / `pointerup`). One `dragState` object. Hit-tests against `[data-droptarget]` elements; use `Element.getBoundingClientRect()` per move.
- **Audio**: single `AudioContext`. All sounds are short functions that build oscillator + gain nodes per play. Reuse buffer for noise where useful.
- **Persistence**: `localStorage` (required). Persist star progress so Jhanav's wins survive tab refresh / reboot. Keys: `bm.stars.{worldId}.{levelIdx}` → 1/2/3. On launch, hydrate state from `localStorage`; on every level-complete, write the new star count if it improves on the prior best.
- **Problem generator**: per-level seed table (5 problems per level) — hand-curated so difficulty climbs cleanly. Don't use random within a level. Seed table embedded as a JS literal.

**Suggested problem seeding (Banana Hills, addition):**
- Level 1: no-carry 2-digit + 1-digit (12+3, 21+4, 13+5, 32+6, 41+5)
- Level 2: no-carry 2-digit + 2-digit (12+13, 21+34, 25+22, 41+15, 33+24)
- Level 3: first carry, single-carry on ones (15+6, 18+4, 23+8, 27+5, 19+7)
- Level 4: carry with 2-digit + 2-digit (16+25, 27+18, 35+27, 48+23, 56+27)
- Level 5: two-digit + two-digit, mixed carry/no-carry (14+22, 17+8, 36+27, 25+13, 48+19)
- Level 6: a small challenge — final problem has carry into tens (47+38, 56+24, 39+27, 65+18, 49+36)

Similar curated tables for Misty River (subtraction) and Firefly Meadow (multiplication: 2×3, 3×2, 3×3, 2×5, 4×3, 3×4, 5×3, 4×5; drag-groups for ×4–×6).

---

## 9. Confirmed decisions

All confirmed by parent during brainstorm:

1. **Theme:** Jungle Friends (Banji/Mo/Pip).
2. **Game structure:** level-based world map, 3 worlds × 6 levels.
3. **Input:** drag-and-drop digit tiles.
4. **Difficulty ceiling:** 2-digit with carry/borrow (addition + subtraction); multiplication up to 5×5.
5. **Multiplication mechanic:** tap-count (L1–L3), drag-groups (L4–L6).
6. **Carry/borrow:** auto-animated; child only places digits.
7. **Wrong-answer feedback:** bounce-back, then dim-other-tiles hint after 2 wrong drops on the same slot.
8. **Level length:** 5 problems per level (~2 min).
9. **Audio:** sound effects only — no music, no voice narration.
10. **Persistence:** `localStorage` (required).
11. **Score:** stars only — 3★ (0–1 wrong) / 2★ (2–4 wrong) / 1★ (5+ wrong, no-fail).
12. **Negative-answer subtraction:** never — subtraction problems seeded so top ≥ bottom.
13. **Multiplication beyond ×5:** out of scope for v1.
14. **Parent gate:** long-press cog → math challenge.
15. **Reading direction:** left-to-right (English).
