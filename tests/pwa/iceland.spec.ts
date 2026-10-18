import { test, expect } from '@playwright/test';

test('unfinished Iceland pilot stays out of the production picker and direct links', async ({ page }) => {
  await page.goto('/?area=iceland');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'northern-reach');
  await expect(page.locator('input[name="area"][value="iceland"]')).toHaveCount(0);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
});
