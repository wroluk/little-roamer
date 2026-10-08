import { test, expect, type Page } from '@playwright/test';
import { MARS_ROUTES, CROWN_LOOKOUT, type MarsPoint } from '../../src/game/mars-terrain';
test.use({ deviceScaleFactor: 1 });
type State = { area: string; car: string; position: MarsPoint; rotation: { x: number; y: number; z: number; w: number }; speed: number;
  contacts: number; camera: number[]; cameraObstructed: boolean; terrainTracks: number; geometries: number; streaming: { activeRender: number; activePhysics: number; queued: number } };
type Game = { snapshot(): State; placeVehicle(x: number, z: number, heading: number): Promise<void>; follow: { orbit(yaw: number, pitch: number): void } };
const state = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
async function boot(page: Page, query = '') {
  await page.goto(`/?area=mars${query}`); await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
}
async function drive(page: Page, points: MarsPoint[]) {
  const outcome = await page.evaluate(async path => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    let next = 1; const deadline = performance.now() + 170_000;
    const keys = new Set<string>();
    const setKey = (code: string, pressed: boolean) => {
      if (keys.has(code) === pressed) return;
      if (pressed) keys.add(code); else keys.delete(code);
      window.dispatchEvent(new KeyboardEvent(pressed ? 'keydown' : 'keyup', { code, bubbles: true }));
    };
    try {
      while (next < path.length && performance.now() < deadline) {
        const s = game.snapshot(), target = path[next], dx = target.x - s.position.x, dz = target.z - s.position.z;
        if (Math.hypot(dx, dz) < 4) { next++; continue; }
        const q = s.rotation, fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        const angle = Math.atan2(dx, -dz) - Math.atan2(fx, -fz), error = Math.atan2(Math.sin(angle), Math.cos(angle));
        setKey('KeyD', error > 0.045); setKey('KeyA', error < -0.045); setKey('KeyW', Math.abs(s.speed) < (Math.abs(error) > 0.5 ? 3 : 6));
        await new Promise(requestAnimationFrame);
      }
      return { next, total: path.length, state: game.snapshot() };
    } finally { for (const key of [...keys]) setKey(key, false); }
  }, points);
  expect(outcome.next, JSON.stringify(outcome.state)).toBe(outcome.total);
  expect(outcome.state.streaming.activeRender).toBeLessThanOrEqual(25);
  expect(outcome.state.streaming.activePhysics).toBeLessThanOrEqual(9);
}

test('Mars pilot presents the Scout, habitat and crater views; regional reset and travel work', async ({ page }, info) => {
  test.setTimeout(90_000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  expect((await state(page)).car).toBe('mars-scout');
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.28));
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(10, -4, Math.PI));
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: info.outputPath('habitat.png') });
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(2.4, 0.12));
  await page.waitForTimeout(500);
  await page.screenshot({ path: info.outputPath('scout-front.png') });
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(-2.4, -0.12));
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.PI), CROWN_LOOKOUT);
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  expect((await state(page)).cameraObstructed).toBe(false);
  await page.screenshot({ path: info.outputPath('crown-overlook.png') });
  await page.locator('#reset').click(); await expect(page.locator('#toast')).toHaveText('Back at Crown Crater');
  expect((await state(page)).position.z).toBeCloseTo(-120, 0);
  await page.locator('#pause').click(); await page.locator('#home').click();
  await page.getByRole('radio', { name: 'Classic' }).check();
  expect((await state(page)).car).toBe('classic');
  await page.locator('#area-select').selectOption('valley'); await expect(page.locator('#start')).toBeEnabled();
  expect((await state(page)).area).toBe('valley'); expect(errors).toEqual([]);
});

