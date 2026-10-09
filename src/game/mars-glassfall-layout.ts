import type { MarsPoint, MarsRoute } from './mars-terrain';
import { DISH_SOUTH_EXIT } from './mars-dish-layout';
import { glassfallPosition, regionLocal, GLASSFALL_PLACEMENT } from './mars-layout';

const START: MarsPoint = { x: 195, z: -45, y: 8 };
const SCAR = { x: 282, z: -17 };
const LOOKOUT: MarsPoint = { x: 314, z: -64, y: 18 };
const SOUTH: MarsPoint = { x: 260, z: 128, y: 9 };
export const GLASSFALL_START = glassfallPosition(START), GLASSFALL_SCAR = glassfallPosition(SCAR);
export const GLASSFALL_LOOKOUT = glassfallPosition(LOOKOUT), GLASSFALL_SOUTH = glassfallPosition(SOUTH);
export const GLASSFALL_FLOW_BOUNDS = { min: glassfallPosition({ x: 165, z: -30 }), max: glassfallPosition({ x: 300, z: 100 }) };
export const GLASSFALL_DECOR_BOUNDS = { min: glassfallPosition({ x: 145, z: -80 }), max: glassfallPosition({ x: 345, z: 125 }) };
const localRoutes: MarsRoute[] = [
  { name: 'Glassfall Dish connection', shoulder: 24, points: [START] },
  { name: 'Glassfall firm circuit', points: [START,
    { x: 211, z: -64, y: 8 }, { x: 238, z: -71, y: 8 }, { x: 269, z: -63, y: 10 },
    { x: 296, z: -43, y: 12 }, { x: 311, z: -16, y: 12 }, { x: 311, z: 16, y: 11 },
    { x: 299, z: 46, y: 9 }, { x: 286, z: 86, y: 8 }, { x: 247, z: 100, y: 8 },
    { x: 205, z: 102, y: 8 }, { x: 178, z: 80, y: 8 }, { x: 159, z: 42, y: 8 },
    { x: 160, z: 8, y: 8 }, { x: 179, z: -20, y: 8 }, START,
  ] },
  { name: 'Glassfall overlook', points: [{ x: 269, z: -63, y: 10 }, { x: 291, z: -68, y: 14 }, LOOKOUT] },
  { name: 'Glassfall outpost spoke', shoulder: 24, points: [START] },
  { name: 'Glassfall southern exit', points: [{ x: 247, z: 100, y: 8 }, { x: 260, z: 108, y: 9 }, SOUTH] },
];
export const GLASSFALL_ROUTES: MarsRoute[] = localRoutes.map(route => ({ ...route, points: route.points.map(glassfallPosition) }));
GLASSFALL_ROUTES[0].points = [
  DISH_SOUTH_EXIT, { x: 425, z: -278, y: 10 }, { x: 460, z: -300, y: 14 },
  { x: 505, z: -292, y: 12 }, { x: 548, z: -256, y: 10 }, { x: 549, z: -218, y: 9 },
  { x: 525, z: -194, y: 8 }, { x: 477, z: -170, y: 8 },
  glassfallPosition({ x: 211, z: -64, y: 8 }), GLASSFALL_START,
];
GLASSFALL_ROUTES[3].points = [
  { x: 42, z: 20, y: 6 }, { x: 100, z: 24, y: 7 }, { x: 155, z: -10, y: 11 },
  { x: 202, z: -5, y: 15 }, { x: 235, z: -50, y: 18 }, { x: 290, z: -82, y: 15 },
  { x: 345, z: -76, y: 10 }, GLASSFALL_START,
];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export function glassfallWeight(x: number, z: number) {
  ({ x, z } = regionLocal(x, z, GLASSFALL_PLACEMENT));
  return 1 - smooth((Math.hypot((x - 246) / 100, (z - 10) / 116) - 0.65) / 0.95);
}
export function glassfallHeight(x: number, z: number, base: number) {
  const weight = glassfallWeight(x, z);
  if (!weight) return base;
  ({ x, z } = regionLocal(x, z, GLASSFALL_PLACEMENT));
  const dx = x - SCAR.x, dz = z - SCAR.z;
  const r = Math.hypot(dx / 22, dz / 19), angle = Math.atan2(dz, dx);
  // A broken impact lip opens southwest into a low, gently corrugated ejecta fan.
  const breach = Math.exp(-(((angle - 2.3) / 0.48) ** 2));
  const lip = 8 * Math.exp(-(((r - 1) / 0.25) ** 2)) * (1 - 0.75 * breach);
  const floor = 2.8 * (1 - smooth((r - 0.3) / 0.5));
  const fan = 0.5 * Math.sin(x * 0.055 + z * 0.04) + 0.35 * Math.sin(z * 0.13);
  let h = base + (8 + fan + lip - floor - base) * weight;
  // A broad eastern buttress carries the overlook into the perimeter shoulder.
  const lookout = 1 - smooth((Math.hypot((x - 310) / 31, (z + 67) / 25) - 0.35) / 0.65);
  h += (18 - h) * lookout;
  return h;
}

const RAYS = [
  { x: 177, z: 35, width: 8.5, bend: -6 },
  { x: 207, z: 82, width: 11, bend: 5 },
  { x: 263, z: 86, width: 8, bend: -5 },
];
/** Positive inside the tapered melt ribbons, negative outside. */
export function glassfallRibbonMargin(x: number, z: number): number {
  ({ x, z } = regionLocal(x, z, GLASSFALL_PLACEMENT));
  // A shared melt pool joins all three ribbons beneath the impact-rock cluster.
  let margin = 10 - Math.hypot(x - SCAR.x, z - SCAR.z);
  for (const ray of RAYS) {
    const dx = ray.x - SCAR.x, dz = ray.z - SCAR.z, length = Math.hypot(dx, dz);
    const px = x - SCAR.x, pz = z - SCAR.z;
    const t = (px * dx + pz * dz) / (length * length);
    const across = (px * dz - pz * dx) / length - Math.sin(t * Math.PI) * ray.bend;
    const width = ray.width * Math.sqrt(Math.max(0, Math.sin(Math.max(0, Math.min(1, t)) * Math.PI)));
    margin = Math.max(margin, Math.min(width - Math.abs(across), (t - 0.07) * length, (0.98 - t) * length));
  }
  return Math.min(margin, x - 165, 300 - x, z + 30, 100 - z) * GLASSFALL_PLACEMENT.scale;
}
