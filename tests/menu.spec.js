import { test, expect } from '@playwright/test';
import { startFresh, switchTab } from './helpers.js';

const TAB_NAMES = ['Dashboard', 'Maintenance', 'Fuel', 'Mods', 'Parts', 'Settings'];

test('all six tabs are rendered on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await startFresh(page);
  const tabs = page.locator('nav.tabs .tab');
  await expect(tabs).toHaveCount(6);
  for (const name of TAB_NAMES) {
    await expect(tabs.filter({ hasText: name })).toHaveCount(1);
  }
});

test('all six tabs remain on-screen at narrow (mobile) widths', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await startFresh(page);
  const tabs = await page.locator('.tab').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { right: r.right, visible: e.offsetParent !== null };
    }),
  );
  expect(tabs).toHaveLength(6);
  // Every tab must fit in the viewport so users can see all sections
  // without horizontal scrolling (regression for the min-width: 100px bug).
  for (const t of tabs) {
    expect(t.visible).toBe(true);
    expect(t.right).toBeLessThanOrEqual(375 + 1);
  }
});

test('clicking each tab switches the visible section', async ({ page }) => {
  await startFresh(page);
  for (const tab of ['maintenance', 'fuel', 'mods', 'parts', 'settings', 'dashboard']) {
    await switchTab(page, tab);
    await expect(page.locator(`#${tab}`)).toBeVisible();
    await expect(page.locator(`[data-tab="${tab}"]`)).toHaveClass(/active/);
  }
});

test('keyboard shortcuts 1-6 switch tabs', async ({ page }) => {
  await startFresh(page);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const expected = ['dashboard', 'maintenance', 'fuel', 'mods', 'parts', 'settings'];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(String(i + 1));
    await expect(page.locator(`[data-tab="${expected[i]}"]`)).toHaveClass(/active/);
  }
});

test('tabs carry accessible role and are keyboard-activatable', async ({ page }) => {
  await startFresh(page);
  await expect(page.locator('nav.tabs')).toHaveAttribute('role', 'tablist');
  const roles = await page.locator('.tab').evaluateAll((els) => els.map((e) => e.getAttribute('role')));
  expect(roles.every((r) => r === 'tab')).toBe(true);
  const indices = await page.locator('.tab').evaluateAll((els) => els.map((e) => e.getAttribute('tabindex')));
  expect(indices.every((i) => i === '0')).toBe(true);
  // Enter on a focused tab activates it
  await page.locator('[data-tab="fuel"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tab="fuel"]')).toHaveClass(/active/);
});

test('active tab persists across reload', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'fuel');
  await page.reload();
  // After reload the loader appears; continuing should remember the tab.
  await page.waitForSelector('#continueBtn');
  await page.click('#continueBtn');
  await page.waitForSelector('#loader', { state: 'hidden' });
  await expect(page.locator('[data-tab="fuel"]')).toHaveClass(/active/);
});
