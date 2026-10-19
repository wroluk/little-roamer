import { LAGOON_VIEW_ROUTE, GLACIER_VIEW_ROUTE, JOKULSA_CROSSING, JOKULSA_BRIDGE } from '../../src/game/iceland-lagoon';
import { SKOGA_BRIDGE } from '../../src/game/iceland-layout';
import { LOMAGNUPUR_ROUTE, LOMAGNUPUR_START } from '../../src/game/iceland-skeidararsandur';
import { test, expect, type Page } from '@playwright/test';
import { FORD_PATH, BRIDGE_PATH, ICELAND_LOOP, type IcelandPoint } from '../../src/game/iceland-terrain';
import { ICELAND_RING_ROAD } from '../../src/game/iceland-road';
import { SOLHEIMASANDUR_APPROACH, SOLHEIMASANDUR_WRECK } from '../../src/game/iceland-sandur';
import { REYNIS_BEACH_PATH, REYNIS_CAVE, REYNIS_SHORE_ROUTE } from '../../src/game/iceland-reynisfjara';
test.use({ deviceScaleFactor: 1 });
type State = { area: string; car: string; mode: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number }; speed: number;
  contacts: number; waterDepth: number; streaming: { activeRender: number; activePhysics: number; queued: number }; cameraObstructed: boolean;
  velocity: { x: number; y: number; z: number }; suspension: (number | null)[] };
type Game = { snapshot(): State; placeVehicle(x: number, z: number, heading: number): Promise<void>;
  setPhotoView(view: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov: number }): Promise<void> };
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
async function boot(page: Page) { await page.goto('/?area=iceland'); await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 }); await page.locator('#start').click(); }
async function drive(page: Page, points: IcelandPoint[], budgetMs = 150000) {
  await page.evaluate(async path => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(path[0].x, path[0].z, Math.atan2(path[0].x - path[1].x, path[0].z - path[1].z)), points);
  const result = await page.evaluate(async ({ path, budgetMs }) => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    let next = 1, depth = 0, verticalSpeed = 0, minimumSuspension = Infinity, maximumSuspension = -Infinity;
    const deadline = performance.now() + budgetMs, keys = new Set<string>();
    const key = (code: string, active: boolean) => { if (keys.has(code) === active) return; if (active) keys.add(code); else keys.delete(code); window.dispatchEvent(new KeyboardEvent(active ? 'keydown' : 'keyup', { code, bubbles: true })); };
    try {
      while (next < path.length && performance.now() < deadline) {
        const s = game.snapshot(), dx = path[next].x - s.position.x, dz = path[next].z - s.position.z;
        depth = Math.max(depth, s.waterDepth);
        if (s.contacts >= 2 && Math.abs(s.speed) > 1) {
          verticalSpeed = Math.max(verticalSpeed, Math.abs(s.velocity.y));
          for (const length of s.suspension) if (length !== null) {
            minimumSuspension = Math.min(minimumSuspension, length); maximumSuspension = Math.max(maximumSuspension, length);
          }
        }
        if (Math.hypot(dx, dz) < 3) { next++; continue; }
        const q = s.rotation, fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        const a = Math.atan2(dx, -dz) - Math.atan2(fx, -fz), e = Math.atan2(Math.sin(a), Math.cos(a));
        key('KeyD', e > 0.045); key('KeyA', e < -0.045); key('KeyW', Math.abs(s.speed) < (Math.abs(e) > 0.5 ? 3 : 5));
        await new Promise(requestAnimationFrame);
      }
      return { next, depth, verticalSpeed, suspensionRange: maximumSuspension - minimumSuspension, state: game.snapshot() };
    } finally { for (const code of [...keys]) key(code, false); }
  }, { path: points, budgetMs });
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
test('Sólheimasandur wreck sits in the sand with an attached rear stabilizer', async ({ page }, info) => {
  await page.goto('/?area=iceland&start=solheimasandur');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await page.locator('#start').click();
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -382, y: 8, z: 628 }, target: { x: -368, y: 5.5, z: 630 }, fov: 48,
  });
  await page.locator('#photo-ui').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('solheimasandur-wreck-rear-low.png') });
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -385, y: 18, z: 616 }, target: { x: -365, y: 5.5, z: 635 }, fov: 55,
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('solheimasandur-wreck-overhead.png') });
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


