import { test, expect } from '@playwright/test';
import { startFresh, loadDemoSUV, switchTab } from './helpers.js';

test('Service Reminders card renders above the Vehicle card', async ({ page }) => {
  await startFresh(page);
  const cards = await page.locator('#dashboard > .card, #dashboard > .g3, #dashboard > .g2').evaluateAll((els) =>
    els.map((e) => e.querySelector('h2, h3')?.textContent?.trim() || ''),
  );
  expect(cards[0]).toMatch(/Service Reminders|Recordatorios/);
  expect(cards[1]).toMatch(/Vehicle|Vehículo/);
});

test('Vehicle card shows color, plate, VIN last-4 and purchase date', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  const meta = await page.locator('#vehicleCard .vehicle-meta').textContent();
  expect(meta).toContain('Orange'); // color
  expect(meta).toContain('DEMO1'); // plate
  expect(meta).toContain('G123'); // vin last-4
  expect(meta).toMatch(/2023-01-01/); // purchase date
});

test('TCO + $/mile cards render with demo data', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  await expect(page.locator('#tcoCard')).toContainText(/\$/);
  await expect(page.locator('#cpmCard')).toContainText(/\$|mile|milla/);
});

test('Monthly trend chart canvas is present', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  await expect(page.locator('#monthlyChart')).toBeVisible();
});

test('Budget card header adapts to what is configured', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  // Demo SUV seeds both monthlyBudget and annualBudget → "Budget"
  await expect(page.locator('#budgetCardTitle')).toHaveText(/Budget|Presupuesto/);
});

test('MPG vs Goal card shows delta', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  // Demo SUV has mpgGoal: 18 and several fuel entries computing to ~19 MPG
  await expect(page.locator('#mpgGoalCard')).toContainText(/goal|meta/i);
});

test('dashboard recent lists show empty states on fresh install', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'dashboard');
  await expect(page.locator('#recentMaintenance .empty-state')).toBeVisible();
  await expect(page.locator('#recentFuel .empty-state')).toBeVisible();
  await expect(page.locator('#topMods .empty-state')).toBeVisible();
});

test('vehicle value card reflects purchase price + depreciation', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  await expect(page.locator('#vehicleValueCard')).toContainText(/\$/);
  await expect(page.locator('#vehicleValueCard')).toContainText(/depreciation|depreciación/i);
});

test('cost breakdown pie chart is present', async ({ page }) => {
  await loadDemoSUV(page);
  await switchTab(page, 'dashboard');
  await expect(page.locator('#costChart')).toBeVisible();
});
