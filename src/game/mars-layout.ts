export const MARS_HALF = 768;
export const MARS_CHUNK_SIZE = 96;
export const MARS_MIN_CHUNK = -MARS_HALF / MARS_CHUNK_SIZE - 1;
export const MARS_MAX_CHUNK = MARS_HALF / MARS_CHUNK_SIZE;

type Point = { x: number; z: number };
type Placement = { origin: Point; centre: Point; scale: number };
export const DISH_PLACEMENT: Placement = { origin: { x: 238, z: -262 }, centre: { x: 398, z: -472 }, scale: 1 };
export const GLASSFALL_PLACEMENT: Placement = { origin: { x: 246, z: 10 }, centre: { x: 500, z: -30 }, scale: 1.45 };
export const IRON_PLACEMENT: Placement = { origin: { x: 233, z: 213 }, centre: { x: 380, z: 460 }, scale: 1.4 };
export const MARS_SCREENS = [
  { x: 230, z: -285, rx: 75, rz: 95, height: 18 },
  { x: 245, z: 180, rx: 80, rz: 100, height: 14 },
  { x: 465, z: 310, rx: 85, rz: 55, height: 46 },
];
/** Broad, unequal sediment shoulders with finite footprints, not overlapping bell-shaped peaks. */
export function marsScreenHeight(x: number, z: number): number {
  let height = 0;
  for (const screen of MARS_SCREENS) {
    const u = (x - screen.x) / screen.rx, v = (z - screen.z) / screen.rz;
    const radius = Math.max(Math.abs(u + v * 0.18), Math.abs(v), Math.abs(u - v * 0.45) * 0.82);
    const t = Math.max(0, Math.min(1, (radius - 0.22) / 0.78));
    const shoulder = 1 - t * t * (3 - 2 * t);
    height = Math.max(height, screen.height * shoulder * (0.93 + 0.07 * Math.max(-1, Math.min(1, u))));
  }
  return height;
}

export function placeRegionPoint<T extends Point>(point: T, placement: Placement): T {
  return { ...point, x: placement.centre.x + (point.x - placement.origin.x) * placement.scale,
    z: placement.centre.z + (point.z - placement.origin.z) * placement.scale };
}
export function regionLocal(x: number, z: number, placement: Placement): Point {
  return { x: placement.origin.x + (x - placement.centre.x) / placement.scale,
    z: placement.origin.z + (z - placement.centre.z) / placement.scale };
}
export const dishPosition = <T extends Point>(p: T) => placeRegionPoint(p, DISH_PLACEMENT);
export const glassfallPosition = <T extends Point>(p: T) => placeRegionPoint(p, GLASSFALL_PLACEMENT);
export const ironPosition = <T extends Point>(p: T) => placeRegionPoint(p, IRON_PLACEMENT);
