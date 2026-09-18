import { coastShoreX } from './northern-coast';
import { MARSH_LOOKOUT } from './northern-marsh';
import type { SurfaceId } from './surfaces';

type Point = { x: number; z: number; y: number };
type Trail = { name: string; points: Point[] };
type Region = { id: string; name: string; bounds: [number, number, number, number]; start: Point; trails: Trail[]; description: string };
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
const hill = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, h: number) =>
  h * Math.exp(-(((x - cx) / rx) ** 2) - ((z - cz) / rz) ** 2);
export const shoalPoint = (z: number, inland: number, y: number): Point => ({ x: coastShoreX(z) + inland, z, y });
export const TIMBER_START = { x: -335, z: 480, y: 12 };
export const BASIN_START = { x: -300, z: -305, y: 32 };
export const BASIN_LOOKOUT = { x: -260, z: -465, y: 62 };
export const SHOAL_START = shoalPoint(-60, 30, 1.2);

export const ADVENTURE_REGIONS: Region[] = [
  { id: 'timber-run', name: 'Timber Run', bounds: [-430, -225, 280, 570], start: TIMBER_START,
    description: 'Roll over fallen trunks in a sheltered forest gully, or climb the hillside bypass for a view through the pines.',
    trails: [
      { name: 'Coast Road connection', points: [{ x: -380, z: 300, y: 8.207 }, { x: -355, z: 345, y: 14 }, { x: -335, z: 375, y: 18 }, { x: -335, z: 400, y: 16 }] },
      { name: 'Timber gully and hillside bypass', points: [TIMBER_START, { x: -335, z: 440, y: 12 }, { x: -335, z: 400, y: 16 }, { x: -320, z: 375, y: 18 }, { x: -280, z: 390, y: 22 }, { x: -265, z: 435, y: 24 }, { x: -280, z: 480, y: 20 }, { x: -315, z: 505, y: 14 }, TIMBER_START] },
    ] },
  { id: 'stonegate-basin', name: 'Stonegate Basin', bounds: [-410, -115, -520, -165], start: BASIN_START,
    description: 'Follow the narrow approach into an enclosed highland bowl. Explore its stone garden and climb the rim for a view back through the entrance.',
    trails: [
      { name: 'Hidden pass from Willow Marsh', points: [MARSH_LOOKOUT, { x: -355, z: -225, y: 24 }, { x: -330, z: -265, y: 28 }, BASIN_START] },
      { name: 'Inner rim', points: [BASIN_START, { x: -330, z: -345, y: 38 }, { x: -315, z: -390, y: 42 }, { x: -270, z: -425, y: 52 }, { x: -215, z: -415, y: 48 }, { x: -185, z: -365, y: 44 }, { x: -205, z: -320, y: 36 }, { x: -250, z: -300, y: 32 }, BASIN_START] },
      { name: 'Stone garden', points: [BASIN_START, { x: -275, z: -340, y: 29 }, { x: -260, z: -365, y: 28 }] },
      { name: 'North crown', points: [{ x: -270, z: -425, y: 52 }, { x: -260, z: -453, y: 62 }, BASIN_LOOKOUT] },
    ] },
  { id: 'boulder-shoals', name: 'Boulder Shoals', bounds: [-720, -325, -230, 80], start: SHOAL_START,
    description: 'Leave Willow Marsh for the coast. Weave between sea stacks, crawl over low rocks in shallow water, or use the dry beach route.',
    trails: [
      { name: 'Marsh to sea', points: [{ x: -345, z: -55, y: 15 }, { x: -410, z: -65, y: 14 }, { x: -470, z: -85, y: 18 }, { x: -525, z: -75, y: 14 }, { x: -565, z: -60, y: 4.5 }, { x: -585, z: -60, y: 1.2 }, SHOAL_START] },
      { name: 'Dry beach', points: [SHOAL_START, shoalPoint(-100, 30, 1.2), shoalPoint(-145, 30, 1.2), shoalPoint(-175, 30, 1.2)] },
      { name: 'Shallow rock run', points: [SHOAL_START, shoalPoint(-80, 3, -0.22), shoalPoint(-110, 3, -0.22), shoalPoint(-140, 3, -0.22), shoalPoint(-160, 12, 0.1), shoalPoint(-175, 30, 1.2)] },
    ] },
];