test('Iceland HUD distinguishes asphalt, gravel, river, sea and dark sand', async ({ page }) => {
  await boot(page);
  for (const [x, z, label] of [[-531, 530, 'Asphalt'], [-490, 555, 'Packed dirt'], [-535, 585, 'Glacial river'],
    [-450, 740, 'Deep sea'], [-535, 680, 'Deep sea'],
    [-388, 603, 'Coastal sand']] as const) {
    await page.evaluate(async ({ x, z }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, 0), { x, z });
    await expect(page.locator('#surface-label')).toHaveText(label);
    if (label === 'Asphalt')
      expect(await page.locator('#surface i').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(114, 119, 117)');
  }
  expect(await page.locator('#surface i').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(74, 77, 74)');
});

test('Reynisfjara columns and sea stacks render beside a drivable beach approach', async ({ page }, info) => {
  test.setTimeout(210000); await page.goto('/?area=iceland&start=reynisfjara');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('body')).toContainText('Reynisfjara');
  await page.locator('#start').click();
  expect((await state(page)).position.x).toBeCloseTo(REYNIS_BEACH_PATH[1].x, 0);
  const features = await page.evaluate(() => {
    const scene = (window as unknown as { __ROAMER__: { vehicle: { model: import('three').Group } } }).__ROAMER__.vehicle.model.parent!;
    return { wall: !!scene.getObjectByName('Reynisfjara · basalt column wall'),
      stacks: [1, 2, 3].map(i => !!scene.getObjectByName(`Reynisdrangar · sea stack ${i}`)) };
  });
  expect(features).toEqual({ wall: true, stacks: [true, true, true] });
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -291, y: 20, z: 687 }, target: { x: -185, y: 12, z: 679 }, fov: 62,
  });
  await page.locator('#photo-ui').click(); await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('reynisfjara-beach.png') });
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -263, y: 76, z: 691 }, target: { x: -166, y: 3, z: 690 }, fov: 55,
  });
  await page.waitForTimeout(400); await page.screenshot({ path: info.outputPath('reynisfjara-overhead.png') });
  await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  expect((await drive(page, REYNIS_BEACH_PATH)).depth).toBe(0);
  expect((await drive(page, [...REYNIS_BEACH_PATH].reverse())).depth).toBe(0);
});

test('Reynisfjara has a dry driveable beach and shallow transparent shore water', async ({ page }, info) => {
  test.setTimeout(210000); await boot(page);
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -250, y: 10, z: 699 }, target: { x: -210, y: 12, z: 661 }, fov: 58,
  });
  await page.locator('#photo-ui').click(); await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('reynisfjara-beach-shelf.png') });
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -226, y: 13, z: 688 }, target: { x: -194, y: 1, z: 727 }, fov: 58,
  });
  await page.waitForTimeout(400); await page.screenshot({ path: info.outputPath('reynisfjara-shallows.png') });
  await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), {
    position: { x: -211, y: 11, z: 693 }, target: { x: REYNIS_CAVE.x, y: 10, z: 662 }, fov: 58,
  });
  await page.waitForTimeout(400); await page.screenshot({ path: info.outputPath('halsanefshellir-cave.png') });
  for (const view of [
    { name: 'cave-feedback', position: { x: -141.765, y: 4.19, z: 701.388 }, target: { x: -149.181, y: 4.225, z: 690.023 } },
    { name: 'east-shallows-feedback', position: { x: -108.346, y: 7.267, z: 702.721 }, target: { x: -98.463, y: 1.909, z: 709.421 } },
    { name: 'cliff-feedback', position: { x: -230, y: 8, z: 615 }, target: { x: -205, y: 29, z: 470 } },
  ]) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView({ ...view, fov: 48 }), view);
    await page.waitForTimeout(400); await page.screenshot({ path: info.outputPath(`${view.name}.png`) });
  }

  await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  expect((await drive(page, REYNIS_SHORE_ROUTE)).depth).toBe(0);
  expect((await drive(page, [...REYNIS_SHORE_ROUTE].reverse())).depth).toBe(0);
  const cavePath = [{ x: REYNIS_CAVE.x, z: 685 }, { x: REYNIS_CAVE.x, z: 671 },
    { x: REYNIS_CAVE.x, z: 659 }, { x: REYNIS_CAVE.x, z: 652 }];
  expect((await drive(page, cavePath)).depth).toBe(0);
  expect((await drive(page, [...cavePath].reverse())).depth).toBe(0);
  await page.evaluate(async () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(-220, 719, 0));
  await expect.poll(async () => (await state(page)).waterDepth).toBeGreaterThan(0.1);
  expect((await state(page)).waterDepth).toBeLessThan(0.7);
  await expect(page.locator('#surface-label')).toHaveText('Coastal shallows');
});


