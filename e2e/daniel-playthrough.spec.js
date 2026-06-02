import { test, expect } from '@playwright/test';

// Real-flow integration: pick Daniel from the picker, play a mission, and
// confirm (a) progress saves under daniel.* , (b) Dave's slot is untouched,
// (c) the next mission unlocks.

async function dragDigit(page, digit, slotSel) {
  const tile = page.locator(`.tile[data-digit="${digit}"]`).first();
  const tBox = await tile.boundingBox();
  const sBox = await page.locator(slotSel).first().boundingBox();
  if (!tBox || !sBox) throw new Error(`missing tile ${digit} or active slot`);
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function solveColAdd(page) {
  const prob = await page.locator('#screen-col-add').getAttribute('data-problem');
  const [a, b] = prob.split('+').map(Number);
  const digits = String(a + b).split('').map(Number);
  for (let i = digits.length - 1; i >= 0; i--) {
    await dragDigit(page, digits[i], '.col-ws .slot.active');
    await page.waitForTimeout(1700);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Daniel: pick → play → next mission unlocks; Dave slot untouched', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.locator('.picker-card[data-profile="daniel"]').click();
  await expect(page.locator('#screen-splash')).toBeVisible();
  await page.locator('.splash-play').click();
  await expect(page.locator('#screen-map')).toBeVisible();

  const w0 = page.locator('.world-panel').first();
  await expect(w0.locator('.level-node').nth(0)).toHaveClass(/unlocked/);
  await expect(w0.locator('.level-node').nth(1)).toHaveClass(/locked/);

  await page.evaluate(() => window.__router.go('level', { world: 'nadd', level: 1 }));
  await expect(page.locator('#screen-col-add')).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(i === 0 ? 300 : 700);
    await solveColAdd(page);
  }
  await expect(page.locator('#screen-complete')).toBeVisible({ timeout: 8000 });

  const store = await page.evaluate(() => ({
    danielL1: localStorage.getItem('daniel.stars.nadd.1'),
    daveKeys: Object.keys(localStorage).filter((k) => k.startsWith('dave.stars')).length,
  }));
  expect(Number(store.danielL1)).toBeGreaterThanOrEqual(1);
  expect(store.daveKeys).toBe(0); // Dave's save slot is independent

  await page.evaluate(() => window.__router.go('map'));
  await expect(page.locator('#screen-map')).toBeVisible();
  await expect(
    page.locator('.world-panel').first().locator('.level-node').nth(1),
    'nadd L2 should be unlocked after clearing L1'
  ).toHaveClass(/unlocked/);
});
