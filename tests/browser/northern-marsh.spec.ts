import { test, expect } from '@playwright/test';
import { MARSH_START, MARSH_LOOKOUT } from '../../src/game/northern-marsh';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; surface: string; terrainParticles: number;
    terrainTracks: number; waterDepth: number; contacts: number; cameraObstructed: boolean;
    streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

test('the first hummock loop makes soft mud visible and felt near the start', async ({ page }, testInfo) => {
  await page.goto('/?area=northern-reach&start=willow-marsh');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const game = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await page.evaluate(async () => {
    await (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-208, -18, 0);
  });
  await expect.poll(async () => (await game()).surface).toBe('mud');
  await expect(page.locator('#surface-label')).toHaveText('Soft mud');
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await game()).terrainParticles, { timeout: 10_000 }).toBeGreaterThan(0);
  await expect.poll(async () => (await game()).terrainTracks, { timeout: 10_000 }).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('mud-near-start.png') });
  await page.keyboard.up('KeyW');
});

test('Willow Marsh ford crosses in both directions and reset returns to dry ground', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=northern-reach&start=willow-marsh');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  expect((await state()).position.x).toBeCloseTo(MARSH_START.x, 0);
  for (const direction of [1, -1]) {
    await page.evaluate(async direction => {
      await (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-267, -45 + direction * 36, direction === 1 ? 0 : Math.PI);
    }, direction);
    await page.keyboard.down('KeyW');
    await expect.poll(async () => (await state()).waterDepth, { timeout: 25_000 }).toBeGreaterThan(0.05);
    expect((await state()).waterDepth).toBeLessThan(0.38);
    await page.screenshot({ path: testInfo.outputPath(`reed-ford-${direction}.png`) });
    await expect.poll(async () => direction * ((await state()).position.z + 45), { timeout: 40_000 }).toBeLessThan(-36);
    await page.keyboard.up('KeyW');
    expect((await state()).waterDepth).toBe(0);
    expect((await state()).contacts).toBeGreaterThanOrEqual(2);
  }
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.PI), MARSH_LOOKOUT);
  await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  expect((await state()).cameraObstructed).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('heron-lookout.png') });
  expect((await state()).streaming.activeRender).toBeLessThanOrEqual(25);
  expect((await state()).streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(MARSH_START.z, 0);
  expect((await state()).waterDepth).toBe(0);
  expect(errors).toEqual([]);
});
