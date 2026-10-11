import { expect, test } from '@playwright/test';
import { glassfallPosition } from '../../src/game/mars-layout';

test.use({ deviceScaleFactor: 1 });
test('Scout spins below the glass impact lip instead of climbing out', async ({ page }, info) => {
  test.setTimeout(60_000);
  await page.goto('/?area=mars&start=glassfall-plain');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#start').click();
  const start = glassfallPosition({ x: 278, z: -8 });
  const result = await page.evaluate(async start => {
    const game = (window as unknown as { __ROAMER__: {
      placeVehicle(x: number, z: number, heading: number): Promise<void>;
      snapshot(): { position: { x: number; z: number }; surface: string; contacts: number };
    } }).__ROAMER__;
    await game.placeVehicle(start.x, start.z, Math.atan2(0.18, -1));
    let progress = 0, glassFrames = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    try {
      const until = performance.now() + 10_000;
      while (performance.now() < until) {
        const s = game.snapshot();
        progress = Math.max(progress, ((s.position.x - start.x) * -0.18 + s.position.z - start.z) / Math.hypot(0.18, 1));
        if (s.surface === 'mars-glass') glassFrames++;
        await new Promise(requestAnimationFrame);
      }
      return { progress, glassFrames, state: game.snapshot() };
    } finally { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true })); }
  }, start);
  expect(result.glassFrames).toBeGreaterThan(30);
  expect(result.progress).toBeLessThan(12);
  await page.screenshot({ path: info.outputPath('glass-lip-no-climb.png') });
  await info.attach('glass-attempt', { body: JSON.stringify(result), contentType: 'application/json' });
});
