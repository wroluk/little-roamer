import { test, expect } from '@playwright/test';
import { EMBER_START, EMBER_LOOKOUT } from '../../src/game/northern-ember';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; surface: string; contacts: number; cameraObstructed: boolean; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

test('Ember Basin rim and ash ascent are drivable and reset returns to the entrance', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=northern-reach&start=ember-basin');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('ember-basin-entrance.png') });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 25_000 }).toBeLessThan(394);
  await page.keyboard.up('KeyW');
  expect((await state()).position.y).toBeGreaterThan(98);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(565, 467, Math.atan2(-15, -24)));
  await expect.poll(async () => (await state()).surface).toBe('ash');
  await page.screenshot({ path: testInfo.outputPath('ember-basin-ash-descent.png') });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 25_000 }).toBeGreaterThan(485);
  await page.keyboard.up('KeyW');
  expect((await state()).position.y).toBeGreaterThan(89);
  expect((await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.PI), EMBER_LOOKOUT);
  await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  expect((await state()).cameraObstructed).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('ember-basin-overlook.png') });
  expect((await state()).streaming.activeRender).toBeLessThanOrEqual(25);
  expect((await state()).streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(EMBER_START.z, 0);
  expect(errors).toEqual([]);
});
