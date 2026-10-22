import { expect, test } from '@playwright/test';
import { LAVA_TUBES, tubePoint } from '../../src/game/mars-tubes-layout';
import { POSTCARD_STORAGE_KEY } from '../../src/game/postcards';
import { inletCenterX, LAKE_ISLAND, lakeShorePoint } from '../../src/game/northern-watershed';

test('journal appears only on supported home and pause screens and shows this world only', async ({ page }) => {
  await page.goto('/?area=valley');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#open-journal')).toBeHidden();
  await page.locator('input[name="area"][value="northern-reach"]').check();
  await expect(page.locator('#open-journal')).toBeVisible();
  await page.locator('#open-journal').click();
  await expect(page.locator('#journal-grid .journal-card')).toHaveCount(17);
  await expect(page.locator('#journal-grid')).toContainText('Secret discovery');
  await expect(page.locator('#journal-grid .journal-card.secret.locked')).toHaveCount(1);
  await expect(page.locator('#journal-grid')).not.toContainText('Stone Circle');
  await expect(page.locator('#journal-grid')).not.toContainText('Buried Shuttle');
  await page.locator('#close-journal').click();
  await page.locator('input[name="area"][value="mars"]').check();
  await page.locator('#open-journal').click();
  await expect(page.locator('#journal-grid .journal-card')).toHaveCount(10);
  await expect(page.locator('#journal-grid .journal-card.secret.locked')).toHaveCount(1);
  await expect(page.locator('#journal-grid')).not.toContainText('River Valley');
  await page.locator('#close-journal').click();
  await page.locator('#start').click();
  await expect(page.locator('#open-journal')).toBeHidden();
  await expect(page.locator('#journal')).toBeHidden();
  await page.locator('#pause').click();
  await expect(page.locator('#pause-journal')).toBeVisible();
  await page.locator('#pause-journal').click();
  await expect(page.locator('#journal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible();
});

test('a short real drive unlocks a clickable postcard notice and the entry survives reload', async ({ page }) => {
  await page.goto('/?area=mars');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await expect(page.locator('#postcard-notice')).toBeHidden();
  await page.keyboard.down('KeyW');
  await expect(page.locator('#postcard-notice-name')).toHaveText('Habitat Seven', { timeout: 15_000 });
  await page.keyboard.up('KeyW');
  await expect(page.locator('#postcard-notice')).toBeVisible();
  await expect(page.locator('#postcard-notice')).toHaveClass(/visible/);
  await expect(page.locator('#postcard-notice-image')).toHaveJSProperty('naturalWidth', 800);
  await page.locator('#postcard-notice').click();
  await expect(page.locator('#journal')).toBeVisible();
  await expect(page.locator('#journal-grid .journal-photo-button').first()).toBeFocused();
  await page.locator('#close-journal').click();
  await expect(page.locator('#journal')).toBeHidden();
  await expect(page.locator('#pause')).toBeEnabled();
  await page.locator('#pause').click();
  await page.locator('#pause-journal').click();
  await expect(page.locator('#journal-count')).toHaveText('1 of 10 places visited');
  await expect(page.locator('#journal-grid .journal-card').first().locator('img')).toBeVisible();
  await expect(page.locator('#journal-grid .journal-card').first()).toContainText('FIRST VISITED');
  await page.locator('#journal-grid .journal-photo-button').first().click();
  await expect(page.locator('#postcard-detail')).toBeVisible();
  await expect(page.locator('#postcard-detail-image')).toHaveJSProperty('naturalWidth', 800);
  await expect(page.locator('#postcard-detail-title')).toHaveText('Habitat Seven');
  await page.keyboard.press('Escape');
  await expect(page.locator('#journal')).toBeVisible();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#open-journal').click();
  await expect(page.locator('#journal-count')).toHaveText('1 of 10 places visited');
});

test('an unlocked secret postcard has a distinct journal card and detail view', async ({ page }, info) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify([
    { id: 'shuttle-wreck', discoveredAt: '2026-10-16T12:00:00.000Z' },
  ])), POSTCARD_STORAGE_KEY);
  await page.goto('/?area=mars');
  await expect(page.locator('#open-journal')).toBeEnabled();
  await page.locator('#open-journal').click();
  const secret = page.locator('#journal-grid .journal-card.secret:not(.locked)');
  await expect(secret).toHaveCount(1);
  await expect(secret.locator('.journal-secret-badge')).toHaveText('✦ SECRET DISCOVERY');
  await expect(secret).toHaveCSS('background-image', /gradient/);
  await secret.scrollIntoViewIfNeeded();
  await secret.screenshot({ path: info.outputPath('unlocked-secret-card.png') });
  await secret.locator('.journal-photo-button').click();
  await expect(page.locator('#postcard-detail .postcard-detail')).toHaveClass(/secret/);
  await expect(page.locator('#postcard-detail-title')).toHaveText('Buried Shuttle');
  await page.locator('#postcard-detail .postcard-detail').screenshot({ path: info.outputPath('unlocked-secret-detail.png') });
});

