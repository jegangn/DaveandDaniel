import { test, expect } from '@playwright/test';

/**
 * Helper: open the parents-only settings gate from the splash.
 * The cog (`.cog-corner`, labelled "PARENTS") listens for `pointerup` and
 * routes straight to the settings screen, which mounts the parent-gate card
 * (a math question) before revealing the actual settings.
 */
async function openParentGate(page) {
  await page.locator('.cog-corner').dispatchEvent('pointerup');
  await expect(page.locator('.parent-gate-card')).toBeVisible({ timeout: 4000 });
}

test('tapping the cog opens the parent gate', async ({ page }) => {
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

  // Settings card should be visible. Heading is profile-namespaced
  // ("SETTINGS · DAVE"), so match the prefix.
  await expect(page.locator('.settings-card')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.settings-card h2')).toContainText('SETTINGS');
});
