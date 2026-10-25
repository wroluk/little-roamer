import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { MOON_BASE, MOON_BASALT, MOON_FLOOR, MOON_HIGHLANDS, MOON_HOLLOW, MOON_OVERLOOK, MOON_RILLE, MOON_ROUTES, moonHollowCentreX, moonSurfaceHeight } from '../../src/game/moon-terrain';
import { MOON_SHELTER } from '../../src/game/moon-scenery';

test.use({ deviceScaleFactor: 1 });
type Point = { x: number; z: number };
type State = {
  area: string; car: string; gravity: number; fog: boolean; viewDistance: number; mode: string;
  position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number };
  contacts: number; speed: number; drawCalls: number; triangles: number; geometries: number;
  graphicsReduced: boolean; cameraObstructed: boolean; streaming: { activeRender: number; activePhysics: number; queued: number };
};
type Game = {
  snapshot(): State; placeVehicle(x: number, z: number, heading: number): Promise<void>;
  setPhotoView(view: { position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number }; fov: number }): Promise<void>;
  follow: { orbit(yaw: number, pitch: number): void };
  vehicle: { model: import('three').Group };
  camera: import('three').PerspectiveCamera;
};
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
async function boot(page: Page, start = '', car = '') {
  await page.goto(`/?area=moon${start ? `&start=${start}` : ''}${car ? `&car=${car}` : ''}`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
}
async function drive(page: Page, points: readonly Point[]) {
  const result = await page.evaluate(async path => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__, keys = new Set<string>();
    const press = (code: string, down: boolean) => {
      if (keys.has(code) === down) return;
      if (down) keys.add(code); else keys.delete(code);
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
    };
    let next = 1, peakAirborne = 0, airborne = 0, peakPhysics = 0, peakTriangles = 0, peakDrawCalls = 0;
    const deadline = performance.now() + 155_000;
    try {
      while (next < path.length && performance.now() < deadline) {
        const s = game.snapshot(), target = path[next], dx = target.x - s.position.x, dz = target.z - s.position.z;
        peakPhysics = Math.max(peakPhysics, s.streaming.activePhysics);
        peakTriangles = Math.max(peakTriangles, s.triangles);
        peakDrawCalls = Math.max(peakDrawCalls, s.drawCalls);
        if (Math.hypot(dx, dz) < 4.5) { next++; continue; }
        const q = s.rotation, fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        const angle = Math.atan2(dx, -dz) - Math.atan2(fx, -fz), error = Math.atan2(Math.sin(angle), Math.cos(angle));
        press('KeyD', error > 0.055); press('KeyA', error < -0.055);
        press('KeyW', Math.abs(s.speed) < (Math.abs(error) > 0.45 ? 2.4 : 4.8));
        airborne = s.contacts === 0 ? airborne + 1 : 0; peakAirborne = Math.max(peakAirborne, airborne);
        await new Promise(requestAnimationFrame);
      }
      return { next, total: path.length, state: game.snapshot(), peakAirborne, peakPhysics, peakTriangles, peakDrawCalls };
    } finally { for (const key of [...keys]) press(key, false); }
  }, points);
  expect(result.next, JSON.stringify(result)).toBe(result.total);
  expect(result.state.streaming.activePhysics).toBeLessThanOrEqual(9);
  expect(result.peakPhysics).toBeLessThanOrEqual(9);
  expect(result.state.cameraObstructed).toBe(false);
  return result;
}

