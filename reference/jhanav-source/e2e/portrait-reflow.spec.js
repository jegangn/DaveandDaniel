import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel, dragDigitToSlot } from './helpers/math.js';

// iPhone 14 dimensions — representative modern phone.
const PHONE_PORTRAIT = { width: 390, height: 844 };
const PHONE_LANDSCAPE = { width: 844, height: 390 };
const TABLET_LANDSCAPE = { width: 1280, height: 800 };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('portrait phone viewport sets data-orient="portrait" on stage', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  const orient = await page.locator('#stage').getAttribute('data-orient');
  expect(orient).toBe('portrait');
});

test('landscape phone viewport sets data-orient="landscape" on stage', async ({ page }) => {
  await page.setViewportSize(PHONE_LANDSCAPE);
  await page.goto('/');
  const orient = await page.locator('#stage').getAttribute('data-orient');
  expect(orient).toBe('landscape');
});

test('tablet viewport keeps data-orient="landscape" (default)', async ({ page }) => {
  await page.setViewportSize(TABLET_LANDSCAPE);
  await page.goto('/');
  const orient = await page.locator('#stage').getAttribute('data-orient');
  expect(orient).toBe('landscape');
});

test('splash in portrait: title top, mascot middle, play button bottom', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await expect(page.locator('#screen-splash')).toBeVisible();

  const title = await page.locator('.splash-title').boundingBox();
  const mascot = await page.locator('.splash-mascot').boundingBox();
  const play = await page.locator('.splash-play').boundingBox();

  // Vertical stacking: title.top < mascot.top < play.top
  expect(title.y).toBeLessThan(mascot.y);
  expect(mascot.y).toBeLessThan(play.y);
  // All three are horizontally centered within the visible viewport.
  // (Looseness ±30px to absorb scale rounding.)
  const vw = 390;
  expect(title.x + title.width / 2).toBeGreaterThan(vw / 2 - 30);
  expect(title.x + title.width / 2).toBeLessThan(vw / 2 + 30);
  expect(play.x + play.width / 2).toBeGreaterThan(vw / 2 - 30);
  expect(play.x + play.width / 2).toBeLessThan(vw / 2 + 30);

  // Mascot is centred + enlarged (384 logical ≈ 208px at this scale) so the
  // splash reads as balanced rather than top-heavy with a void below it.
  expect(mascot.height).toBeGreaterThan(190);
  expect(mascot.height).toBeLessThan(230);
  // It sits roughly in the vertical middle of the 844px viewport.
  const mascotCenterY = mascot.y + mascot.height / 2;
  expect(mascotCenterY).toBeGreaterThan(844 * 0.34);
  expect(mascotCenterY).toBeLessThan(844 * 0.62);
  expect(play.height).toBeLessThan(63); // portrait play button 110 * 0.542 ≈ 60
});

test('world map in portrait: 3 panels stacked vertically (not side-by-side)', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await page.locator('.splash-play').click();
  await expect(page.locator('#screen-map')).toBeVisible();

  const panels = await page.locator('.world-panel').all();
  expect(panels.length).toBe(3);

  const boxes = await Promise.all(panels.map((p) => p.boundingBox()));
  // Stacked vertically: panel[1].top > panel[0].bottom (with small overlap tolerance).
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 10);
  expect(boxes[2].y).toBeGreaterThan(boxes[1].y + boxes[1].height - 10);
  // All panels have similar widths (within 10px of each other).
  expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThan(10);
});

test('addition level in portrait: worksheet centered, tray pinned bottom, tile >= 44px physical', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'add', 1);

  await expect(page.locator('#screen-add')).toBeVisible();

  const worksheet = await page.locator('.worksheet').boundingBox();
  const tray = await page.locator('.digit-tray').boundingBox();
  const tile = await page.locator('.tile').first().boundingBox();

  // Worksheet is above tray (allow up to 10px overlap to absorb scale rounding)
  expect(worksheet.y + worksheet.height).toBeLessThanOrEqual(tray.y + 10);

  // Worksheet roughly horizontally centered in 390px viewport
  const wsCenter = worksheet.x + worksheet.width / 2;
  expect(wsCenter).toBeGreaterThan(390 / 2 - 40);
  expect(wsCenter).toBeLessThan(390 / 2 + 40);

  // Tile rendered size >= 44px physical (iOS HIG minimum)
  expect(tile.width).toBeGreaterThanOrEqual(44);
  expect(tile.height).toBeGreaterThanOrEqual(44);
});

