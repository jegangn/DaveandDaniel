import { test, expect } from '@playwright/test';
import { goToLevel } from './helpers/math.js';

// Navigate straight to Dave's Sub L3 (problem 1 = 22-7, borrow needed).

test('borrow: strike and new tens digit are visible together at mid-Phase-A', async ({ page }) => {
  test.setTimeout(20_000);
  await page.goto('/?profile=dave');
  await goToLevel(page, 'sub', 3);
  await page.waitForSelector('.strike', { timeout: 5000 });

  // Early in Phase A both the strike SVG line and the new tens digit are
  // mid-animation, progressing together. The strike draw is front-loaded (eased
  // cubic-bezier(0.45,0.05,0.25,1), ~120 -> 0 over the first ~0.85s) while the
  // new-tens fade runs the full ~1.8s, so sample ~250ms in and use generous
  // bounds that tolerate scheduling jitter.
  await page.waitForTimeout(250);

  // Strike exists and its line is mid-draw (dashoffset between fully-hidden 120
  // and fully-drawn 0).
  const dashOffset = await page.locator('.strike line').evaluate(el => parseFloat(getComputedStyle(el).strokeDashoffset));
  expect(dashOffset).toBeGreaterThan(5);      // started drawing, not yet fully drawn
  expect(dashOffset).toBeLessThan(110);       // already begun (not still at 120)

  // New tens digit exists and is partly opaque (gentle fade in progress)
  const newTens = page.locator('.borrow-replacement').first();
  await expect(newTens).toBeVisible();
  const opacity = await newTens.evaluate(el => parseFloat(getComputedStyle(el).opacity));
  expect(opacity).toBeGreaterThan(0.1);
  expect(opacity).toBeLessThan(0.97);

  await page.screenshot({ path: 'test-results/borrow-mid-phase-a.png' });
});

test('borrow takes at least 3.5s total', async ({ page }) => {
  test.setTimeout(15_000);
  await page.goto('/?profile=dave');

  const start = Date.now();
  await goToLevel(page, 'sub', 3);

  // Wait for the late carry mark (the ones cell text never becomes "12";
  // the regrouped value is shown by a separate "1" mark beside the "2").
  await page.waitForSelector('.borrow-carry', { timeout: 9000 });

  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(3500);
});
