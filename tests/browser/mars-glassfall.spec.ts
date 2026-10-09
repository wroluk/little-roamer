import { expect, test, type Page } from '@playwright/test';
import { GLASSFALL_ROUTES, GLASSFALL_START, GLASSFALL_LOOKOUT } from '../../src/game/mars-glassfall-layout';
import type { MarsPoint } from '../../src/game/mars-terrain';
import { driveMarsRoute } from './mars-driving';
test.use({ deviceScaleFactor: 1 });
type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>; follow: { orbit(yaw: number, pitch: number): void };
  snapshot(): { contacts: number; cameraObstructed: boolean; position: MarsPoint; surface: string } };
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
async function boot(page: Page) {
  await page.goto('/?area=mars&start=glassfall-plain');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
}
test('Glassfall arrival, impact scar, glass crossing and lookout; regional reset', async ({ page }, info) => {
  test.setTimeout(90_000); await boot(page);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.22));
  for (const [name, x, z, heading] of [
    ['arrival', 195, -45, -2.1], ['impact-scar', 311, -16, 1.57], ['glass-crossing', 217, 36, -2.05],
    ['eastern-shields', 299, 46, -0.3], ['lookout', GLASSFALL_LOOKOUT.x, GLASSFALL_LOOKOUT.z, 2.2],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    expect((await state(page)).cameraObstructed).toBe(false);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.locator('#reset').click(); await expect(page.locator('#toast')).toHaveText('Back at Glassfall Plain');
  const s = await state(page); expect(s.position.x).toBeCloseTo(GLASSFALL_START.x, 0); expect(s.position.z).toBeCloseTo(GLASSFALL_START.z, 0);
  expect(errors).toEqual([]);
});
for (const [label, path] of [
  ['firm circuit', GLASSFALL_ROUTES[1].points],
  ['glass crossing in both directions', [...GLASSFALL_ROUTES[2].points, ...GLASSFALL_ROUTES[2].points.slice(0, -1).reverse()]],
] as const) test(`Glassfall Scout drives ${label} without reset`, async ({ page }, info) => {
  test.setTimeout(200_000); await page.setViewportSize({ width: 512, height: 384 }); await boot(page);
  const a = path[0], b = path[1], heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
  await page.evaluate(({ a, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(a.x, a.z, heading), { a, heading });
  await driveMarsRoute(page, [...path]);
  await page.screenshot({ path: info.outputPath('completed-drive.png') });
});
