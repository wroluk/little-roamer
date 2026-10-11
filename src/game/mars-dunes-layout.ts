import type { MarsPoint, MarsRoute } from './mars-terrain';
import { DELTA_EXIT } from './mars-delta-layout';

export const DUNES_START: MarsPoint = { x: -535, z: 190, y: 9 };
export const DUNES_LOOKOUT: MarsPoint = { x: -528, z: -5, y: 29 };
export const DUNES_EXIT: MarsPoint = { x: -480, z: -160, y: 10 };
export const DUNES_ROUTES: MarsRoute[] = [
  { name: 'Dunes Delta connection', shoulder: 20, points: [
    DELTA_EXIT, { x: -515, z: 239, y: 8 }, DUNES_START,
  ] },
  { name: 'Dunes bedrock perimeter', surface: 'rock', shoulder: 20, points: [
    DUNES_START, { x: -600, z: 155, y: 10 }, { x: -648, z: 95, y: 9 }, { x: -655, z: 20, y: 9 },
    { x: -630, z: -55, y: 10 }, { x: -560, z: -108, y: 11 }, DUNES_EXIT,
  ] },
  { name: 'Dunes crescent crest', surface: 'mars-dust', shoulder: 22, points: [
    { x: -600, z: 155, y: 10 }, { x: -578, z: 113, y: 14 }, { x: -552, z: 75, y: 19 },
    { x: -528, z: 28, y: 26 }, DUNES_LOOKOUT, { x: -545, z: -50, y: 25 },
    { x: -566, z: -79, y: 19 }, { x: -560, z: -108, y: 11 },
  ] },
  { name: 'Dunes island loop', shoulder: 18, points: [
    DUNES_START, { x: -472, z: 145, y: 9 }, { x: -431, z: 77, y: 10 }, { x: -409, z: 15, y: 11 },
    { x: -425, z: -49, y: 11 }, { x: -460, z: -111, y: 10 }, DUNES_EXIT,
  ] },
];
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const dunesWeight = (x: number, z: number) =>
  1 - smooth((Math.hypot((x + 525) / 145, (z - 15) / 185) - 0.75) / 0.45);
export function dunesHeight(x: number, z: number, base: number) {
  const weight = dunesWeight(x, z); if (!weight) return base;
  const u = (x + 472) / 84, v = (z - 12) / 137;
  const r = Math.hypot(u, v);
  const crescent = Math.exp(-(((r - 0.92) / (r < 0.92 ? 0.2 : 0.4)) ** 2));
  const west = 1 - smooth((u + 0.1) / 0.85);
  const height = 8 + 21 * crescent * west + 0.7 * Math.sin(z * 0.047 + x * 0.026);
  return base + (height - base) * weight;
}
