import { test, expect } from '@playwright/test';
import { startFresh, switchTab } from './helpers.js';

test('Trails tab shows empty state when no trail runs logged', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'trails');
  await expect(page.locator('#trailsList .empty-state')).toBeVisible();
});

test('can log a trail run', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'trails');
  await page.fill('#trailName', 'Moab Slickrock');
  await page.fill('#trailDuration', '4');
  await page.check('#trailRock');
  await page.fill('#trailNotes', 'Great traction, no damage');
  await page.click('#trailsForm button[type="submit"]');
  await expect(page.locator('#trailsList')).toContainText('Moab Slickrock');
  await expect(page.locator('#trailsList')).toContainText('4h');
  await expect(page.locator('#trailsList')).toContainText('rock');
});

test('water crossing auto-spawns diff + transfer case reminders', async ({ page }) => {
  await startFresh(page);
  // Give the vehicle an odometer so the spawn has an anchor
  await switchTab(page, 'settings');
  await page.fill('#eOdometer', '20000');
  await page.click('#editVehicleForm button[type="submit"]');

  await switchTab(page, 'trails');
  await page.fill('#trailName', 'River Run');
  await page.check('#trailWater');
  await page.click('#trailsForm button[type="submit"]');

  await switchTab(page, 'maintenance');
  const list = page.locator('#maintenanceList');
  await expect(list).toContainText('Differential fluid front');
  await expect(list).toContainText('Differential fluid rear');
  await expect(list).toContainText('Transfer case fluid');
});

test('trail search filters the list', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'trails');
  const names = ['Hell\'s Revenge', 'Poison Spider', 'Top of the World'];
  for (let i = 0; i < names.length; i++) {
    // trailDate is required; form.reset() wipes it so we must re-fill every iteration.
    await page.fill('#trailDate', '2024-01-0' + (i + 1));
    await page.fill('#trailName', names[i]);
    await page.check('#trailRock');
    await page.click('#trailsForm button[type="submit"]');
    await expect(page.locator('#trailsList li')).toHaveCount(i + 1);
    await expect(page.locator('#trailName')).toHaveValue('');
  }
  await page.fill('#trailsSearch', 'spider');
  await expect(page.locator('#trailsList li')).toHaveCount(1);
  await page.fill('#trailsSearch', 'nope');
  await expect(page.locator('#trailsList .empty-state')).toBeVisible();
});

test('can delete a trail with undo', async ({ page }) => {
  await startFresh(page);
  await switchTab(page, 'trails');
  await page.fill('#trailName', 'Test Trail');
  await page.click('#trailsForm button[type="submit"]');
  page.on('dialog', (d) => d.accept());
  await page.locator('#trailsList .del-btn').first().click();
  await expect(page.locator('#trailsList .empty-state')).toBeVisible();
  await page.click('#toastAction');
  await expect(page.locator('#trailsList li').filter({ hasText: 'Test Trail' })).toHaveCount(1);
});
