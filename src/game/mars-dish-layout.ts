import type { MarsPoint, MarsRoute } from './mars-terrain';
import { dishPosition, regionLocal, DISH_PLACEMENT } from './mars-layout';

const START: MarsPoint = { x: 130, z: -201, y: 23 };
const SITE: MarsPoint = { x: 238, z: -262, y: 52 };
const SUMMIT: MarsPoint = { x: 210, z: -262, y: 52 };
const LOOKOUT: MarsPoint = { x: 161, z: -284, y: 54 };
const SOUTH_EXIT: MarsPoint = { x: 245, z: -80, y: 8 };
export const DISH_START = dishPosition(START), DISH_SITE = dishPosition(SITE);
export const DISH_SUMMIT = dishPosition(SUMMIT), DISH_LOOKOUT = dishPosition(LOOKOUT);
export const DISH_SOUTH_EXIT = dishPosition(SOUTH_EXIT);
// Inside the level service island, clear of the circuit and the main tripod.
export const DISH_RELAYS = [
  { x: 227, z: -274, height: 8, yaw: -0.3 },
  { x: 238, z: -280, height: 6.5, yaw: 0.15 },
  { x: 251, z: -274, height: 5.5, yaw: 0.4 },
].map(dishPosition);

const localRoutes: MarsRoute[] = [
  { name: 'Crown to Dish saddle', shoulder: 24, points: [
    START,
  ] },
  { name: 'Dish switchbacks', points: [
    START, { x: 147, z: -189, y: 23 }, { x: 171, z: -179, y: 25 }, { x: 199, z: -174, y: 28 },
    { x: 228, z: -176, y: 31 }, { x: 246, z: -185, y: 34 }, { x: 249, z: -198, y: 36 },
    { x: 239, z: -209, y: 38 }, { x: 216, z: -213, y: 40 }, { x: 190, z: -214, y: 42 },
    { x: 173, z: -221, y: 44 }, { x: 170, z: -233, y: 46 }, { x: 181, z: -244, y: 48 },
    { x: 199, z: -252, y: 50 }, SUMMIT,
  ] },
  { name: 'Dish summit circuit', points: Array.from({ length: 25 }, (_, i) => {
    const angle = Math.PI - i * Math.PI / 12;
    return { x: SITE.x + 28 * Math.cos(angle), z: SITE.z + 28 * Math.sin(angle), y: 52 };
  }) },
  { name: 'Dish western lookout', points: [SUMMIT, { x: 195, z: -278, y: 54 }, { x: 176, z: -286, y: 54 }, LOOKOUT] },
  { name: 'Dish eastern ledge', halfWidth: 3.8, surface: 'rock', points: [
    { x: 228, z: -176, y: 31 }, { x: 255, z: -166, y: 32 }, { x: 278, z: -175, y: 35 },
    { x: 292, z: -194, y: 40 }, { x: 294, z: -216, y: 45 }, { x: 286, z: -239, y: 49 },
    { x: 266, z: -262, y: 52 },
  ] },
  { name: 'Dish southern descent', points: [
    { x: 255, z: -166, y: 32 }, { x: 263, z: -148, y: 27 }, { x: 259, z: -125, y: 19 },
    { x: 250, z: -101, y: 12 }, SOUTH_EXIT,
  ] },
];
export const DISH_ROUTES: MarsRoute[] = localRoutes.map(route => ({ ...route, points: route.points.map(dishPosition) }));
DISH_ROUTES[0].points = [
  { x: 75, z: -195, y: 26 }, { x: 110, z: -225, y: 24 }, { x: 145, z: -272, y: 20 },
  { x: 155, z: -325, y: 18 }, { x: 190, z: -365, y: 20 }, { x: 240, z: -378, y: 22 }, DISH_START,
];

const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const dishRegionWeight = (x: number, z: number) => {
  ({ x, z } = regionLocal(x, z, DISH_PLACEMENT));
  return (1 - smooth((Math.hypot((x - 228) / 88, (z + 235) / 110) - 0.8) / 0.55)) * smooth((x - 100) / 35);
};

/** Three unequal shelves and wind-cut gullies support the road rather than leaving it on a thin embankment. */
export function dishRidgeHeight(x: number, z: number, base: number): number {
  ({ x, z } = regionLocal(x, z, DISH_PLACEMENT));
  const weight = smooth((x - 100) / 35);
  const radius = Math.hypot((x - 229) / 71, (z + 240) / 83);
  let h = base + weight * (9 * (1 - smooth((radius - 1.02) / 0.35))
    + 15 * (1 - smooth((radius - 0.68) / 0.38)) + 19 * (1 - smooth((radius - 0.35) / 0.4)));
  const gully = (cx: number, cz: number, rx: number, rz: number) => Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
  h -= weight * (6 * gully(177, -265, 13, 33) + 5 * gully(274, -234, 12, 30));
  // Wide supporting shoulders keep the lookout and ledge attached to the ridge.
  const west = 1 - smooth((Math.hypot((x - 197) / 57, (z + 274) / 38) - 0.5) / 0.65);
  h += (54 - h) * west;
  const east = 1 - smooth((Math.hypot((x - 278) / 32, (z + 214) / 68) - 0.4) / 0.65);
  const shelf = 31 + smooth((-z - 170) / 85) * 21;
  h += Math.max(0, shelf - h) * east;
  h += 9 * gully(177, -226, 24, 27);
  // A broad, solid service terrace carries the dish feet and its surrounding circuit.
  const pad = Math.hypot(x - SITE.x, z - SITE.z);
  h += (SITE.y - h) * (1 - smooth((pad - 31) / 15));
  return h;
}
