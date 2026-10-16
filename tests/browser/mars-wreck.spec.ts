import { expect, test } from '@playwright/test';
import { WRECK_PASSAGE, wreckPoint } from '../../src/game/mars-wreck-layout';
import { marsSurfaceHeight } from '../../src/game/mars-terrain';
import { driveMarsRoute } from './mars-driving';
import { POSTCARD_STORAGE_KEY } from '../../src/game/postcards';

test.use({ deviceScaleFactor: 1 });
test('buried shuttle views and real Scout exterior approach both ways', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?area=mars&start=fossil-delta');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>;
    follow: { orbit(yaw: number, pitch: number): void }; snapshot(): { contacts: number; position: { x: number; y: number; z: number } } };
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.15));
  for (const [name, u, v, heading] of [
    ['reveal', -15, 100, -0.1], ['stern', -30, 62, -0.7],
    ['side', -45, 15, -1.7],
  ] as const) {
    const p = wreckPoint(u, v);
    await page.evaluate(async ({ p, heading }) => {
      const g = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      await g.placeVehicle(p.x, p.z, heading);
    }, { p, heading });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await page.waitForTimeout(600); await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.evaluate(async () => {
    const g = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    await g.placeVehicle(-515, 239, Math.PI / 2);
  });
  await page.waitForTimeout(600); await page.screenshot({ path: info.outputPath('screened-from-connector.png') });
  await page.evaluate(async () => {
    const g = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    await g.placeVehicle(-622, 127, Math.PI);
  });
  await page.waitForTimeout(600); await page.screenshot({ path: info.outputPath('screened-from-perimeter.png') });
  for (const reverse of [false, true]) {
    const path = WRECK_PASSAGE.map(p => ({ ...p, y: marsSurfaceHeight(p.x, p.z) }));
    if (reverse) path.reverse();
    await page.evaluate(async ({ p, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, heading),
      { p: path[0], heading: reverse ? Math.PI - 0.24 : -0.24 });
    await driveMarsRoute(page, path, 35_000);
    if (!reverse) {
      const discovered = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]')
        .some((record: { id: string }) => record.id === 'shuttle-wreck'), POSTCARD_STORAGE_KEY);
      expect(discovered).toBe(true);
    }
    await page.screenshot({ path: info.outputPath(`approach-${reverse ? 'reverse' : 'forward'}.png`) });
  }
  expect(errors).toEqual([]);
});
