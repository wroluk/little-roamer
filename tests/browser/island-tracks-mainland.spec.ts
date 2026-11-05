import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  CLIFF_WADE, HEATHER_CUT, MAINLAND_LOOP, SMUGGLERS_APPROACH,
  TIDAL_STARTS, WEST_BEACH, WEST_WADE,
} from '../../src/game/tidal-terrain';
import { demoState, driveDemo } from './location-demo-driving';

for (const [model, reverse] of [['modern', false], ['classic', true]] as const) {
  for (const [name, route, speed, timeout, entry, exit] of [
    ['mainland circuit', MAINLAND_LOOP, 6, 300_000, 'harbor-cove', reverse ? 'heather-cut' : 'west-overlook'],
    ['Heather Cut', HEATHER_CUT, 5, 120_000, reverse ? 'west-overlook' : 'heather-cut',
      reverse ? 'heather-cut' : 'west-overlook'],
    ['cliff-foot water ride', CLIFF_WADE, 2.5, 160_000, reverse ? 'north-cove' : 'west-beach',
      reverse ? 'west-beach' : 'north-cove'],
  ] as const) {
    test(`mainland acceptance: ${model} ${name} ${reverse ? 'reverse' : 'forward'}`, async ({ page }, info) => {
      test.setTimeout(timeout + 35_000);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/?area=island-tracks&start=${entry}&car=${model}`);
      await expect(page.locator('#start')).toBeEnabled();
      await page.locator('#start').click();
      const path = reverse ? [...route].reverse() : [...route];
      const result = await driveDemo(page, path, speed, timeout, 2);
      const folder = `artifacts/island-tracks/${info.project.name}/mainland-acceptance`;
      await mkdir(folder, { recursive: true });
      await writeFile(`${folder}/${model}-${name.replaceAll(' ', '-')}.json`, JSON.stringify(result, null, 2));
      await page.screenshot({ path: `${folder}/${model}-${name.replaceAll(' ', '-')}.png` });
      expect(result.next, JSON.stringify(result)).toBe(result.total);
      expect(result.minimumUp).toBeGreaterThan(0.65);
      expect(result.obstructedFrames).toBe(0);
      expect(result.maxTriangles).toBeLessThan(300_000);
      expect(result.maxCalls).toBeLessThan(65);
      expect(result.state.streaming.colliderCount).toBe(28);
      expect(result.state.recoveryStart).toBe(exit);
      if (name === 'cliff-foot water ride') {
        expect(result.maxWater).toBeGreaterThan(0.15);
        expect(result.maxWater).toBeLessThan(0.6);
      } else expect(result.maxWater).toBe(0);
      if (name !== 'mainland circuit') {
        expect(result.wheelLift).toBeGreaterThan(0.1);
        expect(result.articulation).toBeGreaterThan(0.08);
        expect(result.suspensionDifference).toBeGreaterThan(0.04);
      }
      if (name === 'Heather Cut') expect(result.high).toBeGreaterThan(26);
      const destination = TIDAL_STARTS.find(start => start.id === exit);
      if (!destination) throw new Error(`Unknown expected mainland arrival: ${exit}`);
      for (const keyboard of [true, false]) {
        if (keyboard) await page.keyboard.press('KeyR');
        else await page.locator('#reset').click();
        await expect.poll(async () => (await demoState(page)).recoveryStart).toBe(exit);
        await expect.poll(async () => {
          const { position } = await demoState(page);
          return Math.hypot(position.x - destination.position.x, position.z - destination.position.z);
        }).toBeLessThan(0.5);
        await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
      }
      expect(errors).toEqual([]);
    });
  }
}

test('mainland acceptance: beach wet play and hidden discovery retain free-roaming recovery', async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=island-tracks&start=west-beach&car=classic');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  const arc = Array.from({ length: 10 }, (_, i) => ({
    x: WEST_WADE.x + Math.cos(Math.PI + i * Math.PI / 6) * 9,
    z: WEST_WADE.z + Math.sin(Math.PI + i * Math.PI / 6) * 9,
  }));
  const beach = await driveDemo(page, [
    WEST_BEACH, { x: -600, z: -103 }, { x: -601, z: -114 }, ...arc,
    { x: -600, z: -113 }, { x: -606, z: -105 }, { x: -600, z: -98 }, WEST_BEACH,
  ], 2.5, 90_000, 2);
  expect(beach.next, JSON.stringify(beach)).toBe(beach.total);
  expect(beach.maxWater).toBeGreaterThan(0.1);
  expect(beach.maxWater).toBeLessThan(0.5);
  expect(beach.state.recoveryStart).toBe('west-beach');
  const nook = await driveDemo(page, [
    ...SMUGGLERS_APPROACH, { x: -607, z: 24 }, { x: -605, z: 28 },
    { x: -610, z: 33 }, { x: -617, z: 30 }, { x: -620, z: 24 },
    ...[...SMUGGLERS_APPROACH].reverse().slice(1),
  ], 2, 65_000, 2);
  expect(nook.next, JSON.stringify(nook)).toBe(nook.total);
  expect(nook.maxWater).toBeGreaterThan(0.02);
  expect(nook.maxWater).toBeLessThan(0.5);
  expect(nook.state.recoveryStart).toBe('west-beach');
  const folder = `artifacts/island-tracks/${info.project.name}/mainland-acceptance`;
  await mkdir(folder, { recursive: true });
  await writeFile(`${folder}/beach-and-nook.json`, JSON.stringify({ beach, nook }, null, 2));
  await page.screenshot({ path: `${folder}/beach-and-nook.png` });
  for (const result of [beach, nook]) {
    expect(result.minimumUp).toBeGreaterThan(0.65);
    expect(result.obstructedFrames).toBe(0);
    expect(result.maxTriangles).toBeLessThan(300_000);
    expect(result.maxCalls).toBeLessThan(65);
  }
  expect(errors).toEqual([]);
});
