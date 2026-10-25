import { expect, test } from '@playwright/test';
test.use({ deviceScaleFactor: 1 });

test('world car restrictions, saved Earth preference and shared driving camera', async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('little-roamer-car', 'classic');
      sessionStorage.setItem('seeded', 'yes');
    }
  });
  await page.goto('/?area=mars&car=modern');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  const snapshot = () => page.evaluate(() => (window as unknown as { __ROAMER__: { snapshot(): {
    car: string; position: { x: number; y: number; z: number }; camera: number[]; cameraObstructed: boolean;
  } } }).__ROAMER__.snapshot());
  await expect(page.locator('#car-picker').getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: 'Mars Scout' })).toBeChecked();
  await expect(page).toHaveURL(/car=mars-scout/);
  expect(await page.evaluate(() => localStorage.getItem('little-roamer-car'))).toBe('classic');
  const home = await snapshot();
  expect(home.position.x).toBeCloseTo(0, 0); expect(home.position.z).toBeCloseTo(40, 0);
  expect(home.camera[0] - home.position.x).toBeCloseTo(12, 0);
  await page.screenshot({ path: info.outputPath('mars-pad-home.png') });
  await page.locator('#start').click();
  await page.waitForTimeout(250);
  const playing = await snapshot();
  expect(playing.cameraObstructed).toBe(false);
  expect(playing.camera[0]).toBeCloseTo(playing.position.x, 1);
  expect(playing.camera[2]).toBeGreaterThan(playing.position.z);
  expect(playing.camera[1] - playing.position.y).toBeLessThan(5);
  await page.screenshot({ path: info.outputPath('mars-pad-driving.png') });
  await page.locator('#pause').click(); await page.locator('#home').click();
  await page.locator('input[name="area"][value="valley"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#car-picker').getByRole('radio')).toHaveCount(2);
  await page.getByRole('radio', { name: 'Classic' }).check();
  await page.locator('input[name="area"][value="mars"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  expect((await snapshot()).car).toBe('mars-scout');
  expect(await page.evaluate(() => localStorage.getItem('little-roamer-car'))).toBe('classic');
  await page.locator('input[name="area"][value="valley"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.getByRole('radio', { name: 'Classic' })).toBeChecked();
  await page.goto('/?area=valley&car=mars-scout');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.getByRole('radio', { name: 'Classic' })).toBeChecked();
  await expect(page).toHaveURL(/car=classic/);
  await page.evaluate(() => localStorage.setItem('little-roamer-car', 'mars-scout'));
  await page.goto('/?area=valley');
  await expect(page.locator('#start')).toBeEnabled();
  expect((await snapshot()).car).toBe('modern');
  await page.locator('#start').click();
  await expect.poll(async () => {
    const earth = await snapshot();
    return earth.camera[1] - earth.position.y;
  }).toBeLessThan(6.5);
  await page.screenshot({ path: info.outputPath('earth-driving-camera.png') });
});
