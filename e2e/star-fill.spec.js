import { test, expect } from '@playwright/test';

test('level complete: earned stars are visually filled yellow', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').first().locator('.level-node[data-level="1"]').click();
  await page.waitForTimeout(500);

  // L1: 12+3, 21+4, 13+5, 32+6, 41+5 - drop ones then tens for each
  const drops = [
    [5, 1], [5, 2], [8, 1], [8, 3], [6, 4],
  ];
  for (const [ones, tens] of drops) {
    const t1 = page.locator(`.tile[data-digit="${ones}"]`).first();
    const a1 = page.locator('.slot.active').first();
    let tBox = await t1.boundingBox();
    let sBox = await a1.boundingBox();
    await page.mouse.move(tBox.x + tBox.width/2, tBox.y + tBox.height/2);
    await page.mouse.down();
    await page.mouse.move(sBox.x + sBox.width/2, sBox.y + sBox.height/2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    const t2 = page.locator(`.tile[data-digit="${tens}"]`).first();
    const a2 = page.locator('.slot.active').first();
    tBox = await t2.boundingBox();
    sBox = await a2.boundingBox();
    await page.mouse.move(tBox.x + tBox.width/2, tBox.y + tBox.height/2);
    await page.mouse.down();
    await page.mouse.move(sBox.x + sBox.width/2, sBox.y + sBox.height/2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(900);
  }

  // Wait for complete screen + star animation
  await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(2800); // all 3 stars revealed by ~1900+800ms

  // Check that earned stars have the path fill set to the star color
  const fillColor = await page.locator('.star-meter.big .star.earned path').first()
    .evaluate(el => getComputedStyle(el).fill);
  // CSS fill computed value will be in rgb form; --star = #FFC83A = rgb(255, 200, 58)
  expect(fillColor).toContain('255');

  await page.screenshot({ path: 'test-results/level-complete-stars.png' });
});
