import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { ISLAND_ROUTES, ISLAND_STARTS, islandGroundHeight } from '../../src/game/island-terrain';

type Point = { x: number; z: number };
type State = {
  area: string; car: string; gravity: number; mode: string; contacts: number;
  position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number };
  speed: number; waterDepth: number; drawCalls: number; triangles: number; geometries: number; cameraObstructed: boolean;
  streaming: { activePhysics: number; colliderCount: number; queued: number };
  navigation: { elevation: number };
};
type Game = {
  snapshot(): State; placeVehicle(x: number, z: number, heading: number): Promise<void>;
  setPhotoView(view: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov: number }): Promise<void>;
};
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
async function boot(page: Page, start = 'castaway-cove') {
  await page.goto(`/?area=island&start=${start}&car=classic`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
}
async function place(page: Page, first: Point, second: Point) {
  await page.evaluate(({ first, second }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(
    first.x, first.z, Math.atan2(-(second.x - first.x), -(second.z - first.z))), { first, second });
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
}
async function drive(page: Page, path: readonly Point[]) {
  const result = await page.evaluate(async path => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__, keys = new Set<string>();
    const press = (code: string, down: boolean) => {
      if (keys.has(code) === down) return;
      if (down) keys.add(code); else keys.delete(code);
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
    };
    let next = 1, under = false, over = false, maxWater = 0, maxCalls = 0, maxTriangles = 0;
    const deadline = performance.now() + 240_000;
    try {
      while (next < path.length && performance.now() < deadline) {
        const s = game.snapshot(), target = path[next], dx = target.x - s.position.x, dz = target.z - s.position.z;
        if (Math.abs(s.position.x) < 4 && Math.abs(s.position.z) < 4) {
          if (s.position.y < 8) {
            if (s.navigation.elevation !== 5) throw new Error('Lower trail must report ground elevation, not the bridge roof');
            under = true;
          }
          if (s.position.y > 25) {
            if (s.navigation.elevation !== 26) throw new Error('Crossing must report deck elevation');
            over = true;
          }
        }
        maxWater = Math.max(maxWater, s.waterDepth); maxCalls = Math.max(maxCalls, s.drawCalls);
        maxTriangles = Math.max(maxTriangles, s.triangles);
        if (Math.hypot(dx, dz) < 3.5) { next++; continue; }
        const q = s.rotation, fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        const angle = Math.atan2(dx, -dz) - Math.atan2(fx, -fz), error = Math.atan2(Math.sin(angle), Math.cos(angle));
        press('KeyD', error > 0.06); press('KeyA', error < -0.06);
        press('KeyW', Math.abs(s.speed) < (Math.abs(error) > 0.5 ? 2.8 : 6.5));
        await new Promise(requestAnimationFrame);
      }
      return { next, total: path.length, under, over, maxWater, maxCalls, maxTriangles, state: game.snapshot() };
    } finally { for (const key of [...keys]) press(key, false); }
  }, path);
  expect(result.next, JSON.stringify(result)).toBe(result.total);
  expect(result.maxWater).toBeLessThan(0.1);
  expect(result.maxCalls).toBeLessThan(85);
  expect(result.maxTriangles).toBeLessThan(350_000);
  expect(result.state.streaming.activePhysics).toBe(1);
  return result;
}

test('Island pilot renders beach, jungle and aqueduct, with safe entries, recovery and Earth travel', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/island/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  for (const start of ISLAND_STARTS) {
    await boot(page, start.id);
    const s = await state(page);
    expect(s.area).toBe('island'); expect(s.car).toBe('classic'); expect(s.gravity).toBe(-18);
    expect(s.position.x).toBeCloseTo(start.position.x, 0); expect(s.position.z).toBeCloseTo(start.position.z, 0);
    expect(s.streaming.colliderCount).toBeLessThanOrEqual(12);
    expect(s.triangles).toBeLessThan(350_000); expect(s.drawCalls).toBeLessThan(85);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${folder}/${start.id}-driving.png` });
    await page.locator('#reset').click();
    await expect(page.locator('#toast')).toHaveText(`Back at ${start.name}`);
    expect((await state(page)).position.x).toBeCloseTo(start.position.x, 0);
  }
  for (const [name, position, target] of [
    ['cove', { x: -77, y: islandGroundHeight(-77, 143) + 3, z: 143 }, { x: -73, y: 3, z: 153 }],
    ['arches-arrival', { x: 0, y: 8.2, z: 43 }, { x: 0, y: 10.5, z: 33 }],
    ['jungle', { x: -111, y: islandGroundHeight(-111, -50) + 3, z: -50 },
      { x: -109, y: islandGroundHeight(-109, -42) + 2, z: -42 }],
    ['aqueduct-side', { x: 22, y: islandGroundHeight(22, 34) + 3, z: 34 }, { x: 17, y: 12, z: 26 }],
    ['ocean-overlook', { x: 64, y: 29, z: 6 }, { x: 67.2, y: 27, z: 16 }],
  ] as const) {
    expect(position.y, `${name}: review camera must be above actual ground`).toBeGreaterThan(
      islandGroundHeight(position.x, position.z) + 0.3);
    await page.evaluate(view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), { position, target, fov: 60 });
    await page.getByRole('button', { name: 'Hide UI', exact: true }).click();
    await page.waitForTimeout(300); await page.screenshot({ path: `${folder}/${name}.png` });
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page)).mode).toBe('playing');
  }
  await page.locator('#pause').click(); await page.locator('#home').click();
  await expect(page.locator('input[name="area"][value="island"]')).toBeChecked();
  await page.locator('input[name="area"][value="moon"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  expect((await state(page)).gravity).toBe(-3);
  await page.locator('input[name="area"][value="island"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  expect((await state(page)).gravity).toBe(-18); expect((await state(page)).car).toBe('classic');
  const before = await state(page);
  await page.locator('input[name="area"][value="valley"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('input[name="area"][value="island"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  const after = await state(page);
  expect(after.geometries).toBeLessThanOrEqual(before.geometries + 2);
  expect(errors).toEqual([]);
  await writeFile(`${folder}/render-budget.json`, JSON.stringify(after, null, 2));
});

for (const reverse of [false, true]) test(`real Island circuit ${reverse ? 'reverse' : 'forward'} passes below and above the arches`, async ({ page }, info) => {
  test.setTimeout(300_000);
  await boot(page);
  const loop = ISLAND_ROUTES.slice(0, 4).flatMap((route, i) => i ? route.points.slice(1) : route.points);
  const path = reverse ? [...loop].reverse() : loop;
  await place(page, path[0], path[1]);
  const result = await drive(page, path);
  expect(result.under).toBe(true); expect(result.over).toBe(true);
  const folder = `artifacts/island/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/loop-${reverse ? 'reverse' : 'forward'}.png` });
  await writeFile(`${folder}/loop-${reverse ? 'reverse' : 'forward'}.json`, JSON.stringify(result, null, 2));
});