test('Lómagnúpur cliff and sandur have a connected gravel route and regional reset', async ({ page }, info) => {
  test.setTimeout(600000);
  await page.goto('/?area=iceland&start=lomagnupur');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#welcome-title')).toHaveText('At the edge of the sandur.');
  await page.locator('#start').click();
  for (const view of [
    { name: 'lomagnupur-arrival', position: { x: -115, y: 10, z: 640 }, target: { x: -5, y: 58, z: 480 } },
    { name: 'lomagnupur-prow', position: { x: 91, y: 10, z: 620 }, target: { x: -5, y: 55, z: 480 } },
    { name: 'sandur-east', position: { x: 42, y: 18, z: 558 }, target: { x: 194, y: 5, z: 584 } },
  ]) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView({ position: view.position, target: { x: view.position.x + (view.target.x - view.position.x) * 0.05, y: view.position.y + (view.target.y - view.position.y) * 0.05, z: view.position.z + (view.target.z - view.position.z) * 0.05 }, fov: 55 }), view);
    if (await page.locator('#photo-ui').isVisible()) await page.locator('#photo-ui').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: info.outputPath(`${view.name}.png`) });
  }
  await page.keyboard.press('KeyU');
  await page.locator('#photo-exit').click();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  expect((await drive(page, LOMAGNUPUR_ROUTE, 210000)).depth).toBe(0);
  expect((await drive(page, [...LOMAGNUPUR_ROUTE].reverse(), 210000)).depth).toBe(0);
  const road = ICELAND_RING_ROAD.filter(p => p.x >= -160 && p.x <= 340 && p.z > 580);
  for (let i = 0; i < road.length - 1; i += 18)
    expect((await drive(page, road.slice(i, i + 19))).depth).toBe(0);
  await page.evaluate(async () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(100, 578, 0));
  await page.locator('#reset').click();
  await expect.poll(async () => (await state(page)).position.x).toBeCloseTo(LOMAGNUPUR_START.x, 0);
  await expect.poll(async () => (await state(page)).position.z).toBeCloseTo(LOMAGNUPUR_START.z, 0);
});


