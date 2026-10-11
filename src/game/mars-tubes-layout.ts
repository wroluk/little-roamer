import type { MarsPoint, MarsRoute } from './mars-terrain';
import { DUNES_EXIT } from './mars-dunes-layout';

const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const TUBES_START: MarsPoint = { x: -455, z: -275, y: 10 };
export const TUBES_LOOKOUT: MarsPoint = { x: -526, z: -430, y: 22 };
export const TUBES_EXIT: MarsPoint = { x: -275, z: -433, y: 15 };
export const TUBES_CENTRE: MarsPoint = { x: -430, z: -456, y: 6 };
export const QUIET_VAULT: MarsPoint = { x: -419, z: -526, y: 6 };
export const LAVA_TUBES = [
  { x: -430, south: -330, north: -574, phase: 0, skylights: [-381, -456, -535] },
  { x: -488, south: -373, north: -591, phase: 1.7, skylights: [-413, -456, -558] },
] as const;
export type LavaTube = typeof LAVA_TUBES[number];
export const tubeCentreX = (tube: LavaTube, z: number) =>
  tube.x + 3.5 * Math.sin((z + 456) * 0.023 + tube.phase);
export const tubeFloor = (z: number) => 6 + 0.3 * Math.sin((z + 456) * 0.035);
export const tubePoint = (tube: LavaTube, z: number): MarsPoint =>
  ({ x: tubeCentreX(tube, z), z, y: tubeFloor(z) });
export function tubeOpening(tube: LavaTube, z: number) {
  let width = 0;
  for (const centre of tube.skylights) {
    const t = Math.abs(z - centre) / 12;
    if (t < 1) width = Math.max(width, 11.5 * Math.sqrt(1 - t * t) * (1 + 0.08 * Math.sin(z * 0.7)));
  }
  return width;
}
const main = LAVA_TUBES[0], west = LAVA_TUBES[1];
const mainPath = [-304, -330, -355, -381, -413, -438, -456, -482, -506, -535, -558, -574, -602]
  .map(z => tubePoint(main, z));
const westPath = [-346, -373, -393, -413, -436, -456, -481, -509, -534, -558, -578, -591, -614]
  .map(z => tubePoint(west, z));
const returnPoint = { x: -357, z: -493, y: 12 };
export const TUBES_ROUTES: MarsRoute[] = [
  { name: 'Tubes Dunes connection', shoulder: 20, points: [
    DUNES_EXIT, { x: -445, z: -213, y: 10 }, TUBES_START,
  ] },
  { name: 'Tubes skylight passage', surface: 'rock', shoulder: 3, points: [
    TUBES_START, ...mainPath, { x: -392, z: -622, y: 9 },
    { x: -351, z: -585, y: 12 }, { x: -340, z: -536, y: 13 }, returnPoint,
  ] },
  { name: 'Tubes surface bypass', surface: 'rock', shoulder: 12, points: [
    TUBES_START, { x: -514, z: -318, y: 16 }, { x: -536, z: -370, y: 21 },
    TUBES_LOOKOUT, { x: -536, z: -493, y: 21 }, { x: -541, z: -552, y: 19 },
    { x: -537, z: -624, y: 11 }, { x: -475, z: -643, y: 10 },
    { x: -392, z: -622, y: 9 }, { x: -351, z: -585, y: 12 },
    { x: -340, z: -536, y: 13 }, returnPoint,
  ] },
  { name: 'Tubes Vault alcove', halfWidth: 3.5, shoulder: 5, surface: 'rock', points: [
    tubePoint(main, -506), { x: -420, z: -513, y: 6 }, { x: -418, z: -520, y: 6 },
  ] },
  { name: 'Tubes western passage', surface: 'rock', shoulder: 3, points: [
    TUBES_START, { x: -479, z: -310, y: 9 }, ...westPath,
    { x: -475, z: -643, y: 10 }, { x: -392, z: -622, y: 9 },
  ] },
  { name: 'Tubes collapsed junction', surface: 'rock', shoulder: 3, points: [
    tubePoint(main, -456), { x: -456, z: -456, y: 6 }, tubePoint(west, -456),
  ] },
  { name: 'Tubes Crown return', shoulder: 20, points: [
    returnPoint, { x: -318, z: -473, y: 15 }, TUBES_EXIT,
    { x: -229, z: -412, y: 18 }, { x: -179, z: -393, y: 20 }, { x: -133, z: -349, y: 24 },
    { x: -106, z: -295, y: 26 }, { x: -103, z: -246, y: 26 }, { x: -75, z: -195, y: 26 },
  ] },
];
export const tubesWeight = (x: number, z: number) =>
  1 - smooth((Math.hypot((x + 460) / 145, (z + 458) / 218) - 0.7) / 0.4);
export function tubesHeight(x: number, z: number, base: number) {
  const weight = tubesWeight(x, z); if (!weight) return base;
  let height = 20 + 1.3 * Math.sin(x * 0.038 + z * 0.017) + 0.6 * Math.sin(z * 0.073);
  for (const tube of LAVA_TUBES) {
    const distance = Math.abs(x - tubeCentreX(tube, z));
    const ends = smooth((z - tube.north + 35) / 30) * smooth((tube.south + 38 - z) / 32);
    const ledges = 0.7 * Math.sin(z * 0.27 + distance * 0.6) + 0.4 * Math.sin(z * 0.61);
    const wall = Math.max(0, Math.min(1, (distance - 8 - ledges) / 13));
    const shelf = wall * 3, bands = (Math.floor(shelf) + smooth(shelf % 1)) / 3;
    const trench = (1 - bands) * ends;
    height += (tubeFloor(z) - height) * trench;
  }
  const junction = (1 - smooth((Math.abs(z + 456) - 7) / 8))
    * (1 - smooth((Math.abs(x + 458) - 27) / 13));
  height += (6 - height) * junction;
  const alcove = 1 - smooth((Math.hypot((x - QUIET_VAULT.x) / 11, (z - QUIET_VAULT.z) / 14) - 0.55) / 0.55);
  height += (6 - height) * alcove;
  return base + (height - base) * weight;
}