test('driving the western Lava Tube unlocks its postcard away from the regional start', async ({ page }) => {
  await page.goto('/?area=mars&start=lava-tubes');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const entry = tubePoint(LAVA_TUBES[1], -510);
  await page.evaluate(async point => {
    await (window as unknown as { __ROAMER__: { placeVehicle(x: number, z: number, heading: number): Promise<void> } })
      .__ROAMER__.placeVehicle(point.x, point.z, Math.PI);
  }, entry);
  await page.keyboard.down('KeyW');
  try { await expect(page.locator('#postcard-notice-name')).toHaveText('Lava Tubes', { timeout: 20_000 }); }
  finally { await page.keyboard.up('KeyW'); }
  await page.locator('#pause').click();
  await page.locator('#pause-journal').click();
  await expect(page.locator('#journal-grid .journal-card').filter({ hasText: 'Lava Tubes' })).toContainText('FIRST VISITED');
});

test('short drives on the far Crown rim and inside Iron Maze unlock their postcards', async ({ page }, info) => {
  for (const [start, point, heading, name] of [
    ['crown-crater', { x: 0, z: -260 }, Math.PI / 2, 'Crown Crater'],
    ['iron-maze', { x: 404, z: 477 }, 0, 'Iron Maze'],
  ] as const) {
    await page.goto(`/?area=mars&start=${start}`);
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await page.evaluate(({ point, heading }) => (window as unknown as {
      __ROAMER__: { placeVehicle(x: number, z: number, heading: number): Promise<void> };
    }).__ROAMER__.placeVehicle(point.x, point.z, heading), { point, heading });
    await expect(page.locator('#postcard-notice')).toBeHidden();
    await page.keyboard.down('KeyW');
    try { await expect(page.locator('#postcard-notice-name')).toHaveText(name, { timeout: 20_000 }); }
    finally { await page.keyboard.up('KeyW'); }
    await page.screenshot({ path: info.outputPath(`${start}-postcard-drive.png`) });
  }
});

test('a short drive on the far Alder River bank unlocks its postcard', async ({ page }) => {
  await page.goto('/?area=northern-reach&start=alder-river');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.evaluate(point => (window as unknown as {
    __ROAMER__: { placeVehicle(x: number, z: number, heading: number): Promise<void> };
  }).__ROAMER__.placeVehicle(point.x, point.z, 0), { x: inletCenterX(-470) + 42, z: -470 });
  await expect(page.locator('#postcard-notice')).toBeHidden();
  await page.keyboard.down('KeyW');
  try { await expect(page.locator('#postcard-notice-name')).toHaveText('Alder River', { timeout: 15_000 }); }
  finally { await page.keyboard.up('KeyW'); }
  const records = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]') as { id: string }[], POSTCARD_STORAGE_KEY);
  expect(records.some(record => record.id === 'alder-river')).toBe(true);
});

test('Northern lake island, shore and far rims unlock on short real drives', async ({ page }, info) => {
  test.setTimeout(120_000);
  for (const [start, point, name] of [
    ['great-lake', LAKE_ISLAND, 'Great Lake'],
    ['great-lake', lakeShorePoint(1.8, 22), 'Great Lake'],
    ['stonegate-basin', { x: -185, z: -365 }, 'Stonegate Basin'],
    ['ember-basin', { x: 635, z: 380 }, 'Ember Basin'],
    ['ochre-terraces', { x: 550, z: 190 }, 'Ochre Terraces'],
    ['ochre-terraces', { x: 375, z: 40 }, 'Ochre Terraces'],
  ] as const) {
    if (page.url().startsWith('http'))
      await page.evaluate(key => localStorage.removeItem(key), POSTCARD_STORAGE_KEY);
    await page.goto(`/?area=northern-reach&start=${start}`);
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await page.evaluate(point => (window as unknown as {
      __ROAMER__: { placeVehicle(x: number, z: number, heading: number): Promise<void> };
    }).__ROAMER__.placeVehicle(point.x, point.z, 0), point);
    await expect(page.locator('#postcard-notice')).toBeHidden();
    await page.keyboard.down('KeyW');
    try { await expect(page.locator('#postcard-notice-name')).toHaveText(name, { timeout: 20_000 }); }
    finally { await page.keyboard.up('KeyW'); }
    await page.screenshot({ path: info.outputPath(`${start}-${Math.round(point.z)}-postcard-drive.png`) });
  }
});

test('driving the outer Ochre slope does not unlock the terraces postcard', async ({ page }, info) => {
  await page.goto('/?area=northern-reach&start=ochre-terraces');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.evaluate(() => (window as unknown as {
    __ROAMER__: { placeVehicle(x: number, z: number, heading: number): Promise<void> };
  }).__ROAMER__.placeVehicle(480, -20, 0));
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => page.evaluate(() => (window as unknown as {
      __ROAMER__: { snapshot(): { position: { z: number } } };
    }).__ROAMER__.snapshot().position.z), { timeout: 20_000 }).toBeLessThan(-32);
  } finally { await page.keyboard.up('KeyW'); }
  await expect(page.locator('#postcard-notice')).toBeHidden();
  await page.screenshot({ path: info.outputPath('ochre-outer-slope-no-postcard.png') });
});
