import { expect, type Page } from '@playwright/test';
import type { MarsPoint } from '../../src/game/mars-terrain';

type State = { position: MarsPoint; rotation: { x: number; y: number; z: number; w: number }; speed: number;
  streaming: { activeRender: number; activePhysics: number } };
type Game = { snapshot(): State };

/** Drive through the actual animation loop, keyboard controls, physics and streaming. */
export async function driveMarsRoute(page: Page, points: MarsPoint[]) {
  const outcome = await page.evaluate(async path => {
    const game = (window as unknown as { __ROAMER__: Game }).__ROAMER__;
    let next = 1; const deadline = performance.now() + 175_000;
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
