import type { MarsPoint, MarsRoute } from './mars-terrain';
import { IRON_EXIT } from './mars-iron-layout';

export const KEYHOLE_START: MarsPoint = { x: 145, z: 575, y: 9 };
export const KEYHOLE_ARCH: MarsPoint = { x: 0, z: 530, y: 8 };
export const KEYHOLE_LOOKOUT: MarsPoint = { x: -92, z: 580, y: 24 };
export const KEYHOLE_EXIT: MarsPoint = { x: -190, z: 490, y: 9 };
export const KEYHOLE_CREST = [
  { x: -88, z: 530, y: 18 }, { x: -64, z: 530, y: 24 }, { x: -40, z: 530, y: 31 },
  { x: -16, z: 530, y: 35 }, { x: 14, z: 530, y: 34 }, { x: 40, z: 530, y: 29 },
  { x: 64, z: 530, y: 22 }, { x: 88, z: 530, y: 16 },
];
export const KEYHOLE_ARCHES = [
  { x: 0, z: 530, scale: 1, turn: 0 },
  { x: 103, z: 467, scale: 0.55, turn: 0.55 },
] as const;
export const keyholeRockAt = (x: number, z: number) => KEYHOLE_ARCHES.some(arch => {
  const dx = x - arch.x, dz = z - arch.z;
  return Math.abs(dx * Math.cos(arch.turn) - dz * Math.sin(arch.turn)) < 100 * arch.scale
    && Math.abs(dx * Math.sin(arch.turn) + dz * Math.cos(arch.turn)) < 23 * arch.scale;
});
export const KEYHOLE_ROUTES: MarsRoute[] = [
  { name: 'Keyhole Iron connection', shoulder: 20, points: [
    IRON_EXIT, { x: 213, z: 590, y: 10 }, { x: 176, z: 596, y: 10 }, KEYHOLE_START,
  ] },
  { name: 'Keyhole wash', shoulder: 16, points: [
    KEYHOLE_START, { x: 115, z: 602, y: 8 }, { x: 72, z: 618, y: 8 },
    { x: 28, z: 605, y: 8 }, { x: 0, z: 579, y: 8 }, KEYHOLE_ARCH,
    { x: 0, z: 486, y: 8 }, { x: -28, z: 459, y: 8 }, { x: -72, z: 448, y: 9 },
  ] },
  { name: 'Keyhole ledge return', surface: 'rock', shoulder: 16, points: [
    { x: -72, z: 448, y: 9 }, { x: -105, z: 464, y: 12 }, { x: -131, z: 499, y: 17 },
    { x: -136, z: 540, y: 22 }, { x: -119, z: 571, y: 24 }, KEYHOLE_LOOKOUT,
    { x: -57, z: 591, y: 21 }, { x: -25, z: 620, y: 15 }, { x: 8, z: 632, y: 10 },
    { x: 42, z: 632, y: 8 }, { x: 72, z: 618, y: 8 },
  ] },
  { name: 'Keyhole gentle return', shoulder: 18, points: [
    { x: -72, z: 448, y: 9 }, { x: -100, z: 416, y: 9 }, { x: -150, z: 419, y: 9 },
    { x: -181, z: 451, y: 9 }, KEYHOLE_EXIT, { x: -179, z: 544, y: 9 },
    { x: -155, z: 590, y: 9 }, { x: -111, z: 626, y: 9 }, { x: -58, z: 646, y: 9 },
    { x: 8, z: 632, y: 10 },
  ] },
  { name: 'Keyhole western crest approach', surface: 'rock', shoulder: 8, points: [
    KEYHOLE_LOOKOUT, { x: -106, z: 560, y: 23 }, { x: -110, z: 537, y: 20 },
    { x: -96, z: 530, y: 18 }, KEYHOLE_CREST[0],
  ] },
  { name: 'Keyhole eastern crest approach', surface: 'rock', shoulder: 8, points: [
    KEYHOLE_CREST.at(-1)!, { x: 119, z: 547, y: 14 }, KEYHOLE_START,
  ] },
];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const keyholeWeight = (x: number, z: number) =>
  1 - smooth((Math.hypot(x / 225, (z - 532) / 160) - 0.7) / 0.4);
export function keyholeHeight(x: number, z: number, base: number) {
  const weight = keyholeWeight(x, z);
  if (!weight) return base;
  let height = 8 + 0.45 * Math.sin(x * 0.035 + z * 0.019);
  for (const [cx, cz, rx, rz, rise] of [
    [86, 506, 49, 62, 15], [-78, 540, 68, 56, 17], [91, 675, 83, 34, 14],
  ]) {
    const radius = Math.max(Math.abs((x - cx) / rx), Math.abs((z - cz) / rz));
    height += rise * (0.4 * (1 - smooth((radius - 0.62) / 0.38))
      + 0.6 * (1 - smooth((radius - 0.3) / 0.32)));
  }
  for (const arch of KEYHOLE_ARCHES) {
    const dx = x - arch.x, dz = z - arch.z;
    const u = (dx * Math.cos(arch.turn) - dz * Math.sin(arch.turn)) / arch.scale;
    const v = (dx * Math.sin(arch.turn) + dz * Math.cos(arch.turn)) / arch.scale;
    for (const [cx, rise] of [[-76, 17], [78, 13]]) {
      const radius = Math.hypot((u - cx) / 48, v / 39);
      const shoulder = 8 + arch.scale * rise * (1 - smooth((radius - 0.35) / 0.85));
      height = Math.max(height, shoulder);
    }
    if (arch.scale < 1) {
      const opening = (1 - smooth((Math.abs(u) - 28) / 15)) * (1 - smooth((Math.abs(v) - 40) / 45));
      height += (8 - height) * opening;
    }
  }
  if (x >= -88 && x <= 88 && Math.abs(x) > 35) {
    const i = Math.max(0, KEYHOLE_CREST.findIndex(p => p.x >= x) - 1);
    const a = KEYHOLE_CREST[i], b = KEYHOLE_CREST[i + 1];
    const crest = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    height += Math.min(0, crest - 0.8 - height) * (1 - smooth((Math.abs(z - 530) - 8) / 12));
  }
  const archApron = (1 - smooth((Math.abs(x) - 12) / 15)) * (1 - smooth((Math.abs(z - 530) - 23) / 18));
  height += (8 - height) * archApron;
  return base + (height - base) * weight;
}