test('mult tap-count in portrait: lily-pads wrap into a 2-wide grid', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 2); // L2 = 3xN, so the screen has 3 lily-pads

  await expect(page.locator('#screen-mult-tap')).toBeVisible();
  const pads = await page.locator('.lily-group').all();
  expect(pads.length).toBe(3);

  const boxes = await Promise.all(pads.map((p) => p.boundingBox()));
  // 2-wide grid: pad[1] sits to the RIGHT of pad[0] on the same row;
  // pad[2] wraps to the next row below. (Keeps 3–4 groups compact instead of
  // a tall single column that would crowd the answer box on short phones.)
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x + 20);
  expect(Math.abs(boxes[1].y - boxes[0].y)).toBeLessThan(30);
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y + 20);
});

test('mult drag-groups in portrait: 3 group trays stacked + block pile below', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 5); // L5 first problem is 3x4 → 3 group trays

  await expect(page.locator('#screen-mult-drag')).toBeVisible();
  const trays = await page.locator('.group-tray').all();
  expect(trays.length).toBe(3);

  const trayBoxes = await Promise.all(trays.map((t) => t.boundingBox()));
  // Stacked vertically: tray[1].top > tray[0].top by at least 30px
  expect(trayBoxes[1].y).toBeGreaterThan(trayBoxes[0].y + 30);
  expect(trayBoxes[2].y).toBeGreaterThan(trayBoxes[1].y + 30);

  const pile = await page.locator('.block-pile').boundingBox();
  expect(pile.y).toBeGreaterThan(trayBoxes[2].y + trayBoxes[2].height - 10);
});

test('complete screen in portrait: 3 buttons stacked vertically', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  // Jump directly to complete via router with mock context
  await page.evaluate(() => {
    window.__router.go('complete', { world: 'add', level: 1, wrongCount: 0 });
  });
  await expect(page.locator('#screen-complete')).toBeVisible();

  // Wait for star reveal animation to finish before measuring buttons
  await page.waitForTimeout(2500);

  const buttons = await page.locator('.complete-buttons .btn').all();
  expect(buttons.length).toBeGreaterThanOrEqual(2);

  const boxes = await Promise.all(buttons.map((b) => b.boundingBox()));
  // Stacked vertically: button[1].top > button[0].top + (height - small overlap)
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 10);
});

test('settings modal in portrait: fits within viewport width', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await page.evaluate(() => window.__router.go('settings'));
  await expect(page.locator('#screen-settings')).toBeVisible();

  const card = await page.locator('.parent-gate-card, .settings-card').first().boundingBox();
  // Card must fit inside the 390px viewport (with at least 4px margin each side)
  expect(card.width).toBeLessThanOrEqual(390 - 8);
  expect(card.x).toBeGreaterThanOrEqual(4);
});

test('addition carry slot lands above tens cell in portrait', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'add', 3); // L3 has carry on every problem

  await expect(page.locator('.carry-slot')).toBeAttached();
  // After render, carry slot's horizontal center should match the tens cell's center (within ±10px)
  const tens = await page.locator('.worksheet .row.top .cell').first().boundingBox();
  const carry = await page.locator('.carry-slot').boundingBox();
  const tensCenterX = tens.x + tens.width / 2;
  const carryCenterX = carry.x + carry.width / 2;
  expect(Math.abs(tensCenterX - carryCenterX)).toBeLessThan(10);
});

test('drag math works in portrait: dragging a digit tile lands on the active slot', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'add', 1); // L1 problem 1: 12 + 3 = 15

  await expect(page.locator('#screen-add')).toBeVisible();

  // Drag the "5" tile into the ones slot (active)
  const tile = page.locator('.tile[data-digit="5"]').first();
  const slot = page.locator('.slot.active');
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  // The slot should now be filled with "5" and no longer active
  await expect(page.locator('.slot[data-index="1"].filled')).toBeAttached();
});

test('rotating from landscape to portrait re-renders active screen', async ({ page }) => {
  await page.setViewportSize(TABLET_LANDSCAPE);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'add', 3);
  await expect(page.locator('#screen-add')).toBeVisible();

  // Rotate to portrait
  await page.setViewportSize(PHONE_PORTRAIT);
  // After resize, screen should still be visible and carry slot still aligned
  await page.waitForTimeout(200);
  await expect(page.locator('#screen-add')).toBeVisible();

  const tens = await page.locator('.worksheet .row.top .cell').first().boundingBox();
  const carry = await page.locator('.carry-slot').boundingBox();
  const tensCenterX = tens.x + tens.width / 2;
  const carryCenterX = carry.x + carry.width / 2;
  expect(Math.abs(tensCenterX - carryCenterX)).toBeLessThan(10);
});

