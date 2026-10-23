import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { Group, PerspectiveCamera } from 'three';

test.use({ deviceScaleFactor: 1 });
type Game = {
  snapshot(): { car: string; gravity: number; geometries: number; contacts: number; cameraObstructed: boolean;
    position: { x: number; y: number; z: number } };
  follow: { orbit(yaw: number, pitch: number): void };
  camera: PerspectiveCamera;
  vehicle: { bodyVisual: Group };
};

for (const area of ['moon', 'mars'] as const) {
  test(`${area} offers both exploration rovers with stable switching, URL reload and driving`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('little-roamer-car', 'classic'));
    await page.goto(`/?area=${area}`);
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
    expect((await state()).car).toBe(area === 'moon' ? 'lunar-rover' : 'mars-scout');
    await expect(page.locator('#car-picker').getByRole('radio')).toHaveCount(2);
    await expect(page.getByRole('radio', { name: 'Mars Scout' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Lunar Rover' })).toBeVisible();
    await expect(page.locator('#lunar-car-option img')).toHaveJSProperty('naturalWidth', 360);
    const folder = `artifacts/moon/lunar-rover/${info.project.name}`;
    await mkdir(folder, { recursive: true });
    for (const name of ['Mars Scout', 'Lunar Rover']) {
      await page.getByRole('radio', { name, exact: false }).check();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${folder}/${area}-${name === 'Mars Scout' ? 'scout' : 'rover'}-home.png` });
    }
    const baseline = await state();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('radio', { name: 'Mars Scout' }).check();
      await page.getByRole('radio', { name: 'Lunar Rover' }).check();
    }
    await page.waitForTimeout(200);
    expect((await state()).geometries).toBe(baseline.geometries);
    await expect(page).toHaveURL(/car=lunar-rover/);
    await page.reload();
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByRole('radio', { name: 'Lunar Rover' })).toBeChecked();
    expect((await state()).car).toBe('lunar-rover');
    expect(await page.evaluate(() => localStorage.getItem('little-roamer-car'))).toBe('classic');
    await page.locator('#start').click();
    await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
    const from = (await state()).position;
    await page.keyboard.down('KeyW');
    try { await page.waitForTimeout(2500); } finally { await page.keyboard.up('KeyW'); }
    const driven = await state();
    expect(Math.hypot(driven.position.x - from.x, driven.position.z - from.z)).toBeGreaterThan(1);
    expect(driven.gravity).toBe(area === 'moon' ? -3 : -18);
    expect(driven.cameraObstructed).toBe(false);
    await page.screenshot({ path: `${folder}/${area}-rover-driving.png` });
    await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(Math.PI * 0.7, 0.15));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${folder}/${area}-rover-front.png` });
    const paneColors = await page.evaluate(() => new Promise<number[][]>((resolve, reject) => {
      requestAnimationFrame(() => {
        try {
          const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
          const canvas = document.querySelector('canvas')!;
          const gl = canvas.getContext('webgl2');
          if (!gl) throw new Error('Missing game WebGL context');
          const side = Math.sign(game.vehicle.bodyVisual.worldToLocal(game.camera.position.clone()).x);
          const front = -1.27 + (0.85 - 0.58) * 0.1 / 0.52 - 0.006;
          resolve([[0, 0.85, front], [side * 0.58, 0.85, front + 0.11 * 0.26 / 0.23],
            [side * 0.707, 0.85, -0.4]].map(([x, y, z]) => {
            const point = game.vehicle.bodyVisual.localToWorld(game.camera.position.clone().set(x, y, z))
              .project(game.camera);
            if (Math.abs(point.x) >= 1 || Math.abs(point.y) >= 1) throw new Error('Window sample outside camera');
            const pixel = new Uint8Array(4);
            gl.readPixels(Math.floor((point.x + 1) * gl.drawingBufferWidth / 2),
              Math.floor((point.y + 1) * gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            return [...pixel].slice(0, 3);
          }));
        } catch (error) { reject(error); }
      });
    }));
    expect(paneColors[0][0]).toBeGreaterThan(5);
    expect(paneColors[0][2]).toBeGreaterThan(paneColors[0][0]);
    for (const color of paneColors.slice(1)) for (let channel = 0; channel < 3; channel++)
      expect(Math.abs(color[channel] - paneColors[0][channel]), 'front, corner and side glass share the rendered tint')
        .toBeLessThanOrEqual(2);
    await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(Math.PI * 0.3, -0.15));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${folder}/${area}-rover-head-on.png` });
    await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(-Math.PI * 0.5, 0));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${folder}/${area}-rover-side.png` });
    await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(Math.PI, 0));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${folder}/${area}-rover-other-side.png` });
    await page.locator('#pause').click(); await page.locator('#home').click();
    if (area === 'moon') {
      await page.locator('input[name="area"][value="mars"]').check();
      await expect(page.locator('#start')).toBeEnabled();
      await expect(page.getByRole('radio', { name: 'Lunar Rover' })).toBeChecked();
      expect((await state()).gravity).toBe(-18);
    }
    await page.locator('input[name="area"][value="valley"]').check();
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.getByRole('radio', { name: 'Classic' })).toBeChecked();
    await expect(page.locator('#mars-car-option')).toBeHidden();
    await expect(page.locator('#lunar-car-option')).toBeHidden();
    expect(errors).toEqual([]);
  });
}
