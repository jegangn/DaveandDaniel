import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    // Mult L1 is always unlocked (level === 1), no pre-seeding needed
  });
});

test('Firefly Meadow L1 opens tap-count screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('.splash-play').click();
  // Third world panel = Firefly Meadow (mult)
  await page.locator('.world-panel').nth(2).locator('.level-node').first().click();
  await expect(page.locator('#screen-mult-tap')).toBeVisible();
  // Problem 1 is 2×1 = 2 fireflies across 2 groups of 1
  // p.a = 2 groups → 2 lily-group elements
  await expect(page.locator('.lily-group')).toHaveCount(2);
});

test('Firefly Meadow L1: problem equation displayed correctly', async ({ page }) => {
  await page.goto('/');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(2).locator('.level-node').first().click();
  await expect(page.locator('#screen-mult-tap')).toBeVisible();

  // Problem 1: 2 × 1 = ?
  const chips = page.locator('.op-chip');
  await expect(chips.nth(0)).toHaveText('2');
  await expect(chips.nth(1)).toHaveText('1');
  await expect(page.locator('.op-chip.q')).toHaveText('?');
});

test('Firefly Meadow tap-count flow: tap all blocks reveals answer panel', async ({ page }) => {
  await page.goto('/');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(2).locator('.level-node').first().click();
  // Wait for fly-in animation to complete
  await page.waitForTimeout(800);

  // Problem 1: 2×1 = 2 fireflies total
  const blocks = page.locator('.block-host.untapped');
  const total = await blocks.count();
  expect(total).toBe(2);

  for (let i = 0; i < total; i++) {
    await page.locator('.block-host.untapped').first().click();
    await page.waitForTimeout(150);
  }

  // Total reveal panel should appear
  await expect(page.locator('.total-reveal:not(.hidden)')).toBeVisible({ timeout: 3000 });
  // Digit tray should now be populated
  await expect(page.locator('.digit-tray .tile')).toHaveCount(10);
});

test('Firefly Meadow: already-tapped block does not increment count', async ({ page }) => {
  await page.goto('/');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(2).locator('.level-node').first().click();
  await page.waitForTimeout(800);

  // Tap the first block twice
  const firstBlock = page.locator('.block-host').first();
  await firstBlock.click();
  await page.waitForTimeout(200);
  await firstBlock.click();
  await page.waitForTimeout(200);

  // It should be tapped (not untapped) but still show count 1
  await expect(firstBlock).toHaveClass(/tapped/);
  await expect(firstBlock.locator('.count-badge')).toHaveText('1');
});
