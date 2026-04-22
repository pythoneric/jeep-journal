import { test, expect } from '@playwright/test';
import { startFresh, loadDemoTruck, switchTab } from './helpers.js';

// --- Draft auto-save: values survive a tab switch ---

test('Maintenance form draft survives a tab switch', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'maintenance');
  await page.fill('#mDate', '2024-05-01');
  await page.fill('#mOdometer', '12345');
  await page.selectOption('#mType', 'Oil change');
  await page.fill('#mCost', '87.50');
  await page.fill('#mNotes', 'Mid-typed, about to switch tabs');
  // Playwright's fill fires `input` events synchronously, but the autosave
  // debounces 250ms — let it settle before navigating away.
  await page.waitForTimeout(350);
  await switchTab(page, 'fuel');
  await switchTab(page, 'maintenance');
  await expect(page.locator('#mDate')).toHaveValue('2024-05-01');
  await expect(page.locator('#mOdometer')).toHaveValue('12345');
  await expect(page.locator('#mType')).toHaveValue('Oil change');
  await expect(page.locator('#mCost')).toHaveValue('87.50');
  await expect(page.locator('#mNotes')).toHaveValue('Mid-typed, about to switch tabs');
});

test('Fuel form draft survives a tab switch', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'fuel');
  await page.fill('#fDate', '2024-05-01');
  await page.fill('#fOdometer', '20000');
  await page.fill('#fGallons', '13.4');
  await page.fill('#fCost', '52.00');
  await page.fill('#fStation', 'Shell Manhattan Beach');
  await page.selectOption('#fFuelType', 'Premium');
  await page.waitForTimeout(350);
  await switchTab(page, 'dashboard');
  await switchTab(page, 'fuel');
  await expect(page.locator('#fDate')).toHaveValue('2024-05-01');
  await expect(page.locator('#fOdometer')).toHaveValue('20000');
  await expect(page.locator('#fGallons')).toHaveValue('13.4');
  await expect(page.locator('#fCost')).toHaveValue('52.00');
  await expect(page.locator('#fStation')).toHaveValue('Shell Manhattan Beach');
  await expect(page.locator('#fFuelType')).toHaveValue('Premium');
});

test('Mods draft survives a tab switch (and category follow-ups are restored)', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'mods');
  await page.fill('#modDate', '2024-05-01');
  await page.fill('#modOdometer', '14000');
  await page.selectOption('#modCategory', 'Suspension');
  await page.fill('#modPart', 'Rancho 2.5" lift');
  await page.fill('#modCost', '1299');
  await page.waitForTimeout(350);
  await switchTab(page, 'parts');
  await switchTab(page, 'mods');
  await expect(page.locator('#modPart')).toHaveValue('Rancho 2.5" lift');
  await expect(page.locator('#modCategory')).toHaveValue('Suspension');
});

test('Trails draft survives a tab switch (including conditions + depth)', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'trails');
  await page.fill('#trailName', 'Rubicon — East Loop');
  await page.fill('#trailOdometer', '18500');
  await page.check('#trailWater');
  await page.selectOption('#trailWaterDepth', 'deep');
  await page.check('#trailRock');
  await page.waitForTimeout(350);
  await switchTab(page, 'dashboard');
  await switchTab(page, 'trails');
  await expect(page.locator('#trailName')).toHaveValue('Rubicon — East Loop');
  await expect(page.locator('#trailOdometer')).toHaveValue('18500');
  await expect(page.locator('#trailWater')).toBeChecked();
  await expect(page.locator('#trailRock')).toBeChecked();
  await expect(page.locator('#trailWaterDepth')).toHaveValue('deep');
});

test('Parts draft survives a tab switch', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'NGK iridium plug set');
  await page.fill('#partNumber', 'NGK ILZKAR7D11HS');
  await page.selectOption('#partCategory', 'Electrical');
  await page.fill('#partQuantity', '6');
  await page.fill('#partCost', '12.25');
  await page.waitForTimeout(350);
  await switchTab(page, 'dashboard');
  await switchTab(page, 'parts');
  await expect(page.locator('#partName')).toHaveValue('NGK iridium plug set');
  await expect(page.locator('#partNumber')).toHaveValue('NGK ILZKAR7D11HS');
  await expect(page.locator('#partCategory')).toHaveValue('Electrical');
  await expect(page.locator('#partQuantity')).toHaveValue('6');
});

