import { coastShoreX } from './northern-coast';
import { MARSH_LOOKOUT } from './northern-marsh';
import type { SurfaceId } from './surfaces';
import { WEST_REGIONS, WEST_PROPS, westCoastWeight } from './northern-west';
import { WATERSIDE_REGIONS, WATERSIDE_PROPS, lakeShoreDistance, inletDistance } from './northern-watershed';

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
export const WIND_START = { x: -90, z: -365, y: 28 };
export const TERRACE_START = { x: 330, z: 80, y: 20 };

export const ADVENTURE_REGIONS: Region[] = [
  { id: 'windstone-ridge', name: 'Windstone Ridge', bounds: [-210, 150, -645, -275], start: WIND_START,
    description: 'Climb out of Stonegate Basin, pass beneath a weathered stone arch and follow the rolling crest to a high northern lookout.',
    trails: [
      { name: 'Stonegate saddle', points: [{ x: -185, z: -365, y: 44 }, { x: -140, z: -365, y: 36 }, WIND_START] },
      { name: 'Windstone crest circuit', points: [WIND_START, { x: -65, z: -410, y: 36 }, { x: -50, z: -445, y: 44 }, { x: -50, z: -485, y: 44 }, { x: -20, z: -525, y: 58 }, { x: 15, z: -555, y: 68 }, { x: 55, z: -520, y: 60 }, { x: 65, z: -470, y: 48 }, { x: 20, z: -410, y: 34 }, WIND_START] },
      { name: 'Windstone lookout', points: [{ x: 15, z: -555, y: 68 }, { x: 15, z: -585, y: 76 }, { x: 15, z: -600, y: 76 }] },
    ] },
  { id: 'ochre-terraces', name: 'Ochre Terraces', bounds: [245, 650, -25, 285], start: TERRACE_START,
    description: 'Climb warm stone shelves above Mountain Road. Try the rounded rock ramp on the inner traverse, then wind down past layered outcrops.',
    trails: [
      { name: 'Mountain Road terrace approach', points: [{ x: 260, z: 80, y: 11.428 }, { x: 295, z: 80, y: 15 }, TERRACE_START] },
      { name: 'Ochre shelves circuit', points: [TERRACE_START, { x: 375, z: 40, y: 30 }, { x: 435, z: 50, y: 40 }, { x: 480, z: 90, y: 48 }, { x: 525, z: 130, y: 52 }, { x: 550, z: 190, y: 42 }, { x: 485, z: 225, y: 32 }, { x: 415, z: 200, y: 24 }, { x: 355, z: 150, y: 18 }, TERRACE_START] },
      { name: 'Rock ramp traverse', points: [{ x: 355, z: 150, y: 18 }, { x: 400, z: 135, y: 23 }, { x: 445, z: 130, y: 31 }, { x: 480, z: 90, y: 48 }] },
    ] },
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

// Grade the new connecting saddles after the older regions' enclosing relief.
const latestRegions = new Set(['windstone-ridge', 'ochre-terraces']);
ADVENTURE_REGIONS.sort((a, b) => Number(latestRegions.has(a.id)) - Number(latestRegions.has(b.id)));
ADVENTURE_REGIONS.push(...WATERSIDE_REGIONS);
ADVENTURE_REGIONS.push(...WEST_REGIONS);

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
    if (WEST_REGIONS.some(w => w.id === r.id) && westCoastWeight(z)>0.1) return trail.distance<5?'dirt':x-coastShoreX(z)<38?'sand':'grass';
    if (r.id === 'great-lake' && Math.abs(lakeShoreDistance(x, z)) < 40) return trail.distance < 5 ? 'dirt' : 'moss';
    if (r.id === 'alder-river' && inletDistance(x, z) < 55) return trail.distance < 5 ? 'dirt' : 'moss';
    if (r.id === 'windstone-ridge') return trail.distance < 5 ? 'dirt' : 'rock';
    if (r.id === 'ochre-terraces') return trail.distance < 5 ? 'dirt' : 'sand';
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
    const w = weight(r, x, z) * (r.id === 'windstone-ridge' ? smooth((x + 165) / 35) : 1);
    let shaped = ground;
    if (r.id === 'windstone-ridge') {
      shaped = 18 + hill(x, z, -42, -492, 68, 115, 34) + hill(x, z, 28, -570, 54, 56, 48)
        + hill(x, z, 70, -455, 40, 70, 16) - hill(x, z, 5, -450, 25, 65, 12);
    } else if (r.id === 'ochre-terraces') {
      const radius = Math.hypot((x - 480) / 145, (z - 120) / 113);
      shaped = 12 + 12 * (1 - smooth((radius - 0.95) / 0.25))
        + 15 * (1 - smooth((radius - 0.65) / 0.2)) + 18 * (1 - smooth((radius - 0.3) / 0.22));
      shaped += hill(x, z, 518, 98, 33, 48, 10) - hill(x, z, 410, 140, 36, 35, 9);
    } else if (r.id === 'timber-run') {
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
    const connection = r.id === 'river-mouth' ? smooth((-x-345)/25)
      : r.id === 'driftwood-strand' ? smooth((z-488)/7) : 1;
    if (trail.distance < 22) ground += (trail.elevation - ground) * (1 - smooth((trail.distance - 7) / 15)) * connection;
    for (const p of r.id === 'stonegate-basin' ? [r.start, BASIN_LOOKOUT, MARSH_LOOKOUT] : [r.start]) {
      const clearing = 1 - smooth((Math.hypot(x - p.x, z - p.z) - 6) / 5);
      ground += (p.y - ground) * clearing;
    }
  }
  return ground;
}

