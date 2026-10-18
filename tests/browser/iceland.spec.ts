import { test, expect, type Page } from '@playwright/test';
import { FORD_PATH, BRIDGE_PATH, ICELAND_LOOP, type IcelandPoint } from '../../src/game/iceland-terrain';
import { ICELAND_RING_ROAD } from '../../src/game/iceland-road';
import { SOLHEIMASANDUR_APPROACH, SOLHEIMASANDUR_WRECK } from '../../src/game/iceland-sandur';
test.use({ deviceScaleFactor: 1 });
type State = { area: string; car: string; mode: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number }; speed: number;
  contacts: number; waterDepth: number; streaming: { activeRender: number; activePhysics: number; queued: number }; cameraObstructed: boolean };
type Game = { snapshot(): State; placeVehicle(x: number, z: number, heading: number): Promise<void>;
  setPhotoView(view: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov: number }): Promise<void> };
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
async function boot(page: Page) { await page.goto('/?area=iceland'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 }); await page.locator('#start').click(); }
async function drive(page: Page, points: IcelandPoint[]) {
  await page.evaluate(async path => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(path[0].x, path[0].z, Math.atan2(path[0].x - path[1].x, path[0].z - path[1].z)), points);
  const result = await page.evaluate(async path => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    let next = 1, depth = 0; const deadline = performance.now() + 150000, keys = new Set<string>();
    const key = (code: string, active: boolean) => { if (keys.has(code) === active) return; if (active) keys.add(code); else keys.delete(code); window.dispatchEvent(new KeyboardEvent(active ? 'keydown' : 'keyup', { code, bubbles: true })); };
    try {
      while (next < path.length && performance.now() < deadline) {
        const s = game.snapshot(), dx = path[next].x - s.position.x, dz = path[next].z - s.position.z;
        depth = Math.max(depth, s.waterDepth);
        if (Math.hypot(dx, dz) < 3) { next++; continue; }
        const q = s.rotation, fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        const a = Math.atan2(dx, -dz) - Math.atan2(fx, -fz), e = Math.atan2(Math.sin(a), Math.cos(a));
        key('KeyD', e > 0.045); key('KeyA', e < -0.045); key('KeyW', Math.abs(s.speed) < (Math.abs(e) > 0.5 ? 3 : 5));
        await new Promise(requestAnimationFrame);
      }
      return { next, depth, state: game.snapshot() };
    } finally { for (const code of [...keys]) key(code, false); }
  }, points);
  expect(result.next, JSON.stringify(result.state)).toBe(points.length);
  expect(result.state.streaming.activeRender).toBeLessThanOrEqual(25);
  expect(result.state.streaming.activePhysics).toBeLessThanOrEqual(9);
  return result;
}
test('Iceland pilot renders waterfall, ford, black coast and resets; switching areas disposes cleanly', async ({ page }, info) => {
  // Fifteen real camera captures plus an area switch can exceed two minutes on Chromium.
  test.setTimeout(180000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); await boot(page);
  expect((await state(page)).area).toBe('iceland');
  expect(await page.evaluate(() => {
    const scene = (window as unknown as { __ROAMER__: { vehicle: { model: import('three').Group } } }).__ROAMER__.vehicle.model.parent!;
    const river = scene.getObjectByName('Skógá · continuous river') as import('three').Mesh;
    const material = river.material as import('three').MeshStandardMaterial;
    return { transparent: material.transparent, opacity: material.opacity, bridge: !!scene.getObjectByName('Skógá · bridge deck') };
  })).toEqual({ transparent: true, opacity: 1, bridge: true });
  await expect(page.locator('input[name="area"][value="iceland"]')).toHaveCount(0);
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => (await state(page)).streaming.queued).toBe(0);
  await page.screenshot({ path: info.outputPath('skogafoss-arrival.png') });
  for (const [name, position, target] of [
    ['upper-river', { x: -508, y: 64, z: 482 }, { x: -535, y: 48, z: 374 }],
    ['river-source', { x: -495, y: 72, z: 155 }, { x: -535, y: 48, z: 100 }],
    ['ground-detail', { x: -477, y: 9, z: 568 }, { x: -497, y: 5, z: 550 }],
    ['black-sand-detail', { x: -465, y: 5, z: 644 }, { x: -488, y: 1, z: 665 }],
    ['river-banks', { x: -527, y: 10, z: 509 }, { x: -535, y: 5.8, z: 480 }],
    ['ford-water', { x: -510, y: 15, z: 600 }, { x: -535, y: 2.8, z: 585 }],
    ['waterfall-front', { x: -550, y: 12, z: 550 }, { x: -535, y: 25, z: 468 }],
    ['waterfall-lip', { x: -513, y: 58, z: 489 }, { x: -535, y: 44, z: 467 }],
    ['road-bend', { x: -590, y: 72, z: 520 }, { x: -590, y: 6, z: 520 }],
    ['waterfall', { x: -504, y: 22, z: 524 }, { x: -535, y: 24, z: 475 }],
    ['river-loop', { x: -466, y: 70, z: 634 }, { x: -535, y: 8, z: 540 }],
    ['black-coast', { x: -466, y: 22, z: 628 }, { x: -480, y: 0, z: 690 }],
    ['river-sea-bed', { x: -513, y: 9, z: 618 }, { x: -537, y: 0.8, z: 647 }],
    ['river-mouth', { x: -503, y: 23, z: 633 }, { x: -538, y: 0, z: 680 }],
    ['river-mouth-low', { x: -537, y: 3, z: 665 }, { x: -538, y: 0, z: 683 }],
  ] as const) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), { position, target, fov: 55 });
    await page.locator('#photo-ui').click();
    await page.waitForTimeout(400); await page.screenshot({ path: info.outputPath(`${name}.png`) });
    await page.keyboard.press('KeyU');
    await page.locator('#photo-exit').click();
    await expect.poll(async () => (await state(page)).mode).toBe('playing');
  }
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-450, 720, 0));
  await page.locator('#reset').click(); await expect.poll(async () => (await state(page)).position.x).toBeCloseTo(-489, 0);
  await page.locator('#pause').click(); await page.locator('#home').click();
  await page.locator('input[name="area"][value="highlands"]').check(); await expect(page.locator('#start')).toBeEnabled();
  expect((await state(page)).area).toBe('highlands'); expect(errors).toEqual([]);
});
test('Iceland ford and road bridge drive in both directions in the real browser', async ({ page }, info) => {
  test.setTimeout(210000); await boot(page);
  for (const reversed of [false, true]) {
    expect((await drive(page, reversed ? [...FORD_PATH].reverse() : FORD_PATH)).depth).toBeGreaterThan(0.1);
    expect((await drive(page, reversed ? [...BRIDGE_PATH].reverse() : BRIDGE_PATH)).depth).toBe(0);
  }
  await page.screenshot({ path: info.outputPath('ford-return.png') });
});
test('Sólheimasandur sandur and wreck are visible and the approach drives both ways', async ({ page }, info) => {
  test.setTimeout(210000); const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); await boot(page);
  const features = await page.evaluate(() => {
    const scene = (window as unknown as { __ROAMER__: { vehicle: { model: import('three').Group } } }).__ROAMER__.vehicle.model.parent!;
    const names: string[] = [];
    scene.traverse(child => { if (child.name.startsWith('Sólheimasandur · plane wreck')) names.push(child.name); });
    return names;
  });
  expect(features.length).toBeGreaterThanOrEqual(7);
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -385, y: 18, z: 616 },
    target: { x: SOLHEIMASANDUR_WRECK.x, y: 5.5, z: SOLHEIMASANDUR_WRECK.z }, fov: 55,
  });
  await page.locator('#photo-ui').click(); await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('solheimasandur-wreck.png') });
  await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  expect((await drive(page, SOLHEIMASANDUR_APPROACH)).depth).toBe(0);
  await page.screenshot({ path: info.outputPath('solheimasandur-arrival.png') });
  expect((await drive(page, [...SOLHEIMASANDUR_APPROACH].reverse())).depth).toBe(0);
  expect(errors).toEqual([]);
});
test('Iceland regional start URLs open the chosen region and reset returns to the nearest start', async ({ page }) => {
  await page.goto('/?area=iceland&start=solheimasandur');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#welcome-title')).toHaveText('Across the black sand.');
  await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).position.x).toBeCloseTo(-388, 0);
  await expect.poll(async () => (await state(page)).position.z).toBeCloseTo(603, 0);
  await page.evaluate(async () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-377, 637, 0));
  await page.locator('#reset').click();
  await expect.poll(async () => (await state(page)).position.x).toBeCloseTo(-388, 0);
  await expect.poll(async () => (await state(page)).position.z).toBeCloseTo(603, 0);
  await page.goto('/?area=iceland&start=skogafoss');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).position.x).toBeCloseTo(-489, 0);
  await expect.poll(async () => (await state(page)).position.z).toBeCloseTo(518, 0);
});
test('coastal turnout and low western Ring Road render with clean verges', async ({ page }, info) => {
  test.setTimeout(90000); await boot(page);
  for (const [name, position, target] of [
    ['coastal-turnout', { x: -405, y: 32, z: 610 }, { x: -443, y: 5, z: 640 }],
    ['west-coastal-road', { x: -679, y: 30, z: 470 }, { x: -640, y: 8, z: 420 }],
    ['road-verge', { x: -590, y: 72, z: 520 }, { x: -590, y: 6, z: 520 }],
  ] as const) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), { position, target, fov: 55 });
    await page.locator('#photo-ui').click();
    await page.waitForTimeout(400); await page.screenshot({ path: info.outputPath(`${name}.png`) });
    await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
    await expect.poll(async () => (await state(page)).mode).toBe('playing');
  }
  // Reproduce the user's straight-sided estuary seam from the supplied view.
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -472.155, y: 33.628, z: 682.205 },
    target: { x: -482.554, y: 25.746, z: 682.558 }, fov: 48,
  });
  await page.locator('#photo-ui').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('river-mouth-user-view.png') });
  await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  await page.evaluate(async () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-492.517, 679.515, 0));
  await expect.poll(async () => (await state(page)).streaming.queued).toBe(0);
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -472.155, y: 33.628, z: 682.205 },
    target: { x: -482.554, y: 25.746, z: 682.558 }, fov: 48,
  });
  await page.locator('#photo-ui').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('river-mouth-user-car.png') });
});
test('Skógá remains visible from the ford approach', async ({ page }, info) => {
  await boot(page);
  await page.evaluate(async () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-510.996, 587.6, 0));
  await expect.poll(async () => (await state(page)).streaming.queued).toBe(0);
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -504.177, y: 12.384, z: 578.062 },
    target: { x: -510.996, y: 6.65, z: 587.6 }, fov: 48,
  });
  await page.locator('#photo-ui').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('river-from-user-view.png') });
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -550, y: 12, z: 550 }, target: { x: -535, y: 3, z: 515 }, fov: 48,
  });
  await page.waitForTimeout(400);
  const image = await page.screenshot({ path: info.outputPath('river-below-fall.png') });
  const waterPixel = await page.evaluate(async png => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    return [...context.getImageData(Math.round(image.width * 0.1), Math.round(image.height * 0.4), 1, 1).data];
  }, image.toString('base64'));
  expect(waterPixel[2], `river should render blue-green below the fall; pixel ${waterPixel}`).toBeGreaterThan(waterPixel[0] + 10);
});
test('Skógá converges into the Skógafoss brink', async ({ page }, info) => {
  await boot(page);
  for (const [name, position, target] of [
    ['brink-oblique', { x: -513, y: 58, z: 489 }, { x: -535, y: 44, z: 467 }],
    ['brink-front', { x: -535, y: 68, z: 501 }, { x: -535, y: 45, z: 464 }],
  ] as const) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), { position, target, fov: 48 });
    await page.locator('#photo-ui').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
    await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
    await expect.poll(async () => (await state(page)).mode).toBe('playing');
  }
});
test('Iceland river route joins both waterfall banks through the ford and bridge', async ({ page }, info) => {
  test.setTimeout(190000); await boot(page); await drive(page, ICELAND_LOOP);
  await page.screenshot({ path: info.outputPath('completed-loop.png') });
});