test('Jökulsárlón renders its calving front, outlet bridge and Lómagnúpur gateway', async ({ page }, info) => {
  test.setTimeout(180000);
  await page.goto('/?area=iceland&start=jokulsarlon');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await page.locator('#start').click();
  for (const view of [
    { name: 'ring-road-detail', position: { x: 187, y: 8, z: 614 }, target: { x: 270, y: 5, z: 612 } },
    { name: 'north-coast-shallows', position: { x: 0, y: 60, z: -710 }, target: { x: 80, y: 0, z: -711 } },
    { name: 'west-coast-shallows', position: { x: -682, y: 30, z: 280 }, target: { x: -680, y: 0, z: 360 } },
    { name: 'east-coast-shallows', position: { x: 706, y: 45, z: 200 }, target: { x: 710, y: 0, z: 280 } },
    { name: 'lomagnupur-front', position: { x: -5, y: 12, z: 610 }, target: { x: -5, y: 60, z: 480 } },
    { name: 'beach-ice', position: { x: 454, y: 3, z: 674 }, target: { x: 463, y: 0.6, z: 679 } },
    { name: 'lagoon-arrival', position: { x: 410, y: 10, z: 623 }, target: { x: 485, y: 15, z: 530 } },
    { name: 'outlet-bridge', position: { x: 451, y: 13, z: 685 }, target: { x: 500, y: 6, z: 650 } },
    { name: 'calving-front', position: { x: 393, y: 12, z: 540 }, target: { x: 479, y: 23, z: 483 } },
    { name: 'gateway-glacier', position: { x: 108, y: 10, z: 563 }, target: { x: 158, y: 30, z: 493 } },
    { name: 'lomagnupur-ridge', position: { x: 88, y: 12, z: 605 }, target: { x: -10, y: 60, z: 460 } },
  ]) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView({
      position: view.position, target: { x: view.position.x + (view.target.x - view.position.x) * 0.05,
        y: view.position.y + (view.target.y - view.position.y) * 0.05, z: view.position.z + (view.target.z - view.position.z) * 0.05 }, fov: 55,
    }), view);
    if (await page.locator('#photo-ui').isVisible()) await page.locator('#photo-ui').click();
    await page.waitForTimeout(500); await page.screenshot({ path: info.outputPath(`${view.name}.png`) });
  }
  await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
 });

test('Jökulsárlón outlet bridge and shores drive both directions and reset from deep water', async ({ page }) => {
  test.setTimeout(480000);
  await page.goto('/?area=iceland&start=jokulsarlon');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await page.locator('#start').click();
  for (const path of [JOKULSA_CROSSING, LAGOON_VIEW_ROUTE, GLACIER_VIEW_ROUTE]) {
    expect((await drive(page, path)).depth).toBe(0);
    expect((await drive(page, [...path].reverse())).depth).toBe(0);
  }
  await page.evaluate(async () => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(485, 560, 0));
  await expect.poll(async () => (await state(page)).waterDepth).toBeGreaterThan(1);
  await expect(page.locator('#surface-label')).toHaveText('Glacial lagoon');
  await page.locator('#reset').click();
  await expect.poll(async () => (await state(page)).position.x).toBeCloseTo(411, 0);
  await expect.poll(async () => (await state(page)).waterDepth).toBe(0);
});

test('Iceland road shoulders blend into sandur and heath at driving and raised views', async ({ page }, info) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  expect(await page.evaluate(() => {
    const scene = (window as unknown as { __ROAMER__: { vehicle: { model: import('three').Group } } }).__ROAMER__.vehicle.model.parent!;
    const shoulders = scene.getObjectByName('Iceland · gravel shoulders') as import('three').Mesh;
    const material = shoulders.material as import('three').MeshStandardMaterial;
    return { transparent: material.transparent, depthWrite: material.depthWrite, rgba: shoulders.geometry.attributes.color.itemSize };
  })).toEqual({ transparent: true, depthWrite: false, rgba: 4 });
  for (const view of [
    { name: 'road-sandur-driving', position: { x: 187, y: 6, z: 610 }, target: { x: 270, y: 5, z: 613 } },
    { name: 'road-sandur-raised', position: { x: 180, y: 27, z: 607 }, target: { x: 270, y: 4, z: 614 } },
    { name: 'road-sandur-reverse', position: { x: 330, y: 22, z: 616 }, target: { x: 240, y: 4, z: 612 } },
    { name: 'road-heath-driving', position: { x: -610, y: 8.5, z: 520 }, target: { x: -577, y: 6.3, z: 530 } },
    { name: 'road-heath-raised', position: { x: -616, y: 28, z: 518 }, target: { x: -577, y: 6.3, z: 530 } },
    { name: 'bridge-east-cable-clearance', position: { x: 581, y: 25, z: 675 }, target: { x: 525, y: 5, z: 650 } },
    { name: 'bridge-east-road-height', position: { x: 577, y: 6.5, z: 650 }, target: { x: 500, y: 4.8, z: 650 } },
  ]) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView({
      position: view.position, target: { x: view.position.x + (view.target.x - view.position.x) * 0.05,
        y: view.position.y + (view.target.y - view.position.y) * 0.05, z: view.position.z + (view.target.z - view.position.z) * 0.05 }, fov: 55,
    }), view);
    if (await page.locator('#photo-ui').isVisible()) await page.locator('#photo-ui').click();
    await page.waitForTimeout(500); await page.screenshot({ path: info.outputPath(`${view.name}.png`) });
  }
  expect(errors).toEqual([]);
});

