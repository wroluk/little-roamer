import { nearestNorthernStart } from '../../src/game/regional-starts';
import { test, expect } from '@playwright/test';
import { ADVENTURE_REGIONS, BASIN_LOOKOUT, shoalPoint } from '../../src/game/northern-adventures';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; waterDepth: number; contacts: number; cameraObstructed: boolean; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};

for (const region of ADVENTURE_REGIONS.filter(r => ['timber-run','stonegate-basin','boulder-shoals','windstone-ridge','ochre-terraces'].includes(r.id))) test(`${region.name}: drive the feature and reset`, async ({ page }, testInfo) => {
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
  const beforeReset = (await state()).position;
  const expectedStart = nearestNorthernStart(beforeReset.x, beforeReset.z);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.x).toBeCloseTo(expectedStart.position.x, 0);
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(expectedStart.position.z, 0);
  expect((await state()).waterDepth).toBe(0);
  expect(errors).toEqual([]);
});

test('Stonegate rock shelf can be driven while the easier north crown remains open', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?area=northern-reach&start=stonegate-basin');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const game = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await page.evaluate(async () => {
    await (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-293, -434, 0);
  });
  for (let i = 0; i < 32 && (await game()).position.z > -454; i++) {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(330);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(180);
  }
  expect((await game()).position.z).toBeLessThan(-454);
  await expect.poll(async () => (await game()).contacts).toBeGreaterThanOrEqual(2);
  expect((await game()).position.y).toBeGreaterThan(58);
});
