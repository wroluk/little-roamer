import { expect, test } from '@playwright/test';
import { driveMarsRoute } from './mars-driving';
import { glassfallPosition } from '../../src/game/mars-layout';

test.use({ deviceScaleFactor: 1 });
test('expanded Mars eastern journey loads its open glass plain and hidden Iron approach', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=mars&start=dish-ridge');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  await page.evaluate(() => (window as unknown as { __ROAMER__: {
    follow: { orbit(yaw: number, pitch: number): void };
  } }).__ROAMER__.follow.orbit(0, -0.32));
  for (const [name, x, z, heading] of [
    ['glassfall-approach', 460, -300, -2.1],
    ['glassfall-reveal', 549, -218, 2.75],
    ['glassflow-close', 458, 8, -0.9],
    ['iron-reveal', 374, 315, -2.55],
  ] as const) {
    await page.evaluate(async ({ x, z, heading }) => {
      const game = (window as unknown as { __ROAMER__: {
        placeVehicle(x: number, z: number, heading: number): Promise<void>;
      } }).__ROAMER__;
      await game.placeVehicle(x, z, heading);
    }, { x, z, heading });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: {
      snapshot(): { contacts: number };
    } }).__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  expect(errors).toEqual([]);
});

test('Scout crosses an unmarked glass edge without a graded road', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?area=mars&start=glassfall-plain');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const path = [{ x: 194, z: 20, y: 8 }, { x: 208, z: 30, y: 8 }].map(glassfallPosition);
  const [a, b] = path, heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
  await page.evaluate(async ({ a, heading }) => {
    const game = (window as unknown as { __ROAMER__: {
      placeVehicle(x: number, z: number, heading: number): Promise<void>;
    } }).__ROAMER__;
    await game.placeVehicle(a.x, a.z, heading);
  }, { a, heading });
  await driveMarsRoute(page, path);
});