test('Moon pilot has Earth, crisp terrain, bounded frame work, regional reset and safe return to Earth', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('little-roamer-car', 'classic'));
  const before = Date.now();
  await boot(page);
  const loadMs = Date.now() - before;
  const folder = `artifacts/moon/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  expect((await state(page)).gravity).toBe(-3);
  expect((await state(page)).fog).toBe(false);
  expect((await state(page)).viewDistance).toBe(3200);
  expect((await state(page)).car).toBe('lunar-rover');
  await expect(page.locator('.vignette')).toHaveCSS('background-image', 'none');
  for (const [name, p, heading] of [
    ['earthview-base', MOON_BASE, 0],
    ['base-shelter', { x: -128, z: 85 }, Math.PI / 2],
    ['exposed-overlook', MOON_OVERLOOK, Math.PI],
    ['earthrise', MOON_OVERLOOK, 0],
    ['crater-floor', MOON_FLOOR, 0],
  ] as const) {
    await page.evaluate(({ p, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, heading), { p, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await page.waitForTimeout(1000);
    if (name === 'earthview-base' || name === 'earthrise') {
      const visibility = await page.evaluate(async () => {
        const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__, scene = game.vehicle.model.parent!;
        const source = await (await fetch('/src/game/moon-scenery.ts')).text();
        const threeUrl = source.match(/from "([^"\n]*deps\/three[^"\n]*)"/)?.[1];
        if (!threeUrl) throw new Error('Missing Three.js browser module');
        const THREE = await import(/* @vite-ignore */ threeUrl);
        const earth = scene.getObjectByName('Earth')!, terrain = scene.getObjectByName('Moon continuous landscape')!;
        const projected = earth.position.clone().project(game.camera);
        const ray = new THREE.Raycaster(game.camera.position, earth.position.clone().sub(game.camera.position).normalize(), 0, 1800);
        return { x: projected.x, y: projected.y, z: projected.z, blocked: ray.intersectObject(terrain).length > 0 };
      });
      expect(Math.abs(visibility.x)).toBeLessThan(0.8);
      expect(Math.abs(visibility.y)).toBeLessThan(0.85);
      expect(visibility.z).toBeLessThan(1);
      expect(visibility.blocked, 'Earth must be above the actual rendered horizon').toBe(false);
    }
    await page.screenshot({ path: `${folder}/${name}.png` });
  }
  const earth = await page.evaluate(() => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    const scene = game.vehicle.model.parent!;
    const earth = scene.getObjectByName('Earth') as import('three').Mesh;
    const terrain = scene.getObjectByName('Moon continuous landscape') as import('three').Mesh;
    return { earth: !!earth, terrainVertices: terrain.geometry.getAttribute('position').count };
  });
  expect(earth.earth).toBe(true);
  expect(earth.terrainVertices).toBeLessThan(65_000);
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at Quiet Crater');
  expect((await state(page)).position.x).toBeCloseTo(MOON_FLOOR.x, 0);
  const frames = await page.evaluate(async () => {
    const samples: number[] = [];
    let previous = performance.now();
    for (let i = 0; i < 121; i++) {
      const now = await new Promise<number>(resolve => requestAnimationFrame(resolve));
      if (i > 0) samples.push(now - previous);
      previous = now;
    }
    samples.sort((a, b) => a - b);
    return { medianMs: samples[60], p95Ms: samples[114] };
  });
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('#game')!.getContext('webgl2')!;
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : 'unavailable';
  });
  const sample = { renderer, loadMs, ...frames, state: await state(page) };
  await writeFile(`${folder}/performance.json`, JSON.stringify(sample, null, 2));
  expect(sample.state.drawCalls).toBeLessThan(90);
  expect(sample.state.triangles).toBeLessThan(300_000);
  expect(sample.state.streaming.queued).toBe(0);
  expect(sample.state.streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#pause').click(); await page.locator('#home').click();
  await expect(page.getByRole('radio', { name: 'Lunar Rover' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Mars Scout' })).toBeVisible();
  await expect(page.locator('input[name="area"][value="moon"]')).toBeChecked();
  await page.locator('input[name="area"][value="valley"]').check();
  await expect(page.locator('#start')).toBeEnabled();
  expect((await state(page)).gravity).toBe(-18);
  expect((await state(page)).fog).toBe(true);
  expect((await state(page)).car).toBe('classic');
  await page.getByRole('radio', { name: 'Classic' }).check();
  expect((await state(page)).car).toBe('classic');
  expect(errors).toEqual([]);
});

test('Moon preview home tile opens the lunar world with its rover choices', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  const tile = page.locator('input[name="area"][value="moon"]');
  await expect(tile.locator('..')).toContainText('Low-gravity preview');
  await expect(tile.locator('..').locator('img')).toHaveJSProperty('naturalWidth', 476);
  await tile.check();
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('body')).toHaveAttribute('data-area', 'moon');
  await expect(page.getByRole('radio', { name: 'Lunar Rover' })).toBeChecked();
  await expect(page.locator('#car-picker').getByRole('radio')).toHaveCount(3);
  expect((await state(page)).gravity).toBe(-3);
  const folder = `artifacts/moon/home-preview/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/home.png` });
  await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#controls')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Earth texture stays clean in driving and close views without changing lunar presentation', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'earthrise-overlook');
  const folder = `artifacts/moon/earth-texture/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/driving.png` });
  const presentation = await page.evaluate(async () => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    const earth = game.vehicle.model.parent!.getObjectByName('Earth') as
      import('three').Mesh<import('three').SphereGeometry, import('three').MeshStandardMaterial>;
    const map = earth.material.map!;
    const position = game.camera.position.clone();
    const direction = earth.position.clone().sub(position).normalize();
    const target = position.clone().addScaledVector(direction, 10);
    await game.setPhotoView({ position, target, fov: 14 });
    return { width: map.image.width, height: map.image.height, mipmaps: map.generateMipmaps,
      radius: earth.geometry.parameters.radius, direction: direction.toArray() };
  });
  expect(presentation.width).toBe(512);
  expect(presentation.height).toBe(256);
  expect(presentation.mipmaps).toBe(true);
  expect(presentation.radius).toBe(72);
  const length = Math.hypot(0.16, 0.28, -1);
  for (const [index, component] of [0.16, 0.28, -1].entries())
    expect(presentation.direction[index]).toBeCloseTo(component / length, 5);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/close.png` });
  await page.evaluate(() => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    const earth = game.vehicle.model.parent!.getObjectByName('Earth')!;
    const direction = game.camera.position.clone().sub(earth.position).normalize();
    // Face the sphere's -X longitude seam toward the camera, rather than hiding it behind Earth.
    earth.rotation.set(0, Math.atan2(direction.z, -direction.x), 0);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${folder}/seam.png` });
  expect((await state(page)).gravity).toBe(-3);
  expect((await state(page)).fog).toBe(false);
  expect(errors).toEqual([]);
});

test('Moon structures sit on the ground with clear shelter supports and solid footings', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  const folder = `artifacts/moon/grounding/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  for (const [name, position, target] of [
    ['shelter', { x: -153, y: 6.3, z: 98 }, { x: MOON_SHELTER.x, y: 5.8, z: MOON_SHELTER.z }],
    ['shelter-feet', { x: -159, y: 4.8, z: 92 }, { x: MOON_SHELTER.x, y: 4.6, z: MOON_SHELTER.z }],
    ['solar', { x: -167, y: 4.4, z: 96 }, { x: -175, y: 4.5, z: 85 }],
    ['instrument', { x: -52, y: 29.3, z: -190 }, { x: -57, y: 29.1, z: -195 }],
  ] as const) {
    await page.evaluate(view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view),
      { position, target, fov: 55 });
    await page.getByRole('button', { name: 'Hide UI', exact: true }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${folder}/${name}.png` });
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});

test('real browser lunar driving crosses collision boundaries and climbs and descends Quiet Crater', async ({ page }, info) => {
  test.setTimeout(360_000);
  await boot(page);
  const entry = MOON_ROUTES[0].points.slice(0, 4);
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(
    p.x, p.z, Math.atan2(30, 50)), entry[0]);
  await drive(page, entry);
  for (const reversed of [false, true]) {
    const path = reversed ? [...MOON_ROUTES[1].points].reverse() : [...MOON_ROUTES[1].points];
    const first = path[0], second = path[1];
    await page.evaluate(({ first, second }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(
      first.x, first.z, Math.atan2(-(second.x - first.x), -(second.z - first.z))), { first, second });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await drive(page, path);
  }
  await page.screenshot({ path: info.outputPath('lunar-real-drive.png') });
});

test('Moon regional direct entry starts at the Earthrise overlook', async ({ page }) => {
  await boot(page, 'earthrise-overlook');
  expect((await state(page)).position.x).toBeCloseTo(MOON_OVERLOOK.x, 0);
  expect((await state(page)).position.z).toBeCloseTo(MOON_OVERLOOK.z, 0);
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at Earthrise Overlook');
});

test('Moon basalt and rille starts, views and resets retain the bounded haze-free presentation', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/moon/basalt-rille/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  for (const [id, name, point] of [
    ['basalt-reach', 'Basalt Reach', MOON_BASALT], ['silver-rille', 'Silver Rille', MOON_RILLE],
  ] as const) {
    await boot(page, id);
    const s = await state(page);
    expect(s.position.x).toBeCloseTo(point.x, 0); expect(s.position.z).toBeCloseTo(point.z, 0);
    expect(s.gravity).toBe(-3); expect(s.fog).toBe(false);
    expect(s.streaming.activeRender).toBe(64); expect(s.streaming.activePhysics).toBeLessThanOrEqual(9);
    expect(s.drawCalls).toBeLessThan(90); expect(s.triangles).toBeLessThan(120_000);
    await page.screenshot({ path: `${folder}/${id}.png` });
    await page.locator('#reset').click();
    await expect(page.locator('#toast')).toHaveText(`Back at ${name}`);
    expect((await state(page)).position.x).toBeCloseTo(point.x, 0);
  }
  for (const [name, x, z, heading] of [
    ['bank-arrival', 208, -95, Math.PI], ['breach-floor', 238, 85, -Math.PI / 2],
    ['eastern-shoulder', 288, 70, Math.PI / 2],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading),
      { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${folder}/${name}.png` });
  }
  expect(errors).toEqual([]);
});

