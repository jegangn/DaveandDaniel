import { test } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

// Screenshot harness for the new profile screens (picker + both splashes +
// Daniel's mission board). Not an assertion test — eyeballing the spy skin.
//   bunx playwright test zz-capture-profiles
const TAG = process.env.SHOT_TAG || 'profiles';
const DIR = `test-results/shots`;
const TABLET = { width: 1280, height: 800, tag: 'tablet' };

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

test(`capture profile screens @ ${TABLET.width}x${TABLET.height}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize(TABLET);

  // Picker
  await page.goto('/');
  await page.waitForTimeout(250);
  await shot(page, '01-picker', TABLET);

  // Dave's splash
  await page.locator('.picker-card[data-profile="dave"]').click();
  await page.waitForTimeout(300);
  await shot(page, '02-dave-splash', TABLET);

  // Daniel's splash
  await page.goto('/?profile=daniel');
  await page.waitForTimeout(300);
  await shot(page, '03-daniel-splash', TABLET);

  // Daniel's mission board (unlock so nodes show, then enter)
  await unlockAll(page, 'daniel');
  await page.goto('/?profile=daniel');
  await page.locator('.splash-play').click();
  await page.waitForTimeout(350);
  await shot(page, '04-daniel-board', TABLET);

  // Daniel screens (initial problem state) — eyeball alignment + spy theme.
  await unlockAll(page, 'daniel');
  await page.evaluate(() => { window.__setProfile('daniel'); window.__router.go('level', { world: 'nadd', level: 5 }); });
  await page.waitForTimeout(400);
  await shot(page, '05-col-add', TABLET);

  // col-sub M5 — let the across-zero borrow pre-pass settle, then capture.
  await page.evaluate(() => { window.__setProfile('daniel'); window.__router.go('level', { world: 'nsub', level: 5 }); });
  await page.waitForTimeout(4000);
  await shot(page, '06-col-sub-borrow', TABLET);

  // long multiplication (2×2 layout: two partials + sum)
  await page.evaluate(() => { window.__setProfile('daniel'); window.__router.go('level', { world: 'nmul', level: 4 }); });
  await page.waitForTimeout(500);
  await shot(page, '07-long-mult', TABLET);
});
