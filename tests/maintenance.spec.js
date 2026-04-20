import { test, expect } from '@playwright/test';
import { startFresh, loadDemoSUV, switchTab, useOilTemplate } from './helpers.js';

test('can add a maintenance entry and see it in the history', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'maintenance');
  await page.fill('#mDate', '2024-05-01');
  await page.fill('#mOdometer', '10000');
  await page.selectOption('#mType', 'Oil change');
  await page.fill('#mCost', '50');
  await page.click('#maintenanceForm button[type="submit"]');
  await expect(page.locator('#maintenanceList')).toContainText('Oil change');
  await expect(page.locator('#maintenanceList')).toContainText('10000 mi');
});

test('Quick Templates prefill type and intervals', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'maintenance');
  await useOilTemplate(page);
  await expect(page.locator('#mType')).toHaveValue('Oil change');
  await expect(page.locator('#mIntervalMiles')).toHaveValue('5000');
  await expect(page.locator('#mIntervalMonths')).toHaveValue('6');
});

test('"Specify if Other" field is hidden unless Other selected', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'maintenance');
  await expect(page.locator('#mOtherType')).toBeHidden();
  await page.selectOption('#mType', 'Other');
  await expect(page.locator('#mOtherType')).toBeVisible();
  await page.selectOption('#mType', 'Oil change');
  await expect(page.locator('#mOtherType')).toBeHidden();
});

test('date + odometer auto-fill when tab opens', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  await expect(page.locator('#mDate')).not.toHaveValue('');
  // Demo Wrangler odometer is 15200
  await expect(page.locator('#mOdometer')).toHaveValue('15200');
});

test('can edit a maintenance entry inline', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  await page.locator('#maintenanceList .edit-btn').first().click();
  await expect(page.locator('#maintenanceForm .edit-banner')).toBeVisible();
  await page.fill('#mNotes', 'EDITED BY TEST');
  await page.click('#maintenanceForm button[type="submit"]');
  await expect(page.locator('#maintenanceList')).toContainText('EDITED BY TEST');
  await expect(page.locator('#maintenanceForm .edit-banner')).toHaveCount(0);
});

test('Escape cancels maintenance edit mode', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  await page.locator('#maintenanceList .edit-btn').first().click();
  await expect(page.locator('#maintenanceForm .edit-banner')).toBeVisible();
  await page.locator('#maintenanceList').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Escape');
  await expect(page.locator('#maintenanceForm .edit-banner')).toHaveCount(0);
});

test('can delete a maintenance entry and undo via toast', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  page.on('dialog', (d) => d.accept());
  const before = await page.locator('#maintenanceList li').count();
  await page.locator('#maintenanceList .del-btn').first().click();
  await expect(page.locator('#maintenanceList li')).toHaveCount(before - 1);
  await expect(page.locator('#toast:not(.hidden)')).toHaveCount(1);
  await page.click('#toastAction');
  await expect(page.locator('#maintenanceList li')).toHaveCount(before);
});

test('search filters the maintenance history', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  const total = await page.locator('#maintenanceList li').count();
  expect(total).toBeGreaterThan(1);
  await page.fill('#maintenanceSearch', 'oil');
  const filtered = await page.locator('#maintenanceList li').count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(total);
  await page.fill('#maintenanceSearch', 'xyzNOMATCH');
  await expect(page.locator('#maintenanceList .empty-state')).toBeVisible();
});

test('odometer regression warns with confirm dialog', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  const dialogs = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    d.dismiss();
  });
  await page.fill('#mOdometer', '1'); // way below demo max of 16200
  await page.selectOption('#mType', 'Oil change');
  await page.fill('#mCost', '50');
  await page.click('#maintenanceForm button[type="submit"]');
  await page.waitForTimeout(500); // let confirm() dialog propagate
  expect(dialogs.some((d) => /lower than a previous entry/i.test(d))).toBe(true);
});

test('saving a higher odometer bumps the vehicle odometer', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  await page.fill('#mDate', '2026-01-01');
  await page.fill('#mOdometer', '99999');
  await page.selectOption('#mType', 'Oil change');
  await page.fill('#mCost', '50');
  await page.click('#maintenanceForm button[type="submit"]');
  await switchTab(page, 'dashboard');
  await expect(page.locator('#vehicleCard')).toContainText('99999 mi');
});

test('duplicate entry warns before saving', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'maintenance');
  await page.fill('#mDate', '2024-05-01');
  await page.fill('#mOdometer', '10000');
  await page.selectOption('#mType', 'Oil change');
  await page.fill('#mCost', '50');
  await page.click('#maintenanceForm button[type="submit"]');
  await expect(page.locator('#maintenanceList')).toContainText('Oil change');

  const dialogs = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    d.dismiss();
  });
  await page.fill('#mDate', '2024-05-01');
  await page.fill('#mOdometer', '10020');
  await page.selectOption('#mType', 'Oil change');
  await page.fill('#mCost', '50');
  await page.click('#maintenanceForm button[type="submit"]');
  await page.waitForTimeout(500);
  expect(dialogs.some((d) => /similar entry/i.test(d))).toBe(true);
});

test('print service report opens a new window with totals', async ({ page, context }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  const [report] = await Promise.all([context.waitForEvent('page'), page.click('#reportBtn')]);
  await expect(report.locator('h1')).toContainText(/Service History|Historial/);
  await expect(report.locator('h2').first()).toBeVisible();
  await report.close();
});