test('Basalt Reach identity is readable from the start and reported northern approach', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'basalt-reach');
  const folder = `artifacts/moon/basalt-identity/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${folder}/arrival.png` });
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView({
    position: { x: 108.684, y: 10.09, z: 173.21 },
    target: { x: 98.706, y: 6.846, z: 182.326 }, fov: 48,
  }));
  await page.getByRole('button', { name: 'Hide UI', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/reported-view.png` });
  await page.keyboard.press('Escape');
  await page.evaluate(view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: 147, y: moonSurfaceHeight(147, 186) + 3, z: 186 },
    target: { x: 138, y: moonSurfaceHeight(138, 192) + 1, z: 192 }, fov: 55,
  });
  await page.getByRole('button', { name: 'Hide UI', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/grounded-crust.png` });
  expect((await state(page)).streaming.activePhysics).toBeLessThanOrEqual(9);
  expect(errors).toEqual([]);
});

test('real browser basalt flow corridor remains open in both directions', async ({ page }, info) => {
  test.setTimeout(240_000);
  await boot(page, 'basalt-reach');
  for (const reversed of [false, true]) {
    const points = MOON_ROUTES[2].points.slice(3, 6), path = reversed ? [...points].reverse() : points;
    const first = path[0], second = path[1];
    await page.evaluate(({ first, second }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(
      first.x, first.z, Math.atan2(-(second.x - first.x), -(second.z - first.z))), { first, second });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await drive(page, path);
  }
  const folder = `artifacts/moon/basalt-identity/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/real-drive.png` });
});

