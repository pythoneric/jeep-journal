import { test, expect } from '@playwright/test';
import { startFresh, switchTab } from './helpers.js';

async function switchToSpanish(page) {
  await startFresh(page);
  // On page load the header button shows the CURRENT language; click once to flip to ES.
  await page.click('#langToggle');
  // Wait for a known ES translation to appear so the assertion doesn't race setLang()
  await expect(page.locator('[data-tab="dashboard"]')).toHaveText('Panel');
}

test.describe('Spanish translation coverage (regression for untranslated Parts tab)', () => {
  test('Parts tab is fully localized in Spanish', async ({ page }) => {
    await switchToSpanish(page);
    await switchTab(page, 'parts');
    await expect(page.locator('#parts h2')).toHaveText('Inventario de piezas');
    await expect(page.locator('#partsForm button[type="submit"]')).toHaveText('Agregar pieza');
    await expect(page.locator('#partName')).toHaveAttribute('placeholder', 'Nombre de pieza');
    await expect(page.locator('#partQuantity')).toHaveAttribute('placeholder', 'Cantidad');
    await expect(page.locator('#partLocation')).toHaveAttribute('placeholder', 'Ubicación (ej. estante del garaje)');
    await expect(page.locator('#partsSearch')).toHaveAttribute('placeholder', 'Buscar…');
  });

  test('Maintenance form placeholders translate', async ({ page }) => {
    await switchToSpanish(page);
    await switchTab(page, 'maintenance');
    await expect(page.locator('#mOdometer')).toHaveAttribute('placeholder', 'Odómetro (mi)');
    await expect(page.locator('#mCost')).toHaveAttribute('placeholder', 'Costo (USD)');
    await expect(page.locator('#mNotes')).toHaveAttribute('placeholder', 'Notas');
    await expect(page.locator('#mIntervalMiles')).toHaveAttribute('placeholder', 'Intervalo (millas)');
    await expect(page.locator('#mIntervalMonths')).toHaveAttribute('placeholder', 'Intervalo (meses)');
  });

  test('Fuel form placeholders translate', async ({ page }) => {
    await switchToSpanish(page);
    await switchTab(page, 'fuel');
    await expect(page.locator('#fGallons')).toHaveAttribute('placeholder', 'Galones');
    await expect(page.locator('#fCost')).toHaveAttribute('placeholder', 'Costo total (USD)');
    await expect(page.locator('#fStation')).toHaveAttribute('placeholder', 'Estación');
    await expect(page.locator('#fOctane')).toHaveAttribute('placeholder', 'Octanaje');
  });

  test('Mods form placeholders translate', async ({ page }) => {
    await switchToSpanish(page);
    await switchTab(page, 'mods');
    await expect(page.locator('#modPart')).toHaveAttribute('placeholder', 'Nombre de pieza');
    await expect(page.locator('#modBrand')).toHaveAttribute('placeholder', 'Marca');
    await expect(page.locator('#modCost')).toHaveAttribute('placeholder', 'Costo (USD)');
    await expect(page.locator('#modNotes')).toHaveAttribute('placeholder', 'Notas');
  });

  test('Add Vehicle form placeholders translate', async ({ page }) => {
    await switchToSpanish(page);
    await switchTab(page, 'settings');
    await expect(page.locator('#vNickname')).toHaveAttribute('placeholder', 'Apodo');
    await expect(page.locator('#vMake')).toHaveAttribute('placeholder', 'Marca');
    await expect(page.locator('#vModel')).toHaveAttribute('placeholder', 'Modelo');
    await expect(page.locator('#vYear')).toHaveAttribute('placeholder', 'Año');
    await expect(page.locator('#vVin')).toHaveAttribute('placeholder', 'VIN');
    await expect(page.locator('#vPlate')).toHaveAttribute('placeholder', 'Placa');
  });

  test('no raw i18n keys leak into the DOM on any tab in Spanish', async ({ page }) => {
    await switchToSpanish(page);
    // camelCase identifiers that should never render as visible text — if any
    // show up it means setLang fell through to `key` instead of a translation.
    const rawKeys = /\b(addPart|partsInventory|phOdometerMi|phGallons|phCostUsd|phPartName|phPartLocation|phQuantity|addEntry|addMod|addTrail|loaderTitle|loaderImport|savedInfoVehicle|followUpRetorque)\b/;
    for (const tab of ['dashboard', 'maintenance', 'fuel', 'mods', 'trails', 'parts', 'settings']) {
      await switchTab(page, tab);
      const body = await page.locator('body').innerText();
      expect(body, `raw i18n key leaked on ${tab} tab`).not.toMatch(rawKeys);
    }
  });
});

test.describe('Language toggle flag icons', () => {
  test('default EN shows a US flag SVG (stripes + blue canton)', async ({ page }) => {
    await startFresh(page);
    await expect(page.locator('#langFlag svg')).toHaveCount(1);
    const html = await page.locator('#langFlag').innerHTML();
    expect(html).toContain('#b22234'); // US red
    expect(html).toContain('#3c3b6e'); // US blue canton
  });

  test('switching to ES swaps to the Dominican Republic flag SVG', async ({ page }) => {
    await startFresh(page);
    await page.click('#langToggle');
    const html = await page.locator('#langFlag').innerHTML();
    expect(html).toContain('#002d62'); // DR blue
    expect(html).toContain('#ce1126'); // DR red
  });

  test('loader language button renders its own flag icon', async ({ page }) => {
    await startFresh(page);
    // Bring the loader back (header refresh clears cache + reloads)
    await page.click('#refreshBtn');
    await page.waitForSelector('#langToggleLoader', { timeout: 10000 });
    await expect(page.locator('#langFlagLoader svg')).toHaveCount(1);
  });

  test('header language button label still shows the language code', async ({ page }) => {
    await startFresh(page);
    await expect(page.locator('#langToggle [data-i18n="langToggle"]')).toHaveText('EN');
    await page.click('#langToggle');
    await expect(page.locator('#langToggle [data-i18n="langToggle"]')).toHaveText('ES');
  });
});
