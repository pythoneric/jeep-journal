import { test, expect } from '@playwright/test';
import { startFresh, loadDemoTruck, switchTab } from './helpers.js';

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

// --- Part number / category / cost ---

test('part number + category + cost round-trip through edit', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Oil filter');
  await page.fill('#partNumber', 'Mopar MO-899');
  await page.selectOption('#partCategory', 'Filters');
  await page.fill('#partQuantity', '3');
  await page.fill('#partCost', '12.50');
  await page.click('#partsForm button[type="submit"]');

  // Rendered row should surface the SKU and per-unit cost.
  await expect(page.locator('#partsList')).toContainText('Oil filter');
  await expect(page.locator('#partsList')).toContainText('Mopar MO-899');
  await expect(page.locator('#partsList')).toContainText('$12.50/ea');

  // Edit path prefills the new fields.
  await page.locator('#partsList .edit-btn').first().click();
  await expect(page.locator('#partNumber')).toHaveValue('Mopar MO-899');
  await expect(page.locator('#partCategory')).toHaveValue('Filters');
  await expect(page.locator('#partCost')).toHaveValue('12.5');
});

test('parts list groups by category with a per-category total', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'parts');
  // Demo seeds Filters, Fluids, Electrical, Tools, Tires, Other categories.
  const cats = await page.locator('#partsList h3').allTextContents();
  expect(cats).toEqual(expect.arrayContaining(['Filters', 'Fluids', 'Electrical']));
  // At least one category has Total: $ line.
  await expect(page.locator('#partsList')).toContainText(/Total:\s*\$/);
});

test('search matches by part number and category', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'parts');
  await page.fill('#partsSearch', 'MO-899');
  await expect(page.locator('#partsList')).toContainText('Oil filter');
  // No unrelated categories rendered under the filter.
  const heads = await page.locator('#partsList h3').count();
  expect(heads).toBe(1);

  await page.fill('#partsSearch', 'filters');
  await expect(page.locator('#partsList h3')).toHaveText('Filters');
});

// --- Reorder threshold / low-stock chip ---

test('LOW STOCK chip appears when quantity <= reorder threshold', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Brake fluid');
  await page.selectOption('#partCategory', 'Fluids');
  await page.fill('#partQuantity', '1');
  await page.fill('#partReorderAt', '2'); // 1 <= 2 → low stock
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList .low-stock-badge')).toBeVisible();
  await expect(page.locator('#partsList .low-stock-badge')).toHaveText(/LOW STOCK|STOCK BAJO/);
});

test('LOW STOCK chip is absent when quantity is above threshold', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Spark plugs');
  await page.selectOption('#partCategory', 'Electrical');
  await page.fill('#partQuantity', '6');
  await page.fill('#partReorderAt', '2'); // 6 > 2 → no chip
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList .low-stock-badge')).toHaveCount(0);
});

// --- Duplicate detection with increment flow ---

test('adding a duplicate part offers to increment existing stock', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Oil filter');
  await page.fill('#partNumber', 'Mopar MO-899');
  await page.selectOption('#partCategory', 'Filters');
  await page.fill('#partQuantity', '2');
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList li')).toHaveCount(1);

  // Dismiss dialog by ACCEPT → merge into existing (quantity 2 + 3 = 5),
  // no new row.
  page.on('dialog', (d) => d.accept());
  await page.fill('#partName', 'oil filter'); // different case
  await page.fill('#partNumber', 'MOPAR mo-899');
  await page.selectOption('#partCategory', 'Filters');
  await page.fill('#partQuantity', '3');
  await page.click('#partsForm button[type="submit"]');

  await expect(page.locator('#partsList li')).toHaveCount(1);
  await expect(page.locator('#partsList')).toContainText('5x');
});

test('declining the duplicate merge saves as a new row', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Oil filter');
  await page.selectOption('#partCategory', 'Filters');
  await page.fill('#partQuantity', '2');
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList li')).toHaveCount(1);

  // Dismiss → keep as separate row.
  page.on('dialog', (d) => d.dismiss());
  await page.fill('#partName', 'Oil filter');
  await page.selectOption('#partCategory', 'Filters');
  await page.fill('#partQuantity', '1');
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList li')).toHaveCount(2);
});

// --- Quantity=0 is a valid state (tracked-but-depleted) ---

test('quantity of 0 persists (tracked-but-depleted inventory)', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Depleted filter');
  await page.fill('#partQuantity', '0');
  await page.fill('#partReorderAt', '1');
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList')).toContainText('0x');
  await expect(page.locator('#partsList .low-stock-badge')).toBeVisible();
});

// --- Purchase date ---

test('purchase date is stored and renders in the row', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'parts');
  await page.fill('#partName', 'Brake fluid');
  await page.fill('#partQuantity', '1');
  await page.fill('#partPurchaseDate', '2024-01-15');
  await page.click('#partsForm button[type="submit"]');
  await expect(page.locator('#partsList')).toContainText('2024-01-15');
});
