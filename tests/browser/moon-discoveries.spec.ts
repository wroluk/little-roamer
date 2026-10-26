import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { MOON_DISCOVERY_APPROACHES } from '../../src/game/moon-discoveries';
import { POSTCARDS, POSTCARD_STORAGE_KEY } from '../../src/game/postcards';

type Point = { x: number; z: number };
type State = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  speed: number; contacts: number; cameraObstructed: boolean; triangles: number; drawCalls: number;
  streaming: { activePhysics: number; queued: number };
};
type Game = { snapshot(): State; placeVehicle(x: number, z: number, heading: number): Promise<void> };

// Same low-speed, real-input steering technique as the existing Moon route cases.
async function drive(page: Page, points: readonly Point[]) {
  const outcome = await page.evaluate(async path => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__, keys = new Set<string>();
    const set = (code: string, on: boolean) => {
      if (keys.has(code) === on) return;
      if (on) keys.add(code); else keys.delete(code);
      window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, bubbles: true }));
    };
    let next = 1, peakPhysics = 0, peakTriangles = 0, peakDrawCalls = 0;
    const deadline = performance.now() + 95_000;
    try {
      while (next < path.length && performance.now() < deadline) {
        const s = game.snapshot(), target = path[next], dx = target.x - s.position.x, dz = target.z - s.position.z;
        peakPhysics = Math.max(peakPhysics, s.streaming.activePhysics);
        peakTriangles = Math.max(peakTriangles, s.triangles); peakDrawCalls = Math.max(peakDrawCalls, s.drawCalls);
        if (Math.hypot(dx, dz) < 3) { next++; continue; }
        const q = s.rotation, fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        const angle = Math.atan2(dx, -dz) - Math.atan2(fx, -fz), error = Math.atan2(Math.sin(angle), Math.cos(angle));
        set('KeyD', error > 0.055); set('KeyA', error < -0.055);
        set('KeyW', Math.abs(s.speed) < (Math.abs(error) > 0.45 ? 2.4 : 4.5));
        await new Promise(requestAnimationFrame);
      }
      return { next, total: path.length, state: game.snapshot(), peakPhysics, peakTriangles, peakDrawCalls };
    } finally { for (const key of [...keys]) set(key, false); }
  }, points);
  expect(outcome.next, JSON.stringify(outcome)).toBe(outcome.total);
  expect(outcome.peakPhysics).toBeLessThanOrEqual(9);
  expect(outcome.state.cameraObstructed).toBe(false);
  expect(outcome.state.streaming.queued).toBe(0);
  return outcome;
}

test.use({ deviceScaleFactor: 1 });

test('Moon journal shows empty secret slots without names or totals and stays separate from Mars', async ({ page }, info) => {
  await page.goto('/?area=moon');
  await expect(page.locator('#open-journal')).toBeEnabled();
  await page.locator('#open-journal').click();
  await expect(page.locator('#journal-grid .journal-card')).toHaveCount(5);
  await expect(page.locator('#journal-grid .journal-card.secret.locked')).toHaveCount(2);
  await expect(page.locator('#journal-grid .journal-card.locked:not(.secret)')).toHaveCount(3);
  for (const card of POSTCARDS.filter(card => card.area === 'moon' && !card.secret))
    await expect(page.locator('#journal-grid')).toContainText(card.name);
  await expect(page.locator('#journal-grid .journal-photo-button')).toHaveCount(0);
  await expect(page.locator('#journal-count')).toHaveText('Your discoveries will be kept here. Take your time exploring.');
  await expect(page.locator('#journal')).not.toContainText('First Landing');
  await expect(page.locator('#journal')).not.toContainText('Stranded Surveyor');
  const folder = `artifacts/moon/discoveries/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/empty-journal.png` });
  await page.locator('#close-journal').click();
  await expect(page.locator('#home-journal-count')).toHaveText('0/5');
  await page.locator('input[name="area"][value="mars"]').check();
  await expect(page.locator('#open-journal')).toBeEnabled();
  await page.locator('#open-journal').click();
  await expect(page.locator('#journal-grid .journal-card')).toHaveCount(10);
  await expect(page.locator('#journal-count')).toHaveText('0 of 10 places visited');
});

