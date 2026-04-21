import { test, expect } from '@playwright/test';
import { startFresh, loadDemoTruck, switchTab } from './helpers.js';

test('can add a fuel entry with Total Cost', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'fuel');
  await page.fill('#fDate', '2024-01-01');
  await page.fill('#fOdometer', '10000');
  await page.fill('#fGallons', '10');
  await page.fill('#fCost', '30');
  await page.click('#fuelForm button[type="submit"]');
  await expect(page.locator('#fuelList')).toContainText('10 gal');
});

test('MPG is computed between two full-tank fills', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'fuel');
  const rows = [
    ['2024-01-01', '10000', '10', '30'],
    ['2024-01-15', '10100', '10', '30'],
  ];
  for (let i = 0; i < rows.length; i++) {
    const [date, odo, gal, cost] = rows[i];
    await page.fill('#fDate', date);
    await page.fill('#fOdometer', odo);
    await page.fill('#fGallons', gal);
    await page.fill('#fCost', cost);
    await page.check('#fFullTank');
    await page.click('#fuelForm button[type="submit"]');
    await expect(page.locator('#fuelList li')).toHaveCount(i + 1);
    // Wait for the async form-reset that happens after db.add to settle
    // before the next iteration's fills race with it.
    await expect(page.locator('#fDate')).toHaveValue('');
  }
  await expect(page.locator('#fuelList')).toContainText('10.0 MPG');
});

test('$/gallon alone computes Total Cost', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'fuel');
  await page.fill('#fDate', '2026-04-20');
  await page.fill('#fOdometer', '20000');
  await page.fill('#fGallons', '10');
  await page.fill('#fPrice', '4.25');
  // Leave #fCost blank on purpose
  await page.fill('#fCost', '');
  await page.click('#fuelForm button[type="submit"]');
  // Expect list to show $4.25/gal price
  await expect(page.locator('#fuelList li').first()).toContainText('$4.25/gal');
});

test('missing both cost and price shows a toast', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'fuel');
  await page.fill('#fDate', '2024-01-01');
  await page.fill('#fOdometer', '10000');
  await page.fill('#fGallons', '10');
  // No #fCost, no #fPrice
  await page.click('#fuelForm button[type="submit"]');
  await expect(page.locator('#toast:not(.hidden)')).toBeVisible();
  await expect(page.locator('#toastMsg')).toContainText(/Total Cost|galón|gallon/i);
});

test('partial fill (no Full Tank) yields "— MPG" placeholder', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'fuel');
  await page.fill('#fDate', '2024-01-01');
  await page.fill('#fOdometer', '10000');
  await page.fill('#fGallons', '5');
  await page.fill('#fCost', '15');
  await page.uncheck('#fFullTank');
  await page.click('#fuelForm button[type="submit"]');
  await expect(page.locator('#fuelList li').first()).toContainText('— MPG');
});

test('autofill populates fuel form with date + odometer', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'fuel');
  await expect(page.locator('#fDate')).not.toHaveValue('');
  await expect(page.locator('#fOdometer')).toHaveValue('15200');
});

test('fuel search filters the list', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'fuel');
  const total = await page.locator('#fuelList li').count();
  expect(total).toBeGreaterThan(3);
  await page.fill('#fuelSearch', 'Shell');
  const filtered = await page.locator('#fuelList li').count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThanOrEqual(total);
});

test('can delete a fuel entry and undo', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'fuel');
  page.on('dialog', (d) => d.accept());
  const before = await page.locator('#fuelList li').count();
  await page.locator('#fuelList .del-btn').first().click();
  await expect(page.locator('#fuelList li')).toHaveCount(before - 1);
  await page.click('#toastAction');
  await expect(page.locator('#fuelList li')).toHaveCount(before);
});

test('fuel type + driving condition persist on entry', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'fuel');
  await page.fill('#fDate', '2024-01-01');
  await page.fill('#fOdometer', '10000');
  await page.fill('#fGallons', '10');
  await page.fill('#fCost', '30');
  await page.selectOption('#fFuelType', 'Premium');
  await page.selectOption('#fDriving', 'Offroad');
  await page.click('#fuelForm button[type="submit"]');
  await page.locator('#fuelList .edit-btn').first().click();
  await expect(page.locator('#fFuelType')).toHaveValue('Premium');
  await expect(page.locator('#fDriving')).toHaveValue('Offroad');
});

test('can edit a fuel entry', async ({ page }) => {
  await loadDemoTruck(page);
  await switchTab(page, 'fuel');
  // Odometer-regression warning may fire if the entry's odo is below the bumped
  // vehicle odo; auto-accept any confirm dialog.
  page.on('dialog', (d) => d.accept());
  await page.locator('#fuelList .edit-btn').first().click();
  await expect(page.locator('#fuelForm .edit-banner')).toBeVisible();
  await page.fill('#fStation', 'EDITED_STATION');
  await page.click('#fuelForm button[type="submit"]');
  await expect(page.locator('#fuelList')).toContainText('EDITED_STATION');
});
