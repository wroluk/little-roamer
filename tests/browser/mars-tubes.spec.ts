import { expect, test } from '@playwright/test';
import { LAVA_TUBES, tubePoint } from '../../src/game/mars-tubes-layout';
import { driveMarsRoute } from './mars-driving';

type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>;
  follow: { orbit(yaw: number, pitch: number): void }; snapshot(): { contacts: number; position: { y: number } } };
test.use({ deviceScaleFactor: 1 });
test('buried lava entrances, skylights and fractured Vault presentation', async ({ page }, info) => {
  await page.goto('/?area=mars&start=lava-tubes');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.25));
  for (const [name, x, z, heading] of [
    ['entrance', tubePoint(LAVA_TUBES[0], -304).x, -304, 0],
    ['inside', tubePoint(LAVA_TUBES[0], -355).x, -355, 0],
    ['skylight', tubePoint(LAVA_TUBES[0], -376).x, -376, 0],
    ['western-entrance', tubePoint(LAVA_TUBES[1], -359).x, -359, 0],
    ['junction', -455, -456, Math.PI / 2],
    ['vault', -430, -506, -0.35],
    ['surface', -398, -430, Math.PI / 2],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await page.evaluate(async () => {
      for (let i = 0; i < 30; i++) await new Promise(requestAnimationFrame);
    });
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
});
for (const [label, points] of [
  ['rubble under a skylight', [-365, -381, -397].map(z => tubePoint(LAVA_TUBES[0], z))],
  ['solid terrain above the tube', [-398, -411, -430, -458].map(x => ({ x, z: -430, y: 21 }))],
] as const) test(`short Scout drive across ${label}`, async ({ page }, info) => {
  await page.setViewportSize({ width: 640, height: 480 });
  await page.goto('/?area=mars&start=lava-tubes');
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
  const [a, b] = points, heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
  await page.evaluate(({ a, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(a.x, a.z, heading), { a, heading });
  if (label === 'solid terrain above the tube') {
    await driveMarsRoute(page, points.slice(0, 3), 20_000);
    expect(await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().position.y)).toBeGreaterThan(18);
    await driveMarsRoute(page, points.slice(2), 15_000);
  } else await driveMarsRoute(page, [...points], 30_000);
  await page.screenshot({ path: info.outputPath('completed.png') });
});
