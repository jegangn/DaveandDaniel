import { test, expect } from '@playwright/test';

/**
 * Regression test for the "tile disappears during drag" bug.
 *
 * Root cause: tiles lived inside .digit-tray (position: absolute inside the
 * screen). When drag started, setting `position: absolute; left: Xpx; top: Ypx`
 * resolved against the tray, adding the tray's own offset — so the tile was
 * visually displaced from the pointer.
 *
 * Fix: on drag start the tile is re-parented to #stage, making all absolute
 * coordinates stage-local and matching the pointer position.
 *
 * This test verifies that mid-drag the tile's centre is within 30 viewport px
 * of the pointer, at both 1x and 2x scale.
 */

async function navigateToAddLevel(page) {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node').first().click();
  await page.waitForTimeout(600);
}

test('tile follows pointer during drag — 1x viewport (1280×800)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await navigateToAddLevel(page);

  const tile = page.locator('.tile[data-digit="5"]').first();
  const tBox = await tile.boundingBox();
  const startX = tBox.x + tBox.width / 2;
  const startY = tBox.y + tBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // Move to a position clearly away from the tray
  const midX = 800;
  const midY = 300;
  await page.mouse.move(midX, midY, { steps: 10 });
  await page.waitForTimeout(50);

  const draggingTile = page.locator('.tile.dragging').first();
  const draggingBox = await draggingTile.boundingBox();
  expect(draggingBox).not.toBeNull();

  const draggingCenterX = draggingBox.x + draggingBox.width / 2;
  const draggingCenterY = draggingBox.y + draggingBox.height / 2;

  // Tile centre should be close to the pointer (within 30 viewport px)
  expect(Math.abs(draggingCenterX - midX)).toBeLessThan(30);
  expect(Math.abs(draggingCenterY - midY)).toBeLessThan(30);

  await page.mouse.up();
});

test('tile follows pointer during drag — 2x viewport (2560×1600, simulates tablet)', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1600 });
  await navigateToAddLevel(page);

  const tile = page.locator('.tile[data-digit="5"]').first();
  const tBox = await tile.boundingBox();
  const startX = tBox.x + tBox.width / 2;
  const startY = tBox.y + tBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // Move to a position clearly away from the tray (mid-screen at 2x)
  const midX = 1500;
  const midY = 500;
  await page.mouse.move(midX, midY, { steps: 10 });
  await page.waitForTimeout(50);

  const draggingTile = page.locator('.tile.dragging').first();
  const draggingBox = await draggingTile.boundingBox();
  expect(draggingBox).not.toBeNull();

  const draggingCenterX = draggingBox.x + draggingBox.width / 2;
  const draggingCenterY = draggingBox.y + draggingBox.height / 2;

  // Tile centre should be close to the pointer (within 30 viewport px)
  expect(Math.abs(draggingCenterX - midX)).toBeLessThan(30);
  expect(Math.abs(draggingCenterY - midY)).toBeLessThan(30);

  await page.mouse.up();
});

test('tile returns to tray after a missed drop (bounce-back re-parents)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await navigateToAddLevel(page);

  // Count tiles before drag
  const tileBefore = await page.locator('.digit-tray .tile[data-digit="5"]').count();
  expect(tileBefore).toBe(1);

  const tile = page.locator('.tile[data-digit="5"]').first();
  const tBox = await tile.boundingBox();
  const startX = tBox.x + tBox.width / 2;
  const startY = tBox.y + tBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Drag to empty space (no drop target)
  await page.mouse.move(640, 10, { steps: 10 });
  await page.mouse.up();

  // Wait for bounce-back animation to finish
  await page.waitForTimeout(600);

  // Tile should be back in the tray
  const tileAfter = await page.locator('.digit-tray .tile[data-digit="5"]').count();
  expect(tileAfter).toBe(1);
});
