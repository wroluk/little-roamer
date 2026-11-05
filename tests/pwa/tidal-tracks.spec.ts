import { test, expect } from '@playwright/test';
import { POSTCARDS, POSTCARD_STORAGE_KEY } from '../../src/game/postcards';

test('Island Tracks postcards are precached and all eight images decode at full size offline', async ({ page, context }) => {
  const cards = POSTCARDS.filter(card => card.area === 'island-tracks');
  await page.addInitScript(({ key, ids }) => localStorage.setItem(key,
    JSON.stringify(ids.map(id => ({ id, discoveredAt: '2026-11-05T12:00:00.000Z' })))),
  { key: POSTCARD_STORAGE_KEY, ids: cards.map(card => card.id) });
  await page.goto('/?area=island-tracks');
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cached = await page.evaluate(async () => {
    const stores = await caches.keys();
    return (await Promise.all(stores.map(async name => (await (await caches.open(name)).keys()).map(request => request.url)))).flat();
  });
  for (const card of cards)
    expect(cached.some(url => url.includes(`/postcards/island-tracks/${card.id}.jpg`))).toBe(true);
  await context.setOffline(true);
  try {
    await page.locator('#open-journal').click();
    await expect(page.locator('#journal-count')).toHaveText('8 of 8 places visited');
    const sizes = await page.evaluate(async images => Promise.all(images.map(async src => {
      const image = new Image(); image.src = src; await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    })), cards.map(card => card.image));
    expect(sizes).toEqual(cards.map(() => [800, 520]));
    await page.getByRole('button', { name: "Enlarge Smuggler's Nook postcard", exact: true }).click();
    await expect(page.locator('#postcard-detail-image')).toHaveJSProperty('naturalWidth', 800);
  } finally { await context.setOffline(false); }
});

test('published home picker opens the Island Tracks preview with Earth cars', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  const tile = page.locator('#area-picker input[value="island-tracks"]');
  await expect(page.locator('input[name="area"][value="island-tracks"]')).toHaveCount(1);
  await expect(tile.locator('..').locator('small')).toHaveText('Meadows, coves & crossings');
  await expect(tile.locator('..').locator('img')).toHaveJSProperty('naturalWidth', 476);
  await page.locator('input[name="car"][value="classic"]').check();
  await tile.check();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'island-tracks');
  await expect(page.locator('#welcome-eyebrow')).toHaveText('ISLAND TRACKS / HARBOR COVE');
  await expect(page.locator('input[name="car"][value="classic"]')).toBeChecked();
  await expect(page.locator('#mars-car-option')).toBeHidden();
  await expect(page.locator('#development-menu')).toHaveCount(0);
  expect(await page.evaluate(() => '__ROAMER__' in window)).toBe(false);
  await expect(page.locator('#reset')).toHaveAttribute('title', 'Restart the whole current challenge from its departure point (R)');
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
  await page.locator('#start').click();
  await expect(page.locator('#controls')).toBeVisible();
  await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.up('KeyW');
  await page.screenshot({ path: info.outputPath('published-island-tracks-driving.png') });
  await page.locator('#reset').click();
  await expect(page.locator('#error')).toBeHidden();
  expect(errors).toEqual([]);
});

test('published Island Tracks regional links retain the requested Earth car', async ({ page }) => {
  for (const [id, name] of [['pebble-cove', 'Pebble Cove'], ['needle-lighthouse', 'Needle Lighthouse'], ['whales-back', "Whale's Back"]]) {
    await page.goto(`/?area=island-tracks&start=${id}&car=classic`);
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('body')).toHaveAttribute('data-area', 'island-tracks');
    await expect(page.locator('#area-picker input[value="island-tracks"]')).toBeChecked();
    await expect(page.locator('input[name="car"][value="classic"]')).toBeChecked();
    await expect(page.locator('#welcome-eyebrow')).toHaveText(`ISLAND TRACKS / ${name.toUpperCase()}`);
    await expect(page.locator('#loading-status')).toContainText(name);
    await page.locator('#start').click();
    await expect(page.locator('#controls')).toBeVisible();
    await page.keyboard.press('KeyR');
    await expect(page.locator('#error')).toBeHidden();
  }
});

test('Island Tracks preview reloads and travels offline with its cached thumbnail', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit offline navigation remains unreliable; keep iPad Safari offline review.');
  await page.goto('/?area=island-tracks&start=pebble-cove&car=modern');
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('body')).toHaveAttribute('data-area', 'island-tracks');
    await expect(page.locator('#welcome-eyebrow')).toHaveText('ISLAND TRACKS / PEBBLE COVE');
    await expect(page.locator('#area-picker input[value="island-tracks"] + .area-choice img')).toHaveJSProperty('naturalWidth', 476);
    await page.locator('#start').click();
    await expect(page.locator('#controls')).toBeVisible();
    await page.locator('#pause').click(); await page.locator('#home').click();
    await page.locator('#area-picker input[value="valley"]').check();
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('body')).toHaveAttribute('data-area', 'valley');
    await page.locator('#area-picker input[value="island-tracks"]').check();
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('body')).toHaveAttribute('data-area', 'island-tracks');
    await page.locator('#start').click();
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#error')).toBeHidden();
  } finally { await context.setOffline(false); }
});