// --- Draft cleared on successful submit ---

test('Submitting the maintenance form clears its draft', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'maintenance');
  await page.fill('#mDate', '2024-05-01');
  await page.fill('#mOdometer', '12345');
  await page.selectOption('#mType', 'Oil change');
  await page.fill('#mCost', '50');
  await page.click('#maintenanceForm button[type="submit"]');
  // localStorage draft key should be removed after a successful submit.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('draft:maintenanceForm'))).toBeNull();
  // Switch away and back — fields that aren't auto-populated (cost, notes)
  // should stay empty because the draft is gone. Date + odometer get re-
  // filled by autofillFormDefaults from today / vehicle.odometer, so we
  // can't use those to distinguish "draft restored" from "autofilled fresh."
  await switchTab(page, 'fuel');
  await switchTab(page, 'maintenance');
  await expect(page.locator('#mCost')).toHaveValue('');
  await expect(page.locator('#mNotes')).toHaveValue('');
});

// --- Draft survives a full page reload ---

test('Maintenance draft survives a page reload', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'maintenance');
  await page.fill('#mDate', '2024-05-01');
  await page.fill('#mOdometer', '99999');
  await page.fill('#mNotes', 'Draft survives reload');
  await page.waitForTimeout(350);
  await page.reload();
  // Loader shows on reload — Continue past it.
  await page.waitForSelector('#continueBtn');
  await page.click('#continueBtn');
  await page.waitForSelector('#loader', { state: 'hidden' });
  await switchTab(page, 'maintenance');
  await expect(page.locator('#mOdometer')).toHaveValue('99999');
  await expect(page.locator('#mNotes')).toHaveValue('Draft survives reload');
});

// --- Export / import includes full settings ---

test('Export JSON includes the settings block', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportBtn'),
  ]);
  const path = await download.path();
  const fs = await import('fs/promises');
  const data = JSON.parse(await fs.readFile(path, 'utf-8'));
  expect(data.settings).toBeDefined();
  expect(data.settings).toEqual(expect.objectContaining({
    lang: expect.any(String),
    theme: expect.any(String),
    currency: expect.any(String),
  }));
});

test('Import round-trip restores currency + language from the backup', async ({ page }) => {
  // 1. Start fresh in DOP, set Spanish, export.
  await startFresh(page, { currency: 'DOP' });
  await page.click('#langToggle'); // flip to ES
  await switchTab(page, 'settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportBtn'),
  ]);
  const filePath = await download.path();
  const fs = await import('fs/promises');
  const buffer = await fs.readFile(filePath);

  // Sanity: the backup carries the restored settings we expect.
  const payload = JSON.parse(buffer.toString('utf-8'));
  expect(payload.settings.currency).toBe('DOP');
  expect(payload.settings.lang).toBe('es');

  // 2. Nuke into a default-language, default-currency state.
  await page.evaluate(() => { localStorage.removeItem('lang'); localStorage.removeItem('currency'); });
  await page.reload();
  // Dismiss loader; use Demo Truck to put us in USD/EN before the import.
  await page.waitForSelector('#demoTruckBtn');
  await page.click('#demoTruckBtn');
  await page.waitForSelector('#loader', { state: 'hidden' });

  // 3. Import the earlier backup and confirm the replace prompts.
  await switchTab(page, 'settings');
  await page.setInputFiles('#importFile', {
    name: 'round-trip.json',
    mimeType: 'application/json',
    buffer,
  });
  page.on('dialog', (d) => d.accept());
  await page.click('#importBtn');
  // Wait for the success toast — signals the settings restore has completed.
  await expect(page.locator('#toastMsg')).toContainText(/Imported|Importado/i);

  // 4. After import, currency + lang should be back to DOP / ES.
  const after = await page.evaluate(() => ({
    currency: localStorage.getItem('currency'),
    lang: localStorage.getItem('lang'),
  }));
  expect(after.currency).toBe('DOP');
  expect(after.lang).toBe('es');
});