test('Moon retains the empty slot after finding one discovery, pausing and reloading', async ({ page }, info) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify([
    { id: 'first-landing', discoveredAt: '2026-10-25T12:00:00.000Z' },
  ])), POSTCARD_STORAGE_KEY);
  await page.goto('/?area=moon');
  await expect(page.locator('#open-journal')).toBeEnabled();
  await page.locator('#open-journal').click();
  const grid = page.locator('#journal-grid');
  await expect(grid.locator('.journal-card')).toHaveCount(5);
  await expect(grid.locator('.secret.locked')).toHaveCount(1);
  await expect(grid).toContainText('First Landing');
  await expect(grid).not.toContainText('Stranded Surveyor');
  await expect(grid.locator('.journal-photo-button')).toHaveCount(1);
  await expect(page.locator('#journal-count')).toHaveText('Keepsakes from your lunar travels.');
  const folder = `artifacts/moon/discoveries/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/partly-discovered-journal.png` });
  await page.locator('#close-journal').click();
  await expect(page.locator('#home-journal-count')).toHaveText('1/5');
  await page.locator('#open-journal').screenshot({ path: info.outputPath('moon-journal-tile.png') });
  await page.locator('#start').click();
  await page.locator('#pause').click(); await page.locator('#pause-journal').click();
  await expect(grid.locator('.secret.locked')).toHaveCount(1);
  await expect(page.locator('#pause-journal-count')).toHaveText('1/5');
  await page.reload(); await expect(page.locator('#open-journal')).toBeEnabled();
  await expect(page.locator('#home-journal-count')).toHaveText('1/5');
  await page.locator('#open-journal').click();
  await expect(grid.locator('.journal-card')).toHaveCount(5);
  await expect(grid.locator('.secret.locked')).toHaveCount(1);
});

test('Moon journal tile counts all five postcards independently of Mars', async ({ page }) => {
  const cards = POSTCARDS.filter(card => card.area === 'moon');
  const marsCard = POSTCARDS.find(card => card.area === 'mars')!;
  await page.addInitScript(({ key, records }) => localStorage.setItem(key, JSON.stringify(records)), {
    key: POSTCARD_STORAGE_KEY,
    records: [...cards, marsCard].map(card => ({ id: card.id, discoveredAt: '2026-10-26T09:00:00.000Z' })),
  });
  await page.goto('/?area=moon');
  await expect(page.locator('#open-journal')).toBeEnabled();
  await expect(page.locator('#home-journal-count')).toHaveText('5/5');
  await page.locator('input[name="area"][value="mars"]').check();
  await expect(page.locator('#home-journal-count')).toHaveText('1/10');
  await page.locator('input[name="area"][value="moon"]').check();
  await expect(page.locator('#home-journal-count')).toHaveText('5/5');
});

for (const [index, id, name] of [
  [0, 'first-landing', 'First Landing'], [1, 'stranded-surveyor', 'Stranded Surveyor'],
] as const) test(`${name} reveals on a real Nomad approach, is driveable both ways and persists`, async ({ page }, info) => {
  test.setTimeout(230_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const folder = `artifacts/moon/discoveries/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  await page.goto('/?area=moon&car=lunar-nomad');
  await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
  const evidence = [];
  for (const reverse of [false, true]) {
    const path: readonly Point[] = reverse ? [...MOON_DISCOVERY_APPROACHES[index].points].reverse()
      : MOON_DISCOVERY_APPROACHES[index].points;
    const a = path[0], b = path[1], heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    await page.evaluate(({ a, heading }) => (window as unknown as { __ROAMER__: Game }).__ROAMER__
      .placeVehicle(a.x, a.z, heading), { a, heading });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game })
      .__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    if (!reverse) {
      await expect(page.locator('#postcard-notice')).toBeHidden();
      await page.screenshot({ path: `${folder}/${id}-departure.png` });
    }
    evidence.push({ reverse, ...await drive(page, path) });
    await page.screenshot({ path: `${folder}/${id}-${reverse ? 'return' : 'arrival'}.png` });
    const records = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]') as { id: string }[], POSTCARD_STORAGE_KEY);
    expect(records.map(record => record.id)).toEqual([id]);
  }
  await page.locator('#pause').click(); await page.locator('#pause-journal').click();
  await expect(page.locator('#journal-grid .journal-card')).toHaveCount(5);
  await expect(page.locator('#journal-grid')).toContainText(name);
  await expect(page.locator('#journal-grid .locked')).toHaveCount(4);
  await page.locator('#journal-grid .journal-photo-button').click();
  await expect(page.locator('#postcard-detail-image')).toHaveJSProperty('naturalWidth', 800);
  await expect(page.locator('#postcard-detail-title')).toHaveText(name);
  if (id === 'stranded-surveyor') await expect(page.locator('#postcard-detail-note')).toHaveText(
    'Before Earthview Base was built, this surveyor searched for a safe crossing of Silver Rille. Its maps reached home; the rover never did.');
  await page.screenshot({ path: `${folder}/${id}-journal.png` });
  await page.reload();
  await expect(page.locator('#open-journal')).toBeEnabled(); await page.locator('#open-journal').click();
  await expect(page.locator('#journal-grid .journal-card')).toHaveCount(5);
  await expect(page.locator('#journal-grid')).toContainText(name);
  await writeFile(`${folder}/${id}-drives.json`, JSON.stringify(evidence, null, 2));
  expect(errors).toEqual([]);
});

test('Basalt Sea excludes the removed outer circles and unlocks on the retained western and eastern flats', async ({ page }, info) => {
  test.setTimeout(120_000);
  const card = POSTCARDS.find(card => card.id === 'sea-turned-to-stone')!;
  const folder = `artifacts/moon/discoveries/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const evidence = [];
  for (const [side, xs] of [['west', [-40, -25, -10]], ['east', [170, 155, 140]]] as const) {
    await page.goto('/?area=moon&car=lunar-nomad');
    await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
    await page.evaluate(({ x, heading }) => (window as unknown as { __ROAMER__: Game })
      .__ROAMER__.placeVehicle(x, 235, heading), { x: xs[0], heading: side === 'west' ? -Math.PI / 2 : Math.PI / 2 });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game })
      .__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await expect(page.locator('#postcard-notice')).toBeHidden();
    const outside = await drive(page, xs.map(x => ({ x, z: 235 })));
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), POSTCARD_STORAGE_KEY)).toEqual([]);
    await expect(page.locator('#postcard-notice')).toBeHidden();
    await page.screenshot({ path: `${folder}/basalt-sea-${side}-excluded.png` });
    const outcome = await drive(page, [
      { x: outside.state.position.x, z: outside.state.position.z },
      { x: side === 'west' ? 10 : 120, z: 235 },
    ]);
    expect(Math.hypot(outcome.state.position.x - card.x, outcome.state.position.z - card.z)).toBeGreaterThan(40);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]')
      .map((record: { id: string }) => record.id), POSTCARD_STORAGE_KEY)).toEqual([card.id]);
    await page.screenshot({ path: `${folder}/basalt-sea-${side}-flat.png` });
    evidence.push({ side, outside, ...outcome });
    await page.evaluate(key => localStorage.removeItem(key), POSTCARD_STORAGE_KEY);
  }
  await writeFile(`${folder}/basalt-sea-flat-drives.json`, JSON.stringify(evidence, null, 2));
});

