import { test, expect } from '@playwright/test';
import { VALLEY_FORDS } from '../../src/game/northern-valley';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; waterDepth: number; contacts: number; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

test('River Valley entry, streamed fords in both directions, and reset', async ({ page }, testInfo) => {
  test.setTimeout(210_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=northern-reach&start=river-valley');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  expect((await state()).position.x).toBeCloseTo(-240, 0);
  for (const ford of VALLEY_FORDS) for (const direction of [1, -1]) {
    await page.evaluate(async ({ ford, direction }) => {
      await (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(ford.x, ford.z + direction * ford.halfLength, direction === 1 ? 0 : Math.PI);
    }, { ford, direction });
    await page.keyboard.down('KeyW');
    await expect.poll(async () => (await state()).waterDepth, { timeout: 25_000 }).toBeGreaterThan(0.05);
    expect((await state()).waterDepth).toBeLessThan(0.5);
    if (direction === 1) await page.screenshot({ path: testInfo.outputPath(`${ford.name}.png`) });
    await expect.poll(async () => direction * ((await state()).position.z - ford.z), { timeout: 35_000 }).toBeLessThan(-ford.halfLength);
    await page.keyboard.up('KeyW');
    const after = await state();
    expect(after.contacts).toBeGreaterThanOrEqual(2);
    expect(after.streaming.activeRender).toBeLessThanOrEqual(25);
    expect(after.streaming.activePhysics).toBeLessThanOrEqual(9);
  }
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(232, 0);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-270, 115, Math.PI / 2));
  await page.screenshot({ path: testInfo.outputPath('ridge.png') });
  expect(errors).toEqual([]);
});
