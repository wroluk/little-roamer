import { test, expect } from '@playwright/test';
import { DEMO_IDS } from '../../src/game/location-demo-terrain';

for (const id of DEMO_IDS) test(`${id}: no production picker or direct-entry exposure`, async ({ page }) => {
  await page.goto(`/?area=${id}`);
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'northern-reach');
  for (const hidden of DEMO_IDS) await expect(page.locator(`input[name="area"][value="${hidden}"]`)).toHaveCount(0);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
});
