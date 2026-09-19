import { expect, test, type Page } from '@playwright/test';
import { generateNorthernChunk } from '../../src/game/northern-terrain';

type StreamingStats = {
  activeRender: number;
  activePhysics: number;
  queued: number;
  triangles: number;
  colliderCount: number;
  lastActivationMs: number;
};

type State = {
  area: string;
  bounds: number;
  mode: string;
  surface: string;
  waterDepth: number;
  contacts: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  suspension: number[];
  cameraFeedbackApplied: number;
  cameraObstructed: boolean;
  streaming: StreamingStats | null;
};

type Game = {
  snapshot(): State;
  placeVehicle(x: number, z: number, heading: number): Promise<void>;
  waitForStreamingIdle(): Promise<void>;
};

const state = (page: Page): Promise<State> => page.evaluate(
  () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot(),
);

async function enter(page: Page) {
  await page.goto('/?area=northern-reach');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('#area-select')).toHaveValue('northern-reach');
  await expect(page.locator('#welcome-eyebrow')).toHaveText('NORTHERN REACH / COAST TO SUMMIT');
  await page.locator('#start').click();
}

test('Northern Reach starts on solid streamed terrain and drives normally', async ({ page }) => {
  await enter(page);
  const start = await state(page);
  expect(start.area).toBe('northern-reach');
  expect(start.bounds).toBe(768);
  expect(start.contacts).toBe(4);
  expect(start.streaming).toMatchObject({
    activeRender: 25,
    activePhysics: 9,
    queued: 0,
  });
  expect(start.streaming!.colliderCount).toBeGreaterThan(9);
  expect(start.streaming!.colliderCount).toBeLessThanOrEqual(80);
  expect(start.streaming!.triangles).toBeLessThanOrEqual(85_000);

  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state(page)).position.z).toBeLessThan(start.position.z - 8);
  await page.keyboard.up('KeyW');
  const driven = await state(page);
  expect(driven.contacts).toBeGreaterThanOrEqual(2);
  expect(driven.cameraObstructed).toBe(false);
});

test('crossing a chunk seam refreshes bounded render and physics rings', async ({ page }) => {
  await enter(page);
  await page.evaluate(async () => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    await game.placeVehicle(0, 486, 0);
    await game.waitForStreamingIdle();
  });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state(page)).position.z, {
    timeout: 18_000,
    intervals: [150],
  }).toBeLessThan(476);
  await page.keyboard.up('KeyW');
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.waitForStreamingIdle());
  const crossed = await state(page);
  expect(crossed.streaming).toMatchObject({
    activeRender: 25,
    activePhysics: 9,
    queued: 0,
  });
  expect(crossed.streaming!.colliderCount).toBeGreaterThanOrEqual(9);
  expect(crossed.streaming!.colliderCount).toBeLessThanOrEqual(80);
  expect(crossed.cameraObstructed).toBe(false);
  expect(crossed.contacts).toBeGreaterThanOrEqual(2);
});

test('local deep lake water remains impassable after streaming teleport', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(0, 180, 0));
  await expect.poll(async () => (await state(page)).surface).toBe('water');
  await expect.poll(async () => (await state(page)).waterDepth).toBeGreaterThan(0.95);
  const before = await state(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2_500);
  await page.keyboard.up('KeyW');
  const after = await state(page);
  expect(Math.hypot(after.position.x - before.position.x, after.position.z - before.position.z)).toBeLessThan(1);
  await expect(page.locator('#surface-trait')).toHaveText('Too deep · reset');
});

test('streamed loose boulders physically stop a head-on vehicle impact', async ({ page }) => {
  await enter(page);
  // Use the lake-side chunk; (3, 0) is cleared for the Ochre Terraces approach.
  const chunk = generateNorthernChunk(2, 2);
  const boulder = Array.from(chunk.props.type).findIndex(value => value === 1 || value === 2);
  expect(boulder).toBeGreaterThanOrEqual(0);
  const x = chunk.props.x[boulder];
  const z = chunk.props.z[boulder];
  const current = await state(page);
  expect(current.streaming).not.toBeNull();
  expect(current.streaming!.activePhysics).toBe(9);
  expect(current.streaming!.colliderCount).toBeGreaterThan(current.streaming!.activePhysics);
  expect(current.streaming!.colliderCount).toBeLessThanOrEqual(80);
  await page.evaluate(
    ({ x, z }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z + 7, 0),
    { x, z },
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(4_000);
  await page.keyboard.up('KeyW');
  const impacted = await state(page);
  expect(impacted.position.z).toBeGreaterThan(z);
  expect(Math.abs(impacted.position.x - x)).toBeLessThan(1);
});

test('shrubs let the car pass while producing soft suspension feedback', async ({ page }) => {
  await enter(page);
  const chunk = generateNorthernChunk(0, 6);
  const shrub = Array.from(chunk.props.type).findIndex(value => value === 5);
  expect(shrub).toBeGreaterThanOrEqual(0);
  const x = chunk.props.x[shrub];
  const z = chunk.props.z[shrub];
  await page.evaluate(
    ({ x, z }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z + 7, 0),
    { x, z },
  );
  await page.keyboard.down('KeyW');
  const samples: State[] = [];
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(100);
    samples.push(await state(page));
  }
  await page.keyboard.up('KeyW');
  expect(Math.min(...samples.map(sample => sample.position.z))).toBeLessThan(z - 5);
  expect(Math.max(...samples.map(sample => sample.cameraFeedbackApplied))).toBeGreaterThan(0.045);
});

test('travelling through all three destinations releases and rebuilds streamed resources', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  for (const [index, area] of ['northern-reach', 'highlands', 'valley', 'northern-reach'].entries()) {
    if (index > 0) {
      await page.locator('#pause').click();
      await page.locator('#home').click();
    }
    await page.locator('#area-select').selectOption(area);
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    await page.locator('#start').click();
    await expect.poll(async () => (await state(page)).area).toBe(area);
  }
  const returned = await state(page);
  expect(returned.streaming).toMatchObject({ activeRender: 25, activePhysics: 9, queued: 0 });
});

test('streamed reset locks travel and honors a pause requested while terrain loads', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-300, 300, 0));
  await page.locator('#reset').click();
  await expect(page.locator('#area-select')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#area-select')).toBeDisabled();
  await expect(page.locator('#area-select')).toHaveValue('northern-reach');
  const reset = await state(page);
  expect(reset.mode).toBe('paused');
  expect(reset.position.x).toBeCloseTo(24, 0);
  expect(reset.position.z).toBeCloseTo(560, 0);
});

test('fatal errors stay terminal while an asynchronous area load is in flight', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>('#area-select')!;
    select.value = 'northern-reach';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector<HTMLCanvasElement>('#game')!
      .dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await expect(page.locator('#error')).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#area-select')).toBeDisabled();
  await expect(page.locator('#controls')).toBeHidden();
});
