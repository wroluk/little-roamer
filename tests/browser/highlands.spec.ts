import { test, expect, type Page } from '@playwright/test';

type Ford = { name: string; x: number; z: number; heading: number; length: number; waterY: number };
type Ascent = { x: number; z: number; heading: number; length: number };
type State = {
  area: string;
  surface: string;
  mode: string;
  bounds: number;
  spawn: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  speed: number;
  cameraObstructed: boolean;
  contacts: number;
  input: { steer: number; forward: boolean; reverse: boolean };
  geometries: number;
  textures: number;
  drawCalls: number;
  targetDistance: number;
  wheelSurfaces: string[];
  terrainFeedback: number;
  terrainParticles: number;
  terrainParticleCapacity: number;
  terrainEffectUsesInstanceColors: boolean;
  reducedMotion: boolean;
  cameraFeedbackApplied: number;
  waterDepth: number;
};
type Game = { snapshot(): State; fords: Ford[]; ascents: Ascent[]; placeVehicle(x: number, z: number, heading: number): void };
const state = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());

async function returnHome(page: Page) {
  await page.locator('#pause').click();
  await expect(page.locator('#paused')).toBeVisible();
  await page.locator('#home').click();
  await expect(page.locator('#welcome')).toBeVisible();
}

async function enter(page: Page) {
  await page.goto('/?area=highlands');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 20_000 });
  await page.locator('#start').click();
}

test('choose Iceland, drive, reset within Iceland, return to valley and release old area resources', async ({ page }) => {
  test.setTimeout(70_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await page.waitForTimeout(200);
  const valley = await state(page);
  for (let i = 0; i < 2; i++) {
    await page.keyboard.down('KeyW');
    await returnHome(page);
    await page.locator('#area-select').selectOption('highlands');
    await page.keyboard.up('KeyW');
    await expect(page.locator('#start')).toBeVisible();
    await expect(page.locator('#start')).toBeEnabled();
    await expect(page.locator('#welcome-description')).toContainText('volcanoes');
    await page.locator('#start').click();
    const start = await state(page);
    expect(start.area).toBe('highlands');
    expect(start.bounds).toBeGreaterThanOrEqual(valley.bounds * 3);
    await expect.poll(async () => (await state(page)).targetDistance).toBeLessThan(14);
    expect(start.input).toEqual({ steer: 0, forward: false, reverse: false });
    await page.keyboard.down('KeyW');
    await expect.poll(async () => (await state(page)).position.z).toBeLessThan(start.position.z - 8);
    await page.keyboard.up('KeyW');
    await page.locator('#reset').click();
    await expect.poll(async () => (await state(page)).position.z).toBeCloseTo(start.spawn.z, 0);
    expect((await state(page)).position.x).toBeCloseTo(start.spawn.x, 0);
    await returnHome(page);
    await page.locator('#area-select').selectOption('valley');
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await page.waitForTimeout(200);
    const returned = await state(page);
    expect(returned.area).toBe('valley');
    expect(returned.position.z).toBeCloseTo(22, 0);
    expect(returned.geometries).toBeLessThanOrEqual(valley.geometries + 2);
    expect(returned.textures).toBeLessThanOrEqual(valley.textures + 1);
  }
  expect(errors).toEqual([]);
});

test('drive every Iceland ford across actual water and emerge on the other bank', async ({ page }) => {
  test.setTimeout(110_000);
  await enter(page);
  const fords = await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.fords);
  expect(fords.length).toBeGreaterThanOrEqual(3);
  for (const ford of fords) {
    await page.evaluate(f => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      game.placeVehicle(f.x + Math.sin(f.heading) * f.length / 2,
        f.z + Math.cos(f.heading) * f.length / 2, f.heading);
    }, ford);
    await page.waitForTimeout(500);
    await page.keyboard.down('KeyW');
    let submergedWheelSamples = 0;
    let cameraOverlaps = 0;
    await expect.poll(async () => {
      const current = await state(page);
      if (current.position.y - 0.65 < ford.waterY) submergedWheelSamples++;
      cameraOverlaps += Number(current.cameraObstructed);
      return Math.sin(ford.heading) * (current.position.x - ford.x)
        + Math.cos(ford.heading) * (current.position.z - ford.z);
    }, { timeout: 25_000, intervals: [100] }).toBeLessThan(-ford.length / 2);
    await page.keyboard.up('KeyW');
    expect(submergedWheelSamples).toBeGreaterThan(0);
    expect(cameraOverlaps).toBe(0);
    const exit = await state(page);
    expect(exit.position.y).toBeGreaterThan(ford.waterY);
    expect(exit.rotation.x ** 2 + exit.rotation.z ** 2).toBeLessThan(0.3);
    console.log(`${ford.name}: river crossed, ${submergedWheelSamples} water-contact samples, camera clear`);
  }
});

