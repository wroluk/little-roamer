import { expect, test, type Page } from '@playwright/test';
import { POSTCARDS, POSTCARD_STORAGE_KEY } from '../../src/game/postcards';
import { demoState, type DemoGame } from './location-demo-driving';

const cards = POSTCARDS.filter(card => card.area === 'island-tracks');
async function seedJournal(page: Page) {
  await page.addInitScript(({ key, ids }) => localStorage.setItem(key,
    JSON.stringify(ids.map(id => ({ id, discoveredAt: '2026-11-05T12:00:00.000Z' })))),
  { key: POSTCARD_STORAGE_KEY, ids: cards.map(card => card.id) });
}

test('Island Tracks journal has eight slots and conceals the hidden discovery on home and pause', async ({ page }) => {
  await page.goto('/?area=island-tracks');
  await expect(page.locator('#open-journal')).toBeEnabled();
  await expect(page.locator('#home-journal-count')).toHaveText('0/8');
  await page.locator('#open-journal').click();
  await expect(page.locator('#journal-grid .journal-card')).toHaveCount(8);
  await expect(page.locator('#journal-grid .secret.locked')).toHaveCount(1);
  await expect(page.locator('#journal-grid')).not.toContainText("Smuggler's Nook");
  await expect(page.locator('#journal-grid img')).toHaveCount(0);
  await page.locator('#close-journal').click();
  await page.locator('#start').click();
  await page.locator('#pause').click();
  await expect(page.locator('#pause-journal-count')).toHaveText('0/8');
  await page.locator('#pause-journal').click();
  await expect(page.locator('#journal-count')).toHaveText('0 of 8 places visited');
});

test('Island Tracks saved postcards show all eight full-size photographs', async ({ page }) => {
  await seedJournal(page);
  await page.goto('/?area=island-tracks');
  await expect(page.locator('#open-journal')).toBeEnabled();
  await page.locator('#open-journal').click();
  for (const card of cards) {
    await page.getByRole('button', { name: `Enlarge ${card.name} postcard`, exact: true }).click();
    await expect(page.locator('#postcard-detail-title')).toHaveText(card.name);
    await expect(page.locator('#postcard-detail-note')).toHaveText(card.note);
    await expect(page.locator('#postcard-detail-image')).toHaveJSProperty('naturalWidth', 800);
    await expect(page.locator('#postcard-detail-image')).toHaveJSProperty('naturalHeight', 520);
    await page.keyboard.press('Escape');
  }
  await expect(page.locator('#journal-grid .secret:not(.locked)')).toContainText('SECRET DISCOVERY');
});

test('Island Tracks postcard dates and counts survive reload and stay isolated across worlds', async ({ page }) => {
  await seedJournal(page);
  await page.goto('/?area=island-tracks');
  await expect(page.locator('#open-journal')).toBeEnabled();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#home-journal-count')).toHaveText('8/8');
  await page.locator('input[name="area"][value="moon"]').check();
  await expect(page.locator('#home-journal-count')).toHaveText('0/5');
  await page.locator('input[name="area"][value="island-tracks"]').check();
  await expect(page.locator('#home-journal-count')).toHaveText('8/8');
  const records = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]') as { discoveredAt: string }[], POSTCARD_STORAGE_KEY);
  expect(records.every(record => record.discoveredAt === '2026-11-05T12:00:00.000Z')).toBe(true);
});

test('Island Tracks real driving reveals the meadow and hidden nook, not photo views or resets', async ({ page }) => {
  test.setTimeout(75_000);
  await page.goto('/?area=island-tracks&car=classic');
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
  await page.evaluate(async () => {
    const game = (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__;
    await game.setPhotoView({ position: { x: -420, y: 30, z: 15 }, target: { x: -427, y: 15, z: 15 }, fov: 48 });
  });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), POSTCARD_STORAGE_KEY)).toEqual([]);
  for (const [x, z, heading, name] of [
    [-415, 15, Math.PI / 2, 'Mainland Meadows'],
    [-622, 25, -Math.PI / 2, "Smuggler's Nook"],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: DemoGame })
      .__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
    await page.keyboard.down('KeyW');
    try { await expect(page.locator('#postcard-notice-name')).toHaveText(name, { timeout: 20_000 }); }
    finally { await page.keyboard.up('KeyW'); }
  }
  const records = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]') as { id: string }[], POSTCARD_STORAGE_KEY);
  expect(records.map(record => record.id).sort()).toEqual(['mainland-meadows', 'smugglers-nook']);
  await page.locator('#reset').click();
  await page.reload();
  await expect(page.locator('#home-journal-count')).toHaveText('2/8');
});

test('Island Tracks inspection starts and a short drive do not earn the crossing postcard', async ({ page }) => {
  await page.goto('/?area=island-tracks&start=saltgrass-landing&car=classic');
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
  await page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(110, 8, Math.PI / 2));
  await page.keyboard.down('KeyW');
  try { await expect.poll(async () => (await demoState(page)).position.x, { timeout: 20_000 }).toBeLessThan(101); }
  finally { await page.keyboard.up('KeyW'); }
  const records = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]') as { id: string }[], POSTCARD_STORAGE_KEY);
  expect(records.some(record => record.id === 'other-shore')).toBe(false);
  await expect(page.locator('#postcard-notice')).toBeHidden();
});
