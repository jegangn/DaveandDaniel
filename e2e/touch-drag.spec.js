import { test, expect } from '@playwright/test';
import { unlockAll } from './helpers/math.js';

/**
 * Touch-drag regression tests for Samsung Tab S8+ (and any hasTouch device).
 *
 * Root cause: `body` has `touch-action: manipulation` but `.tile` and
 * `.block-host` had no `touch-action` override, so Chrome treated a
 * finger-drag on a tile as a pan/scroll gesture and fired `pointercancel`
 * before the drag manager's `pointermove` listener could run.
 *
 * Fix: add `touch-action: none` to `.tile`, `.block-host`, and `#stage`
 * in src/style.css so the browser hands all pointer events to JS.
 *
 * These tests dispatch synthetic PointerEvents with pointerType:'touch'
 * to replicate the exact event stream a real finger produces.
 */

// Simulate Tab S8+ landscape: 2560×1600 viewport, touch enabled.
test.use({
  viewport: { width: 2560, height: 1600 },
  isMobile: true,
  hasTouch: true,
});

async function navigateToAddLevel1(page) {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await unlockAll(page);
  await page.goto('/');
  await page.locator('.splash-play').tap();
  await page.locator('.world-panel').first().locator('.level-node').first().tap();
  await page.waitForTimeout(600);
}

/** Fire a PointerEvent with pointerType:'touch' on the given element/target. */
function fireTouchPointer(page, { target, type, x, y }) {
  return page.evaluate(({ targetSelector, type, x, y }) => {
    const el = targetSelector === '__window__'
      ? window
      : document.querySelector(targetSelector) || document.elementFromPoint(x, y);
    el.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      pointerId: 1,
      clientX: x,
      clientY: y,
      isPrimary: true,
    }));
  }, { targetSelector: target, type, x, y });
}

test('touch drag: tile follows finger and drops correctly into slot', async ({ page }) => {
  test.setTimeout(45_000);
  await navigateToAddLevel1(page);

  const tile = page.locator('.tile[data-digit="5"]').first();
  const slot = page.locator('.slot.active').first();
  const tBox = await tile.boundingBox();
  const sBox = await slot.boundingBox();

  const startX = tBox.x + tBox.width / 2;
  const startY = tBox.y + tBox.height / 2;
  const endX   = sBox.x + sBox.width / 2;
  const endY   = sBox.y + sBox.height / 2;

  // Dispatch the full touch pointer event sequence via JS so pointerType='touch'
  await page.evaluate(({ startX, startY, endX, endY, steps }) => {
    function fire(target, type, x, y) {
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true,
        pointerType: 'touch', pointerId: 1,
        clientX: x, clientY: y, isPrimary: true,
      }));
    }
    const src = document.elementFromPoint(startX, startY);
    fire(src, 'pointerdown', startX, startY);
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      fire(window, 'pointermove', x, y);
    }
    fire(window, 'pointerup', endX, endY);
  }, { startX, startY, endX, endY, steps: 12 });

  await page.waitForTimeout(600);

  // Slot should now be filled
  const filled = page.locator('.slot.filled');
  await expect(filled).toHaveCount(1);
  // The digit shown in the slot should be "5"
  await expect(filled).toHaveText('5');
});

test('touch drag: tile remains visible and tracks finger mid-drag', async ({ page }) => {
  test.setTimeout(45_000);
  await navigateToAddLevel1(page);

  const tile = page.locator('.tile[data-digit="5"]').first();
  const tBox = await tile.boundingBox();
  const startX = tBox.x + tBox.width / 2;
  const startY = tBox.y + tBox.height / 2;

  // Begin touch drag and pause mid-flight at (1500, 600)
  await page.evaluate(({ startX, startY }) => {
    function fire(target, type, x, y) {
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true,
        pointerType: 'touch', pointerId: 1,
        clientX: x, clientY: y, isPrimary: true,
      }));
    }
    const src = document.elementFromPoint(startX, startY);
    fire(src, 'pointerdown', startX, startY);
    fire(window, 'pointermove', 1500, 600);
    // Leave dragging — do NOT release
  }, { startX, startY });

  await page.waitForTimeout(100);

  // Tile should have .dragging class and be visible near (1500, 600)
  const draggingBox = await page.locator('.tile.dragging').boundingBox();
  expect(draggingBox).not.toBeNull();

  const cx = draggingBox.x + draggingBox.width / 2;
  const cy = draggingBox.y + draggingBox.height / 2;
  expect(Math.abs(cx - 1500)).toBeLessThan(40);
  expect(Math.abs(cy - 600)).toBeLessThan(40);

  // Cleanup: release the drag
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true,
      pointerType: 'touch', pointerId: 1,
      clientX: 1500, clientY: 600, isPrimary: true,
    }));
  });
});

test('touch drag: no pointercancel fired when touch-action:none is set', async ({ page }) => {
  test.setTimeout(30_000);
  await navigateToAddLevel1(page);

  // Monitor whether pointercancel fires during a touch drag
  const cancelFired = await page.evaluate(() => {
    return new Promise((resolve) => {
      let cancelled = false;
      const onCancel = () => { cancelled = true; };
      window.addEventListener('pointercancel', onCancel, { once: true });

      const tile = document.querySelector('.tile');
      const tRect = tile.getBoundingClientRect();
      const startX = tRect.left + tRect.width / 2;
      const startY = tRect.top  + tRect.height / 2;

      function fire(target, type, x, y) {
        target.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true,
          pointerType: 'touch', pointerId: 1,
          clientX: x, clientY: y, isPrimary: true,
        }));
      }

      fire(tile, 'pointerdown', startX, startY);
      for (let i = 1; i <= 10; i++) {
        fire(window, 'pointermove', startX + i * 20, startY + i * 5);
      }
      fire(window, 'pointerup', startX + 200, startY + 50);

      // Give event loop a tick to flush
      setTimeout(() => {
        window.removeEventListener('pointercancel', onCancel);
        resolve(cancelled);
      }, 50);
    });
  });

  // With touch-action:none on .tile, the browser must not fire pointercancel
  expect(cancelFired).toBe(false);
});
