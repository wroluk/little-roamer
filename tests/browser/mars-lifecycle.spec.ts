import { expect, test } from '@playwright/test';
import { MARS_STARTS } from '../../src/game/mars-terrain';

test.use({ deviceScaleFactor: 1 });
test('nine-region travel, car switches and returning home release Mars resources', async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?area=mars');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  type State = { geometries: number; textures: number; car: string; area: string;
    streaming: { activeRender: number; activePhysics: number; queued: number } | null };
  type Game = { snapshot(): State; placeVehicle(x: number, z: number, heading: number): Promise<void>;
    waitForStreamingIdle(): Promise<void> };
  const state = () => page.evaluate(() => (window as unknown as { __ROAMER__: Game }).__ROAMER__.snapshot());
  const samples: { id: string; pass: number; state: State }[] = [];
  // The lower habitat camera initially hides retained distant-landmark meshes.
  // Warm their one-time GPU uploads before comparing two complete round trips.
  for (const pass of [0, 1, 2]) for (const start of MARS_STARTS) {
    await page.evaluate(async p => {
      const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
      await game.placeVehicle(p.x, p.z, 0); await game.waitForStreamingIdle();
      // Count uploaded resources after the teleported camera has rendered, not
      // in the same frame as streaming completion.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }, start.position);
    const s = await state();
    expect(s.streaming?.activeRender).toBeLessThanOrEqual(25);
    expect(s.streaming?.activePhysics).toBeLessThanOrEqual(9);
    expect(s.streaming?.queued).toBe(0);
    if (pass === 2) {
      const first = samples.find(sample => sample.id === start.id && sample.pass === 1)!;
      expect(s.geometries).toBeLessThanOrEqual(first.state.geometries + 2);
      expect(s.textures).toBeLessThanOrEqual(first.state.textures + 1);
    }
    samples.push({ id: start.id, pass, state: s });
  }
  await page.locator('#pause').click(); await page.locator('#home').click();
  await page.locator('input[name="area"][value="valley"]').check();
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const baseline = await state();
  for (const car of ['classic', 'modern']) {
    await page.locator(`input[name="car"][value="${car}"]`).check();
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    await page.locator('input[name="area"][value="mars"]').check();
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    expect((await state()).car).toBe('mars-scout');
    await page.locator('input[name="area"][value="valley"]').check();
    await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
    expect((await state()).car).toBe(car);
  }
  await expect(page.locator('#mars-car-option')).toBeHidden();
  await expect(page.locator('#start')).toBeEnabled();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const returned = await state();
  expect(returned.geometries).toBeLessThanOrEqual(baseline.geometries + 2);
  expect(returned.textures).toBeLessThanOrEqual(baseline.textures + 1);
  expect(errors).toEqual([]);
  await info.attach('region-resource-samples', { body: JSON.stringify(samples, null, 2), contentType: 'application/json' });
});
