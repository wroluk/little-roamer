import { test, expect } from '@playwright/test';

test('unfinished Moon pilot stays out of production URLs, picker and vehicle selection', async ({ page }) => {
  await page.goto('/?area=moon&start=earthrise-overlook&car=mars-scout');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'northern-reach');
  await expect(page.locator('input[name="area"][value="moon"]')).toHaveCount(0);
  await expect(page.locator('#mars-car-option')).toBeHidden();
  await expect(page.locator('#lunar-car-option')).toBeHidden();
  await expect(page.locator('input[name="car"][value="modern"]')).toBeChecked();
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
});
