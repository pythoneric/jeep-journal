import { test, expect } from '@playwright/test';
import { startFresh, loadDemoTruck, switchTab } from './helpers.js';

test('can add a mod entry', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'mods');
  await page.fill('#modDate', '2024-01-01');
  await page.selectOption('#modCategory', 'Suspension');
  await page.fill('#modPart', 'Lift Kit');
  await page.fill('#modBrand', 'Rubicon Express');
  await page.fill('#modCost', '1000');
  await page.click('#modsForm button[type="submit"]');
  await expect(page.locator('#modsList')).toContainText('Lift Kit');
});

test('Shop toggle replaces the old Installed By text field', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'mods');
  // modShop checkbox exists, legacy #modInstalledBy does not
  await expect(page.locator('#modShop')).toHaveCount(1);
  await expect(page.locator('#modInstalledBy')).toHaveCount(0);
});

test('Removed-on date appears only when "Still Installed" is unchecked', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'mods');
  await expect(page.locator('#modRemovedDate')).toBeHidden();
  await page.uncheck('#modInstalled');
  await expect(page.locator('#modRemovedDate')).toBeVisible();
  // Auto-populated to today when first shown
  await expect(page.locator('#modRemovedDate')).not.toHaveValue('');
  await page.check('#modInstalled');
  await expect(page.locator('#modRemovedDate')).toBeHidden();
});

test('mods list groups by category and shows totals', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'mods');
  // Demo has Suspension, Tires/Wheels, Armor, Lighting, Recovery, Interior, Electrical
  await expect(page.locator('#modsList h3').first()).toBeVisible();
  await expect(page.locator('#modsList')).toContainText(/Total: \$/);
});

test('mods search filters and shows empty state on no match', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'mods');
  await page.fill('#modsSearch', 'lift');
  await expect(page.locator('#modsList')).toContainText(/lift/i);
  await page.fill('#modsSearch', 'xyzNOMATCH');
  await expect(page.locator('#modsList .empty-state')).toBeVisible();
});

test('can edit a mod entry', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'mods');
  await page.locator('#modsList .edit-btn').first().click();
  await expect(page.locator('#modsForm .edit-banner')).toBeVisible();
  await page.fill('#modNotes', 'EDITED_NOTES');
  await page.click('#modsForm button[type="submit"]');
  await expect(page.locator('#modsList')).toContainText(/Lift Kit|Tires|LED|Winch/); // still there
});

test('can delete a mod (with undo)', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'mods');
  page.on('dialog', (d) => d.accept());
  const before = await page.locator('#modsList .del-btn').count();
  await page.locator('#modsList .del-btn').first().click();
  await expect(page.locator('#modsList .del-btn')).toHaveCount(before - 1);
  await page.click('#toastAction');
  await expect(page.locator('#modsList .del-btn')).toHaveCount(before);
});
