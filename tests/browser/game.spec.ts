import { test, expect, type Page } from '@playwright/test';

type Snapshot = {
  mode: string;
  position: { x: number; y: number; z: number };
  speed: number;
  contacts: number;
  input: { steer: number; forward: boolean; reverse: boolean };
  camera: number[];
  wheelSteering: number;
  drawCalls: number;
  cameraObstructed: boolean;
  navigation: { heading: number; direction: string; elevation: number };
};
type Ramp = { x: number; z: number; angle: number; length: number; height: number };
type DebugApi = { snapshot(): Snapshot; ramps: Ramp[]; placeVehicle(x: number, z: number, heading: number): void };
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => {
  return (window as unknown as { __ROAMER__: { snapshot(): Snapshot } }).__ROAMER__.snapshot();
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
});

test('renders and drives with real physics, steers, brakes, resets, and safely pauses', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('#error')).toBeHidden();
  await page.locator('#start').click();
  await expect(page.locator('#controls')).toBeVisible();
  const start = await snapshot(page);
  expect(start.contacts).toBe(4);
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await snapshot(page)).position.z).toBeLessThan(start.position.z - 8);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await snapshot(page)).position.x).toBeGreaterThan(2);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => Math.abs((await snapshot(page)).speed)).toBeLessThan(0.5);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowDown');
  const driven = await snapshot(page);
  expect(driven.camera[2]).not.toBe(start.camera[2]);
  await page.locator('#reset').click();
  await expect.poll(async () => (await snapshot(page)).position.z).toBeCloseTo(22, 0);
  await page.keyboard.down('KeyW');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#paused')).toBeVisible();
  const parked = await snapshot(page);
  expect(parked.input).toEqual({ steer: 0, forward: false, reverse: false });
  await page.waitForTimeout(400);
  expect((await snapshot(page)).position).toEqual(parked.position);
  await page.keyboard.up('KeyW');
  await page.locator('#resume').click();
  await expect(page.locator('#controls')).toBeVisible();
  await expect.poll(async () => Math.abs((await snapshot(page)).speed)).toBeLessThan(1);
  expect(errors).toEqual([]);
  console.log('Runtime evidence:', await snapshot(page));
});

test('tablet portrait and landscape controls fit and remain usable', async ({ page }) => {
  await page.locator('#start').click();
  for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const id of ['steer', 'forward', 'reverse', 'reset', 'navigation']) {
      const box = await page.locator(`#${id}`).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const navigation = (await page.locator('#navigation').boundingBox())!;
    const areaSelect = (await page.locator('#area-select').boundingBox())!;
    expect(Math.abs(navigation.y - areaSelect.y)).toBeLessThanOrEqual(2);
    if (viewport.width > viewport.height) {
      expect(Math.abs(navigation.x + navigation.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.locator('#forward').tap();
    expect((await snapshot(page)).input.forward).toBe(false);
  }
});

test('compass follows vehicle heading and altimeter reports terrain elevation', async ({ page }) => {
  await page.locator('#start').click();
  const initial = await snapshot(page);
  expect(initial.navigation.direction).toBe('N');
  expect(initial.navigation.heading).toBeCloseTo(0, 0);
  expect(initial.navigation.elevation).toBe(0);
  await expect(page.locator('#compass-direction')).toHaveText('N');
  await expect(page.locator('#compass-degrees')).toHaveText('000°');
  await expect(page.locator('#altitude')).toHaveText('0 m');

  await page.evaluate(async () => {
    const game = (window as unknown as { __ROAMER__: DebugApi }).__ROAMER__;
    await game.placeVehicle(-30, -28, -Math.PI / 2);
  });
  await expect.poll(async () => (await snapshot(page)).navigation.direction).toBe('E');
  const moved = await snapshot(page);
  expect(moved.navigation.heading).toBeGreaterThan(75);
  expect(moved.navigation.heading).toBeLessThan(105);
  expect(moved.navigation.elevation).toBeGreaterThan(3);
  await expect(page.locator('#compass-degrees')).toHaveText(/0(?:8|9)\d°/);
  await expect(page.locator('#altitude')).not.toHaveText('0 m');
});

test('dragging anywhere on the scene manually orbits the camera without steering the car', async ({ page }) => {
  await page.locator('#start').click();
  const canvas = page.locator('#game');
  const bounds = (await canvas.boundingBox())!;
  const start = await snapshot(page);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.72, bounds.y + bounds.height * 0.32, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await snapshot(page)).camera[0] - start.camera[0])).toBeGreaterThan(5);
  const orbited = await snapshot(page);
  expect(orbited.position).toEqual(start.position);
  expect(orbited.input).toEqual({ steer: 0, forward: false, reverse: false });
  expect(orbited.cameraObstructed).toBe(false);
  await expect(canvas).not.toHaveClass(/camera-dragging/);
});