test('Mars pad stencil, solar mounts and clear north lookout read correctly from the drive', async ({ page }, info) => {
  test.setTimeout(90_000); await boot(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const [name, x, z, heading] of [
    ['habitat-pad', 7, 19, Math.PI],
    ['solar-mounts', -51, 62, 0],
    ['north-lookout-clear', 0, -289, Math.PI / 2],
  ] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    expect((await state(page)).cameraObstructed).toBe(false);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  const lookoutDisplays = await page.evaluate(() => {
    const game = (window as unknown as { __ROAMER__: { vehicle: { model: import('three').Group } } }).__ROAMER__;
    let count = 0;
    game.vehicle.model.parent!.traverse(object => {
      if (object.name !== 'mars-wayfinding-display') return;
      const mesh = object as import('three').Mesh;
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox!;
      if (bounds.max.x > -15 && bounds.min.x < 1 && bounds.max.z > -300 && bounds.min.z < -280) count++;
    });
    return count;
  });
  expect(lookoutDisplays).toBe(0);
  expect(errors).toEqual([]);
});

test('real browser driving completes the habitat-crater return loop', async ({ page }, info) => {
  test.setTimeout(190_000); await boot(page);
  const path = [...MARS_ROUTES[0].points, ...MARS_ROUTES[4].points.slice(1)];
  await drive(page, path);
  expect((await state(page)).terrainTracks).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath('return-loop.png') });
});

test('Mars wayfinding displays render bright lettering on both faces without flicker', async ({ page }, info) => {
  await boot(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const samples = await page.evaluate(async () => {
    const source = await (await fetch('/src/game/mars-landmarks.ts')).text();
    const threeUrl = source.match(/from "([^"\n]*deps\/three[^"\n]*)"/)?.[1];
    if (!threeUrl) throw new Error('Missing Three.js browser module');
    const THREE = await import(/* @vite-ignore */ threeUrl);
    const game = (window as unknown as { __ROAMER__: { vehicle: { model: import('three').Group } } }).__ROAMER__;
    const displays: import('three').Mesh[] = [];
    game.vehicle.model.parent!.traverse(object => {
      if (object.name === 'mars-wayfinding-display') displays.push(object as import('three').Mesh);
    });
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    const target = new THREE.WebGLRenderTarget(512, 192);
    renderer.setRenderTarget(target); renderer.setClearColor(0x000000);
    const scene = new THREE.Scene(), counts: number[][] = [];
    const pixels = new Uint8Array(512 * 192 * 4);
    try {
      for (const display of displays) {
        // Render actual batched game geometry, material and UVs from either approach.
        const mesh = display.clone(); scene.add(mesh);
        display.geometry.computeBoundingBox();
        const centre = display.geometry.boundingBox!.getCenter(new THREE.Vector3());
        const camera = new THREE.OrthographicCamera(-2.625, 2.625, 0.985, -0.985, 0.1, 30);
        const faceCounts: number[] = [];
        for (const side of [-1, 1]) for (const offset of [-0.08, 0, 0.08]) {
          camera.position.set(centre.x + offset, centre.y, centre.z + side * 10); camera.lookAt(centre);
          renderer.render(scene, camera); renderer.readRenderTargetPixels(target, 0, 0, 512, 192, pixels);
          let bright = 0;
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 165 && pixels[i + 1] > 165 && pixels[i + 2] > 150) bright++;
          faceCounts.push(bright);
        }
        counts.push(faceCounts); scene.remove(mesh);
      }
    } finally { target.dispose(); renderer.dispose(); }
    return counts;
  });
  expect(samples.length).toBeGreaterThanOrEqual(1);
  for (const faces of samples) {
    for (const count of faces) expect(count).toBeGreaterThan(2500);
    expect(Math.max(...faces) / Math.min(...faces)).toBeLessThan(1.12);
  }
  for (const [name, z, heading] of [['front', 1, 0], ['back', -25, Math.PI]] as const) {
    await page.evaluate(({ z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(11, z, heading), { z, heading });
    await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.28));
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: info.outputPath(`sign-${name}.png`) });
  }
  expect(errors).toEqual([]);
});

