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

test('production exposes Mars and all three exploration rovers and precaches their assets', async ({ page }) => {
  await page.goto('/?area=mars&car=mars-scout');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'mars');
  await expect(page.locator('#mars-car-option')).toBeVisible();
  await expect(page.locator('#lunar-car-option')).toBeVisible();
  await expect(page.locator('#nomad-car-option')).toBeVisible();
  await expect(page.locator('input[name="area"][value="mars"]')).toBeChecked();
  await expect(page.locator('input[name="area"][value="mars"] + .area-choice')).toContainText('Mars Outpost');
  await expect(page.locator('input[name="car"][value="mars-scout"]')).toBeChecked();
  expect(await page.evaluate(() => '__ROAMER__' in window)).toBe(false);
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
  const cached = await page.evaluate(async () => {
    const stores = await caches.keys();
    return (await Promise.all(stores.map(async name => (await (await caches.open(name)).keys()).map(r => r.url)))).flat();
  });
  expect(cached.some(url => /mars-worker-.*\.js/.test(url))).toBe(true);
  expect(cached.some(url => url.includes('/cars/mars-scout.png'))).toBe(true);
  expect(cached.some(url => url.includes('/cars/lunar-rover.png'))).toBe(true);
  expect(cached.some(url => url.includes('/cars/lunar-nomad.png'))).toBe(true);
  for (const area of ['northern-reach', 'valley', 'highlands', 'samurai-village', 'mars', 'moon']) {
    expect(cached.some(url => url.includes(`/locations/${area}.jpg`))).toBe(true);
  }
  for (const [area, postcard] of [
    ['northern-reach', 'pine-hollows'], ['northern-reach', 'river-valley'], ['northern-reach', 'stone-circle'],
    ['mars', 'habitat-seven'], ['mars', 'shuttle-wreck'],
  ]) {
    expect(cached.some(url => url.includes(`/postcards/${area}/${postcard}.jpg`))).toBe(true);
  }
});

test('an unlocked postcard opens at full size while offline', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit offline navigation remains unreliable; keep iPad Safari offline review.');
  await page.addInitScript(() => localStorage.setItem('little-roamer-postcards-v1',
    JSON.stringify([{ id: 'habitat-seven', discoveredAt: '2026-10-14T12:00:00.000Z' }])));
  await page.goto('/?area=mars');
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  try {
    await page.locator('#open-journal').click();
    await page.locator('#journal-grid .journal-photo-button').first().click();
    await expect(page.locator('#postcard-detail-image')).toHaveJSProperty('naturalWidth', 800);
    await expect(page.locator('#postcard-detail')).toBeVisible();
  } finally { await context.setOffline(false); }
});

test('production home picker restricts cars by world and remembers the Earth car', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('input[name="car"][value="classic"]').check();
  await page.locator('input[name="area"][value="mars"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'mars');
  await page.locator('input[name="car"][value="lunar-rover"]').check();
  await expect(page).toHaveURL(/car=lunar-rover/);
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('input[name="car"][value="lunar-rover"]')).toBeChecked();
  await expect(page.locator('#start')).toBeEnabled();
  await page.goto('/?area=valley');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('input[name="car"][value="classic"]')).toBeChecked();
  await expect(page.locator('#mars-car-option')).toBeHidden();
  await expect(page.locator('#lunar-car-option')).toBeHidden();
  await expect(page.locator('#nomad-car-option')).toBeHidden();
  await page.goto('/?area=mars&start=lava-tubes&car=classic');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'mars');
  await expect(page.locator('input[name="car"][value="mars-scout"]')).toBeChecked();
  await expect(page).toHaveURL(/car=mars-scout/);
  await expect(page.locator('#welcome-title')).toHaveText('Beneath the cooled lava.');
  await page.locator('#start').click();
  await expect(page.locator('#controls')).toBeVisible();
  await expect(page.locator('#error')).toBeHidden();
});

test('the cached Mars worker generates all four new regions without network access', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit fails offline module-worker startup for both Northern and Mars; verify on physical iPad Safari.');
  await page.goto('/');
  await expect(page.locator('#offline-status')).toHaveText('Ready to play offline');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const workerUrl = await page.evaluate(async () => {
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) {
      if (/mars-worker-.*\.js/.test(request.url)) return request.url;
    }
    throw new Error('Mars worker missing from offline cache');
  });
  await context.setOffline(true);
  try {
    const results = await page.evaluate(url => new Promise<{ id: number; vertices: number; indices: number; finite: boolean }[]>((resolve, reject) => {
      const worker = new Worker(url, { type: 'module' });
      const results: { id: number; vertices: number; indices: number; finite: boolean }[] = [];
      const timer = window.setTimeout(() => { worker.terminate(); reject(new Error('Offline Mars worker timed out')); }, 20_000);
      worker.onerror = event => { window.clearTimeout(timer); worker.terminate(); reject(new Error(event.message)); };
      worker.onmessage = event => {
        const { id, chunk, error } = event.data;
        if (error || !chunk) { window.clearTimeout(timer); worker.terminate(); reject(new Error(error ?? 'No offline chunk')); return; }
        results.push({ id, vertices: chunk.vertices.length, indices: chunk.indices.length, finite: chunk.vertices.every(Number.isFinite) });
        if (results.length === 4) { window.clearTimeout(timer); worker.terminate(); resolve(results); }
      };
      [[0, 5], [-5, 4], [-6, 0], [-5, -5]].forEach(([cx, cz], id) => worker.postMessage({ id, cx, cz }));
    }), workerUrl!);
    expect(results.map(result => result.id).sort()).toEqual([0, 1, 2, 3]);
    for (const result of results) expect(result).toMatchObject({ vertices: 5043, indices: 9600, finite: true });
  } finally { await context.setOffline(false); }
});

test('reloads and travels through Highlands, Valley, Mars and Moon with no network', async ({ page, context, browserName }) => {
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

  await page.locator('#pause').click();
  await expect(page.locator('#paused')).toBeVisible();
  await page.locator('#home').click();
  await expect(page.locator('#welcome')).toBeVisible();
  await page.locator('input[name="area"][value="valley"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await expect.poll(() => page.evaluate(() => document.body.dataset.area)).toBe('valley');
  await page.locator('#pause').click();
  await page.locator('#home').click();
  await page.locator('input[name="area"][value="mars"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('input[name="car"][value="lunar-rover"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('input[name="car"][value="lunar-rover"]')).toBeChecked();
  await expect(page.locator('#lunar-car-option img')).toHaveJSProperty('naturalWidth', 360);
  await page.locator('input[name="car"][value="lunar-nomad"]').check();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('input[name="car"][value="lunar-nomad"]')).toBeChecked();
  await expect(page.locator('#nomad-car-option img')).toHaveJSProperty('naturalWidth', 360);
  await page.locator('#start').click();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'mars');
  await expect(page.locator('#controls')).toBeVisible();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyW');
  await expect(page.locator('#error')).toBeHidden();
  await page.locator('#pause').click();
  await page.locator('#home').click();
  await page.locator('input[name="area"][value="moon"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-area', 'moon');
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('input[name="car"][value="lunar-nomad"]')).toBeChecked();
  await expect(page.locator('input[name="area"][value="moon"] + .area-choice img')).toHaveJSProperty('naturalWidth', 476);
  await page.locator('#start').click();
  await expect(page.locator('#controls')).toBeVisible();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyW');
  await expect(page.locator('#error')).toBeHidden();
});
