import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { QUARRY_DESCENT, WOODLAND_RIDGE } from '../../src/game/location-demo-adventures';
import { driveDemo, demoState, type DemoGame } from './location-demo-driving';

for (const id of ['old-quarry', 'autumn-woods'] as const) test(`${id}: tactile trail and vertical journey in both directions`, async ({ page }, info) => {
  test.setTimeout(420_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/?area=${id}&car=modern`);
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 }); await page.locator('#start').click();
  const folder = `artifacts/location-demos/${id}/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  if (id === 'old-quarry') {
    await page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(98, -95, 1.15));
    await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
    await expect.poll(async () => (await demoState(page)).cameraObstructed).toBe(false);
    expect((await demoState(page)).camera[1]).toBeLessThan(-8);
    await page.screenshot({ path: `${folder}/deep-cut-driving-camera.png` });
  }
  const source = id === 'old-quarry' ? QUARRY_DESCENT.slice(1, 9) : WOODLAND_RIDGE.slice(1, 8);
  const results = [];
  for (const reverse of [false, true]) {
    const result = await driveDemo(page, reverse ? [...source].reverse() : source, 3.5, 170_000);
    expect(result.next, JSON.stringify(result)).toBe(result.total);
    expect(result.minimumUp).toBeGreaterThan(0.65);
    expect(result.wheelLift).toBeGreaterThan(0.1); expect(result.articulation).toBeGreaterThan(0.08);
    expect(result.suspensionDifference).toBeGreaterThan(0.04);
    expect(result.maxWater).toBeLessThan(0.45);
    expect(result.maxCalls).toBeLessThan(65); expect(result.maxTriangles).toBeLessThan(300_000);
    if (id === 'old-quarry') expect(result.low).toBeLessThan(-23);
    else { expect(result.low).toBeLessThan(16); expect(result.high).toBeGreaterThan(43); }
    results.push({ reverse, ...result });
    await page.screenshot({ path: `${folder}/tactile-driving-${reverse ? 'reverse' : 'forward'}.png` });
  }
  expect(errors).toEqual([]);
  expect((await demoState(page)).streaming.colliderCount).toBeLessThanOrEqual(10);
  await writeFile(`${folder}/tactile-driving-evidence.json`, JSON.stringify(results, null, 2));
});