test('Iceland road edges and bridge thresholds move the suspension and roadside markers are solid', async ({ page }, info) => {
  test.setTimeout(600000); await boot(page);
  const crossings = [
    [{ x: 180, z: 597 }, { x: 180, z: 623 }],
    ...[SKOGA_BRIDGE, JOKULSA_BRIDGE].flatMap(bridge => [-1, 1].map(side => {
      const x = bridge.x + side * bridge.length / 2;
      return [{ x: x - 6, z: bridge.z }, { x: x + 6, z: bridge.z }];
    })),
  ];
  for (const path of crossings)
    for (const reverse of [false, true]) {
      const result = await drive(page, reverse ? [...path].reverse() : path);
      expect(result.depth).toBe(0);
      expect(result.suspensionRange).toBeGreaterThan(0.05);
      expect(result.verticalSpeed).toBeGreaterThan(0.2);
    }
  await page.screenshot({ path: info.outputPath('bridge-threshold-return.png') });
  const marker = await page.evaluate(async () => {
    const game = (window as unknown as { __ROAMER__: Game & { vehicle: import('../../src/game/vehicle').Vehicle } }).__ROAMER__;
    const markers = game.vehicle.model.parent!.getObjectByName('Iceland · yellow road markers') as import('three').InstancedMesh;
    const matrix = markers.matrix.clone();
    let selected = -1, distance = Infinity;
    for (let i = 0; i < markers.count; i++) {
      markers.getMatrixAt(i, matrix);
      const d = Math.hypot(matrix.elements[12] - 180, matrix.elements[14] - 618);
      if (d < distance) { distance = d; selected = i; }
    }
    if (selected < 0) throw new Error('No roadside marker found');
    markers.getMatrixAt(selected, matrix);
    const x = matrix.elements[12], y = matrix.elements[13], z = matrix.elements[14];
    await game.placeVehicle(x - 5, z, -Math.PI / 2);
    return { x, y, z };
  });
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  const contact = await page.evaluate(async marker => {
    const car = (window as unknown as { __ROAMER__: { vehicle: import('../../src/game/vehicle').Vehicle } }).__ROAMER__.vehicle;
    const ray = {
      origin: { x: marker.x - 1, y: marker.y, z: marker.z }, dir: { x: 1, y: 0, z: 0 },
      pointAt(t: number) { return { x: this.origin.x + t, y: this.origin.y, z: this.origin.z }; },
    };
    const hit = car.world.castRay(ray, 2, true, undefined, undefined, undefined, car.body);
    if (!hit || hit.timeOfImpact < 0.9 || hit.timeOfImpact >= 1) throw new Error('No solid collider at the visible marker');
    let contacted = false;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    try {
      const deadline = performance.now() + 30000;
      while (!contacted && performance.now() < deadline) {
        const position = car.body.translation();
        if (Math.hypot(position.x - marker.x, position.z - marker.z) < 2) {
          car.world.contactPairsWith(car.body.collider(0), other => {
            if (other.handle !== hit.collider.handle) return;
            car.world.contactPair(car.body.collider(0), other, manifold => {
              if (manifold.numContacts() > 0) contacted = true;
            });
          });
        }
        await new Promise(requestAnimationFrame);
      }
      return contacted;
    } finally { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true })); }
  }, marker);
  expect(contact, 'the chassis contacts a solid roadside marker rather than passing through it').toBe(true);
  await page.screenshot({ path: info.outputPath('road-marker-contact.png') });
});