test('Broken Highlands has safe regional entry, fractured uplands, ridge views and reset', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'broken-highlands');
  const folder = `artifacts/moon/broken-highlands/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const initial = await state(page);
  expect(initial.position.x).toBeCloseTo(MOON_HIGHLANDS.x, 0);
  expect(initial.position.z).toBeCloseTo(MOON_HIGHLANDS.z, 0);
  expect(initial.gravity).toBe(-3); expect(initial.fog).toBe(false);
  expect(initial.streaming.activeRender).toBe(64); expect(initial.streaming.activePhysics).toBeLessThanOrEqual(9);
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at Broken Highlands');
  for (const [name, x, z, heading] of [
    ['arrival', MOON_HIGHLANDS.x, MOON_HIGHLANDS.z, 0],
    ['shelf-climb', -272, -135, -Math.atan2(22, 45)],
    ['western-ridge', -300, -160, 0],
    ['northern-return', -205, -225, -Math.PI / 2],
    ['basin-view', -250, -180, -Math.PI / 2],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading),
      { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await page.waitForTimeout(1000);
    const s = await state(page);
    expect(s.cameraObstructed).toBe(false);
    expect(s.triangles).toBeLessThan(120_000);
    expect(s.drawCalls).toBeLessThan(90);
    await page.screenshot({ path: `${folder}/${name}.png` });
  }
  await page.evaluate(view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -224, y: moonSurfaceHeight(-224, -110) + 6, z: -110 },
    target: { x: -234, y: 39, z: -116 }, fov: 55,
  });
  await page.getByRole('button', { name: 'Hide UI', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/fracture.png` });
  expect(errors).toEqual([]);
});

test('real browser highland climb and exposed ridge stay driveable both ways', async ({ page }, info) => {
  test.setTimeout(420_000);
  await boot(page, 'broken-highlands');
  for (const points of [MOON_ROUTES[6].points.slice(1, 6), MOON_ROUTES[7].points.slice(2)]) {
    for (const reversed of [false, true]) {
      const path = reversed ? [...points].reverse() : [...points], first = path[0], second = path[1];
      await page.evaluate(({ first, second }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(
        first.x, first.z, Math.atan2(-(second.x - first.x), -(second.z - first.z))), { first, second });
      await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
      await drive(page, path);
    }
  }
  const folder = `artifacts/moon/broken-highlands/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/real-drive.png` });
});

