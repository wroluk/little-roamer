import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { KEYHOLE_ROUTES } from '../../src/game/mars-keyhole-layout';
import { DELTA_ROUTES } from '../../src/game/mars-delta-layout';
import { DUNES_ROUTES } from '../../src/game/mars-dunes-layout';
import { TUBES_ROUTES } from '../../src/game/mars-tubes-layout';
import { MARS_HABITAT_SPOKES } from '../../src/game/mars-spoke-layout';
import { driveMarsRoute } from './mars-driving';

test.use({ deviceScaleFactor: 1, viewport: { width: 512, height: 384 } });
for (const [id, routes] of [
  ['keyhole-badlands', KEYHOLE_ROUTES], ['fossil-delta', DELTA_ROUTES],
  ['rust-dunes', DUNES_ROUTES], ['lava-tubes', TUBES_ROUTES], ['habitat-seven', MARS_HABITAT_SPOKES],
] as const) for (const route of routes) test(`full ${route.name} in both directions`, async ({ page }, info) => {
  test.setTimeout(360_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/?area=mars&start=${id}`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void> };
  for (const reverse of [false, true]) {
    const path = reverse ? [...route.points].reverse() : route.points, [a, b] = path;
    const heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    await page.evaluate(({ a, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(a.x, a.z, heading), { a, heading });
    const metrics = await driveMarsRoute(page, path);
    const name = reverse ? 'reverse-profile' : 'forward-profile';
    const profilePath = info.outputPath(`${name}.json`);
    await writeFile(profilePath, JSON.stringify(metrics, null, 2));
    await info.attach(name, { path: profilePath, contentType: 'application/json' });
  }
  await page.screenshot({ path: info.outputPath('completed-both-directions.png') });
  expect(errors).toEqual([]);
});