type Prop = (typeof WEST_PROPS)[number] | { kind: 'forestPine' | 'trailLog' | 'shoalBoulder' | 'coastStack' | 'graniteTor' | 'timberSign' | 'shoalSign' | 'basinSign' | 'windSign' | 'terraceSign' | 'weatheredArch' | 'layeredRock' | 'rockRamp' | 'willow' | 'reed' | 'driftwood' | 'fordPost' | 'lakeSign' | 'riverSign' | 'coastSign' | 'coastLog'; x: number; z: number; size: number; angle?: number };
export const TIMBER_TRAIL_LOGS = [
  { kind: 'trailLog' as const, x: -334, z: 451, size: 1, angle: 0.48 },
  { kind: 'trailLog' as const, x: -337, z: 431, size: 1.25, angle: -0.65 },
];
export const SHOAL_TRAIL_BOULDERS = [
  { kind: 'shoalBoulder' as const, ...shoalPoint(-90, 3, 0), size: 0.8, angle: 0 },
  { kind: 'shoalBoulder' as const, ...shoalPoint(-124, 3, 0), size: 1.05, angle: 2.17 },
];
export const ADVENTURE_PROPS: Prop[] = [
  { kind: 'windSign', x: -103, z: -358, size: 1 },
  { kind: 'terraceSign', x: 318, z: 92, size: 1 },
  { kind: 'weatheredArch', x: -50, z: -465, size: 1 },
  { kind: 'rockRamp', x: 400, z: 135, size: 1 },
  ...[{ x: -86, z: -488 }, { x: -27, z: -545 }, { x: 81, z: -514 }, { x: 39, z: -609 },
    { x: 434, z: 82 }, { x: 550, z: 115 }, { x: 502, z: 180 }, { x: 380, z: 188 }]
    .map((p, i) => ({ kind: 'layeredRock' as const, ...p, size: 0.8 + (i % 3) * 0.2, angle: i * 1.7 })),
  { kind: 'timberSign', x: -367, z: 310, size: 1 }, { kind: 'timberSign', x: -347, z: 482, size: 1 },
  { kind: 'basinSign', x: -344, z: -216, size: 1 }, { kind: 'basinSign', x: -289, z: -296, size: 1 },
  { kind: 'shoalSign', x: -362, z: -70, size: 1 }, { kind: 'shoalSign', x: SHOAL_START.x + 10, z: -52, size: 1 },
  ...TIMBER_TRAIL_LOGS,
  ...[
    [-348, 457, 1.1, 1.1], [-322, 446, 0.8, -0.3],
    [-355, 420, 1.4, 0.8], [-316, 414, 1, 1.7],
    [-341, 402, 0.9, -1.2], [-307, 465, 1.3, 0.25],
    [-366, 476, 1.15, -0.8], [-289, 389, 0.85, 1.4],
    [-304, 490, 1.25, 0.6], [-359, 395, 1, -0.45],
  ].map(([x, z, size, angle]) => ({ kind: 'trailLog' as const, x, z, size, angle })),
  ...SHOAL_TRAIL_BOULDERS,
  ...[
    [-61, -7, 1.3], [-77, 11, 0.65],
    [-101, -10, 1.6], [-115, 12, 0.9], [-138, -6, 1.25], [-152, 9, 0.75],
    [-166, -12, 1.5], [-48, 8, 0.7], [-182, 4, 1.1], [-132, -19, 1.8],
  ].map(([z, offset, size], i) => ({ kind: 'shoalBoulder' as const, ...shoalPoint(z, offset, 0), size, angle: (i + 2) * 2.17 })),
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
ADVENTURE_PROPS.push(...WATERSIDE_PROPS.filter(p => p.kind !== 'willow' || adventureTrailDistance(p.x, p.z) > 7));
ADVENTURE_PROPS.push(...WEST_PROPS.filter(p => p.kind !== 'layeredRock' || adventureTrailDistance(p.x,p.z)>15));