test('real browser driving circles Crown and descends and climbs its floor route', async ({ page }, info) => {
  test.setTimeout(240_000); await boot(page, '&start=crown-crater');
  const rim = MARS_ROUTES[1].points;
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.PI / 2), rim[0]);
  await drive(page, rim);
  const descent = MARS_ROUTES[2].points;
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.atan2(17, -23)), descent[0]);
  await drive(page, descent);
  await page.screenshot({ path: info.outputPath('crater-floor.png') });
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, Math.atan2(24, -12)), descent.at(-1)!);
  await drive(page, [...descent].reverse());
});

test('the reverse pilot circuit connects eastern climb, opposite rim and northern return without reset', async ({ page }, info) => {
  test.setTimeout(210_000); await boot(page);
  const east = [...MARS_ROUTES[4].points].reverse(), rim = [...MARS_ROUTES[1].points].reverse();
  const north = [...MARS_ROUTES[0].points].reverse();
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(0, 8, Math.atan2(-26, 4)));
  await drive(page, [...east, ...rim.slice(1), ...north.slice(1)]);
  await page.screenshot({ path: info.outputPath('reverse-circuit.png') });
});

test('a delayed Mars worker holds the car on solid terrain and resumes after delivery', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const NativeWorker = window.Worker, pending: (() => void)[] = [];
    let held = true;
    (window as unknown as { releaseMars: () => void }).releaseMars = () => { held = false; pending.splice(0).forEach(send => send()); };
    window.Worker = class extends NativeWorker {
      private count = 0;
      private mars: boolean;
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); this.mars = String(url).includes('mars-worker'); }
      postMessage(message: unknown, transfer: Transferable[] = []) {
        const send = () => super.postMessage(message, transfer);
        if (this.mars && ++this.count > 25 && held) pending.push(send); else send();
      }
    };
  });
  await boot(page);
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(93, 20, -Math.PI / 2));
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state(page)).position.x, { timeout: 50_000 }).toBeGreaterThan(284);
  await page.waitForTimeout(1500);
  const held = await state(page);
  expect(held.position.x).toBeLessThan(288);
  expect(held.streaming.queued).toBeGreaterThan(0);
  await page.waitForTimeout(1000);
  expect((await state(page)).position.x).toBeCloseTo(held.position.x, 3);
  expect((await state(page)).position.y).toBeCloseTo(held.position.y, 3);
  await page.evaluate(() => (window as unknown as { releaseMars: () => void }).releaseMars());
  await expect.poll(async () => (await state(page)).position.x, { timeout: 12_000 }).toBeGreaterThan(296);
  await page.keyboard.up('KeyW');
});

test('Mars feedback views keep the camera outside the Scout and show grounded rocks and joined rim terrain', async ({ page }, info) => {
  test.setTimeout(90_000); await boot(page);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.follow.orbit(0, -0.3));
  // The habitat airlock is directly behind the desired follow-camera boom.
  await page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(23, 25.6, 0));
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < 12; i++) {
    const s = await state(page);
    expect(Math.hypot(s.camera[0] - s.position.x, s.camera[1] - s.position.y, s.camera[2] - s.position.z)).toBeGreaterThan(3.5);
    expect(s.cameraObstructed).toBe(false);
    await page.waitForTimeout(40);
  }
  await page.screenshot({ path: info.outputPath('camera-airlock.png') });
  for (const [name, x, z, heading] of [['crown-rocks', -31, -265, 0], ['varied-scatter', 140, 90, Math.PI / 2], ['rim-before', 94, 285, -Math.PI / 2]] as const) {
    await page.evaluate(({ x, z, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(x, z, heading), { x, z, heading });
    await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await state(page)).position.x, { timeout: 15_000 }).toBeGreaterThan(101);
  await page.keyboard.up('KeyW');
  await expect.poll(async () => (await state(page)).streaming.queued).toBe(0);
  expect((await state(page)).cameraObstructed).toBe(false);
  await page.screenshot({ path: info.outputPath('rim-after.png') });
  expect(errors).toEqual([]);
});
