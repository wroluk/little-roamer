import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('the initial page is styled before any game JavaScript runs', async ({ page }) => {
  await page.goto('/?area=valley');
  const logo = page.locator('#welcome .brand-icon');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveCSS('width', '37px');
  await expect(logo).toHaveCSS('height', '37px');
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  await expect(page.locator('head link[rel="stylesheet"]')).toHaveCount(1);
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#paused')).toBeHidden();
});
