import { test, expect } from '@playwright/test';

test('production home tile opens completed Moon with the lunar rover choices', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  const tile = page.locator('input[name="area"][value="moon"]');
  await expect(tile.locator('..')).toContainText('Low-gravity exploration');
  await expect(tile.locator('..')).not.toContainText('preview');
  await expect(tile.locator('..').locator('img')).toHaveJSProperty('naturalWidth', 476);
  await tile.check();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'moon');
  await expect(page.locator('#welcome-eyebrow')).toHaveText('MOON / EARTHVIEW BASE');
  await expect(page.locator('#mars-car-option')).toBeVisible();
  await expect(page.locator('#lunar-car-option')).toBeVisible();
  await expect(page.locator('#nomad-car-option')).toBeVisible();
  await expect(page.locator('input[name="car"][value="lunar-rover"]')).toBeChecked();
  expect(await page.evaluate(() => '__ROAMER__' in window)).toBe(false);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
  await page.locator('#start').click();
  await expect(page.locator('#controls')).toBeVisible();
  await expect(page.locator('#error')).toBeHidden();
});

test('production Moon regional links retain the selected lunar vehicle', async ({ page }) => {
  await page.goto('/?area=moon&start=earthrise-overlook&car=lunar-nomad');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'moon');
  await expect(page.locator('input[name="area"][value="moon"]')).toBeChecked();
  await expect(page.locator('input[name="car"][value="lunar-nomad"]')).toBeChecked();
  await expect(page.locator('#loading-status')).toContainText('Earthrise Overlook');
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
});
