import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { DEMOS, DEMO_IDS, demoGroundHeight, type DemoId } from '../../src/game/location-demo-terrain';

import { driveDemo as drive, demoState as state, type DemoDrivePoint as Point, type DemoGame as Game } from './location-demo-driving';
const point = (x: number, z: number): Point => ({ x, z });
const critical: Record<DemoId, readonly (readonly Point[])[]> = {
  'red-canyon': [[point(-60, 25), point(-60, -25)], [point(-40, -65), point(20, -65)]],
  'old-quarry': [[point(45, -45), point(65, 0), point(25, 28)], [point(-20, 20), point(-55, 47)]],
  'dune-sea': [[point(-60, -35), point(-10, -55)], [point(3, -85), point(30, -104), point(59, -94)]],
  'autumn-woods': [[point(30, -25), point(45, -25), point(60, -25)], [point(65, 45), point(25, 45)]],
  'island-tracks': [[point(0, 15), point(55, 15)], [point(-64, -20), point(-58, 3), point(-44, 21)]],
};
const views: Record<DemoId, readonly (readonly [string, number, number, number, number, number, number])[]> = {
  'red-canyon': [['split-spire', -59, 37, 3, -59, 27, 14], ['echo-arch', -30, -65, 3, -20, -65, 15],
    ['mesa-return', 80, 12, 3, 71, 17, 18]],
  'old-quarry': [['spiral-cut', -90, 29, 3, -83, 22, 28], ['iron-giant', -57, -18, 3, -48, -24, 23],
    ['blue-seam', 50, -35, 3, 44, -43, 14],
    ['deep-cut-entrance', 98, -5, 2.4, 106, -12, demoGroundHeight('old-quarry', 106, -12) + 2.5],
    ['deep-cut-bend', 127, -43, 2.4, 125, -53, demoGroundHeight('old-quarry', 125, -53) + 2.4],
    ['deep-cut-chamber', 100, -94, 2.4, 90, -98, -20.6]],
  'dune-sea': [['white-pan', -65, 40, 3, -59, 32, 5], ['crescent-crown', 30, -107, 3, 32, -97, 19],
    ['stone-window', -61, -35, 3, -51, -39, 10]],
  'autumn-woods': [['cathedral-grove', -78, 12, 3, -74, 3, 15], ['copper-falls', 44, -40, 3, 50, -48, 2.5],
    ['foxglove-bridge', 15, 45, 3, 25, 45, 8],
    ['fallen-timber', -105, 9, 2, -111, 1, demoGroundHeight('autumn-woods', -111, 1) + 0.5],
    ['ridge-boulders', -99, -90, 2, -89, -93, 44],
    ['ridge-crown', -63, -100, 3.5, -53, -98, 44]],
  'island-tracks': [['needle-lighthouse', -97, 40, 3, -100, 30, 9], ['tide-gate', -12, 15, 3, -2, 15, 7],
    ['islet-return', 80, 27, 3, 70, 26, 6]],
};
for (const id of DEMO_IDS) test(`${id}: actual views, reset and world switching`, async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const folder = `artifacts/location-demos/${id}/${info.project.name}`; await mkdir(folder, { recursive: true });
  await page.goto(`/?area=${id}&car=classic`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  const first = await state(page), start = DEMOS[id].loop[0];
  expect(first.area).toBe(id); expect(first.car).toBe('classic'); expect(first.gravity).toBe(-18);
  expect(first.position.x).toBeCloseTo(start.x, 0); expect(first.position.z).toBeCloseTo(start.z, 0);
  if (id === 'dune-sea') await expect(page.locator('#surface-label')).toHaveText('Firm salt pan');
  await page.screenshot({ path: `${folder}/start-driving.png` });
  const destination = critical[id][0].at(-1)!;
  await page.evaluate(p => (window as unknown as { __ROAMER__: Game }).__ROAMER__.placeVehicle(p.x, p.z, 0), destination);
  await page.locator('#reset').click();
  await expect.poll(async () => Math.hypot((await state(page)).position.x - start.x, (await state(page)).position.z - start.z)).toBeLessThan(0.5);
  for (const [name, x, z, lift, tx, tz, ty] of views[id]) {
    const position = { x, y: demoGroundHeight(id, x, z) + lift, z }, target = { x: tx, y: ty, z: tz };
    await page.evaluate(view => (window as unknown as { __ROAMER__: Game }).__ROAMER__.setPhotoView(view), { position, target, fov: 60 });
    await page.getByRole('button', { name: 'Hide UI', exact: true }).click();
    await page.waitForTimeout(250); await page.screenshot({ path: `${folder}/${name}.png` });
    await page.keyboard.press('Escape'); await expect.poll(async () => (await state(page)).mode).toBe('playing');
  }
  await page.locator('#pause').click(); await page.locator('#home').click();
  for (const demo of DEMO_IDS) await expect(page.locator(`input[name="area"][value="${demo}"]`)).toHaveCount(1);
  const before = await state(page);
  await page.locator('input[name="area"][value="moon"]').check(); await expect(page.locator('#start')).toBeEnabled();
  expect((await state(page)).gravity).toBe(-3);
  await page.locator(`input[name="area"][value="${id}"]`).check(); await expect(page.locator('#start')).toBeEnabled();
  const after = await state(page);
  expect(after.gravity).toBe(-18); expect(after.car).toBe('classic');
  expect(after.geometries).toBeLessThanOrEqual(before.geometries + 2);
  expect(after.streaming.colliderCount).toBeLessThanOrEqual(10); expect(errors).toEqual([]);
  await writeFile(`${folder}/render-budget.json`, JSON.stringify(after, null, 2));
});

for (const id of DEMO_IDS) test(`${id}: two-way signature drives with real keyboard controls`, async ({ page }, info) => {
  test.setTimeout(360_000);
  await page.goto(`/?area=${id}&car=classic`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  await expect.poll(async () => (await state(page)).contacts).toBeGreaterThanOrEqual(2);
  const folder = `artifacts/location-demos/${id}/${info.project.name}`; await mkdir(folder, { recursive: true });
  const results = [];
  for (const reverse of [false, true]) for (const segment of critical[id]) {
    const path = reverse ? [...segment].reverse() : segment, result = await drive(page, path);
    expect(result.next, JSON.stringify(result)).toBe(result.total);
    expect(result.minimumUp).toBeGreaterThan(0.65); expect(result.maxWater).toBeLessThan(0.45);
    if (id === 'autumn-woods' && path.some(p => p.x === 45 && p.z === -25)) expect(result.maxWater).toBeGreaterThan(0.1);
    expect(result.maxCalls).toBeLessThan(65); expect(result.maxTriangles).toBeLessThan(300_000);
    results.push({ reverse, path, ...result });
  }
  await page.screenshot({ path: `${folder}/feature-driving.png` });
  await writeFile(`${folder}/driving-evidence.json`, JSON.stringify(results, null, 2));
});
