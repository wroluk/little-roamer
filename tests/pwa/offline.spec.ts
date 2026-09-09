import { expect, test } from '@playwright/test';

test('installs a standalone manifest and completes the offline cache', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');

  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    if (!href) throw new Error('Missing web app manifest');
    return fetch(href).then((response) => response.json());
  });
  expect(manifest).toMatchObject({
    name: 'Little Roamer · Toy 4WD',
    display: 'standalone',
    start_url: './',
    scope: './',
  });
  expect(manifest.icons).toHaveLength(3);
});

test('reloads and enters both areas with no network', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit cannot navigate after context.setOffline; iPad Safari supports service workers.');

  await page.goto('/?area=highlands');
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.keyboard.press('KeyW');

  await page.locator('#area-select').selectOption('valley');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.area)).toBe('valley');
});
