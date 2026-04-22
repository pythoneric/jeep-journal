import { test, expect } from '@playwright/test';
import { openLoader, startFresh, loadDemoTruck } from './helpers.js';

test('Saved-data banner lists counts after using the app', async ({ page }) => {
  await loadDemoTruck(page);
  await page.click('#refreshBtn');
  await expect(page.locator('#savedDataBanner')).toBeVisible();
  const info = (await page.textContent('#savedDataInfo'))?.trim();
  expect(info).toMatch(/vehicle/i);
  // Demo Truck ships with maintenance, fuel, and mods
  expect(info).toMatch(/maintenance/i);
  expect(info).toMatch(/fuel/i);
  expect(info).toMatch(/mods/i);
  expect(info).toMatch(/parts/i);
});

test('Demo Truck seeds parts, trails, and a reminder alongside maintenance/fuel/mods', async ({ page }) => {
  await loadDemoTruck(page);
  // Parts inventory
  await page.locator('[data-tab="parts"]').click();
  await expect(page.locator('#parts:not(.hidden)')).toBeVisible();
  const partsCount = await page.locator('#partsList li').count();
  expect(partsCount).toBeGreaterThanOrEqual(5);
  // Trail journal
  await page.locator('[data-tab="trails"]').click();
  await expect(page.locator('#trails:not(.hidden)')).toBeVisible();
  const trailsCount = await page.locator('#trailsList li').count();
  expect(trailsCount).toBeGreaterThanOrEqual(3);
  // One seeded maintenance row has nextDueMiles/nextDueDate → a reminder surfaces
  // on the dashboard so users immediately see the feature.
  await page.locator('[data-tab="dashboard"]').click();
  await expect(page.locator('#serviceReminders li').first()).not.toContainText(/No upcoming|Sin recordatorios/i);
});

test('Export button downloads a backup from the loader', async ({ page, context }) => {
  await loadDemoTruck(page);
  await page.click('#refreshBtn');
  await expect(page.locator('#exportLoaderBtn')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportLoaderBtn'),
  ]);
  expect(download.suggestedFilename()).toMatch(/^biteric-jeep-.*\.json$/);
});

test('Delete button wipes saved data + hides the banner', async ({ page }) => {
  await loadDemoTruck(page);
  await page.click('#refreshBtn');
  await expect(page.locator('#savedDataBanner')).toBeVisible();
  page.on('dialog', (d) => d.accept());
  await page.click('#deleteLoaderBtn');
  await expect(page.locator('#savedDataBanner')).toBeHidden();
});

test('Drop zone is clickable and opens the file picker', async ({ page }) => {
  await openLoader(page);
  const zone = page.locator('#loaderDropZone');
  await expect(zone).toBeVisible();
  // The label wraps the hidden file input; clicking should focus/activate it
  const fileInputId = await zone.getAttribute('for');
  expect(fileInputId).toBe('importLoaderFile');
});

test('Drop zone highlights on dragenter', async ({ page }) => {
  await openLoader(page);
  await page.evaluate(() => {
    const zone = document.getElementById('loaderDropZone');
    const dt = new DataTransfer();
    dt.items.add(new File(['{}'], 'x.json', { type: 'application/json' }));
    zone.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
  });
  await expect(page.locator('#loaderDropZone')).toHaveClass(/drag-over/);
});

test('Reload Cache button clears caches and reloads the page', async ({ page }) => {
  await openLoader(page);
  // Seed a cache and an in-page marker that won't survive a real reload.
  await page.evaluate(async () => {
    window.__beforeReload = true;
    if ('caches' in window) await caches.open('biteric-jeep-test-reload');
  });
  await page.click('#clearCacheLoaderBtn');
  // hardReload shows a toast, then setTimeout(location.reload(), 500). The
  // in-page marker is gone after a true reload; poll until it's missing.
  await page.waitForFunction(() => !window.__beforeReload, { timeout: 3000 });
  // Loader rerenders after the reload
  await page.waitForSelector('#startFreshBtn');
  // And the seeded cache should be gone
  const cacheStillThere = await page.evaluate(async () => {
    if (!('caches' in window)) return false;
    const names = await caches.keys();
    return names.includes('biteric-jeep-test-reload');
  });
  expect(cacheStillThere).toBe(false);
});
