import { icelandNoise } from './iceland-noise';

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
export const LOMAGNUPUR = { x: -5, z: 465 };
/** A gravel bypass at the cliff foot, joined to Route 1 at both ends. */
export const LOMAGNUPUR_ROUTE = [
  { x: -90, z: 595 }, { x: -83, z: 570 }, { x: -58, z: 548 },
  { x: -13, z: 550 }, { x: 38, z: 562 }, { x: 88, z: 578 }, { x: 130, z: 608 },
];
export const LOMAGNUPUR_START = LOMAGNUPUR_ROUTE[1];
export function lomagnupurRouteDistance(x: number, z: number) {
  if (x < -110 || x > 150 || z < 530 || z > 630) return Infinity;
  let distance = Infinity;
  for (let i = 1; i < LOMAGNUPUR_ROUTE.length; i++) {
    const a = LOMAGNUPUR_ROUTE[i - 1], b = LOMAGNUPUR_ROUTE[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return distance;
}
export function skeidararsandurWeight(x: number, z: number) {
  if (x <= -110 || x >= 385 || z <= 410 || z >= 710) return 0;
  return smooth((x + 110) / 70) * (1 - smooth((x - 320) / 65))
    * smooth((z - 410) / 90) * (1 - smooth((z - 665) / 45));
}
/** Lómagnúpur is the southern end of a highland ridge, with a broad scree apron. */
export function lomagnupurTalus(x: number, z: number) {
  if (x < -180 || x > 110 || z < 130 || z > 565) return 0;
  const inland = smooth((510 - z) / 240);
  const centre = -5 - inland * 28;
  const width = 49 + inland * 48;
  const edge = 499 - 22 * Math.pow(Math.abs(x - centre) / width, 2) + 4 * (icelandNoise(x / 29, 21) - 0.5);
  const side = 1 - smooth((Math.abs(x - centre) - width + 8) / 45);
  return side * (1 - smooth((z - edge + 5) / 65)) * smooth((z - 130) / 110);
}
export function lomagnupurRise(x: number, z: number) {
  if (x < -180 || x > 110 || z < 130 || z > 565) return 0;
  const inland = smooth((510 - z) / 240);
  const centre = -5 - inland * 28;
  const width = 43 + inland * 44 + 4 * icelandNoise(z / 37, 5);
  const front = 497 - 32 * Math.pow(Math.abs(x - centre) / width, 2) + 4 * (icelandNoise(x / 29, 21) - 0.5);
  const side = 1 - smooth((Math.abs(x - centre) - width + 7) / 16);
  const south = 1 - smooth((z - front + 6) / 9);
  const north = smooth((z - 130) / 110);
  const shoulder = Math.min(1, Math.abs(x - centre + 6) / width);
  const top = 65 - 20 * shoulder ** 2 + 7 * icelandNoise(x / 31 + 4, z / 47 - 2);
  return side * south * north * top + 38 * lomagnupurTalus(x, z);
}
/** Dry distributaries: branching gravel channels and bars, with no water overlays. */
export function sandurChannel(x: number, z: number) {
  if (x < -110 || x > 385 || z < 410 || z > 710) return 0;
  let distance = Infinity;
  const downstream = Math.max(0, z - 430);
  for (const [origin, spread, width] of [[104, -0.19, 8], [119, 0.1, 6], [134, 0.35, 9], [247, -0.12, 7], [258, 0.22, 10]]) {
    const centre = origin + downstream * spread + 17 * (icelandNoise(z / 51, origin) - 0.5);
    distance = Math.min(distance, Math.abs(x - centre) / width);
  }
  return 1 - smooth((distance - 0.55) / 1.8);
}
