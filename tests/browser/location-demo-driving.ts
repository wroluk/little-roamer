import { expect, type Page } from '@playwright/test';

export type DemoDrivePoint = { x: number; z: number };
export type DemoState = {
  area: string; mode: string; car: string; gravity: number; contacts: number; speed: number; waterDepth: number;
  position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number };
  drawCalls: number; triangles: number; geometries: number; camera: number[]; cameraObstructed: boolean;
  wheelContactLift: number[]; suspension: number[];
  recoveryStart: string | null;
  streaming: { activePhysics: number; colliderCount: number };
};
export type DemoGame = {
  snapshot(): DemoState; placeVehicle(x: number, z: number, heading: number): Promise<void>;
  setPhotoView(view: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov: number }): Promise<void>;
};
export const demoState = (page: Page) => page.evaluate(() => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.snapshot());

export async function driveDemo(page: Page, path: readonly DemoDrivePoint[], speed = 6.5, timeout = 100_000,
  arrivalDistance = 3.2, wetPoints: readonly DemoDrivePoint[] = []) {
  await page.evaluate(path => (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__.placeVehicle(path[0].x, path[0].z,
    Math.atan2(-(path[1].x - path[0].x), -(path[1].z - path[0].z))), path);
  await expect.poll(async () => (await demoState(page)).contacts).toBeGreaterThanOrEqual(2);
  return page.evaluate(async ({ path, speed, timeout, arrivalDistance, wetPoints }) => {
    const game = (window as unknown as { __ROAMER__: DemoGame }).__ROAMER__, keys = new Set<string>();
    const press = (code: string, down: boolean) => {
      if (keys.has(code) === down) return;
      if (down) keys.add(code); else keys.delete(code);
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
    };
    let next = 1, maxWater = 0, maxCalls = 0, maxTriangles = 0, minimumUp = 1;
    let low = Infinity, high = -Infinity, wheelLift = 0, articulation = 0, suspensionDifference = 0, obstructedFrames = 0, frames = 0;
    const deadline = performance.now() + timeout;
    const wet = new Set<number>();
    try {
      while (next < path.length && performance.now() < deadline) {
        const s = game.snapshot(), target = path[next], dx = target.x - s.position.x, dz = target.z - s.position.z;
        maxWater = Math.max(maxWater, s.waterDepth); maxCalls = Math.max(maxCalls, s.drawCalls);
        maxTriangles = Math.max(maxTriangles, s.triangles);
        minimumUp = Math.min(minimumUp, 1 - 2 * (s.rotation.x ** 2 + s.rotation.z ** 2));
        low = Math.min(low, s.position.y); high = Math.max(high, s.position.y);
        wheelLift = Math.max(wheelLift, ...s.wheelContactLift);
        articulation = Math.max(articulation, Math.max(...s.wheelContactLift) - Math.min(...s.wheelContactLift));
        suspensionDifference = Math.max(suspensionDifference, Math.max(...s.suspension) - Math.min(...s.suspension));
        if (s.cameraObstructed) obstructedFrames++;
        if (s.waterDepth > 0.12) wetPoints.forEach((point, index) => {
          if (Math.hypot(s.position.x - point.x, s.position.z - point.z) < 7) wet.add(index);
        });
        frames++;
        if (Math.hypot(dx, dz) < arrivalDistance) { next++; continue; }
        const q = s.rotation, fx = -2 * (q.x * q.z + q.y * q.w), fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        const angle = Math.atan2(dx, -dz) - Math.atan2(fx, -fz), error = Math.atan2(Math.sin(angle), Math.cos(angle));
        press('KeyD', error > 0.06); press('KeyA', error < -0.06);
        press('KeyW', Math.abs(s.speed) < (Math.abs(error) > 0.5 ? Math.min(2.8, speed) : speed));
        await new Promise(requestAnimationFrame);
      }
      return { next, total: path.length, maxWater, maxCalls, maxTriangles, minimumUp,
        low, high, wheelLift, articulation, suspensionDifference, obstructedFrames, frames, wetPoints: [...wet], state: game.snapshot() };
    } finally { for (const key of [...keys]) press(key, false); }
  }, { path, speed, timeout, arrivalDistance, wetPoints });
}
