import { test, expect } from '@playwright/test';

// Smoke-test the BUILT, self-contained index.html (the deployed artifact),
// loaded straight off disk via file:// — not the dev server that serves src/.
const FILE = 'file:///C:/dev/projects/Dave%20and%20Daniel/index.html';

test('built index.html boots to the Who\'s-playing picker', async ({ page }) => {
  await page.goto(FILE);
  await expect(page.locator('#screen-picker')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.picker-card')).toHaveCount(2);
});

test('built index.html deep-links into a Daniel level (col-add renders)', async ({ page }) => {
  await page.goto(FILE + '?profile=daniel&world=nadd&level=1');
  await expect(page.locator('#screen-col-add')).toBeVisible({ timeout: 6000 });
  expect(await page.locator('.col-ws .slot').count()).toBeGreaterThan(0);
  expect(await page.locator('.digit-tray .tile').count()).toBe(10);
});

test('built index.html runs Dave addition', async ({ page }) => {
  await page.goto(FILE + '?profile=dave&world=add&level=1');
  await expect(page.locator('#screen-add')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.worksheet')).toBeVisible();
});
