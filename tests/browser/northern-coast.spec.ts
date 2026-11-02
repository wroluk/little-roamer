import { nearestNorthernStart } from '../../src/game/regional-starts';
import { test, expect } from '@playwright/test';
import { COAST_START, coastShoreX } from '../../src/game/northern-coast';
import { generateNorthernChunk } from '../../src/game/northern-terrain';
import { WEST_PROPS } from '../../src/game/northern-west';
import type { Vehicle } from '../../src/game/vehicle';

type Game = {
  snapshot(): { position: { x: number; y: number; z: number }; contacts: number; streaming: { activeRender: number; activePhysics: number } };
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
  vehicle: Pick<Vehicle, 'beforeStep' | 'capture'>;
  world: { step(): void };
};

test('Fjord Coast beach drives smoothly and resets to the clifftop', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=northern-reach&start=fjord-coast');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  await expect.poll(async () => (await state()).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('fjord-clifftop.png') });
  const from = { x: coastShoreX(470) + 30, z: 470 };
  const to = { x: coastShoreX(430) + 30, z: 430 };
  await page.evaluate(async ({ from, to }) => {
    await (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(from.x, from.z, Math.atan2(from.x - to.x, from.z - to.z));
  }, { from, to });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state()).position.z, { timeout: 25_000 }).toBeLessThan(438);
  await page.keyboard.up('KeyW');
  const beach = await state();
  expect(beach.position.y).toBeGreaterThan(0);
  expect(beach.position.y).toBeLessThan(3);
  expect(beach.contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('fjord-beach.png') });
  expect(beach.streaming.activeRender).toBeLessThanOrEqual(25);
  expect(beach.streaming.activePhysics).toBeLessThanOrEqual(9);
  const beforeReset = (await state()).position;
  const expectedStart = nearestNorthernStart(beforeReset.x, beforeReset.z);
  await page.locator('#reset').click();
  await expect.poll(async () => (await state()).position.x).toBeCloseTo(expectedStart.position.x, 0);
  await expect.poll(async () => (await state()).position.z).toBeCloseTo(expectedStart.position.z, 0);
  expect(errors).toEqual([]);
});

for (const reference of ['coastal', 'western'] as const) {
  test(`${reference} reference log retains loaded-wheel progress without a sideways escape`, async ({ page }, info) => {
    test.setTimeout(90_000);
    let log: { x: number; z: number } | undefined;
    if (reference === 'coastal') {
      const { props } = generateNorthernChunk(-7, 4);
      const index = Array.from(props.type).findIndex((type, i) =>
        type === 14 && props.x[i] < -660 && Math.abs(props.z[i] - 420) < 1);
      if (index >= 0) log = { x: props.x[index], z: props.z[index] };
    } else log = WEST_PROPS.find(prop => prop.kind === 'coastLog' && prop.z === 625);
    if (!log) throw new Error(`Missing ${reference} traction reference log.`);
    await page.goto('/?area=northern-reach&start=fjord-coast');
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    await page.locator('#start').click();
    await page.evaluate(async log => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      await game.placeVehicle(log.x, log.z + 11, 0);
      for (let frame = 0; frame < 91; frame++) {
        game.vehicle.beforeStep({ steer: 0, forward: false, reverse: false }, 1 / 60);
        game.world.step(); game.vehicle.capture();
      }
    }, log);
    const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
    let deviation = 0;
    const progress = async () => {
      const current = await state();
      deviation = Math.max(deviation, Math.abs(current.position.x - log.x));
      return current.position.z;
    };
    await page.keyboard.down('KeyW');
    try {
      await expect.poll(progress, { timeout: 30_000, intervals: [50] }).toBeLessThan(log.z + 1);
      await page.screenshot({ path: info.outputPath('log-contact-driving.png') });
      await expect.poll(progress, { timeout: 30_000, intervals: [50] }).toBeLessThan(log.z - 9);
    } finally { await page.keyboard.up('KeyW'); }
    expect(deviation).toBeLessThan(2.5);
    await info.attach('log-drive-state', {
      body: JSON.stringify({ log, deviation, finish: await state() }), contentType: 'application/json',
    });
  });
}
