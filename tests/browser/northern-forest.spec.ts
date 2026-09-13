import { test, expect } from '@playwright/test';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; contacts: number; cameraObstructed: boolean; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

test('Pine Hollow ravine and lookout are accessible across streamed terrain', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=northern-reach');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-72, 501, 0));
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 20_000 }).toBeLessThan(446);
  await page.keyboard.up('KeyW');
  expect((await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('pine-hollow-ravine.png') });
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-115, 420, Math.atan2(-17, 45)));
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 25_000 }).toBeLessThan(382);
  await page.keyboard.up('KeyW');
  expect((await state()).position.y).toBeGreaterThan(29);
  expect((await state()).cameraObstructed).toBe(false);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-98, 375, 0));
  await page.screenshot({ path: testInfo.outputPath('pine-hollow-lookout.png') });
  const ready = await state();
  expect(ready.streaming.activeRender).toBeLessThanOrEqual(25);
  expect(ready.streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(560, 0);
  expect(errors).toEqual([]);
});
