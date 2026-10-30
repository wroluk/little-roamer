import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Vehicle } from '../../src/game/vehicle';
import type { FollowCamera } from '../../src/game/camera';
import { TIDAL_ROUTE, TIDAL_CHANNELS, TIDAL_STARTS, SEABIRD_CLIMB, tidalGroundHeight } from '../../src/game/tidal-terrain';
import { demoState, driveDemo, type DemoGame } from './location-demo-driving';

async function boot(page: Page, start = 'harbor-cove') {
  await page.goto(`/?area=tidal-islands&start=${start}&car=modern`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => {
    const state = await demoState(page);
    return state.position.y - tidalGroundHeight(state.position.x, state.position.z);
  }).toBeLessThan(0.9);
}

test('fresh Island Tracks: wind-bent tree foliage from the reported cliff angle and driving height', async ({ page }, info) => {
  test.setTimeout(60_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'windward-lookout');
  const approach = await driveDemo(page, SEABIRD_CLIMB.slice(0, 2), 2.5, 20_000, 1);
  expect(approach.next, JSON.stringify(approach)).toBe(approach.total);
  expect(approach.minimumUp).toBeGreaterThan(0.65);
  expect(approach.obstructedFrames).toBe(0);
  await page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(136, -69, Math.atan2(-8, -16)));
  await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => {
    const state = await demoState(page);
    return state.position.y - tidalGroundHeight(state.position.x, state.position.z);
  }).toBeLessThan(0.9);
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/wind-tree-driving.png` });
  for (const [name, x, y, z, tx, ty, tz, fov] of [
    ['wind-tree-cliff-feedback', 110, 75, -165, 130, 45, -110, 75],
    ['wind-tree-high-close', 108, 60, -116, 116.8, 59.9, -120.2, 60],
    ['wind-tree-low-view', 145, tidalGroundHeight(145, -72) + 2.5, -72, 151.5, 32.8, -81.3, 60],
  ] as const) {
    await page.evaluate(view => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.setPhotoView(view), {
      position: { x, y, z }, target: { x: tx, y: ty, z: tz }, fov,
    });
    await page.getByRole('button', { name: 'Hide UI', exact: true }).click(); await page.waitForTimeout(250);
    await page.screenshot({ path: `${folder}/${name}.png` });
    const state = await demoState(page);
    expect(state.recoveryStart).toBe('windward-lookout');
    expect(state.drawCalls).toBeLessThan(65); expect(state.triangles).toBeLessThan(300_000);
    expect(state.streaming.colliderCount).toBe(15);
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});

test('fresh Island Tracks: views, safe entries, whole-challenge recovery and switching', async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  for (const [index, start] of TIDAL_STARTS.entries()) {
    const recovery = TIDAL_STARTS[[0, 0, 0, 3, 4, 4, 6][index]];
    await boot(page, start.id);
    await expect(page.locator('#reset')).toHaveAttribute('title', 'Restart the whole current challenge from its departure point (R)');
    await expect.poll(async () => (await demoState(page)).recoveryStart).toBe(recovery.id);
    const state = await demoState(page);
    expect(state.area).toBe('tidal-islands'); expect(state.gravity).toBe(-18);
    expect(state.position.x).toBeCloseTo(start.position.x, 0); expect(state.position.z).toBeCloseTo(start.position.z, 0);
    await page.screenshot({ path: `${folder}/${start.id}-driving.png` });
    await page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(20, 70, 0));
    await page.locator('#reset').click();
    await expect.poll(async () => Math.hypot((await demoState(page)).position.x - recovery.position.x,
      (await demoState(page)).position.z - recovery.position.z)).toBeLessThan(0.5);
  }
  await boot(page);
  for (const [name, x, z, lift, tx, tz, ty] of [
    ['departure-cove', -119, 56, 2.8, -110, 50, 5],
    ['rock-passage-arrival', -70, 35, 2.6, -61, 29, 3.2],
    ['first-wading-channel', -42, 10, 2.5, -32, 4, 0.8],
    ['split-saddle', 40, 15, 2.5, 50, 14, 5.2],
    ['far-shore-lookback', 104, 4, 2.8, 94, 2, 4.2],
    ['windward-lookout', 142, -53, 2.8, 132, -50, 29.5],
    ['seabird-ledge', 109, -86, 2.5, 112, -98, 42],
    ['wind-notch', 132, -110, 2.8, 145, -108, 49],
    ['seabird-summit-lookback', 137, -151, 4.5, 125, -141, 67],
  ] as const) {
    await page.evaluate(view => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.setPhotoView(view), {
      position: { x, y: tidalGroundHeight(x, z) + lift, z }, target: { x: tx, y: ty, z: tz }, fov: 60,
    });
    await page.getByRole('button', { name: 'Hide UI', exact: true }).click(); await page.waitForTimeout(250);
    await page.screenshot({ path: `${folder}/${name}.png` });
    expect((await demoState(page)).recoveryStart, 'photo targets must not unlock recovery across the sea').toBe('harbor-cove');
    await page.keyboard.press('Escape');
  }
  await page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(112, -91, Math.atan2(2, 22)));
  await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => {
    const state = await demoState(page);
    return state.position.y - tidalGroundHeight(state.position.x, state.position.z);
  }).toBeLessThan(0.9);
  await expect.poll(async () => (await demoState(page)).cameraObstructed).toBe(false);
  await page.screenshot({ path: `${folder}/seabird-ledge-driving.png` });
  await page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(-32, 4, -Math.PI / 2));
  await expect.poll(async () => (await demoState(page)).waterDepth).toBeGreaterThan(0.12);
  await page.screenshot({ path: `${folder}/wading-driving.png` });
  const before = await demoState(page);
  await page.locator('#pause').click(); await page.locator('#home').click();
  await page.locator('input[name="area"][value="island-tracks"]').check(); await expect(page.locator('#start')).toBeEnabled();
  expect((await demoState(page)).area).toBe('island-tracks');
  await page.locator('input[name="area"][value="tidal-islands"]').check(); await expect(page.locator('#start')).toBeEnabled();
  const after = await demoState(page);
  expect(after.geometries).toBeLessThanOrEqual(before.geometries + 2);
  expect(after.streaming.colliderCount).toBe(15);
  expect(after.drawCalls).toBeLessThan(65); expect(after.triangles).toBeLessThan(300_000);
  expect(errors).toEqual([]);
  await writeFile(`${folder}/render-budget.json`, JSON.stringify(after, null, 2));
});

test('fresh Island Tracks: Reset and R restart the challenge upright, overturned or beyond an unearned exit', async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  for (const [entry, shelf, exit, approach] of [
    [TIDAL_STARTS[0], TIDAL_STARTS[2], TIDAL_STARTS[3], TIDAL_ROUTE.slice(0, 4)],
    [TIDAL_STARTS[3], TIDAL_STARTS[2], TIDAL_STARTS[0], TIDAL_ROUTE.slice(17, 20).reverse()],
    [TIDAL_STARTS[4], TIDAL_STARTS[5], TIDAL_STARTS[6], SEABIRD_CLIMB.slice(0, 2)],
    [TIDAL_STARTS[6], TIDAL_STARTS[5], TIDAL_STARTS[4], [...SEABIRD_CLIMB].reverse().slice(0, 2)],
  ] as const) {
    await boot(page, entry.id);
    const driven = await driveDemo(page, approach, 2.5, 50_000, 2);
    expect(driven.next, JSON.stringify(driven)).toBe(driven.total);
    for (const [destination, roll] of [[shelf, 0], [shelf, Math.PI / 2], [shelf, Math.PI], [exit, 0]] as const) {
      await page.evaluate(point => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(point.x, point.z, 0.7),
        destination.position);
      await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
      expect((await demoState(page)).recoveryStart).toBe(entry.id);
      if (roll) await page.evaluate(roll => {
        const game = (window as unknown as { __ROAMER__: DemoGame & { vehicle: Vehicle } }).__ROAMER__;
        const position = game.vehicle.body.translation(), s = Math.sin(0.35), c = Math.cos(0.35);
        const sr = Math.sin(roll / 2), cr = Math.cos(roll / 2);
        game.vehicle.body.setRotation({ x: s * sr, y: s * cr, z: c * sr, w: c * cr }, true);
        game.vehicle.body.setTranslation({ ...position, y: position.y + 0.15 }, true);
        game.vehicle.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        game.vehicle.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        game.vehicle.capture();
      }, roll);
      if (roll === Math.PI) await page.keyboard.press('KeyR');
      else await page.locator('#reset').click();
      await expect(page.locator('#toast')).toHaveText(`Back at ${entry.name}`);
      await expect.poll(async () => {
        const state = await demoState(page);
        return Math.hypot(state.position.x - entry.position.x, state.position.z - entry.position.z);
      }).toBeLessThan(0.5);
      await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
      const state = await demoState(page);
      expect(state.mode).toBe('playing');
      expect(1 - 2 * (state.rotation.x ** 2 + state.rotation.z ** 2)).toBeGreaterThan(0.95);
      expect(state.recoveryStart).toBe(entry.id);
      const heading = Math.atan2(-(approach[1].x - approach[0].x), -(approach[1].z - approach[0].z));
      const q = state.rotation, forwardX = -2 * (q.x * q.z + q.w * q.y), forwardZ = -(1 - 2 * (q.x ** 2 + q.y ** 2));
      expect(forwardX * -Math.sin(heading) + forwardZ * -Math.cos(heading)).toBeGreaterThan(0.99);
    }
    await page.screenshot({ path: `${folder}/${entry.id}-to-${exit.id}-challenge-restart.png` });
  }
  expect(errors).toEqual([]);
});

test('fresh Island Tracks: earned shore survives R on arrival and after the first inland left turn', async ({ page }, info) => {
  test.setTimeout(900_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  const wetPoints = TIDAL_CHANNELS.map(([a, b]) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }));
  const results = [];
  await boot(page);
  for (const reverse of [false, true]) {
    const path = reverse ? TIDAL_ROUTE.slice(2, 20).reverse()
      : [...TIDAL_ROUTE.slice(0, 19), { x: 97, z: 0.2 }];
    const recovery = reverse ? TIDAL_STARTS[0] : TIDAL_STARTS[3];
    const result = await driveDemo(page, path, 2.7, 350_000, 2, wetPoints);
    expect(result.next, JSON.stringify(result)).toBe(result.total);
    expect(result.state.recoveryStart).toBe(recovery.id);
    expect(result.wetPoints.sort()).toEqual([0, 1, 2]);
    expect(result.minimumUp).toBeGreaterThan(0.65); expect(result.maxWater).toBeLessThan(0.6);
    expect(result.wheelLift).toBeGreaterThan(0.1); expect(result.articulation).toBeGreaterThan(0.08);
    expect(result.suspensionDifference).toBeGreaterThan(0.04);
    expect(result.obstructedFrames).toBe(0);
    expect(result.maxCalls).toBeLessThan(65); expect(result.maxTriangles).toBeLessThan(300_000);
    await page.screenshot({ path: `${folder}/earned-${reverse ? 'home' : 'far'}-shore-before-reset.png` });
    await page.keyboard.press('KeyR');
    await expect(page.locator('#toast')).toHaveText(`Back at ${recovery.name}`);
    await expect.poll(async () => {
      const state = await demoState(page);
      return Math.hypot(state.position.x - recovery.position.x, state.position.z - recovery.position.z);
    }).toBeLessThan(0.5);
    if (!reverse) {
      const turn = await driveDemo(page, TIDAL_ROUTE.slice(19, 22), 2.7, 70_000, 2);
      expect(turn.next, JSON.stringify(turn)).toBe(turn.total);
      expect(turn.state.recoveryStart).toBe('saltgrass-landing');
      expect(turn.minimumUp).toBeGreaterThan(0.65);
      expect(turn.obstructedFrames).toBe(0);
      await page.screenshot({ path: `${folder}/earned-far-shore-first-left-turn.png` });
      await page.keyboard.press('KeyR');
      await expect(page.locator('#toast')).toHaveText('Back at Saltgrass Landing');
      await expect.poll(async () => {
        const state = await demoState(page);
        return Math.hypot(state.position.x - recovery.position.x, state.position.z - recovery.position.z);
      }).toBeLessThan(0.5);
      results.push({ firstLeftTurn: turn });
    }
    results.push({ reverse, ...result });
    await writeFile(`${folder}/shore-recovery-evidence.json`, JSON.stringify(results, null, 2));
  }
  expect(errors).toEqual([]);
});

test('fresh Island Tracks: driving camera stays above deep sea during falls and low cliff-side orbits', async ({ page }, info) => {
  test.setTimeout(150_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  await boot(page, 'windward-lookout');
  for (const [name, x, z] of [['open-sea', 20, 70], ['cliff-foot', 164, -70]] as const) {
    await page.evaluate(async ({ x, z }) => {
      const game = (window as unknown as { __ROAMER__: DemoGame & { vehicle: Vehicle; follow: FollowCamera } }).__ROAMER__;
      await game.placeVehicle(x, z, 0);
      game.vehicle.body.setTranslation({ x, y: 5, z }, true);
      game.vehicle.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      game.vehicle.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      game.vehicle.capture();
      game.vehicle.previousPosition.copy(game.vehicle.position);
      game.vehicle.syncVisuals(1);
      game.follow.reset();
    }, { x, z });
    const fall = await page.evaluate(async () => {
      const game = (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__;
      let minimumCamera = Infinity, minimumCar = Infinity, obstructed = 0;
      for (let frame = 0; frame < 180; frame++) {
        await new Promise(requestAnimationFrame);
        const state = game.snapshot();
        minimumCamera = Math.min(minimumCamera, state.camera[1]);
        minimumCar = Math.min(minimumCar, state.position.y);
        if (state.cameraObstructed) obstructed++;
      }
      return { minimumCamera, minimumCar, obstructed, state: game.snapshot() };
    });
    expect(fall.minimumCamera).toBeGreaterThanOrEqual(1 - 0.00001);
    expect(fall.minimumCar).toBeLessThan(-5);
    expect(fall.state.waterDepth).toBeGreaterThan(5);
    expect(fall.obstructed).toBe(0);
    await page.screenshot({ path: `${folder}/${name}-above-water-camera.png` });
    const orbit = await page.evaluate(async () => {
      const game = (window as unknown as { __ROAMER__: DemoGame & { follow: FollowCamera } }).__ROAMER__;
      game.follow.orbit(0, -10);
      let minimumCamera = Infinity, obstructed = 0;
      for (let frame = 0; frame < 120; frame++) {
        game.follow.orbit(0.04, 0);
        await new Promise(requestAnimationFrame);
        const state = game.snapshot();
        minimumCamera = Math.min(minimumCamera, state.camera[1]);
        if (state.cameraObstructed) obstructed++;
      }
      return { minimumCamera, obstructed, state: game.snapshot() };
    });
    expect(orbit.minimumCamera).toBeGreaterThanOrEqual(1 - 0.00001);
    expect(orbit.obstructed).toBe(0);
    expect(orbit.state.recoveryStart).toBe('windward-lookout');
    await page.screenshot({ path: `${folder}/${name}-low-water-camera.png` });
    await writeFile(`${folder}/${name}-water-camera.json`, JSON.stringify({ fall, orbit }, null, 2));
    await page.evaluate(() => {
      const game = (window as unknown as { __ROAMER__: DemoGame & { follow: FollowCamera } }).__ROAMER__;
      game.follow.orbit(-4.8, 10); game.follow.orbit(0, -0.82);
    });
  }
  await boot(page, 'windward-lookout');
  const wading = await driveDemo(page, TIDAL_ROUTE.slice(5, 9), 2.7, 40_000, 2, [{ x: -32, z: 4 }]);
  expect(wading.next, JSON.stringify(wading)).toBe(wading.total);
  expect(wading.wetPoints).toEqual([0]);
  expect(wading.maxWater).toBeGreaterThan(0.12); expect(wading.maxWater).toBeLessThan(0.6);
  expect(wading.minimumUp).toBeGreaterThan(0.65); expect(wading.obstructedFrames).toBe(0);
  await page.screenshot({ path: `${folder}/water-camera-shallow-exit.png` });
  await page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(20, 70, 0));
  await expect(page.locator('#surface-trait')).toHaveText('Too deep · reset');
  await page.keyboard.press('KeyR');
  await expect(page.locator('#toast')).toHaveText('Back at Windward Lookout');
  await expect.poll(async () => {
    const state = await demoState(page), start = TIDAL_STARTS[4].position;
    return Math.hypot(state.position.x - start.x, state.position.z - start.z);
  }).toBeLessThan(0.5);
  expect(errors).toEqual([]);
});

test('fresh Island Tracks: solid cairns block the car while the adjacent line stays open', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'saltgrass-landing');
  const a = TIDAL_ROUTE[19], b = TIDAL_ROUTE[20], angle = Math.atan2(b.x - a.x, b.z - a.z);
  const x = a.x + Math.cos(angle) * 3.7, z = a.z - Math.sin(angle) * 3.7;
  const clear = await driveDemo(page, [{ x: x - 4, z: z + 2 }, { x: x + 2, z: z + 2 }], 2.2, 8_000, 0.5);
  expect(clear.next, JSON.stringify(clear)).toBe(clear.total);
  const blocked = await driveDemo(page, [{ x: x - 4, z }, { x: x + 2, z }], 2.2, 8_000, 0.5);
  expect(blocked.next, JSON.stringify(blocked)).toBe(1);
  expect(blocked.state.position.x).toBeGreaterThan(x - 2);
  expect(blocked.state.position.x).toBeLessThan(x - 1);
  expect(Math.abs(blocked.state.speed)).toBeLessThan(0.2);
  expect(blocked.minimumUp).toBeGreaterThan(0.95);
  expect(blocked.obstructedFrames).toBe(0);
  expect(blocked.state.streaming.colliderCount).toBe(15);
  expect(errors).toEqual([]);
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width * 0.35, viewport.height * 0.4); await page.mouse.down();
  await page.mouse.move(viewport.width * 0.6, viewport.height * 0.4, { steps: 12 }); await page.mouse.up();
  await expect.poll(async () => Math.abs((await demoState(page)).camera[2] - blocked.state.position.z)).toBeGreaterThan(10);
  await page.screenshot({ path: `${folder}/solid-cairn-driving.png` });
  await writeFile(`${folder}/cairn-collision.json`, JSON.stringify({ clear, blocked }, null, 2));
});

test('fresh Island Tracks: complete technical journey both ways with real keyboard controls', async ({ page }, info) => {
  test.setTimeout(900_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  const results = [];
  const wetPoints = TIDAL_CHANNELS.map(([a, b]) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }));
  for (const reverse of [false, true]) {
    const result = await driveDemo(page, reverse ? [...TIDAL_ROUTE].reverse() : TIDAL_ROUTE, 2.7, 400_000, 2, wetPoints);
    expect(result.next, JSON.stringify(result)).toBe(result.total);
    expect(result.minimumUp).toBeGreaterThan(0.65); expect(result.maxWater).toBeLessThan(0.6);
    expect(result.wetPoints.sort()).toEqual([0, 1, 2]);
    expect(result.wheelLift).toBeGreaterThan(0.1); expect(result.articulation).toBeGreaterThan(0.08);
    expect(result.suspensionDifference).toBeGreaterThan(0.04);
    expect(result.obstructedFrames).toBe(0);
    expect(result.maxCalls).toBeLessThan(65); expect(result.maxTriangles).toBeLessThan(300_000);
    expect(result.high).toBeGreaterThan(25);
    expect(result.state.recoveryStart).toBe(reverse ? 'harbor-cove' : 'windward-lookout');
    results.push({ reverse, ...result });
    await page.screenshot({ path: `${folder}/full-journey-${reverse ? 'reverse' : 'forward'}.png` });
    await writeFile(`${folder}/driving-evidence.json`, JSON.stringify(results, null, 2));
  }
  expect(errors).toEqual([]);
});

test('fresh Island Tracks: Seabird Climb from the landing to the summit and back', async ({ page }, info) => {
  test.setTimeout(600_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'saltgrass-landing');
  const path = [...TIDAL_ROUTE.slice(19), ...SEABIRD_CLIMB.slice(1)], results = [];
  const folder = `artifacts/island-tracks/${info.project.name}`; await mkdir(folder, { recursive: true });
  for (const reverse of [false, true]) {
    const result = await driveDemo(page, reverse ? [...path].reverse() : path, 2.5, 240_000, 2);
    expect(result.next, JSON.stringify(result)).toBe(result.total);
    expect(result.minimumUp).toBeGreaterThan(0.65); expect(result.maxWater).toBe(0);
    expect(result.low).toBeLessThan(8); expect(result.high).toBeGreaterThan(67);
    expect(result.wheelLift).toBeGreaterThan(0.1); expect(result.articulation).toBeGreaterThan(0.08);
    expect(result.suspensionDifference).toBeGreaterThan(0.04);
    expect(result.obstructedFrames).toBe(0);
    expect(result.maxCalls).toBeLessThan(65); expect(result.maxTriangles).toBeLessThan(300_000);
    expect(result.state.streaming.colliderCount).toBe(15);
    expect(result.state.recoveryStart).toBe(reverse ? 'saltgrass-landing' : 'seabird-summit');
    results.push({ reverse, ...result });
    await page.screenshot({ path: `${folder}/seabird-climb-${reverse ? 'descent' : 'ascent'}.png` });
    await writeFile(`${folder}/seabird-driving-evidence.json`, JSON.stringify(results, null, 2));
  }
  expect(errors).toEqual([]);
});
