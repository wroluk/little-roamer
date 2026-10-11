import type { MarsRoute } from './mars-terrain';
import { DELTA_LOOKOUT } from './mars-delta-layout';

/** Quiet cross-basin alternatives to the long outer circuit; wilderness remains unmarked. */
export const MARS_HABITAT_SPOKES: MarsRoute[] = [
  { name: 'Habitat southern spoke', shoulder: 22, points: [
    { x: 40, z: 64, y: 6 }, { x: 40, z: 110, y: 7 }, { x: 35, z: 150, y: 9 }, { x: 20, z: 175, y: 10 },
    { x: 0, z: 228, y: 13 }, { x: -20, z: 280, y: 15 }, { x: -4, z: 337, y: 12 },
    { x: 17, z: 384, y: 10 }, { x: 0, z: 434, y: 8 }, { x: 0, z: 486, y: 8 },
  ] },
  { name: 'Habitat western spoke', shoulder: 22, points: [
    { x: -12, z: 60, y: 6 }, { x: -75, z: 88, y: 7 }, { x: -139, z: 115, y: 9 },
    { x: -187, z: 170, y: 13 }, { x: -205, z: 233, y: 16 }, { x: -235, z: 295, y: 19 },
    { x: -285, z: 350, y: 23 }, DELTA_LOOKOUT,
  ] },
];