test('Jökulsárlón lagoon and beach have visible translucent ice among opaque pieces', async ({ page }, info) => {
  test.setTimeout(120000);
  await page.goto('/?area=iceland&start=jokulsarlon');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 }); await page.locator('#start').click();
  const groups = await page.evaluate(() => {
    const scene = (window as unknown as { __ROAMER__: { vehicle: import('../../src/game/vehicle').Vehicle } }).__ROAMER__.vehicle.model.parent!;
    return ['Jökulsárlón · iceberg ', 'Jökulsárlón · beach ice '].map(prefix => {
      let clear = 0, opaque = 0;
      scene.traverse(object => {
        if (!object.name.startsWith(prefix)) return;
        const mesh = object as import('three').Mesh, material = mesh.material as import('three').MeshPhysicalMaterial;
        const shore = prefix.includes('beach ice');
        const opticalRange = shore
          ? material.opacity >= 0.88 && material.opacity <= 0.95 && material.transmission >= 0.35 && material.transmission <= 0.55
          : material.opacity <= 0.75 && material.transmission > 0.6;
        if (material.transparent && opticalRange && mesh.renderOrder === 2) clear++;
        else opaque++;
      });
      return { clear, opaque };
    });
  });
  for (const group of groups) { expect(group.clear).toBeGreaterThanOrEqual(2); expect(group.opaque).toBeGreaterThan(0); }
  for (const view of [
    { name: 'lagoon-translucent-ice', position: { x: 445, y: 3, z: 592 }, target: { x: 485, y: 1, z: 551 } },
    { name: 'lagoon-large-varied-ice', position: { x: 510, y: 4, z: 607 }, target: { x: 491, y: 1, z: 574 } },
    { name: 'beach-translucent-ice', position: { x: 454, y: 2.5, z: 674 }, target: { x: 463, y: 0.6, z: 679 } },
    { name: 'beach-large-varied-ice', position: { x: 541, y: 4, z: 690 }, target: { x: 534, y: 1, z: 681.6 } },
    { name: 'beach-ice-raised', position: { x: 541, y: 13, z: 686 }, target: { x: 534, y: 1, z: 681.6 } },
  ]) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView({
      position: view.position, target: { x: view.position.x + (view.target.x - view.position.x) * 0.05,
        y: view.position.y + (view.target.y - view.position.y) * 0.05, z: view.position.z + (view.target.z - view.position.z) * 0.05 }, fov: 55,
    }), view);
    if (await page.locator('#photo-ui').isVisible()) await page.locator('#photo-ui').click();
    await page.waitForTimeout(500); await page.screenshot({ path: info.outputPath(`${view.name}.png`) });
  }
});

test('Iceland final outlet shape and road bridge approaches', async ({ page }, info) => {
  test.setTimeout(240000);
  await page.goto('/?area=iceland&start=jokulsarlon');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 });
  await page.locator('#start').click();
  for (const view of [
    { name: 'outlet-mouth', position: { x: 533, y: 12, z: 678 }, target: { x: 500, y: 0, z: 706 } },
    { name: 'outlet-overhead', position: { x: 500, y: 75, z: 694 }, target: { x: 500, y: 0, z: 697 } },
  ]) {
    await page.evaluate(async view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView({
      position: view.position, target: { x: view.position.x + (view.target.x - view.position.x) * 0.05,
        y: view.position.y + (view.target.y - view.position.y) * 0.05, z: view.position.z + (view.target.z - view.position.z) * 0.05 }, fov: 55,
    }), view);
    if (await page.locator('#photo-ui').isVisible()) await page.locator('#photo-ui').click();
    await page.waitForTimeout(500); await page.screenshot({ path: info.outputPath(`${view.name}.png`) });
  }
  await page.keyboard.press('KeyU'); await page.locator('#photo-exit').click();
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  expect((await drive(page, JOKULSA_CROSSING)).depth).toBe(0);
  expect((await drive(page, [...JOKULSA_CROSSING].reverse())).depth).toBe(0);
});
