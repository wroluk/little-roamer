import { expect, test } from '@playwright/test';
import { KEYHOLE_START, KEYHOLE_LOOKOUT, KEYHOLE_CREST, KEYHOLE_ARCHES } from '../../src/game/mars-keyhole-layout';
import { driveMarsRoute } from './mars-driving';

test.use({ deviceScaleFactor: 1 });
test('Keyhole views, reset and Scout passage under the arch in both directions', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=mars&start=keyhole-badlands');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>;
    follow: { orbit(yaw: number, pitch: number): void }; snapshot(): { contacts: number; position: { x: number; z: number } } };
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.3));
  for (const [name, x, z, heading] of [
    ['arrival', KEYHOLE_START.x, KEYHOLE_START.z, 1.8],
    ['arch', 12, 634, 0], ['companion', 103, 432, Math.PI],
    ['lookout', KEYHOLE_LOOKOUT.x, KEYHOLE_LOOKOUT.z, -2.1],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await page.evaluate(async () => { for (let i = 0; i < 30; i++) await new Promise(requestAnimationFrame); });
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  for (const reverse of [false, true]) {
    const path = [{ x: 0, z: 555, y: 8 }, { x: 0, z: 505, y: 8 }];
    if (reverse) path.reverse();
    await page.evaluate(({ p, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, heading),
      { p: path[0], heading: reverse ? Math.PI : 0 });
    await driveMarsRoute(page, path);
  }
  const companion = KEYHOLE_ARCHES[1];
  const passage = [-18, 0, 18].map(d => ({ x: companion.x + d * Math.sin(companion.turn),
    z: companion.z + d * Math.cos(companion.turn), y: 8 }));
  await page.evaluate(({ p, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, heading),
    { p: passage[0], heading: companion.turn + Math.PI });
  await driveMarsRoute(page, passage, 20_000);
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at Keyhole Badlands');
  expect(errors).toEqual([]);
});

test('Scout can climb onto the natural bridge and cross above the wash', async ({ page }, info) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 640, height: 480 });
  await page.goto('/?area=mars&start=keyhole-badlands');
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
  type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>;
    snapshot(): { position: { y: number } } };
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-96, 530, -Math.PI / 2));
  await driveMarsRoute(page, [{ x: -96, z: 530, y: 18 }, ...KEYHOLE_CREST.slice(0, 5)], 35_000);
  expect(await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().position.y)).toBeGreaterThan(32);
  await page.screenshot({ path: info.outputPath('on-the-crest.png') });
  await driveMarsRoute(page, [...KEYHOLE_CREST.slice(4), { x: 99, z: 536, y: 15.3 }], 25_000);
  await page.screenshot({ path: info.outputPath('crest-completed.png') });
});
