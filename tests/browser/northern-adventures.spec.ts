import { test, expect } from '@playwright/test';
import { ADVENTURE_REGIONS, BASIN_LOOKOUT, shoalPoint } from '../../src/game/northern-adventures';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; waterDepth: number; contacts: number; cameraObstructed: boolean; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

for (const region of ADVENTURE_REGIONS.filter(r => r.id !== 'great-lake' && r.id !== 'alder-river')) test(`${region.name}: drive the feature and reset`, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/?area=northern-reach&start=${region.id}`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  expect((await state()).position.x).toBeCloseTo(region.start.x, 0);
  const approach = region.id === 'timber-run' ? { x: -335, z: 466, heading: 0, finish: 420 }
    : region.id === 'windstone-ridge' ? { x: -50, z: -445, heading: 0, finish: -485 }
    : region.id === 'ochre-terraces' ? { x: 400, z: 147, heading: 0, finish: 123 }
    : region.id === 'boulder-shoals' ? { x: shoalPoint(-90, 3, 0).x, z: -79, heading: 0, finish: -101 }
    : { x: -270, z: -425, heading: Math.atan2(-10, 28), finish: -452 };
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, p.heading), approach);
  await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('approach.png') });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 45_000 }).toBeLessThan(approach.finish);
  await page.keyboard.up('KeyW');
  expect((await state()).waterDepth).toBeLessThan(0.4);
  if (region.id === 'stonegate-basin') {
    expect((await state()).position.y).toBeGreaterThan(59);
    await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.PI), BASIN_LOOKOUT);
    await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  }
  await page.screenshot({ path: testInfo.outputPath('feature.png') });
  expect((await state()).streaming.activeRender).toBeLessThanOrEqual(25);
  expect((await state()).streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(region.start.z, 0);
  expect((await state()).waterDepth).toBe(0);
  expect(errors).toEqual([]);
});
