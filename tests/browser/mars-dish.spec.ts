import { expect, test, type Page } from '@playwright/test';
import { DISH_ROUTES, DISH_START, DISH_LOOKOUT } from '../../src/game/mars-dish-layout';
import type { MarsPoint } from '../../src/game/mars-terrain';
import { driveMarsRoute } from './mars-driving';

test.use({ deviceScaleFactor: 1 });
type Snapshot = { position: MarsPoint; rotation: { x: number; y: number; z: number; w: number }; speed: number; contacts: number; cameraObstructed: boolean; streaming: { activeRender: number; activePhysics: number } };
type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>; snapshot(): Snapshot; follow: { orbit(yaw: number, pitch: number): void } };
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
async function boot(page: Page) {
  await page.goto('/?area=mars&start=dish-ridge');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
}

test('Dish Ridge approach, receiver and western lookout are readable from the Scout', async ({ page }, info) => {
  test.setTimeout(90_000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.32));
  for (const [name, point, heading] of [
    ['approach', { x: 0, z: -270 }, -1.60], ['receiver', DISH_LOOKOUT, -1.85],
    ['lookout', DISH_LOOKOUT, 2.08], ['outpost-view', DISH_LOOKOUT, 2.68], ['eastern-ledge', { x: 294, z: -216 }, 0.88],
  ] as const) {
    await page.evaluate(({ point, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(point.x, point.z, heading), { point, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    expect((await state(page)).cameraObstructed).toBe(false);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.locator('#reset').click(); await expect(page.locator('#toast')).toHaveText('Back at Dish Ridge');
  const reset = await state(page); expect(reset.position.x).toBeCloseTo(DISH_START.x, 0); expect(reset.position.z).toBeCloseTo(DISH_START.z, 0);
  expect(errors).toEqual([]);
});

test('Dish Ridge Scout climbs the switchbacks and returns by the eastern ledge without reset', async ({ page }, info) => {
  test.setTimeout(200_000);
  // Full tablet resolution is covered above; fewer pixels keep software-rendered driving practical.
  await page.setViewportSize({ width: 512, height: 384 });
  await boot(page);
  const ascent = DISH_ROUTES[1].points, circuit = DISH_ROUTES[2].points;
  const path = [...ascent, ...circuit.slice(1, 13), ...[...DISH_ROUTES[4].points].reverse().slice(1), ...ascent.slice(0, 4).reverse()];
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, -2.18), DISH_START);
  await driveMarsRoute(page, path);
  await page.screenshot({ path: info.outputPath('completed-circuit.png') });
});

test('Dish feedback: industrial receiver, stable cabinets, upward view and orange rock fragments', async ({ page }, info) => {
  test.setTimeout(90_000); await boot(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(294, -216, Math.PI));
  await expect(page.locator('#surface')).toContainText('Martian rock');
  await page.keyboard.down('KeyW');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as unknown as { __ROAMER__: Game & { vehicle: { model: import('three').Group } } }).__ROAMER__;
    const mesh = game.vehicle.model.parent!.getObjectByName('terrain-particles') as import('three').InstancedMesh;
    const colors = mesh.instanceColor!, matrices = mesh.instanceMatrix.array;
    const active = Array.from({ length: mesh.count }, (_, i) => i).filter(i => Math.hypot(matrices[i * 16], matrices[i * 16 + 1], matrices[i * 16 + 2]) > 0.001);
    return active.length > 0 && active.every(i => colors.getX(i) > colors.getY(i) * 1.4 && colors.getY(i) > colors.getZ(i) * 1.3);
  })).toBe(true);
  await page.screenshot({ path: info.outputPath('orange-rock-fragments.png') });
  await page.keyboard.up('KeyW');
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.65));
  for (const [name, x, z, heading] of [
    ['antenna-front', DISH_LOOKOUT.x, DISH_LOOKOUT.z, -1.85],
    ['antenna-framework', 294, -216, 0.88],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    expect((await state(page)).cameraObstructed).toBe(false);
    if (name === 'antenna-front') expect(await page.evaluate(() => {
      const camera = (window as unknown as { __ROAMER__: { camera: import('three').PerspectiveCamera } }).__ROAMER__.camera;
      return -camera.matrixWorld.elements[9];
    })).toBeGreaterThan(0.08);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, 0.45));
  for (const [name, heading] of [['cabinet-lids', -0.49], ['cabinet-lids-oblique', -0.7]] as const) {
    await page.evaluate(heading => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(218, -241, heading), heading);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  expect(errors).toEqual([]);
});

test('Dish tripod legs seat in their feet and rising braces join the bearing support', async ({ page }, info) => {
  test.setTimeout(60_000); await boot(page);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.25));
  for (const [name, x, z, heading] of [
    ['tripod-west', 222, -272, -2.13], ['tripod-south', 238, -243, 0],
    ['service-bridge', 250, -244, 0.67], ['tripod-east', 255, -268, 1.91],
  ] as const) {
    if (name === 'service-bridge') await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.35));
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    expect((await state(page)).cameraObstructed).toBe(false);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
    if (name === 'service-bridge') await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, 0.35));
  }
});

test('Dish relay antennas stand on the level service island', async ({ page }, info) => {
  test.setTimeout(60_000); await boot(page);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.3));
  for (const [name, x, z, heading] of [
    ['relay-array', 238, -290, Math.PI], ['relay-footings', 259, -280, 1.7],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    expect((await state(page)).cameraObstructed).toBe(false);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
});
