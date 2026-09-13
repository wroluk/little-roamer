import { test, expect } from '@playwright/test';
import { COAST_START, coastShoreX } from '../../src/game/northern-coast';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; contacts: number; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

test('Fjord Coast beach drives smoothly and resets to the clifftop', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=northern-reach&start=fjord-coast');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('fjord-clifftop.png') });
  const from = { x: coastShoreX(470) + 30, z: 470 };
  const to = { x: coastShoreX(430) + 30, z: 430 };
  await page.evaluate(async ({ from, to }) => {
    await (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(from.x, from.z, Math.atan2(from.x - to.x, from.z - to.z));
  }, { from, to });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 25_000 }).toBeLessThan(438);
  await page.keyboard.up('KeyW');
  const beach = await state();
  expect(beach.position.y).toBeGreaterThan(0);
  expect(beach.position.y).toBeLessThan(3);
  expect(beach.contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('fjord-beach.png') });
  expect(beach.streaming.activeRender).toBeLessThanOrEqual(25);
  expect(beach.streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(COAST_START.z, 0);
  expect(errors).toEqual([]);
});
