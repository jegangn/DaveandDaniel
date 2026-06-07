import { test } from '@playwright/test';
import { unlockAll, goToLevel } from './helpers/math.js';

/**
 * Screenshot-capture harness (not an assertion test — used to eyeball layout).
 * Run with:  bunx playwright test zz-capture --project=chromium
 * Set SHOT_DIR env to control output (default test-results/shots).
 * Set SHOT_TAG=before|after to label the run.
 */
const TAG = process.env.SHOT_TAG || 'shot';
const DIR = `test-results/shots`;

const PHONE = { width: 390, height: 844, tag: 'phone' };  // iPhone 12/13/14
const SE = { width: 320, height: 568, tag: 'se' };        // shortest common phone
const TABLET = { width: 1280, height: 800, tag: 'tablet' }; // landscape — must stay unchanged

// Freeze CSS + WAAPI animations so the frame is stable, then screenshot.
async function shot(page, name, vp) {
  await page.evaluate(() => {
    let st = document.getElementById('kill-anim');
    if (!st) {
      st = document.createElement('style');
      st.id = 'kill-anim';
      st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;}';
      document.head.appendChild(st);
    }
    document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { try { a.cancel(); } catch (_) {} } });
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${DIR}/${TAG}-${name}-${vp.tag}.png` });
}

// Drag a mult tile (data-value) onto the active answer slot.
async function dragValueToSlot(page, value, slotSel = '.slot.active') {
  const tile = page.locator(`.tile[data-value="${value}"]`).first();
  const tBox = await tile.boundingBox();
  const sBox = await page.locator(slotSel).first().boundingBox();
  if (!tBox || !sBox) return false;
  await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  return true;
}

for (const vp of [PHONE, SE, TABLET]) {
  test(`capture all screens @ ${vp.width}x${vp.height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(vp);
    await page.goto('/');
    await unlockAll(page);

    // Splash
    await page.goto('/?profile=dave');
    await page.waitForTimeout(200);
    await shot(page, '01-splash', vp);

    // Map
    await page.locator('.splash-play').click();
    await page.waitForTimeout(300);
    await shot(page, '02-map', vp);

    // Addition L1 (no carry) and L3 (carry → two-row tray, worst add)
    await goToLevel(page, 'add', 1);
    await shot(page, '03-add-l1', vp);
    await goToLevel(page, 'add', 3);
    await shot(page, '04-add-l3-carry', vp);

    // Subtraction L3 (borrow)
    await goToLevel(page, 'sub', 3);
    await shot(page, '05-sub-l3-borrow', vp);

    // Mult tap L3 (4×N): drive past 4×1, 4×2 to reach 4×3=12 (compound tray, 11 tiles)
    await goToLevel(page, 'mult', 3);
    await shot(page, '06-multtap-l3-p0', vp);
    await dragValueToSlot(page, 4);   // 4×1
    await dragValueToSlot(page, 8);   // 4×2
    await page.waitForTimeout(300);
    await shot(page, '07-multtap-l3-12', vp); // 4×3=12 → compound options 10..20

    // Mult drag L6: first problem 5×4=20 → 16 compound tiles (worst tray)
    await goToLevel(page, 'mult', 6);
    await shot(page, '08-multdrag-l6-20', vp);

    // Complete screen
    await page.evaluate(() => window.__router.go('complete', { world: 'mult', level: 3, wrongCount: 0 }));
    await page.waitForTimeout(2600);
    await shot(page, '09-complete', vp);

    // Settings / parent gate
    await page.evaluate(() => window.__router.go('settings'));
    await page.waitForTimeout(200);
    await shot(page, '10-settings', vp);
  });
}
