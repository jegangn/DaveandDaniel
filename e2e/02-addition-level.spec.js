import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

/**
 * Simulate a pointer-based drag from sourceSelector to targetSelector.
 * The game uses pointerdown/move/up on the window — Playwright's dragTo uses
 * mouse events by default and may miss pointer listeners. Use mouse API which
 * also dispatches pointer events in Chromium.
 */
async function pointerDragTo(page, sourceSelector, targetSelector) {
  const src = page.locator(sourceSelector).first();
  const tgt = page.locator(targetSelector).first();

  const srcBox = await src.boundingBox();
  const tgtBox = await tgt.boundingBox();

  const sx = srcBox.x + srcBox.width / 2;
  const sy = srcBox.y + srcBox.height / 2;
  const tx = tgtBox.x + tgtBox.width / 2;
  const ty = tgtBox.y + tgtBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Move in small steps so the drag manager gets move events
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    await page.mouse.move(
      sx + (tx - sx) * progress,
      sy + (ty - sy) * progress
    );
  }
  await page.mouse.up();
}

test('Banana Hills L1 opens addition level', async ({ page }) => {
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node').first().click();
  await expect(page.locator('#screen-add')).toBeVisible();
  await expect(page.locator('.worksheet')).toBeVisible();
  await expect(page.locator('.digit-tray .tile')).toHaveCount(10);
});

test('addition L1 problem 1 (12 + 3 = 15): drag correct ones digit fills slot', async ({ page }) => {
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node').first().click();
  await expect(page.locator('.worksheet')).toBeVisible();

  // Problem 1 is 12+3=15. Answer = 15, two digits.
  // activeIndex starts at ones (index 1 of [1,5]).
  // Active slot = ones slot. Drag digit "5" onto it.
  await pointerDragTo(page, '.tile[data-digit="5"]', '.slot.active');
  // After snap animation (~220ms), slot should be filled
  await page.waitForTimeout(500);
  // Slot becomes filled with "5", tens slot becomes active
  await expect(page.locator('.slot.filled')).toHaveCount(1);
  await expect(page.locator('.slot.active')).toBeVisible();

  // Now drag the tens digit "1"
  await pointerDragTo(page, '.tile[data-digit="1"]', '.slot.active');
  await page.waitForTimeout(500);

  // Both slots filled — problem advances
  // Progress dot index 0 should now be filled
  await page.waitForTimeout(800);
  const filledDots = await page.locator('.dot.filled').count();
  expect(filledDots).toBeGreaterThanOrEqual(1);
});

test('addition: wrong drop bounces back, slot stays empty', async ({ page }) => {
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node').first().click();
  await expect(page.locator('.worksheet')).toBeVisible();

  // Problem 1 is 12+3=15, active slot expects "5". Drag wrong digit "7".
  await pointerDragTo(page, '.tile[data-digit="7"]', '.slot.active');
  // bounceBack animation is ~450ms
  await page.waitForTimeout(700);
  // Slot should still be active (empty)
  await expect(page.locator('.slot.active')).toBeVisible();
  await expect(page.locator('.slot.filled')).toHaveCount(0);
});

test('addition: progress dots advance after completing a problem', async ({ page }) => {
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node').first().click();
  await expect(page.locator('.worksheet')).toBeVisible();

  // Problem 1: 12+3=15
  await pointerDragTo(page, '.tile[data-digit="5"]', '.slot.active');
  await page.waitForTimeout(500);
  await pointerDragTo(page, '.tile[data-digit="1"]', '.slot.active');
  await page.waitForTimeout(1200); // wait for problem advance animation

  // After problem 1, dot index 0 should be filled, dot index 1 should be current
  const dots = page.locator('.progress-dots .dot');
  await expect(dots.first()).toHaveClass(/filled/);
  await expect(dots.nth(1)).toHaveClass(/current/);
});