test('waterfall scenery moves while playing and freezes when paused or reduced motion is enabled', async ({ page }) => {
  await boot(page);
  const sprayHeight = () => page.evaluate(() => {
    const game = (window as unknown as { __ROAMER__: { vehicle: { model: import('three').Group } } }).__ROAMER__;
    return (game.vehicle.model.parent!.getObjectByName('Skógafoss · spray') as import('three').InstancedMesh).instanceMatrix.array[13];
  });
  const initial = await sprayHeight();
  await expect.poll(sprayHeight).not.toBe(initial);
  await page.locator('#pause').click(); const paused = await sprayHeight();
  await page.waitForTimeout(250); expect(await sprayHeight()).toBe(paused);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('#resume').click();
  const reduced = await sprayHeight(); await page.waitForTimeout(250); expect(await sprayHeight()).toBe(reduced);
});

test('Ring Road drives across southern, eastern, northern and western chunk boundaries', async ({ page }, info) => {
  test.setTimeout(180000); await boot(page);
  for (const [name, x, z, reverse] of [['south', 300, 610, false], ['east', 640, 100, true], ['north', -100, -560, false], ['west', -610, 400, true]] as const) {
    let closest = 0;
    for (let i = 1; i < ICELAND_RING_ROAD.length; i++) if (Math.hypot(ICELAND_RING_ROAD[i].x-x, ICELAND_RING_ROAD[i].z-z) < Math.hypot(ICELAND_RING_ROAD[closest].x-x,ICELAND_RING_ROAD[closest].z-z)) closest=i;
    const section = ICELAND_RING_ROAD.slice(Math.max(0, closest-6), closest+7);
    const result = await drive(page, reverse ? section.reverse() : section);
    expect(result.depth).toBe(0); expect(result.state.contacts).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: info.outputPath(`ring-road-${name}.png`) });
  }
});


test('Iceland road HUD distinguishes asphalt, gravel and the river', async ({ page }) => {
  await boot(page);
  for (const [x, z, label] of [[-531, 530, 'Asphalt'], [-490, 555, 'Packed dirt'], [-535, 585, 'Glacial river']] as const) {
    await page.evaluate(async ({ x, z }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, 0), { x, z });
    await expect(page.locator('#surface-label')).toHaveText(label);
  }
});
