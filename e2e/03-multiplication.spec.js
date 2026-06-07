import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    // Mult L1 is always unlocked (level === 1), no pre-seeding needed
  });
});

// App boots to the "Who's playing?" picker; ?profile=dave skips it to Dave's
// splash (which has the TAP TO PLAY button). World panel 3 = Firefly Meadow.
async function openMultL1(page) {
  await page.goto('/?profile=dave');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(2).locator('.level-node').first().click();
  await expect(page.locator('#screen-mult-tap')).toBeVisible();
}

test('Firefly Meadow L1 opens tap-count screen', async ({ page }) => {
  await openMultL1(page);
  // Problem 1 is 2×1 = 2 items per group, shown 1 time → 1 group of 2.
  await expect(page.locator('.lily-group')).toHaveCount(1);
  await expect(page.locator('.lily-group .block-host')).toHaveCount(2);
});

test('Firefly Meadow L1: problem equation displayed with answer slot', async ({ page }) => {
  await openMultL1(page);
  // Problem 1: 2 × 1 = [ ]  — the answer drops into the slot after "=".
  const chips = page.locator('.op-chip');
  await expect(chips.nth(0)).toHaveText('2');
  await expect(chips.nth(1)).toHaveText('1');
  await expect(page.locator('.mult-problem .slot.active')).toHaveCount(1);
});

test('Firefly Meadow tap-count flow: tapping blocks, tray is populated', async ({ page }) => {
  await openMultL1(page);
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

  // Answer slot is in the equation; digit tray is populated (0–9).
  await expect(page.locator('.mult-problem .slot.active')).toHaveCount(1);
  await expect(page.locator('.digit-tray .tile')).toHaveCount(10);
});

test('Firefly Meadow: already-tapped block does not increment count', async ({ page }) => {
  await openMultL1(page);
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
