import type { MarsPoint, MarsRoute } from './mars-terrain';
import { DISH_SOUTH_EXIT } from './mars-dish-layout';

export const GLASSFALL_START: MarsPoint = { x: 195, z: -45, y: 8 };
export const GLASSFALL_SCAR = { x: 282, z: -17 };
export const GLASSFALL_LOOKOUT: MarsPoint = { x: 314, z: -64, y: 18 };
export const GLASSFALL_SOUTH: MarsPoint = { x: 260, z: 128, y: 9 };
export const GLASSFALL_ROUTES: MarsRoute[] = [
  { name: 'Glassfall Dish connection', points: [DISH_SOUTH_EXIT, { x: 238, z: -71, y: 8 }, { x: 211, z: -64, y: 8 }, GLASSFALL_START] },
  { name: 'Glassfall firm circuit', points: [GLASSFALL_START,
    { x: 211, z: -64, y: 8 }, { x: 238, z: -71, y: 8 }, { x: 269, z: -63, y: 10 },
    { x: 296, z: -43, y: 12 }, { x: 311, z: -16, y: 12 }, { x: 311, z: 16, y: 11 },
    { x: 299, z: 46, y: 9 }, { x: 277, z: 71, y: 8 }, { x: 247, z: 86, y: 8 },
    { x: 217, z: 81, y: 8 }, { x: 191, z: 63, y: 8 }, { x: 174, z: 38, y: 8 },
    { x: 171, z: 8, y: 8 }, { x: 179, z: -20, y: 8 }, GLASSFALL_START,
  ] },
  { name: 'Glassfall glass crossing', halfWidth: 5.5, surface: 'mars-glass', points: [
    { x: 171, z: 8, y: 8 }, { x: 194, z: 20, y: 8 }, { x: 217, z: 36, y: 8 },
    { x: 242, z: 49, y: 8 }, { x: 270, z: 58, y: 8 }, { x: 299, z: 46, y: 9 },
  ] },
  { name: 'Glassfall overlook', points: [{ x: 269, z: -63, y: 10 }, { x: 291, z: -68, y: 14 }, GLASSFALL_LOOKOUT] },
  { name: 'Glassfall outpost spoke', points: [{ x: 42, z: 20, y: 6 }, { x: 80, z: 22, y: 6 }, { x: 113, z: 4, y: 7 }, { x: 146, z: -20, y: 8 }, GLASSFALL_START] },
  { name: 'Glassfall southern exit', points: [{ x: 247, z: 86, y: 8 }, { x: 260, z: 108, y: 9 }, GLASSFALL_SOUTH] },
];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export function glassfallWeight(x: number, z: number) {
  return 1 - smooth((Math.hypot((x - 246) / 82, (z - 10) / 97) - 0.7) / 0.55);
}
export function glassfallHeight(x: number, z: number, base: number) {
  const weight = glassfallWeight(x, z);
  if (!weight) return base;
  const dx = x - GLASSFALL_SCAR.x, dz = z - GLASSFALL_SCAR.z;
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
  // A shared melt pool joins all three ribbons beneath the impact-rock cluster.
  let margin = 10 - Math.hypot(x - GLASSFALL_SCAR.x, z - GLASSFALL_SCAR.z);
  for (const ray of RAYS) {
    const dx = ray.x - GLASSFALL_SCAR.x, dz = ray.z - GLASSFALL_SCAR.z, length = Math.hypot(dx, dz);
    const px = x - GLASSFALL_SCAR.x, pz = z - GLASSFALL_SCAR.z;
    const t = (px * dx + pz * dz) / (length * length);
    const across = (px * dz - pz * dx) / length - Math.sin(t * Math.PI) * ray.bend;
    const width = ray.width * Math.sqrt(Math.max(0, Math.sin(Math.max(0, Math.min(1, t)) * Math.PI)));
    margin = Math.max(margin, Math.min(width - Math.abs(across), (t - 0.07) * length, (0.98 - t) * length));
  }
  return Math.min(margin, x - 165, 300 - x, z + 30, 100 - z);
}
