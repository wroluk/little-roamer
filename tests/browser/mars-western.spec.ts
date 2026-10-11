import { expect, test } from '@playwright/test';
import { driveMarsRoute } from './mars-driving';
import { DELTA_ROUTES, DELTA_LOOKOUT } from '../../src/game/mars-delta-layout';
import { DUNES_ROUTES, DUNES_LOOKOUT } from '../../src/game/mars-dunes-layout';
import { TUBES_LOOKOUT, LAVA_TUBES, tubePoint } from '../../src/game/mars-tubes-layout';

test.use({ deviceScaleFactor: 1 });
type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>;
  follow: { orbit(yaw: number, pitch: number): void }; snapshot(): { contacts: number } };
const regions = [
  { id: 'fossil-delta', title: 'Fossil Delta', route: DELTA_ROUTES[1].points.slice(2, 4), lookout: DELTA_LOOKOUT,
    feature: { x: -420, z: 462, heading: 1.8 }, heading: 1.3 },
  { id: 'rust-dunes', title: 'Rust Dunes', route: DUNES_ROUTES[2].points.slice(2, 5), lookout: DUNES_LOOKOUT,
    feature: { x: -454, z: 98, heading: 0.9 }, heading: -1.7 },
  { id: 'lava-tubes', title: 'Lava Tubes', route: [-365, -381, -397].map(z => tubePoint(LAVA_TUBES[0], z)), lookout: TUBES_LOOKOUT,
    feature: { x: -419, z: -514, heading: 0 }, heading: -1.6 },
];
for (const region of regions) test(`${region.title} views, reset and regional feature drive in both directions`, async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/?area=mars&start=${region.id}`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.25));
  await page.screenshot({ path: info.outputPath('arrival.png') });
  for (const [name, point] of [['feature', region.feature], ['lookout', { ...region.lookout, heading: region.heading }]] as const) {
    await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, p.heading), point);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  for (const reverse of [false, true]) {
    const path = reverse ? [...region.route].reverse() : region.route, [a, b] = path;
    const heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    await page.evaluate(({ a, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(a.x, a.z, heading), { a, heading });
    await driveMarsRoute(page, path);
  }
  await page.locator('#reset').click(); await expect(page.locator('#toast')).toHaveText(`Back at ${region.title}`);
  expect(errors).toEqual([]);
});
