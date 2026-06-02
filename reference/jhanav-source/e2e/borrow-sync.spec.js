import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

test('borrow: strike and new tens digit are visible together at mid-Phase-A', async ({ page }) => {
  test.setTimeout(20_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').click();
  await page.locator('.world-panel').nth(1).locator('.level-node[data-level="3"]').click();

  // ~650ms after navigate: roughly halfway through the 1.3s Phase A.
  // Both the strike SVG line and the new tens digit should be visible and partly drawn / partly opaque.
  await page.waitForTimeout(650);

  // Strike exists and its line has been drawn somewhere between 30%-80% of its length
  const dashOffset = await page.locator('.strike line').evaluate(el => parseFloat(getComputedStyle(el).strokeDashoffset));
  expect(dashOffset).toBeGreaterThan(20);     // not fully drawn
  expect(dashOffset).toBeLessThan(100);       // started drawing

  // New tens digit exists and is partly opaque (between 0 and 1)
  const newTens = page.locator('.borrow-replacement');
  await expect(newTens).toBeVisible();
  // Just check that it has some opacity > 0 (the gentle fade is in progress)
  const opacity = await newTens.evaluate(el => parseFloat(getComputedStyle(el).opacity));
  expect(opacity).toBeGreaterThan(0.2);
  expect(opacity).toBeLessThanOrEqual(1);

  await page.screenshot({ path: 'test-results/borrow-mid-phase-a.png' });
});

test('borrow takes at least 3.5s total', async ({ page }) => {
  test.setTimeout(15_000);
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').click();

  const start = Date.now();
  await page.locator('.world-panel').nth(1).locator('.level-node[data-level="3"]').click();

  await page.waitForFunction(() => {
    const cell = document.querySelector('.worksheet .row.top .cell:nth-child(2)');
    return cell && cell.textContent.trim().length === 2;
  }, { timeout: 8000 });

  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(3500);
});
