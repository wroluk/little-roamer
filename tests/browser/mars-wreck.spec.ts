import { expect, test } from '@playwright/test';
import { WRECK_PASSAGE, wreckPoint } from '../../src/game/mars-wreck-layout';
import { marsSurfaceHeight } from '../../src/game/mars-terrain';
import { driveMarsRoute } from './mars-driving';

test.use({ deviceScaleFactor: 1 });
test('buried hull views and real Scout mouth-to-breach drive both ways', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?area=mars&start=fossil-delta');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  type Game = { placeVehicle(x: number, z: number, heading: number): Promise<void>;
    follow: { orbit(yaw: number, pitch: number): void }; snapshot(): { contacts: number; position: { x: number; y: number; z: number } } };
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.15));
  for (const [name, u, v, heading] of [
    ['reveal', -38, -60, -2.65], ['rounded-mouth', 0, -61, Math.PI - 0.24],
    ['hull', -62, -14, -Math.PI / 2 - 0.24],
    ['mouth-scale', -8, -53, Math.PI - 0.24], ['breach', -29, -8, -Math.PI / 2 - 0.24],
    ['interior-to-mouth', 0, -18, -0.24],
  ] as const) {
    const p = wreckPoint(u, v);
    await page.evaluate(async ({ p, heading }) => {
      const g = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      await g.placeVehicle(p.x, p.z, heading);
    }, { p, heading });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await page.waitForTimeout(600); await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.evaluate(async p => {
    const g = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    g.follow.orbit(0, -0.27);
    await g.placeVehicle(p.x, p.z, -1.75);
  }, wreckPoint(-48, -28));
  await page.waitForTimeout(800); await page.screenshot({ path: info.outputPath('plating-detail.png') });
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, 0.27));
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
  const hold = [-36, -24, -12, 0, 12].map(v => {
    const p = wreckPoint(0, v); return { ...p, y: marsSurfaceHeight(p.x, p.z) };
  });
  await page.evaluate(async p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.PI - 0.24), hold[0]);
  await driveMarsRoute(page, hold, 20_000);
  await page.screenshot({ path: info.outputPath('inside-hold.png') });
  for (const reverse of [false, true]) {
    const path = WRECK_PASSAGE.map(p => ({ ...p, y: marsSurfaceHeight(p.x, p.z) }));
    if (reverse) path.reverse();
    await page.evaluate(async ({ p, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, heading),
      { p: path[0], heading: reverse ? -Math.PI / 2 - 0.24 : Math.PI - 0.24 });
    await driveMarsRoute(page, path, 35_000);
    await page.screenshot({ path: info.outputPath(`exited-${reverse ? 'mouth' : 'breach'}.png`) });
  }
  expect(errors).toEqual([]);
});
