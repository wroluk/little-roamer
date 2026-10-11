import type { MarsPoint, MarsRoute } from './mars-terrain';
import { KEYHOLE_EXIT } from './mars-keyhole-layout';

export const DELTA_START: MarsPoint = { x: -300, z: 505, y: 15 };
export const DELTA_LOOKOUT: MarsPoint = { x: -345, z: 405, y: 25 };
export const DELTA_EXIT: MarsPoint = { x: -535, z: 280, y: 8 };
export const DELTA_ROUTES: MarsRoute[] = [
  { name: 'Delta Keyhole connection', shoulder: 20, points: [
    KEYHOLE_EXIT, { x: -235, z: 495, y: 11 }, { x: -270, z: 520, y: 14 }, DELTA_START,
  ] },
  { name: 'Delta northern channel', shoulder: 16, points: [
    DELTA_START, { x: -332, z: 486, y: 14 }, { x: -370, z: 470, y: 12 }, { x: -430, z: 440, y: 8 },
    { x: -482, z: 415, y: 6 }, { x: -505, z: 365, y: 7 },
  ] },
  { name: 'Delta southern channel', shoulder: 16, points: [
    { x: -370, z: 470, y: 12 }, { x: -418, z: 510, y: 10 }, { x: -475, z: 490, y: 7 },
    { x: -525, z: 435, y: 6 }, { x: -532, z: 394, y: 6 }, { x: -505, z: 365, y: 7 },
  ] },
  { name: 'Delta sediment shelf', surface: 'rock', shoulder: 18, points: [
    DELTA_START, { x: -313, z: 462, y: 18 }, { x: -331, z: 430, y: 23 }, DELTA_LOOKOUT,
    { x: -385, z: 376, y: 22 }, { x: -430, z: 354, y: 16 }, { x: -475, z: 348, y: 10 },
    { x: -505, z: 365, y: 7 },
  ] },
  { name: 'Delta Dunes connection', shoulder: 20, points: [
    { x: -505, z: 365, y: 7 }, { x: -544, z: 333, y: 7 }, DELTA_EXIT,
  ] },
];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const deltaWeight = (x: number, z: number) =>
  1 - smooth((Math.hypot((x + 428) / 173, (z - 434) / 119) - 0.75) / 0.4);
export function deltaHeight(x: number, z: number, base: number) {
  const weight = deltaWeight(x, z); if (!weight) return base;
  const fan = Math.hypot((x + 316) / 235, (z - 446) / 180);
  const shelf = 7 + 6 * (1 - smooth((fan - 0.64) / 0.21)) + 8 * (1 - smooth((fan - 0.26) / 0.23));
  return base + (shelf + 0.4 * Math.sin(z * 0.06) - base) * weight;
}
