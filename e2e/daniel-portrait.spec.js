import { test, expect } from '@playwright/test';

// Portrait reflow for Daniel's four screens: the worksheet must be centred in
// the band above the digit tray with no overlap, on a representative phone.
const PHONE = { width: 390, height: 844 };

const SCREENS = [
  { world: 'nadd', level: 5, id: '#screen-col-add' },
  { world: 'nsub', level: 5, id: '#screen-col-sub' },
  { world: 'nmul', level: 4, id: '#screen-long-mult' },
  { world: 'ndiv', level: 4, id: '#screen-short-div' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

for (const s of SCREENS) {
  test(`portrait: ${s.id} worksheet fits above the tray`, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(`/?profile=daniel&world=${s.world}&level=${s.level}`);
    await expect(page.locator(s.id)).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(4500); // borrow pre-pass (sub) + layout settle

    const ws = await page.locator('.col-ws').boundingBox();
    const tray = await page.locator('.digit-tray').boundingBox();
    expect(ws, 'worksheet present').not.toBeNull();
    expect(tray, 'tray present').not.toBeNull();
    // No overlap: worksheet bottom is above the tray top (small tolerance).
    expect(ws.y + ws.height).toBeLessThanOrEqual(tray.y + 6);
    // Below the topbar and within the viewport.
    expect(ws.y).toBeGreaterThan(40);
    expect(ws.x).toBeGreaterThanOrEqual(-2);
  });
}
