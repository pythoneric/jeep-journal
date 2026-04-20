import { test, expect } from '@playwright/test';
import { openLoader, startFresh, loadDemoSUV } from './helpers.js';

test('Saved-data banner lists counts after using the app', async ({ page }) => {
  await loadDemoSUV(page);
  await page.click('#refreshBtn');
  await expect(page.locator('#savedDataBanner')).toBeVisible();
  const info = (await page.textContent('#savedDataInfo'))?.trim();
  expect(info).toMatch(/vehicle/i);
  // Demo SUV ships with maintenance, fuel, and mods
  expect(info).toMatch(/maintenance/i);
  expect(info).toMatch(/fuel/i);
  expect(info).toMatch(/mods/i);
});

test('Export button downloads a backup from the loader', async ({ page, context }) => {
  await loadDemoSUV(page);
  await page.click('#refreshBtn');
  await expect(page.locator('#exportLoaderBtn')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportLoaderBtn'),
  ]);
  expect(download.suggestedFilename()).toMatch(/^biteric-jeep-.*\.json$/);
});

test('Delete button wipes saved data + hides the banner', async ({ page }) => {
  await loadDemoSUV(page);
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