test('Iceland touch controls and Home Screen area picker fit portrait and landscape', async ({ page }) => {
  await enter(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const id of ['steer', 'forward', 'reverse', 'reset']) {
      const box = (await page.locator(`#${id}`).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('#forward').tap();
    expect((await state(page)).input.forward).toBe(false);
  }
  await returnHome(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    const box = (await page.locator('#area-select').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('drive up the glacier and a volcano flank in the complete highlands world', async ({ page }) => {
  test.setTimeout(80_000);
  await enter(page);
  const routes = await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.ascents);
  for (const route of routes) {
    await page.evaluate(r => (window as unknown as { __ROAMER__: Game }).__ROAMER__
      .placeVehicle(r.x, r.z, r.heading), route);
    await page.waitForTimeout(500);
    const startY = (await state(page)).position.y;
    await page.keyboard.down('KeyW');
    let overlaps = 0;
    await expect.poll(async () => {
      const current = await state(page);
      overlaps += Number(current.cameraObstructed);
      return route.z - current.position.z;
    }, { timeout: 30_000, intervals: [200] }).toBeGreaterThan(route.length);
    await page.keyboard.up('KeyW');
    expect((await state(page)).position.y).toBeGreaterThan(startY + 20);
    expect(overlaps).toBe(0);
  }
});

test('visible terrain changes the live handling profile and surface indicator', async ({ page }) => {
  await enter(page);
  const locations = [
    { x: 220, z: -10, id: 'ash', label: 'Loose black sand' },
    { x: -135, z: -65, id: 'lava', label: 'Rough lava' },
    { x: -123, z: -69, id: 'moss', label: 'Springy moss' },
    { x: -8, z: -172, id: 'ice', label: 'Glacier ice' },
  ];
  const ford = await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.fords[1]);
  locations.push({ x: ford.x, z: ford.z, id: 'water', label: 'Glacial river' });
  for (const location of locations) {
    await page.evaluate(point => (window as unknown as { __ROAMER__: Game }).__ROAMER__
      .placeVehicle(point.x, point.z, 0), location);
    await expect.poll(async () => ({
      surface: (await state(page)).surface,
      label: await page.locator('#surface-label').textContent(),
    })).toEqual({ surface: location.id, label: location.label });
    await expect(page.locator('#surface')).toHaveAttribute('data-surface', location.id);
  }
});

test('terrain emits bounded wheel-local feedback without inflating draw calls', async ({ page }) => {
  await enter(page);
  await page.waitForTimeout(1300);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__
    .placeVehicle(-8, -172, 0));
  await expect(page.locator('#surface')).toHaveAttribute('data-surface', 'ice');
  await expect(page.locator('#surface')).toHaveClass(/changed/);
  await page.waitForTimeout(1300);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__
    .placeVehicle(220, -10, 0));
  await expect(page.locator('#surface')).toHaveAttribute('data-surface', 'ash');
  await expect(page.locator('#surface')).toHaveClass(/changed/);
  const baseline = await state(page);
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state(page)).terrainParticles).toBeGreaterThan(0);
  const active = await state(page);
  await page.keyboard.up('KeyW');
  expect(active.terrainParticleCapacity).toBe(72);
  expect(active.terrainParticles).toBeLessThanOrEqual(active.terrainParticleCapacity);
  expect(active.drawCalls).toBeLessThanOrEqual(baseline.drawCalls + 2);
  expect(active.terrainEffectUsesInstanceColors).toBe(true);
  expect(active.terrainFeedback).toBeGreaterThan(0);
  expect(active.cameraFeedbackApplied).toBe(active.terrainFeedback);
  await expect(page.locator('#surface-trait')).toHaveText('Loose & sliding');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await state(page)).reducedMotion).toBe(true);
  expect((await state(page)).cameraFeedbackApplied).toBe(0);
});

test('deep unmarked water stalls the car while directing the player to reset', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__
    .placeVehicle(16, 51.812, 0));
  await expect.poll(async () => (await state(page)).waterDepth).toBeGreaterThan(1);
  const start = await state(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3500);
  await page.keyboard.up('KeyW');
  const stopped = await state(page);
  expect(Math.hypot(stopped.position.x - start.position.x, stopped.position.z - start.position.z)).toBeLessThan(0.5);
  await expect(page.locator('#surface-trait')).toHaveText('Too deep · reset');
});
