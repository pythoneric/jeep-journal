import { test, expect } from '@playwright/test';
import { startFresh, switchTab } from './helpers.js';

test('parts tab shows empty state when no parts logged', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await expect(page.locator('#partsList .empty-state')).toBeVisible();
});

test('can add a part and see it in the list', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Oil filter');
  await page.fill('#partQuantity', '3');
  await page.fill('#partLocation', 'Garage shelf');
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList')).toContainText('Oil filter');
  await expect(page.locator('#partsList')).toContainText('3x');
  await expect(page.locator('#partsList')).toContainText('Garage shelf');
});

test('parts search filters the list', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  const items = [
    ['Oil filter', '3', 'Garage'],
    ['Brake pads', '2', 'Cabinet'],
    ['Air filter', '1', 'Garage'],
  ];
  for (let i = 0; i < items.length; i++) {
    const [name, qty, loc] = items[i];
    await page.fill('#partName', name);
    await page.fill('#partQuantity', qty);
    await page.fill('#partLocation', loc);
    await page.click('#partsForm button[type="submit"]');
    await expect(page.locator('#partsList li')).toHaveCount(i + 1);
    await expect(page.locator('#partName')).toHaveValue('');
  }
  await page.fill('#partsSearch', 'filter');
  await expect(page.locator('#partsList li')).toHaveCount(2);
  await page.fill('#partsSearch', 'xyzNOMATCH');
  await expect(page.locator('#partsList .empty-state')).toBeVisible();
});

test('can edit a part', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Spark plug');
  await page.fill('#partQuantity', '4');
  await page.click('#partsForm button[type="submit"]');
  await page.locator('#partsList .edit-btn').first().click();
  await expect(page.locator('#partsForm .edit-banner')).toBeVisible();
  await page.fill('#partName', 'Spark plug NGK');
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList')).toContainText('Spark plug NGK');
});

test('can delete a part with undo', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Coolant');
  await page.click('#partsForm button[type="submit"]');
  page.on('dialog', (d) => d.accept());
  await page.locator('#partsList .del-btn').first().click();
  await expect(page.locator('#partsList .empty-state')).toBeVisible();
  await page.click('#toastAction');
  await expect(page.locator('#partsList li').filter({ hasText: 'Coolant' })).toHaveCount(1);
});
