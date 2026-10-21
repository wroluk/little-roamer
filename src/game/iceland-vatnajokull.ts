import { icelandNoise } from './iceland-noise';

const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const GRIMSVOTN = { x: 310, z: 143, radiusX: 48, radiusZ: 34 };
export const VATNAJOKULL_START = { x: 260, z: 300 };
/** Broad graded traverse; the western cave branches from the ascent in a later slice. */
export const VATNAJOKULL_ROUTE = [
  { x: 188, z: 610, y: 3.94 }, { x: 115, z: 580, y: 4.5 },
  { x: 80, z: 530, y: 5.7 }, { x: 80, z: 480, y: 26 },
  { x: 100, z: 425, y: 50 }, { x: 120, z: 370, y: 74 },
  { x: 155, z: 320, y: 96 }, { x: 205, z: 290, y: 107 },
  { x: 260, z: 300, y: 110 }, { x: 315, z: 300, y: 110 },
  { x: 385, z: 310, y: 108 }, { x: 445, z: 330, y: 99 },
  { x: 505, z: 355, y: 78 }, { x: 555, z: 390, y: 68 },
  { x: 590, z: 440, y: 44 }, { x: 610, z: 485, y: 19 },
  { x: 635, z: 530, y: 5.83 },
];
export function vatnajokullRouteAt(x: number, z: number) {
  if (x < 45 || x > 670 || z < 235 || z > 635) return { distance: Infinity, height: 0, blend: 0 };
  let distance = Infinity, height = 0;
  for (let i = 1; i < VATNAJOKULL_ROUTE.length; i++) {
    const a = VATNAJOKULL_ROUTE[i - 1], b = VATNAJOKULL_ROUTE[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < distance) { distance = d; height = a.y + (b.y - a.y) * t; }
  }
  return { distance, height, blend: 1 - smooth((distance - 8) / 23) };
}

/** Unequal exposed shoulders around an ice-filled caldera, not a bare volcanic cone. */
export function grimsvotnRockHeight(x: number, z: number) {
  if (Math.abs(x - GRIMSVOTN.x) > 70 || Math.abs(z - GRIMSVOTN.z) > 57) return -Infinity;
  const dx = (x - GRIMSVOTN.x) / GRIMSVOTN.radiusX, dz = (z - GRIMSVOTN.z) / GRIMSVOTN.radiusZ;
  const r = Math.hypot(dx, dz);
  // Keep the same broken shoulders when relocating the crater.
  const sampleZ = z - GRIMSVOTN.z + 232;
  const irregular = 0.10 * (icelandNoise(x / 16 + 91, sampleZ / 13) - 0.5)
    + 0.07 * (icelandNoise(x / 6, sampleZ / 7 + 12) - 0.5);
  const ridge = 1 - smooth(Math.abs(r - 1 + irregular) / 0.4);
  const exposedHalf = smooth((0.18 - dx * 0.6 - dz * 0.8) / 0.65);
  const shoulder = 0.72 + 0.28 * icelandNoise(x / 23, sampleZ / 19 + 77);
  return 94 + ridge * (29 * shoulder) * exposedHalf;
}
