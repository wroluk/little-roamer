import type { DemoId, DemoPoint } from './location-demo-terrain';

const p = (x: number, z: number, y: number): DemoPoint => ({ x, y, z });
export const QUARRY_DESCENT = [
  p(65, 0, 6), p(90, 0, 3), p(110, -15, -2), p(128, -40, -10),
  p(122, -70, -18), p(98, -95, -23), p(65, -110, -25), p(30, -112, -19),
  p(-5, -100, -7), p(-35, -110, 0), p(-50, -90, 8), p(-20, -65, 18),
] as const;
export const QUARRY_CHAMBER = p(98, -95, -23);
export const QUARRY_COVER = QUARRY_DESCENT.slice(2, 8);
export const WOODLAND_RIDGE = [
  p(-78, 12, 8), p(-108, 4, 14), p(-120, -12, 14), p(-130, -40, 28),
  p(-112, -70, 40), p(-95, -90, 43), p(-65, -100, 43), p(-35, -82, 32),
  p(-8, -78, 21), p(12, -64, 10), p(5, -35, 4),
] as const;
export const extraDemoRoutes = (id: DemoId): readonly (readonly DemoPoint[])[] => id === 'old-quarry' ? [QUARRY_DESCENT] : [];

export type DemoObstacle = {
  name: string; kind: 'log' | 'root' | 'boulder';
  x: number; z: number; heading: number; radius: number; halfWidth: number; height: number;
};
function obstacle(name: string, kind: DemoObstacle['kind'], route: readonly DemoPoint[], segment: number, t: number,
  radius: number, height: number, halfWidth = 3.2): DemoObstacle {
  const a = route[segment], b = route[segment + 1];
  return { name, kind, x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    heading: Math.atan2(-(b.x - a.x), -(b.z - a.z)), radius, height, halfWidth };
}
export const WOODLAND_OBSTACLES = [
  obstacle('First fallen birch', 'log', WOODLAND_RIDGE, 1, 0.25, 0.22, 0.22),
  obstacle('Diagonal fallen oak', 'log', WOODLAND_RIDGE, 1, 0.8, 0.25, 0.25),
  obstacle('Exposed ridge roots', 'root', WOODLAND_RIDGE, 2, 0.42, 0.16, 0.16, 3),
  obstacle('Mossy shoulder stone', 'boulder', WOODLAND_RIDGE, 5, 0.3, 1.8, 0.52),
  obstacle('Ridge crown boulder', 'boulder', WOODLAND_RIDGE, 5, 0.75, 1.7, 0.48),
] as const;
export const QUARRY_OBSTACLES = [
  obstacle('Entrance rubble', 'boulder', QUARRY_DESCENT, 1, 0.48, 1.8, 0.5),
  obstacle('Chamber approach slab', 'boulder', QUARRY_DESCENT, 4, 0.4, 1.9, 0.54),
  obstacle('Deep Cut broken shelf', 'boulder', QUARRY_DESCENT, 6, 0.45, 2, 0.5),
] as const;
export const demoObstacles = (id: DemoId): readonly DemoObstacle[] =>
  id === 'old-quarry' ? QUARRY_OBSTACLES : id === 'autumn-woods' ? WOODLAND_OBSTACLES : [];
