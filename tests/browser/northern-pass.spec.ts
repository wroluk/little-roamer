import { test, expect } from '@playwright/test';
import { PASS_START, PASS_BOWL } from '../../src/game/northern-pass';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; surface: string; contacts: number; cameraObstructed: boolean; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

test('High Pass climbs to the lookout, exposes the ice bowl and resets safely', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=northern-reach&start=high-pass');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('high-pass-approach.png') });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 25_000 }).toBeLessThan(-467);
  await page.keyboard.up('KeyW');
  expect((await state()).position.y).toBeGreaterThan(123);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(600, -565, 0));
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 25_000 }).toBeLessThan(-600);
  await page.keyboard.up('KeyW');
  const lookout = await state();
  expect(lookout.position.y).toBeGreaterThan(139);
  expect(lookout.cameraObstructed).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('high-pass-lookout.png') });
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, 0), PASS_BOWL);
  await expect.poll(async () => (await state()).surface).toBe('ice');
  await page.screenshot({ path: testInfo.outputPath('high-pass-blue-hollow.png') });
  expect((await state()).streaming.activeRender).toBeLessThanOrEqual(25);
  expect((await state()).streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(PASS_START.z, 0);
  expect(errors).toEqual([]);
});
