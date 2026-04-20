import { test, expect } from '@playwright/test';
import { startFresh, loadDemoSUV, switchTab } from './helpers.js';

test('can add a new vehicle', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'settings');
  await page.fill('#vNickname', 'Test Jeep');
  await page.fill('#vMake', 'Jeep');
  await page.fill('#vModel', 'Wrangler');
  await page.fill('#vYear', '2020');
  await page.click('#vehicleForm button[type="submit"]');
  await expect(page.locator('#vehicleSelect')).toContainText('Test Jeep');
});

test('Edit Active Vehicle form is populated with active vehicle data', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'settings');
  await expect(page.locator('#eNickname')).toHaveValue('Wrangler Demo');
  await expect(page.locator('#eMake')).toHaveValue('Jeep');
  await expect(page.locator('#eModel')).toHaveValue('Wrangler');
});

test('editing and saving a vehicle updates the selector', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'settings');
  await page.fill('#eNickname', 'Renamed Jeep');
  await page.click('#editVehicleForm button[type="submit"]');
  await expect(page.locator('#vehicleSelect')).toContainText('Renamed Jeep');
  await expect(page.locator('#toast:not(.hidden)')).toBeVisible();
});

test('setting manual value override overrides depreciation math', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'settings');
  await page.fill('#eManualValue', '25000');
  await page.click('#editVehicleForm button[type="submit"]');
  await switchTab(page, 'dashboard');
  await expect(page.locator('#vehicleValueCard')).toContainText('$25,000');
  await expect(page.locator('#vehicleValueCard')).toContainText(/manual value|valor manual/i);
});

test('delete active vehicle cascades to maintenance/fuel/mods/parts', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'maintenance');
  const maintBefore = await page.locator('#maintenanceList li').count();
  expect(maintBefore).toBeGreaterThan(0);

  await switchTab(page, 'settings');
  page.on('dialog', (d) => d.accept());
  await page.click('#deleteVehicleBtn');
  // After cascade the active vehicle is gone — fall back to another or show
  // an empty selector. Either way no maintenance should remain.
  await switchTab(page, 'maintenance');
  await expect(page.locator('#maintenanceList .empty-state')).toBeVisible();
});

test('severe-service toggle halves template intervals', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'settings');
  await page.check('#eSevereService');
  await page.click('#editVehicleForm button[type="submit"]');
  await switchTab(page, 'maintenance');
  await page.selectOption('#mTemplate', 'oil');
  // Oil: 5000 mi / 6 mo normally → 2500 / 3 under severe service
  await expect(page.locator('#mIntervalMiles')).toHaveValue('2500');
  await expect(page.locator('#mIntervalMonths')).toHaveValue('3');
});

test('drivetrain specs show on the dashboard vehicle card', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  const card = await page.textContent('#vehicleCard');
  expect(card).toContain('3.6L Pentastar');
  expect(card).toContain('4.10');
  expect(card).toContain('35x12.50R17');
});

test('severe-service badge appears when toggled', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  await expect(page.locator('#vehicleCard .severe-service-badge')).toBeVisible();
});

test('per-vehicle goals drive dashboard cards', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'settings');
  await page.fill('#eMpgGoal', '18');
  await page.fill('#eMonthlyBudget', '200');
  await page.fill('#eAnnualBudget', '1800');
  await page.fill('#ePurchasePrice', '40000');
  await page.click('#editVehicleForm button[type="submit"]');
  await switchTab(page, 'dashboard');
  await expect(page.locator('#mpgGoalCard')).toContainText(/18/);
  // Budget card title adapts to what's set
  await expect(page.locator('#budgetCardTitle')).toContainText(/Budget|Presupuesto/);
});