for (const [id, points] of [
  ['small-blue-home', [{ x: -73.5, z: -180 }, { x: -59.25, z: -190 }, { x: -45, z: -200 }]],
  ['window-into-darkness', [{ x: -248, z: 160 }, { x: -247, z: 172 }, { x: -246, z: 184 }, { x: -245, z: 192 }]],
  ['sea-turned-to-stone', [{ x: 95, z: 235 }, { x: 80, z: 235 }, { x: 65, z: 235 }]],
] as const) test(`${id} scenic postcard unlocks by real driving in both directions and persists`, async ({ page }, info) => {
  test.setTimeout(160_000);
  const card = POSTCARDS.find(card => card.id === id)!;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/moon/discoveries/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const evidence = [];
  for (const reverse of [false, true]) {
    await page.goto('/?area=moon&car=lunar-nomad');
    await expect(page.locator('#start')).toBeEnabled(); await page.locator('#start').click();
    const path: readonly Point[] = reverse ? [...points].reverse() : points;
    const a = path[0], b = path[1], heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    await page.evaluate(({ a, heading }) => (window as unknown as { __ROAMER__: Game })
      .__ROAMER__.placeVehicle(a.x, a.z, heading), { a, heading });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __ROAMER__: Game })
      .__ROAMER__.snapshot().contacts)).toBeGreaterThanOrEqual(2);
    await expect(page.locator('#postcard-notice')).toBeHidden();
    evidence.push({ reverse, ...await drive(page, path) });
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]')
      .map((record: { id: string }) => record.id), POSTCARD_STORAGE_KEY)).toEqual([id]);
    await page.screenshot({ path: `${folder}/${id}-${reverse ? 'reverse' : 'arrival'}.png` });
    await page.locator('#pause').click(); await page.locator('#pause-journal').click();
    await expect(page.locator('#journal-grid .journal-card')).toHaveCount(5);
    await expect(page.locator('#journal-grid .secret.locked')).toHaveCount(2);
    await page.getByRole('button', { name: `Enlarge ${card.name} postcard` }).click();
    await expect(page.locator('#postcard-detail-image')).toHaveJSProperty('naturalWidth', 800);
    await expect(page.locator('#postcard-detail-note')).toHaveText(card.note);
    await page.screenshot({ path: `${folder}/${id}-journal.png` });
    await page.reload(); await expect(page.locator('#open-journal')).toBeEnabled();
    await page.locator('#open-journal').click();
    await expect(page.getByRole('button', { name: `Enlarge ${card.name} postcard` })).toBeVisible();
    await page.evaluate(key => localStorage.removeItem(key), POSTCARD_STORAGE_KEY);
  }
  await writeFile(`${folder}/${id}-drives.json`, JSON.stringify(evidence, null, 2));
  expect(errors).toEqual([]);
});