test('Skylight Hollow has daylight, open portals, safe Nomad entry and reset', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'skylight-hollow', 'lunar-nomad');
  const folder = `artifacts/moon/skylight-hollow/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  expect((await state(page)).car).toBe('lunar-nomad');
  expect((await state(page)).position.x).toBeCloseTo(MOON_HOLLOW.x, 0);
  await page.locator('#reset').click();
  await expect(page.locator('#toast')).toHaveText('Back at Skylight Hollow');
  for (const [name, x, z, heading] of [
    ['arrival', MOON_HOLLOW.x, MOON_HOLLOW.z, Math.PI],
    ['north-portal', moonHollowCentreX(169), 169, Math.PI],
    ['interior', moonHollowCentreX(184), 184, Math.PI],
    ['skylight', moonHollowCentreX(200), 200, Math.PI],
    ['south-portal', moonHollowCentreX(235), 235, 0],
    ['bypass', -292, 198, -Math.PI / 2],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading),
      { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await page.waitForTimeout(800);
    const s = await state(page);
    expect(s.fog).toBe(false); expect(s.gravity).toBe(-3);
    expect(s.cameraObstructed).toBe(false);
    expect(s.streaming.activePhysics).toBeLessThanOrEqual(9);
    expect(s.triangles).toBeLessThan(120_000); expect(s.drawCalls).toBeLessThan(90);
    await page.screenshot({ path: `${folder}/${name}.png` });
  }
  for (const [name, position, target] of [
    ['daylight-from-inside', { x: moonHollowCentreX(185), y: 9, z: 185 }, { x: moonHollowCentreX(200), y: 15, z: 200 }],
    ['roof-and-bypass', { x: -280, y: 28, z: 155 }, { x: -252, y: 14, z: 199 }],
  ] as const) {
    await page.evaluate(view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view),
      { position, target, fov: 65 });
    await page.getByRole('button', { name: 'Hide UI', exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${folder}/${name}.png` });
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});

test('real browser Nomad drives Skylight Hollow passage and surface bypass both ways', async ({ page }, info) => {
  test.setTimeout(420_000);
  await boot(page, 'skylight-hollow', 'lunar-nomad');
  for (const points of [MOON_ROUTES[8].points.slice(4, 8), MOON_ROUTES[9].points]) {
    for (const reversed of [false, true]) {
      const path = reversed ? [...points].reverse() : [...points], first = path[0], second = path[1];
      await page.evaluate(({ first, second }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(
        first.x, first.z, Math.atan2(-(second.x - first.x), -(second.z - first.z))), { first, second });
      await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
      await drive(page, path);
    }
  }
  const folder = `artifacts/moon/skylight-hollow/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/real-drive.png` });
});

for (const [name, points] of [
  ['base-connector', MOON_ROUTES[8].points.slice(0, 5)],
  ['basalt-return', MOON_ROUTES[8].points.slice(7)],
] as const) test(`real browser Hollow ${name} connects both ways with Nomad`, async ({ page }, info) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'skylight-hollow', 'lunar-nomad');
  const folder = `artifacts/moon/hollow-connectors/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('#game')!.getContext('webgl2')!;
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string : 'unavailable';
  });
  const runs = [];
  for (const reversed of [false, true]) {
    const path = reversed ? [...points].reverse() : [...points], first = path[0], second = path[1];
    await page.evaluate(({ first, second }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(
      first.x, first.z, Math.atan2(-(second.x - first.x), -(second.z - first.z))), { first, second });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    const direction = reversed ? 'reverse' : 'forward';
    await page.screenshot({ path: `${folder}/${name}-${direction}-departure.png` });
    const result = await drive(page, path);
    expect(result.state.car).toBe('lunar-nomad');
    expect(result.peakTriangles).toBeLessThan(120_000);
    expect(result.peakDrawCalls).toBeLessThan(90);
    expect(result.state.streaming.activeRender).toBe(64);
    expect(result.state.streaming.queued).toBe(0);
    await page.screenshot({ path: `${folder}/${name}-${direction}-arrival.png` });
    runs.push({ direction, path, ...result });
  }
  await writeFile(`${folder}/${name}.json`, JSON.stringify({ renderer, runs }, null, 2));
  expect(errors).toEqual([]);
});

test('real browser lunar excursion crosses basalt, rille bends and the crossing breach both ways', async ({ page }, info) => {
  test.setTimeout(480_000);
  await boot(page, 'basalt-reach');
  const paths = [
    MOON_ROUTES[2].points.slice(3, 5), MOON_ROUTES[3].points.slice(1, 7), MOON_ROUTES[5].points.slice(2),
  ];
  for (const points of paths) for (const reversed of [false, true]) {
    const path = reversed ? [...points].reverse() : [...points], first = path[0], second = path[1];
    await page.evaluate(({ first, second }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(first.x, first.z,
      Math.atan2(-(second.x - first.x), -(second.z - first.z))), { first, second });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await drive(page, path);
  }
  await page.screenshot({ path: info.outputPath('basalt-rille-real-drive.png') });
});
