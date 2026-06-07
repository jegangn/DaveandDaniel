import { test, expect } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

const PHONE = { width: 390, height: 844 };

// Fill an answer slot the same way the game does (tileSnapIn sets the slot's
// textContent to the dropped tile's text), then report whether the digits
// overflow the box. Avoids depending on the flaky synthetic compound-tile drag.
async function slotFits(page, slotSel, text) {
  return page.locator(slotSel).evaluate((s, t) => {
    s.classList.remove('active');
    s.classList.add('filled');
    s.textContent = t;
    return s.scrollWidth <= s.clientWidth + 1 && s.scrollHeight <= s.clientHeight + 1;
  }, text);
}

test('mult-drag: a two-digit answer fits the equation answer slot', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 6); // first problem 5×4 = 20

  // "20" must sit inside the equation answer box, not spill past its edges.
  expect(await slotFits(page, '.mult-problem .slot', '20')).toBe(true);
  await page.screenshot({ path: 'test-results/shots/fix-multdrag-20-phone.png' });
});

test('mult-tap: a two-digit answer fits the equation answer slot', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/');
  await unlockAll(page);
  await goToLevel(page, 'mult', 3); // 4×N — slot is the same size regardless of problem

  expect(await slotFits(page, '.mult-problem .slot', '20')).toBe(true);
  await page.screenshot({ path: 'test-results/shots/fix-multtap-20-phone.png' });
});

test('back button steps level → map → splash instead of leaving the site', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/?profile=dave');
  await unlockAll(page);

  // Navigate via the UI so browser history mirrors real play.
  await page.locator('.splash-play').click();
  await expect(page.locator('#screen-map')).toBeVisible();
  await page.locator('.world-panel').first().locator('.level-node').first().click();
  await expect(page.locator('#screen-add')).toBeVisible();

  // Back from a level → world map (the "home" with the level picker), NOT off-site.
  await page.evaluate(() => history.back());
  await page.waitForTimeout(300);
  await expect(page.locator('#screen-map')).toBeVisible();

  // Back again → splash. The document is never unloaded.
  await page.evaluate(() => history.back());
  await page.waitForTimeout(300);
  await expect(page.locator('#screen-splash')).toBeVisible();
});
