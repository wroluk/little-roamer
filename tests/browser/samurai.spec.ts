import { test, expect } from '@playwright/test';

type Game = { snapshot(): { area: string; position: { x: number; y: number; z: number }; waterDepth: number }; placeVehicle(x: number, z: number, heading: number): Promise<void> };

test('village lanes, bamboo route, shallow torii lake and area switching', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=samurai-village');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#welcome-description')).toContainText('bamboo');
  await page.locator('#start').click();
  const snapshot = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  expect((await snapshot()).area).toBe('samurai-village');
  for (const [x, z, distance] of [[0, 55, 12], [0, -43, 18], [0, -65, 18], [65, 30, 15]]) {
    await page.evaluate(({ x, z }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, 0), { x, z });
    await page.keyboard.down('KeyW');
    await expect.poll(async () => (await snapshot()).position.z, { timeout: 25_000 }).toBeLessThan(z - distance);
    await page.keyboard.up('KeyW');
    if (x === 65) {
      expect((await snapshot()).waterDepth).toBeGreaterThan(0);
      await expect(page.locator('#surface-label')).toHaveText('Shallow lake');
    }
  }
  await page.locator('#reset').click();
  expect((await snapshot()).position.z).toBeCloseTo(62, 0);
  await page.screenshot({ path: 'test-results/samurai-village.png' });
  await page.locator('#pause').click();
  await expect(page.locator('#paused')).toBeVisible();
  await page.locator('#home').click();
  await expect(page.locator('#welcome')).toBeVisible();
  await page.locator('#area-select').selectOption('valley');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  expect((await snapshot()).area).toBe('valley');
  expect(errors).toEqual([]);
});


test('lake bridge carries the car above water in both directions', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?area=samurai-village');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const snapshot = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  for (const direction of [1, -1]) {
    await page.evaluate(async (direction) => {
      await (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(direction === 1 ? 29 : 101, 38, -direction * Math.PI / 2);
    }, direction);
    await page.keyboard.down('KeyW');
    await expect.poll(async () => direction * ((await snapshot()).position.x - 65), { timeout: 25_000 }).toBeGreaterThan(-3);
    const onBridge = await snapshot();
    expect(onBridge.position.y).toBeGreaterThan(2.2);
    expect(onBridge.waterDepth).toBe(0);
    expect(Math.abs(onBridge.position.z - 38)).toBeLessThan(2.8);
    await expect.poll(async () => direction * ((await snapshot()).position.x - 65), { timeout: 25_000 }).toBeGreaterThan(35);
    await page.keyboard.up('KeyW');
  }
});
