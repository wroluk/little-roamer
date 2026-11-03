import { test, expect } from '@playwright/test';

test('Island pilot stays out of production selection and direct entry', async ({ page }) => {
  await page.goto('/?area=island&start=aqueduct');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'northern-reach');
  await expect(page.locator('input[name="area"][value="island"]')).toHaveCount(0);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
});
