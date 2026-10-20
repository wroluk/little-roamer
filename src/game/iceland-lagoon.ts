import { icelandNoise } from './iceland-noise';
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const JOKULSARLON = { x: 485, z: 553, level: 0 };
export const JOKULSA_BRIDGE = { x: 500, z: 650, y: 4.8, length: 88, width: 12 };
export const LAGOON_WATER_BOUNDS = { x0: 360, x1: 624, z0: 422.4, z1: 715.2 };
export const LAGOON_VIEW_ROUTE = [
  { x: 420, z: 650 }, { x: 411, z: 623 }, { x: 390, z: 596 },
  { x: 381, z: 565 }, { x: 389, z: 529 },
];
export const GLACIER_VIEW_ROUTE = [
  { x: 188, z: 610 }, { x: 181, z: 580 }, { x: 163, z: 552 }, { x: 146, z: 540 },
];
export const JOKULSA_CROSSING = [
  { x: 440, z: 650 }, { x: 464, z: 650 }, { x: 500, z: 650 },
  { x: 536, z: 650 }, { x: 566, z: 650 }, { x: 585, z: 652 },
  { x: 611, z: 632 }, { x: 626, z: 590 },
];
export function onJokulsaBridge(x: number, z: number) {
  return Math.abs(x - 500) <= 44 && Math.abs(z - 650) <= 6;
}
export function lagoonRadius(x: number, z: number) {
  return Math.hypot((x - 485 - 4 * (icelandNoise(z / 28, 13) - 0.5)) / 80, (z - 553) / 63);
}
export function calvingBay(x: number, z: number) {
  return (1 - smooth((Math.abs(x - 481) - 49) / 18))
    * smooth((z - 474) / 12) * (1 - smooth((z - 550) / 20));
}
export function lagoonCarve(x: number, z: number, height: number) {
  if (x < 365 || x > 610 || z < 470 || z > 710) return height;
  const bowl = Math.max(1 - smooth((lagoonRadius(x, z) - 0.78) / 0.3), calvingBay(x, z));
  const outletX = 500 + 3 * (icelandNoise(z / 24, 71) - 0.5) * (1 - smooth(Math.abs(z - 650) / 20));
  const channel = (1 - smooth((Math.abs(x - outletX) - 10) / 15)) * smooth((z - 590) / 23);
  const basinHeight = -11 + 2 * icelandNoise(x / 23, z / 19);
  height += (basinHeight - height) * bowl;
  // Carve the outlet into land; never raise the deeper sea into a rectangular shelf.
  return height + (Math.min(height, -3.6) - height) * channel * (1 - bowl);
}
export function lagoonWaterRegion(x: number, z: number) {
  return (lagoonRadius(x, z) < 1.1 || calvingBay(x, z) > 0 || Math.abs(x - 500) < 30 && z > 600) && z < 687;
}
export function lagoonRouteDistance(x: number, z: number) {
  if (x < 120 || x > 450 || z < 510 || z > 675) return Infinity;
  let distance = Infinity;
  for (const path of [LAGOON_VIEW_ROUTE, GLACIER_VIEW_ROUTE]) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return distance;
}
/** Broad fractures cut into the shared render/collision surface, with unequal spacing. */
export function glacierFracture(x: number, z: number) {
  let cut = 0;
  for (const [line, bend, depth] of [[354, 8, 5], [379, -11, 8], [401, 13, 6], [432, -9, 11], [454, 8, 9], [477, -6, 13], [501, 7, 6]]) {
    const centre = line + bend * (icelandNoise(x / 25, line) - 0.5) + 0.025 * (x - 315);
    const width = 2.8 + 2.8 * icelandNoise(x / 19, line + 8);
    cut = Math.max(cut, (1 - smooth(Math.abs(z - centre) / width)) * depth);
  }
  return cut * smooth((z - 330) / 60);
}
export const GLACIER_MARGIN_WEIGHT = 0.12;
/** Southern ice field and two outlet tongues; the summit regions are a later chunk. */
export function southernGlacier(x: number, z: number) {
  if (x < 65 || x > 590 || z < 90 || z > 530) return { weight: 0, height: 0 };
  const margin = 13 * (icelandNoise(x / 43 + 8, z / 37) - 0.5)
    + 6 * (icelandNoise(x / 13, z / 17 + 52) - 0.5);
  const capRadius = Math.hypot((x - 315 + margin) / 205, (z - 265 + margin * 0.6) / 165);
  const cap = 1 - smooth((capRadius - 0.62) / 0.38);
  const progress = smooth((z - 300) / 215);
  const westX = 220 - progress * 66;
  const westWidth = 65 - progress * 23;
  const westFront = 516 + 18 * (icelandNoise(x / 19, 31) - 0.5);
  const west = (1 - smooth((Math.abs(x - westX) - westWidth + margin + 4) / 10))
    * smooth((z - 260) / 70) * (1 - smooth((z - westFront + 4) / 12));
  const eastX = 455 + 25 * smooth((z - 320) / 170);
  const eastFront = 493 + 20 * (icelandNoise(x / 16, 42) - 0.5);
  const east = (1 - smooth((Math.abs(x - eastX) - 69 + margin) / 10))
    * smooth((z - 270) / 65) * (1 - smooth((z - eastFront) / 3));
  const weight = Math.max(cap, west, east);
  const surface = 110 - 78 * smooth((z - 295) / 220)
    + 2.5 * (icelandNoise(x / 19, z / 43) - 0.5);
  const westLowering = west * smooth((z - 345) / 155) * 19;
  const brokenFront = smooth((z - 435) / 55) * (icelandNoise(x / 6, z / 11) - 0.5) * 12;
  return { weight, height: surface - westLowering - glacierFracture(x, z) + brokenFront };
}
