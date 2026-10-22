import { icelandNoise } from './iceland-noise';

const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const ICE_CAVE = { north: 211.2, south: 331.2, x0: 40.8, x1: 184.8, z0: 165.6, z1: 388.8 };
export const ICE_CAVE_START = { x: 95, z: 350 };
export const ICE_CAVE_HALL = { x: 130, z: 270, radiusX: 25, radiusZ: 29, floor: 78 };
export const ICE_CAVE_ROUTE = [
  { x: 120, z: 370, y: 74 }, { x: 105, z: 350, y: 78 },
  { x: 112, z: 331.2, y: 78 }, { x: 132, z: 310, y: 78 },
  { x: 142, z: 287, y: 78 }, { x: 132, z: 265, y: 78 },
  { x: 120, z: 244, y: 78 }, { x: 108, z: 225, y: 78 }, { x: 104, z: 211.2, y: 78 },
  { x: 88, z: 200, y: 78 }, { x: 70, z: 190, y: 80 },
];
export const ICE_CAVE_BRANCH = [
  ICE_CAVE_ROUTE[5], { x: 110, z: 256, y: 78 }, { x: 88, z: 248, y: 78 },
  { x: 70, z: 240, y: 81.25 },
];
export const ICE_CAVE_BYPASS = [
  ICE_CAVE_ROUTE[ICE_CAVE_ROUTE.length - 1],
  ICE_CAVE_BRANCH[ICE_CAVE_BRANCH.length - 1], { x: 70, z: 270, y: 82 }, { x: 70, z: 330, y: 78 },
  { x: 85, z: 350, y: 78 }, ICE_CAVE_ROUTE[1],
];
function nearest(path: readonly { x: number; z: number; y: number }[], x: number, z: number) {
  let distance = Infinity, height = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
    if (d < distance) { distance = d; height = a.y + (b.y - a.y) * t; }
  }
  return { distance, height, blend: 1 - smooth((distance - 8) / 13) };
}
export const iceCaveInBounds = (x: number, z: number) =>
  x >= ICE_CAVE.x0 && x <= ICE_CAVE.x1 && z >= ICE_CAVE.z0 && z <= ICE_CAVE.z1;
export function iceCaveHallRadius(x: number, z: number) {
  return Math.hypot((x - ICE_CAVE_HALL.x + 2.5 * (icelandNoise(x / 17, z / 21) - 0.5)) / ICE_CAVE_HALL.radiusX,
    (z - ICE_CAVE_HALL.z) / ICE_CAVE_HALL.radiusZ);
}
export function iceCaveRouteAt(x: number, z: number) {
  if (!iceCaveInBounds(x, z)) return { distance: Infinity, height: 0, blend: 0 };
  const main = nearest(ICE_CAVE_ROUTE, x, z), branch = nearest(ICE_CAVE_BRANCH, x, z);
  const passage = main.distance < branch.distance ? main : branch, bypass = nearest(ICE_CAVE_BYPASS, x, z);
  if (x >= 88 && z >= 200 && z <= 350) passage.height = ICE_CAVE_HALL.floor;
  passage.blend = onIceCaveFloor(x, z)
    ? 1 - smooth((passage.distance - 21) / 12) : 1 - smooth((passage.distance - 8) / 13);
  const route = passage.distance < bypass.distance ? passage : bypass;
  const hallBlend = 1 - smooth((iceCaveHallRadius(x, z) - 1) / 0.4);
  return hallBlend > route.blend ? { distance: Math.max(0, iceCaveHallRadius(x, z) - 0.6) * 25,
    height: ICE_CAVE_HALL.floor, blend: hallBlend } : route;
}
export function iceCaveWeight(x: number, z: number) {
  if (!iceCaveInBounds(x, z)) return 0;
  const margin = 5 * (icelandNoise(x / 27, z / 31) - 0.5);
  const radius = Math.hypot((x - 143 + margin) / 81, (z - 269 + margin) / 104);
  return 1 - smooth((radius - 0.56) / 0.44);
}
export function iceCaveEntranceWeight(x: number, z: number) {
  return Math.max(smooth((z - 302) / 24), smooth((236 - z) / 20),
    smooth((112 - x) / 25) * (1 - smooth((Math.abs(z - 248) - 14) / 18)));
}
/** Unequal melt channels merge as one cavity, without overlapping tunnel shells. */
export function iceCaveVaultRise(x: number, z: number) {
  return vaultRise(x, z, iceCaveEntranceWeight(x, z));
}
function vaultRise(x: number, z: number, entrance: number) {
  if (!iceCaveInBounds(x, z)) return -2;
  const shear = 2.8 * (icelandNoise(x / 17 + 12, z / 23) - 0.5)
    + 1.1 * (icelandNoise(x / 6, z / 11 + 8) - 0.5);
  const width = 14 + 4 * icelandNoise(x / 31, z / 27 + 19) - 5 * entrance;
  const distance = Math.min(nearest(ICE_CAVE_ROUTE, x + shear, z).distance,
    nearest(ICE_CAVE_BRANCH, x + shear, z).distance);
  const section = Math.max(0, 1 - (distance / width) ** 2);
  const scallops = 2.8 * (icelandNoise(x / 8 + z / 19, z / 13) - 0.5);
  const passage = -2 + section ** 0.62 * (22 - 12 * entrance
    + 3.8 * (icelandNoise(x / 29, z / 37) - 0.5) * (1 - 0.7 * entrance)
    + scallops * (1 - 0.6 * entrance));
  const hall = -2 + Math.max(0, 1 - iceCaveHallRadius(x, z) ** 2) ** 0.65
    * (26 + 2 * (icelandNoise(x / 11, z / 16) - 0.5) + scallops);
  return Math.max(passage, hall);
}
export function iceCaveOpenApproach(x: number, z: number) {
  return iceCaveInBounds(x, z) && z > 345 && nearest(ICE_CAVE_ROUTE.slice(0, 3), x, z).distance < 13;
}
export function insideIceCave(x: number, z: number) {
  return z < ICE_CAVE.south + 12 && iceCaveVaultRise(x, z) > 2;
}
export function onIceCaveFloor(x: number, z: number) {
  // Narrow the roof without raising the previously graded floor shoulders.
  return z < ICE_CAVE.south + 12 && vaultRise(x, z, 0) > 2;
}
