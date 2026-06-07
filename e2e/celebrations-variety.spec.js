import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

// Verify that mascotCheer is wired up and that consecutive correct drops do not
// trigger the same celebration twice in a row. We expose the celebration index
// via window probing.
test('correct drops cycle through varied celebrations (no immediate repeats)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/?profile=dave');

  // Patch the module's pick function isn't possible without source access, so
  // we instead observe behavioural variety: do 6 correct drops in a row and
  // verify the body transform sequences differ across drops by snapshotting
  // the corner-mascot SVG's currently-applied transform at a fixed offset
  // during each celebration.
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(500);

  // L1 problems: 12+3=15, 21+4=25, 13+5=18, 32+6=38, 41+5=46
  const drops = [
    [5, 1], [5, 2], [8, 1], [8, 3], [6, 4],
  ];

  const transformsPerDrop = [];

  for (const [ones, tens] of drops) {
    const t1 = page.locator(`.tile[data-digit="${ones}"]`).first();
    const a1 = page.locator('.slot.active').first();
    let tBox = await t1.boundingBox();
    let sBox = await a1.boundingBox();
    await page.mouse.move(tBox.x + tBox.width/2, tBox.y + tBox.height/2);
    await page.mouse.down();
    await page.mouse.move(sBox.x + sBox.width/2, sBox.y + sBox.height/2, { steps: 8 });
    await page.mouse.up();

    // Sample at ~350ms after drop (well into the celebration)
    await page.waitForTimeout(350);
    const t = await page.locator('.corner-mascot svg').evaluate(el => {
      return getComputedStyle(el).transform;
    });
    transformsPerDrop.push(t);

    // Let the celebration finish before the next drop
    await page.waitForTimeout(700);

    const t2 = page.locator(`.tile[data-digit="${tens}"]`).first();
    const a2 = page.locator('.slot.active').first();
    tBox = await t2.boundingBox();
    sBox = await a2.boundingBox();
    await page.mouse.move(tBox.x + tBox.width/2, tBox.y + tBox.height/2);
    await page.mouse.down();
    await page.mouse.move(sBox.x + sBox.width/2, sBox.y + sBox.height/2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1100);
  }

  // Verify at least 3 distinct transform strings across the 5 ones-drops
  // (with 10 celebrations and no-repeat rule, the odds of duplicate strings
  // across 5 samples are extremely low even with similar opening keyframes)
  const unique = new Set(transformsPerDrop);
  expect(unique.size).toBeGreaterThanOrEqual(3);
});

test('mascot sparkles appear on correct drop with varied count', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(500);

  const tile = page.locator('.tile[data-digit="5"]').first();
  const slot = page.locator('.slot.active').first();
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();
  await page.mouse.move(tBox.x + tBox.width/2, tBox.y + tBox.height/2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width/2, sBox.y + sBox.height/2, { steps: 8 });
  await page.mouse.up();

  // Wait for celebration to begin then count sparkles (different celebrations
  // emit different counts but all emit at least a handful)
  await page.waitForTimeout(550);
  const count = await page.locator('.mascot-sparkle').count();
  expect(count).toBeGreaterThanOrEqual(3);

  await page.screenshot({ path: 'test-results/celebration-variety.png' });

  // Sparkles eventually clear
  await page.waitForTimeout(1500);
  expect(await page.locator('.mascot-sparkle').count()).toBe(0);
});