test('real two-finger touch steers and accelerates independently; capture and cancellation clear safely', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP provides real multi-contact touch injection; WebKit covered separately.');
  await page.locator('#start').click();
  const client = await page.context().newCDPSession(page);
  const steering = (await page.locator('#steer').boundingBox())!;
  const pedal = (await page.locator('#forward').boundingBox())!;
  const left = { x: steering.x + steering.width * 0.84, y: steering.y + steering.height / 2, id: 1 };
  const right = { x: pedal.x + pedal.width / 2, y: pedal.y + pedal.height / 2, id: 2 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, right] });
  await expect.poll(async () => (await snapshot(page)).input.forward).toBe(true);
  expect((await snapshot(page)).input.steer).toBeGreaterThan(0.8);
  await expect.poll(async () => (await snapshot(page)).position.x).toBeGreaterThan(1);
  // Steering stays captured even after the thumb leaves its pad.
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...left, x: 450 }, right] });
  expect((await snapshot(page)).input.steer).toBe(1);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...left, x: 450 }] });
  expect((await snapshot(page)).input).toEqual({ steer: 0, forward: true, reverse: false });
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  expect((await snapshot(page)).input).toEqual({ steer: 0, forward: false, reverse: false });
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
  await client.detach();
});

test('graphics context loss displays a readable error instead of a blank screen', async ({ page }) => {
  await page.locator('#start').click();
  await page.locator('#game').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#error-message')).toContainText('graphics connection');
  await expect(page.locator('#controls')).toBeHidden();
});

test('all real-world ramps drive through without hidden lips or scenery blocking them', async ({ page }) => {
  test.setTimeout(75_000);
  await page.locator('#start').click();
  const ramps = await page.evaluate(() => (window as unknown as { __ROAMER__: DebugApi }).__ROAMER__.ramps);
  for (const ramp of ramps) {
    await page.evaluate(r => {
      const game = (window as unknown as { __ROAMER__: DebugApi }).__ROAMER__;
      game.placeVehicle(r.x + Math.sin(r.angle) * (r.length / 2 + 6),
        r.z + Math.cos(r.angle) * (r.length / 2 + 6), r.angle);
    }, ramp);
    await page.waitForTimeout(600);
    const initial = await snapshot(page);
    await page.keyboard.down('KeyW');
    let high = initial.position.y;
    let blockedFrames = 0;
    await expect.poll(async () => {
      const state = await snapshot(page);
      high = Math.max(high, state.position.y);
      blockedFrames += Number(state.cameraObstructed);
      return Math.sin(ramp.angle) * (state.position.x - ramp.x) + Math.cos(ramp.angle) * (state.position.z - ramp.z);
    }, { timeout: 18_000, intervals: [150] }).toBeLessThan(-ramp.length / 2 - 2);
    await page.keyboard.up('KeyW');
    expect(high).toBeGreaterThan(initial.position.y + ramp.height - 0.5);
    expect(blockedFrames).toBe(0);
    console.log(`Cleared ramp ${ramp.x},${ramp.z}: max chassis y=${high.toFixed(2)}, camera clear`);
  }
});
