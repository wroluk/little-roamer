import type { MarsPoint, MarsRoute } from './mars-terrain';
import { GLASSFALL_SOUTH } from './mars-glassfall-layout';
import { ironPosition, regionLocal, IRON_PLACEMENT } from './mars-layout';
const START: MarsPoint = { x: 250, z: 144, y: 9 };
const LOOKOUT: MarsPoint = { x: 306, z: 260, y: 24 };
const EXIT: MarsPoint = { x: 135, z: 290, y: 9 };
export const IRON_START = ironPosition(START), IRON_LOOKOUT = ironPosition(LOOKOUT), IRON_EXIT = ironPosition(EXIT);
const localRoutes: MarsRoute[] = [
  { name: 'Iron Glassfall connection', shoulder: 24, points: [START] },
  { name: 'Iron main passage', points: [START, { x: 253, z: 169, y: 10 }, { x: 253, z: 198, y: 11 }, { x: 250, z: 225, y: 12 }, { x: 250, z: 250, y: 12 }, { x: 230, z: 276, y: 10 }] },
  { name: 'Iron western bypass', points: [START, { x: 223, z: 143, y: 9 }, { x: 190, z: 145, y: 9 }, { x: 162, z: 165, y: 9 }, { x: 154, z: 197, y: 9 }, { x: 157, z: 231, y: 9 }, { x: 179, z: 260, y: 10 }, { x: 205, z: 274, y: 10 }, { x: 230, z: 276, y: 10 }] },
  { name: 'Iron slalom', halfWidth: 4.5, surface: 'rock', points: [{ x: 223, z: 143, y: 9 }, { x: 205, z: 160, y: 10 }, { x: 198, z: 181, y: 11 }, { x: 208, z: 202, y: 12 }, { x: 198, z: 225, y: 12 }, { x: 210, z: 248, y: 12 }, { x: 230, z: 276, y: 10 }] },
  { name: 'Iron lookout', points: [{ x: 250, z: 250, y: 12 }, { x: 275, z: 266, y: 18 }, LOOKOUT] },
  { name: 'Iron Keyhole connection', points: [{ x: 230, z: 276, y: 10 }, { x: 202, z: 292, y: 9 }, { x: 168, z: 294, y: 9 }, EXIT] },
];
export const IRON_ROUTES: MarsRoute[] = localRoutes.map(route => ({ ...route, points: route.points.map(ironPosition) }));
IRON_ROUTES[0].points = [
  GLASSFALL_SOUTH, { x: 531, z: 187, y: 10 }, { x: 511, z: 228, y: 13 },
  { x: 464, z: 250, y: 17 }, { x: 418, z: 252, y: 20 }, { x: 380, z: 279, y: 20 },
  { x: 374, z: 315, y: 14 }, IRON_START,
];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const ironWeight = (x: number, z: number) => {
  ({ x, z } = regionLocal(x, z, IRON_PLACEMENT));
  return 1 - smooth((Math.hypot((x - 233) / 92, (z - 213) / 82) - 0.7) / 0.55);
};
export function ironHeight(x: number, z: number, base: number) {
  const w = ironWeight(x, z); if (!w) return base;
  ({ x, z } = regionLocal(x, z, IRON_PLACEMENT));
  const floor = 10 + 1.2 * Math.sin(z * 0.045) + 0.7 * Math.sin(x * 0.09 + z * 0.02);
  let h = base + (floor - base) * w;
  const lookout = 1 - smooth((Math.hypot((x - 304) / 37, (z - 259) / 32) - 0.3) / 0.7);
  h += (24 - h) * lookout; return h;
}
export type IronFin = { x: number; z: number; length: number; width: number; height: number; yaw: number; seed: number };
/** Individually placed blades leave wide connected corridors between their actual footprints. */
export const IRON_FINS: IronFin[] = [
  { x: 222, z: 174, length: 29, width: 4.2, height: 19, yaw: -0.12, seed: 1 },
  { x: 225, z: 205, length: 22, width: 4, height: 25, yaw: 0.1, seed: 2 },
  { x: 227, z: 239, length: 22, width: 4.5, height: 18, yaw: -0.16, seed: 3 },
  { x: 181, z: 178, length: 22, width: 4.5, height: 15, yaw: -0.15, seed: 4 },
  { x: 177, z: 222, length: 28, width: 5, height: 21, yaw: 0.08, seed: 5 },
  { x: 281, z: 190, length: 48, width: 6, height: 32, yaw: -0.13, seed: 6 },
  { x: 301, z: 201, length: 42, width: 5, height: 26, yaw: -0.13, seed: 7 },
  { x: 277, z: 237, length: 24, width: 5, height: 17, yaw: 0.08, seed: 8 },
  { x: 193, z: 250, length: 15, width: 3.5, height: 8, yaw: -0.6, seed: 9 },
  { x: 314, z: 174, length: 11, width: 3, height: 6, yaw: -0.6, seed: 11 },
  { x: 291, z: 150, length: 13, width: 3.5, height: 4, yaw: 0.8, seed: 12 },
  // The fallen blade makes an open pocket beside the bypass, outside its shoulders.
  { x: 172, z: 201, length: 16, width: 3, height: 2.6, yaw: 0.9, seed: 10 },
].map(fin => ({ ...ironPosition(fin), length: fin.length * 1.2, height: fin.height * 1.1 }));
IRON_FINS.push(
  { x: 551, z: 198, length: 8, width: 1.8, height: 1.8, yaw: -0.2, seed: 21 },
);
