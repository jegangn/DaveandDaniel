import { test, expect } from '@playwright/test';

/**
 * Helper: trigger long-press on the cog.
 * The cog listens for pointerdown → setTimeout(1500ms) → router.go("settings").
 * After the 1500ms, the splash screen is unmounted and .cog-corner no longer exists.
 * We dispatch pointerdown, wait for the settings screen to appear, then skip pointerup
 * (the cog is gone). The settings transition is triggered purely by the timeout.
 */
async function openParentGate(page) {
  const cog = page.locator('.cog-corner');
  await cog.dispatchEvent('pointerdown');
  // Wait for parent gate card to appear (timer fires at 1500ms, add buffer)
  await expect(page.locator('.parent-gate-card')).toBeVisible({ timeout: 4000 });
}

test('long-press cog opens parent gate', async ({ page }) => {
  await page.goto('/?profile=dave');
  await openParentGate(page);
  await expect(page.locator('.parent-gate-card')).toBeVisible();
  await expect(page.locator('h2.display')).toHaveText('PARENTS ONLY');
});

test('parent gate: wrong answer shows error', async ({ page }) => {
  await page.goto('/?profile=dave');
  await openParentGate(page);

  // Find the question text and compute correct answer to identify wrong buttons
  const questionText = await page.locator('#pg-q').textContent();
  // Parse "a + b + c = ?" format
  const match = questionText.match(/(\d+)\s*\+\s*(\d+)\s*\+\s*(\d+)/);
  const correctAnswer = match ? parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3]) : null;
  expect(correctAnswer).not.toBeNull();

  // Click a wrong button (first button that is not the correct answer)
  const buttons = page.locator('.pg-buttons button');
  const count = await buttons.count();
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const btnText = await buttons.nth(i).textContent();
    if (parseInt(btnText) !== correctAnswer) {
      await buttons.nth(i).dispatchEvent('pointerup');
      clicked = true;
      break;
    }
  }
  expect(clicked).toBe(true);

  await expect(page.locator('.pg-error')).not.toHaveClass(/hidden/);
});

test('parent gate: correct answer opens settings card', async ({ page }) => {
  await page.goto('/?profile=dave');
  await openParentGate(page);

  // Parse the sum from the question
  const questionText = await page.locator('#pg-q').textContent();
  const match = questionText.match(/(\d+)\s*\+\s*(\d+)\s*\+\s*(\d+)/);
  const correctAnswer = match ? parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3]) : null;
  expect(correctAnswer).not.toBeNull();

  // Click the correct answer button
  const buttons = page.locator('.pg-buttons button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const btnText = await buttons.nth(i).textContent();
    if (parseInt(btnText) === correctAnswer) {
      await buttons.nth(i).dispatchEvent('pointerup');
      break;
    }
  }

  // Settings card should be visible
  await expect(page.locator('.settings-card')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.settings-card h2')).toHaveText('SETTINGS');
});