function inside(r: Region, x: number, z: number) {
  const [left, right, top, bottom] = r.bounds;
  return x > left && x < right && z > top && z < bottom;
}
function weight(r: Region, x: number, z: number) {
  const [left, right, top, bottom] = r.bounds;
  return smooth((x - left) / 30) * smooth((right - x) / 30) * smooth((z - top) / 30) * smooth((bottom - z) / 30);
}
function trailSample(r: Region, x: number, z: number) {
  let distance = Infinity, sum = 0, weights = 0;
  for (const trail of r.trails) for (let i = 0; i < trail.points.length - 1; i++) {
    const a = trail.points[i], b = trail.points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d2 = (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2;
    distance = Math.min(distance, Math.sqrt(d2));
    if (d2 > 576) continue;
    const w = Math.exp(-d2 / 32);
    weights += w; sum += (a.y + (b.y - a.y) * t) * w;
  }
  return { distance, elevation: weights ? sum / weights : 0 };
}
export function adventureTrailDistance(x: number, z: number): number {
  let distance = Infinity;
  for (const r of ADVENTURE_REGIONS) if (inside(r, x, z)) distance = Math.min(distance, trailSample(r, x, z).distance);
  return distance;
}
export function shoalsWaterRegion(x: number, z: number): boolean {
  return x < -540 && x > -720 && z > -230 && z < 80;
}
export function adventureSurface(x: number, z: number): SurfaceId | null {
  for (const r of ADVENTURE_REGIONS) {
    if (!inside(r, x, z) || weight(r, x, z) < 0.2) continue;
    const trail = trailSample(r, x, z);
    if (r.id === 'timber-run') return trail.distance < 5 ? 'dirt' : 'moss';
    if (r.id === 'stonegate-basin' && z < -225) return trail.distance < 5 ? 'dirt' : 'rock';
    if (r.id === 'boulder-shoals') {
      if (x < -575) return 'sand';
      if (trail.distance < 5) return 'dirt';
    }
  }
  return null;
}
export function applyAdventures(x: number, z: number, ground: number): number {
  for (const r of ADVENTURE_REGIONS) {
    if (!inside(r, x, z)) continue;
    const w = weight(r, x, z);
    let shaped = ground;
    if (r.id === 'timber-run') {
      shaped += hill(x, z, -382, 455, 32, 64, 16) + hill(x, z, -271, 438, 40, 56, 15)
        - hill(x, z, -335, 446, 21, 60, 7);
    } else if (r.id === 'stonegate-basin') {
      const radius = Math.hypot((x + 260) / 88, (z + 365) / 98);
      const bowl = 28 + 38 * Math.exp(-(((radius - 1.02) / 0.24) ** 2))
        + hill(x, z, -340, -365, 25, 35, 17) + hill(x, z, -170, -370, 25, 35, 13);
      shaped += (bowl - shaped) * (1 - smooth((radius - 1.25) / 0.45));
      shaped += hill(x, z, -260, -465, 37, 30, 8);
    } else if (shoalsWaterRegion(x, z)) {
      const d = x - coastShoreX(z);
      const shore = d < -18 ? -0.45 + (d + 18) * 0.12
        : d < 8 ? -0.45 + 0.5 * smooth((d + 18) / 26)
        : d < 35 ? 0.05 + 1.6 * smooth((d - 8) / 27)
        : 1.65 + 10 * smooth((d - 35) / 45);
      shaped += (shore - shaped) * smooth((-540 - x) / 30);
    }
    ground += (shaped - ground) * w;
    const trail = trailSample(r, x, z);
    if (trail.distance < 22) ground += (trail.elevation - ground) * (1 - smooth((trail.distance - 7) / 15));
    for (const p of r.id === 'stonegate-basin' ? [r.start, BASIN_LOOKOUT, MARSH_LOOKOUT] : [r.start]) {
      const clearing = 1 - smooth((Math.hypot(x - p.x, z - p.z) - 6) / 5);
      ground += (p.y - ground) * clearing;
    }
  }
  return ground;
}

type Prop = { kind: 'forestPine' | 'trailLog' | 'shoalBoulder' | 'coastStack' | 'graniteTor' | 'timberSign' | 'shoalSign' | 'basinSign'; x: number; z: number; size: number; angle?: number };
export const ADVENTURE_PROPS: Prop[] = [
  { kind: 'timberSign', x: -367, z: 310, size: 1 }, { kind: 'timberSign', x: -347, z: 482, size: 1 },
  { kind: 'basinSign', x: -344, z: -216, size: 1 }, { kind: 'basinSign', x: -289, z: -296, size: 1 },
  { kind: 'shoalSign', x: -362, z: -70, size: 1 }, { kind: 'shoalSign', x: SHOAL_START.x + 10, z: -52, size: 1 },
  ...[450, 430].map(z => ({ kind: 'trailLog' as const, x: -335, z, size: z === 450 ? 1 : 1.4, angle: z === 450 ? 0.08 : -0.12 })),
  ...[-90, -124].map(z => ({ kind: 'shoalBoulder' as const, ...shoalPoint(z, 3, 0), size: 1 })),
  ...[-70, -108, -146].map((z, i) => ({ kind: 'coastStack' as const, ...shoalPoint(z, -13, 0), size: 1.3 + i * 0.25 })),
  ...[{ x: -323, z: -285 }, { x: -302, z: -270 }, { x: -240, z: -364 }, { x: -283, z: -383 }, { x: -244, z: -399 }]
    .map((p, i) => ({ kind: 'graniteTor' as const, ...p, size: 1 + (i % 3) * 0.3 })),
];
for (const center of [{ x: -365, z: 423 }, { x: -303, z: 459 }, { x: -291, z: 355 }, { x: -374, z: 495 }]) {
  for (let i = 0; i < 9; i++) {
    const x = center.x + 13 * Math.sin(i * 2.4), z = center.z + 17 * Math.cos(i * 1.7);
    if (adventureTrailDistance(x, z) > 10) ADVENTURE_PROPS.push({ kind: 'forestPine', x, z, size: 0.9 + (i % 3) * 0.15 });
  }
}
