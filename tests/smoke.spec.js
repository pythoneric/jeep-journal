import { test, expect } from '@playwright/test';
import { openLoader, startFresh, loadDemoSUV, loadDemoTruck } from './helpers.js';

test('loader overlay is visible on first load', async ({ page }) => {
  await openLoader(page);
  await expect(page.locator('#loader')).toBeVisible();
  await expect(page.locator('#continueBtn')).toBeVisible();
  await expect(page.locator('#demoSUVBtn')).toBeVisible();
  await expect(page.locator('#demoTruckBtn')).toBeVisible();
  await expect(page.locator('#startFreshBtn')).toBeVisible();
});

test('Start Fresh dismisses loader and reveals app', async ({ page }) => {
  await startFresh(page);
  await expect(page.locator('#loader')).toBeHidden();
  await expect(page.locator('#vehicleSelect')).toBeVisible();
  await expect(page.locator('nav.tabs')).toBeVisible();
});

test('Demo SUV loads the Wrangler sample', async ({ page }) => {
  await loadDemoSUV(page);
  await expect(page.locator('#vehicleSelect')).toContainText('Wrangler Demo');
});

test('Demo Truck loads the Gladiator sample', async ({ page }) => {
  await loadDemoTruck(page);
  await expect(page.locator('#vehicleSelect')).toContainText('Gladiator Demo');
});

test('refresh button brings the loader back', async ({ page }) => {
  await startFresh(page);
  await expect(page.locator('#loader')).toBeHidden();
  await page.click('#refreshBtn');
  await expect(page.locator('#loader')).toBeVisible();
  await expect(page.locator('#continueBtn')).toBeVisible();
});

test('language toggle flips UI text', async ({ page }) => {
  await startFresh(page);
  const toggle = page.locator('#langToggle');
  const initial = await toggle.textContent();
  await toggle.click();
  await expect(toggle).not.toHaveText(initial ?? '');
});
