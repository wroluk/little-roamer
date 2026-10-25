import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Vehicle } from '../../src/game/vehicle';
import type { FollowCamera } from '../../src/game/camera';
import type * as THREE from 'three';

type Game = {
  vehicle: Vehicle;
  follow: FollowCamera;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  snapshot(): { mode: string; car: string; contacts: number; speed: number; cameraObstructed: boolean;
    streaming: { activePhysics: number }; position: { x: number; y: number; z: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());

for (const scenario of [
  { name: 'reported west edge', car: 'lunar-rover', x: -373, z: -149.002, dx: -1, dz: 0 },
  { name: 'northeast corner', car: 'lunar-nomad', x: 373, z: -373, dx: 1, dz: -1 },
]) test(`Moon ${scenario.name}: the guard stops real driving without freezing, hiding scenery or trapping the camera`, async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/?area=moon&car=${scenario.car}`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  expect((await state(page)).car).toBe(scenario.car);
  await page.evaluate(async s => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    await game.placeVehicle(s.x, s.z, Math.atan2(-s.dx, -s.dz));
  }, scenario);
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  await page.keyboard.down('KeyW');
  try {
    await expect.poll(async () => {
      const s = await state(page);
      return Math.max(Math.abs(s.position.x), Math.abs(s.position.z));
    }, { timeout: 30_000 }).toBeGreaterThan(375);
    await expect.poll(async () => Math.abs((await state(page)).speed)).toBeLessThan(0.4);
    await page.waitForTimeout(1500);
    const stopped = await state(page);
    expect(stopped.mode).toBe('playing');
    expect(Math.max(Math.abs(stopped.position.x), Math.abs(stopped.position.z))).toBeLessThan(378);
    expect(stopped.contacts).toBeGreaterThanOrEqual(2);
    expect(stopped.streaming.activePhysics).toBeLessThanOrEqual(9);
    expect(stopped.cameraObstructed).toBe(false);
    await page.keyboard.up('KeyW');
    await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(Math.PI, 0));
    await expect.poll(() => page.evaluate(() => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      return Math.max(Math.abs(game.camera.position.x), Math.abs(game.camera.position.z));
    })).toBeGreaterThan(379);
    expect((await state(page)).cameraObstructed).toBe(false);
    const image = await page.evaluate(() => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      game.renderer.render(game.vehicle.model.parent!, game.camera);
      return game.renderer.domElement.toDataURL('image/png').split(',')[1];
    });
    const folder = `artifacts/moon/perimeter-shadow/${info.project.name}`;
    await mkdir(folder, { recursive: true });
    await writeFile(`${folder}/${scenario.dx === -1 ? 'west-edge' : 'northeast-corner'}.png`, Buffer.from(image, 'base64'));
    await page.keyboard.down('KeyS');
    await expect.poll(async () => {
      const s = await state(page);
      return (stopped.position.x - s.position.x) * scenario.dx + (stopped.position.z - s.position.z) * scenario.dz;
    }, { timeout: 30_000 }).toBeGreaterThan(3);
    expect((await state(page)).mode).toBe('playing');
    expect(errors).toEqual([]);
    await expect(page.locator('#error')).toBeHidden();
  } finally { await page.keyboard.up('KeyW'); await page.keyboard.up('KeyS'); }
});
