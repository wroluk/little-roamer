import { expect, test, type Page } from '@playwright/test';
import type { Vehicle } from '../../src/game/vehicle';
import type { FollowCamera } from '../../src/game/camera';
import type * as THREE from 'three';
import { nearestNorthernStart, regionalSpawn } from '../../src/game/regional-starts';

type State = {
  mode: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  contacts: number;
  input: { steer: number; forward: boolean; reverse: boolean };
};
type Game = {
  snapshot(): State;
  vehicle: Vehicle;
  follow: FollowCamera;
  camera: THREE.PerspectiveCamera;
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
};
const state = (page: Page): Promise<State> => page.evaluate(
  () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot(),
);

async function overturn(page: Page, roll: number) {
  return page.evaluate(roll => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    const position = { ...game.vehicle.body.translation() };
    const heading = 0.7, s = Math.sin(heading / 2), c = Math.cos(heading / 2);
    const sr = Math.sin(roll / 2), cr = Math.cos(roll / 2);
    game.vehicle.body.setRotation({ x: s * sr, y: s * cr, z: c * sr, w: c * cr }, true);
    game.vehicle.body.setTranslation({ ...position, y: position.y + 0.15 }, true);
    game.vehicle.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    game.vehicle.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    game.vehicle.capture();
    return position;
  }, roll);
}

for (const area of ['valley', 'northern-reach', 'mars', 'iceland', 'moon']) {
  test(`${area}: Reset and R right an overturned car locally, then an upright reset still returns`, async ({ page }) => {
    if (area === 'iceland') test.slow();
    await page.goto(`/?area=${area}`);
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    await page.locator('#start').click();
    await expect.poll(async () => (await state(page)).contacts).toBe(4);
    const spawn = (await state(page)).position;
    await page.evaluate(async () => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      const position = game.snapshot().position;
      await game.placeVehicle(position.x, position.z + 5, 0.7);
    });
    await expect.poll(async () => (await state(page)).contacts).toBe(4);
    for (const roll of [Math.PI / 2, Math.PI]) {
      const before = await overturn(page, roll);
      if (roll === Math.PI / 2) await page.locator('#reset').click();
      else await page.keyboard.press('KeyR');
      await expect(page.locator('#toast')).toHaveText('Back on your wheels. Off you go.');
      await expect.poll(async () => (await state(page)).contacts).toBe(4);
      const righted = await state(page);
      expect(righted.mode).toBe('playing');
      expect(Math.hypot(righted.position.x - before.x, righted.position.z - before.z)).toBeLessThan(0.5);
      expect(1 - 2 * (righted.rotation.x ** 2 + righted.rotation.z ** 2)).toBeGreaterThan(0.95);
      expect(righted.input).toEqual({ steer: 0, forward: false, reverse: false });
      const forwardX = -2 * (righted.rotation.x * righted.rotation.z + righted.rotation.w * righted.rotation.y);
      expect(forwardX).toBeCloseTo(-Math.sin(0.7), 1);
    }
    await page.locator('#reset').click();
    await expect(page.locator('#toast')).toContainText('Back at');
    await expect.poll(async () => Math.hypot((await state(page)).position.x - spawn.x,
      (await state(page)).position.z - spawn.z)).toBeLessThan(0.5);
    await page.keyboard.down('KeyW');
    await expect.poll(async () => Math.hypot((await state(page)).position.x - spawn.x,
      (await state(page)).position.z - spawn.z)).toBeGreaterThan(2);
    await page.keyboard.up('KeyW');
    await expect(page.locator('#error')).toBeHidden();
  });
}

test('an overturned car in deep water returns to the regional start', async ({ page }) => {
  await page.goto('/?area=northern-reach');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(0, 180, 0));
  await expect(page.locator('#surface-trait')).toHaveText('Too deep · reset');
  await overturn(page, Math.PI);
  const before = (await state(page)).position;
  const expected = regionalSpawn(nearestNorthernStart(before.x, before.z));
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toContainText('Back at');
  await expect.poll(async () => Math.hypot((await state(page)).position.x - expected.x,
    (await state(page)).position.z - expected.z)).toBeLessThan(0.5);
  await expect.poll(async () => (await state(page)).contacts).toBe(4);
});

test('light reset keeps the rover camera view when leaning backwards past vertical', async ({ page }, info) => {
  await page.goto('/?area=moon');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).contacts).toBe(4);
  const before = await page.evaluate(() => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    game.follow.orbit(0.9, -0.2);
    game.follow.update(1);
    const position = { ...game.vehicle.body.translation() };
    const pitch = 100 * Math.PI / 180;
    game.vehicle.body.setRotation({ x: Math.sin(pitch / 2), y: 0, z: 0, w: Math.cos(pitch / 2) }, true);
    game.vehicle.body.setTranslation({ ...position, y: position.y + 0.6 }, true);
    game.vehicle.capture();
    game.vehicle.syncVisuals(1);
    game.follow.update(1 / 60);
    const offset = game.camera.position.clone().sub(game.vehicle.position).setY(0).normalize();
    return { position, offset: offset.toArray(), direction: game.camera.getWorldDirection(game.camera.position.clone()).toArray() };
  });
  await page.keyboard.press('KeyR');
  await expect(page.locator('#toast')).toHaveText('Back on your wheels. Off you go.');
  await expect.poll(async () => (await state(page)).contacts).toBe(4);
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    const offset = game.camera.position.clone().sub(game.vehicle.position).setY(0).normalize();
    return { position: game.snapshot().position, offset: offset.toArray(),
      direction: game.camera.getWorldDirection(game.camera.position.clone()).toArray() };
  });
  expect(after.offset.reduce((sum, component, i) => sum + component * before.offset[i], 0)).toBeGreaterThan(0.99);
  expect(after.direction.reduce((sum, component, i) => sum + component * before.direction[i], 0)).toBeGreaterThan(0.94);
  expect(Math.hypot(after.position.x - before.position.x, after.position.z - before.position.z)).toBeLessThan(0.5);
  await page.screenshot({ path: info.outputPath('moon-light-reset-camera-kept.png') });
});