test('full smoke: iPhone SE can complete addition L1 problem 1 (12+3)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'add', 1);
  await expect(page.locator('#screen-add')).toBeVisible();

  // Drag ones answer (15 → ones=5)
  await dragDigitToSlot(page, 5, page.locator('.slot.active'));
  await page.waitForTimeout(400);
  // Drag tens answer (15 → tens=1)
  await dragDigitToSlot(page, 1, page.locator('.slot.active'));
  await page.waitForTimeout(400);

  // Progress dot 0 should now be 'filled', dot 1 should be 'current'
  const dots = await page.locator('.dot').all();
  await expect(dots[0]).toHaveClass(/filled/);
  await expect(dots[1]).toHaveClass(/current/);
});

// ---------------------------------------------------------------------------
// Point 2 regression: the number pad must never cover the answer box, for any
// tile count or phone height. These reproduce the exact reported screenshots.
// ---------------------------------------------------------------------------

// Drag a mult option tile (data-value) onto the active answer slot.
async function dragValueToSlot(page, value) {
  const tile = page.locator(`.tile[data-value="${value}"]`).first();
  const slot = page.locator('.slot.active').first();
  const tb = await tile.boundingBox();
  const sb = await slot.boundingBox();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
}

test('mult tap-count ≥10: TOTAL box clears the tray (reported screenshot 1)', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 3); // 4×N — drive past 4×1, 4×2 to reach 4×3 = 12
  await dragValueToSlot(page, 4);
  await dragValueToSlot(page, 8);
  await page.waitForTimeout(300);

  // Now showing 4×3 = 12 → compound options 10–20 (11 tiles, 3 rows).
  const reveal = await page.locator('.total-reveal').boundingBox();
  const tray = await page.locator('.digit-tray').boundingBox();
  const slot = await page.locator('.total-reveal .slot').first().boundingBox();
  expect(reveal.y + reveal.height).toBeLessThanOrEqual(tray.y + 1);
  expect(slot.y).toBeGreaterThanOrEqual(reveal.y - 1);
  expect(slot.y + slot.height).toBeLessThanOrEqual(reveal.y + reveal.height + 1);
  // Option tiles stay a usable size.
  const tile = await page.locator('.digit-tray .tile').first().boundingBox();
  expect(tile.height).toBeGreaterThanOrEqual(44);
});

test('mult drag-groups: answer box clears the 16-tile tray', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 6); // first problem 5×4 = 20 → options 10–20 (16 tiles)
  const ans = await page.locator('.ans-host').boundingBox();
  const tray = await page.locator('.digit-tray').boundingBox();
  expect(ans.y + ans.height).toBeLessThanOrEqual(tray.y + 1);
});

test('addition carry on iPhone SE: answer slots clear the tray (reported screenshot 2)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'add', 3); // carry on every problem → tall two-row tray
  const slot = await page.locator('.slot.active').boundingBox();
  const tray = await page.locator('.digit-tray').boundingBox();
  expect(slot.y + slot.height).toBeLessThanOrEqual(tray.y + 1);
});

// ---------------------------------------------------------------------------
// Point 1 regression: dragging a tile must not reflow the rest of the palette.
// The dragged original is hidden in place (its slot reserved); a clone flies.
// ---------------------------------------------------------------------------
test('point 1: dragging a tile does not shift the other tiles', async ({ page }) => {
  await page.setViewportSize(PHONE_PORTRAIT);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'add', 1);
  await expect(page.locator('#screen-add')).toBeVisible();

  const snapshot = () => page.locator('.digit-tray .tile').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { d: e.dataset.digit, x: Math.round(r.x), y: Math.round(r.y) };
    })
  );

  const before = await snapshot();
  const five = page.locator('.tile[data-digit="5"]').first();
  const fb = await five.boundingBox();
  await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await page.mouse.down();
  await page.mouse.move(180, 320, { steps: 10 }); // drag well away from the tray
  await page.waitForTimeout(60);

  const during = await snapshot(); // tray still holds all 10 tiles in place
  await page.mouse.up();

  expect(during.length).toBe(before.length);
  for (let i = 0; i < before.length; i++) {
    expect(during[i].d).toBe(before[i].d);
    expect(Math.abs(during[i].x - before[i].x)).toBeLessThanOrEqual(1);
    expect(Math.abs(during[i].y - before[i].y)).toBeLessThanOrEqual(1);
  }
});
