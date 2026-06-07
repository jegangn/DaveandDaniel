import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/?profile=dave');
});

test('compound row fits inside tray (no overflow)', async ({ page }) => {
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="3"]').click();
  await page.waitForTimeout(800);

  const tray = page.locator('.digit-tray');
  const trayBox = await tray.boundingBox();

  for (let n = 10; n <= 18; n++) {
    const tile = page.locator(`.tile.compound[data-compound="${n}"]`).first();
    const box = await tile.boundingBox();
    expect(box, `compound tile ${n} should exist`).not.toBeNull();
    expect(box.x, `compound tile ${n} left edge inside tray`).toBeGreaterThanOrEqual(trayBox.x - 1);
    expect(box.x + box.width, `compound tile ${n} right edge inside tray`).toBeLessThanOrEqual(trayBox.x + trayBox.width + 1);
  }
});

test('home button does not overlap progress dots', async ({ page }) => {
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(400);

  const homeBox = await page.locator('.home-btn.small').boundingBox();
  const dotsBox = await page.locator('.progress-dots').boundingBox();
  // Home is on the left; dots are to its right (or center)
  expect(homeBox.x + homeBox.width).toBeLessThan(dotsBox.x);
});

test('correct drop triggers .just-filled flash', async ({ page }) => {
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(400);

  // L1 P1 is 12+3=15; ones-digit answer = 5
  const tile = page.locator('.tile[data-digit="5"]').first();
  const slot = page.locator('.slot.active').first();
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();

  // Within 100ms, the slot should have the .just-filled class
  await page.waitForTimeout(100);
  await expect(page.locator('.slot.just-filled')).toHaveCount(1);
});

test('screenshot: addition L3 with compound row visible', async ({ page }) => {
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="3"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/ui-polish-add-l3.png' });
});
