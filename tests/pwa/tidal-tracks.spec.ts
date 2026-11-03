import { test, expect } from '@playwright/test';

test('fresh Island Tracks remains internal in production and offline installation', async ({ page }) => {
  await page.goto('/?area=tidal-islands&start=saltgrass-landing');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'northern-reach');
  await expect(page.locator('input[name="area"][value="tidal-islands"]')).toHaveCount(0);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
});
