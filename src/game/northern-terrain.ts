// The Northern Reach: a fixed, finite, chunk-streamed world model.
//
// Every export here is a pure function of (x, z) or (cx, cz) — there is no
// hidden mutable state and no wall-clock or global RNG. The same inputs
// always produce the same outputs, byte-for-byte, which is what lets
// independently generated chunks share bit-identical edges and keeps prop
// placement seam-free.
import type { SurfaceId } from './surfaces';

// ---------------------------------------------------------------------------
// World / chunk geometry
// ---------------------------------------------------------------------------

/** Nominal world half-extent in metres: the playable world spans -768..768. */
export const NORTHERN_HALF = 768;
export const NORTHERN_CHUNK_SIZE = 96;
export const NORTHERN_CHUNK_CELLS = 40;
export const NORTHERN_CELL_SIZE = NORTHERN_CHUNK_SIZE / NORTHERN_CHUNK_CELLS; // 2.4m

/** Logical chunk coordinates for the playable world. */
export const NORTHERN_MIN_NOMINAL_CHUNK = -8;
export const NORTHERN_MAX_NOMINAL_CHUNK = 7;
/** One extra chunk of apron on every side, used so edge chunks always have real neighbour data. */
export const NORTHERN_MIN_CHUNK = NORTHERN_MIN_NOMINAL_CHUNK - 1;
export const NORTHERN_MAX_CHUNK = NORTHERN_MAX_NOMINAL_CHUNK + 1;
/** Half-extent of the world including the apron ring, in metres. */
export const NORTHERN_APRON_HALF = NORTHERN_HALF + NORTHERN_CHUNK_SIZE;

const CHUNK_SPAN = NORTHERN_MAX_CHUNK - NORTHERN_MIN_CHUNK + 1; // 18
/** Total lattice cells / vertices spanning the whole apron, on one axis. */
export const NORTHERN_LATTICE_CELLS = CHUNK_SPAN * NORTHERN_CHUNK_CELLS; // 720
export const NORTHERN_LATTICE_VERTS = NORTHERN_LATTICE_CELLS + 1; // 721

export function isNominalChunk(cx: number, cz: number): boolean {
  return cx >= NORTHERN_MIN_NOMINAL_CHUNK && cx <= NORTHERN_MAX_NOMINAL_CHUNK
    && cz >= NORTHERN_MIN_NOMINAL_CHUNK && cz <= NORTHERN_MAX_NOMINAL_CHUNK;
}

export function isChunkInBounds(cx: number, cz: number): boolean {
  return cx >= NORTHERN_MIN_CHUNK && cx <= NORTHERN_MAX_CHUNK
    && cz >= NORTHERN_MIN_CHUNK && cz <= NORTHERN_MAX_CHUNK;
}

// ---------------------------------------------------------------------------
// Small deterministic numeric helpers
// ---------------------------------------------------------------------------

export const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Cheap, purely positional hash for colour speckle / dithering — no shared state. */
function hash01(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Integer hash for seeding per-cell prop RNGs from grid coordinates alone. */
function hashInt(a: number, b: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) ^ (a << 13);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Mulberry32: small, fast, deterministic PRNG for a given integer seed. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Polylines: shared machinery for both authored roads and river channels
// ---------------------------------------------------------------------------

type Point = { x: number; z: number };
type Polyline = Point[];

/** Perpendicular distance to the nearest segment, plus a 0..1 fraction along the whole line. */
function polylineSample(line: Polyline, x: number, z: number): { distance: number; t: number } {
  let bestDistSq = Infinity;
  let bestT = 0;
  let cumulative = 0;
  let totalLength = 0;
  for (let i = 0; i < line.length - 1; i++) {
    totalLength += Math.hypot(line[i + 1].x - line[i].x, line[i + 1].z - line[i].z);
  }
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1e-6;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (len * len), 0, 1);
    const px = a.x + t * dx;
    const pz = a.z + t * dz;
    const distSq = (x - px) ** 2 + (z - pz) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestT = totalLength > 0 ? (cumulative + t * len) / totalLength : 0;
    }
    cumulative += len;
  }
  return { distance: Math.sqrt(bestDistSq), t: bestT };
}

type RouteProfile = { ts: number[]; elevations: number[] };

function buildRouteProfile(line: Polyline, elevationAt: (p: Point) => number): RouteProfile {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const d = Math.hypot(line[i + 1].x - line[i].x, line[i + 1].z - line[i].z);
    lengths.push(d);
    total += d;
  }
  const ts = [0];
  let cumulative = 0;
  for (const len of lengths) {
    cumulative += len;
    ts.push(total > 0 ? cumulative / total : 1);
  }
  return { ts, elevations: line.map(elevationAt) };
}

function profileElevation(profile: RouteProfile, t: number): number {
  const { ts, elevations } = profile;
  for (let i = 0; i < ts.length - 1; i++) {
    if (t <= ts[i + 1] || i === ts.length - 2) {
      const span = ts[i + 1] - ts[i] || 1e-6;
      const local = clamp((t - ts[i]) / span, 0, 1);
      return lerp(elevations[i], elevations[i + 1], local);
    }
  }
  return elevations[elevations.length - 1];
}

// ---------------------------------------------------------------------------
// Authored geography
// ---------------------------------------------------------------------------

/** North-east snow peaks. */
const MOUNTAIN = { x: 520, z: -500, rx: 280, rz: 300, peak: 150 };
/** South-east volcanic uplands. */
const UPLAND = { x: 520, z: 470, radius: 270, peak: 95 };
/** Central lake, sitting well above sea level. */
const LAKE = { x: 0, z: 180, rx: 95, rz: 135, level: 30, bedDrop: 12 };

/** Glacial meltwater stream: mountains down to the lake's north-east inlet. */
const RIVER_IN_LINE: Polyline = [
  { x: 430, z: -560 }, { x: 320, z: -400 }, { x: 230, z: -250 }, { x: 140, z: -90 }, { x: 62, z: 40 },
];
const RIVER_IN_SOURCE_LEVEL = 96;

/** Lake outlet: south-west down to the fjord mouth. */
const RIVER_OUT_LINE: Polyline = [
  { x: -95, z: 195 }, { x: -220, z: 178 }, { x: -350, z: 208 }, { x: -455, z: 188 },
];

function shoreX(z: number): number {
  const meander = 22 * Math.sin(z * 0.006) + 9 * Math.sin(z * 0.021 + 1.4);
  // The coastline bulges inland around the river mouth, forming a fjord.
  const fjordBulge = 235 * Math.exp(-(((z - 190) / 85) ** 2));
  return -690 + meander + fjordBulge;
}

function mountainHeight(x: number, z: number): number {
  const r = Math.hypot((x - MOUNTAIN.x) / MOUNTAIN.rx, (z - MOUNTAIN.z) / MOUNTAIN.rz);
  if (r >= 1) return 0;
  const ridge = 0.85 + 0.15 * Math.sin(Math.atan2(z - MOUNTAIN.z, x - MOUNTAIN.x) * 3);
  return MOUNTAIN.peak * ridge * (1 - smooth(r));
}

function uplandHeight(x: number, z: number): number {
  const r = Math.hypot(x - UPLAND.x, z - UPLAND.z) / UPLAND.radius;
  if (r >= 1) return 0;
  // A broad rounded highland with a shallow, non-hazardous caldera bowl at its heart.
  if (r < 0.22) return UPLAND.peak * (0.7 + 0.3 * smooth((r - 0.05) / 0.17));
  return UPLAND.peak * (1 - smooth((r - 0.22) / 0.78));
}

function forestHills(x: number, z: number): number {
  const hill = (cx: number, cz: number, spread: number, height: number) =>
    height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / spread ** 2);
  return hill(150, 640, 140, 14) + hill(-220, 600, 150, 10) + hill(-40, 700, 120, 8);
}

function tundraTexture(x: number, z: number): number {
  const amount = smooth((-z - 520) / 160);
  return amount * 1.4 * Math.sin(x * 0.05) * Math.sin(z * 0.047);
}

function baseElevation(x: number, z: number): number {
  return 9 + 3.2 * Math.sin(x * 0.006) * Math.cos(z * 0.0055)
    + 1.3 * Math.sin(x * 0.017 + z * 0.013)
    + 0.5 * Math.sin(x * 0.041 - z * 0.037);
}

function naturalHeight(x: number, z: number): number {
  const base = baseElevation(x, z) + forestHills(x, z) + tundraTexture(x, z);
  return base + Math.max(mountainHeight(x, z), uplandHeight(x, z));
}

type Route = { name: string; line: Polyline; width: number; band: number; profile: RouteProfile };

function makeRoute(name: string, line: Polyline, width: number, band: number): Route {
  return { name, line, width, band, profile: buildRouteProfile(line, p => naturalHeight(p.x, p.z)) };
}

/**
 * A hub south-east of the lake, well outside its banks, that every route beyond
 * the spawn approach shares — this keeps roads from cutting straight chords
 * across the lake's elliptical shoreline.
 */
const LAKE_JUNCTION: Point = { x: 160, z: 300 };

/** Authored major routes, graded smooth and kept to reasonable climbing slopes. */
export const ROUTES: Route[] = [
  makeRoute('Lake Road', [
    { x: 24, z: 560 }, { x: 60, z: 420 }, LAKE_JUNCTION,
  ], 9, 12),
  makeRoute('Mountain Road', [
    LAKE_JUNCTION, { x: 260, z: 80 }, { x: 370, z: -160 }, { x: 450, z: -350 },
    // A wide switchback keeps the final climb to the mountain base gentle.
    { x: 390, z: -443 }, { x: 500, z: -430 },
  ], 9, 12),
  makeRoute('Coast Road', [
    LAKE_JUNCTION, { x: 0, z: 350 }, { x: -200, z: 330 }, { x: -380, z: 300 }, { x: -480, z: 280 },
  ], 9, 12),
  makeRoute('Upland Road', [
    { x: 0, z: 560 }, { x: 170, z: 585 }, { x: 320, z: 545 },
    // A wide switchback keeps the final climb to the upland base gentle.
    { x: 419, z: 588 }, { x: 450, z: 485 }, { x: 505, z: 445 },
  ], 9, 12),
];

function applyRoutes(x: number, z: number, height: number): number {
  let result = height;
  for (const route of ROUTES) {
    const { distance, t } = polylineSample(route.line, x, z);
    const amount = 1 - smooth((distance - route.width / 2) / route.band);
    if (amount <= 0) continue;
    const graded = profileElevation(route.profile, t);
    result += (graded - result) * amount;
  }
  return result;
}

type WaterFeature = { amount: number; level: number; bed: number };

function waterFeatures(x: number, z: number): WaterFeature[] {
  const features: WaterFeature[] = [];

  const ldx = (x - LAKE.x) / LAKE.rx;
  const ldz = (z - LAKE.z) / LAKE.rz;
  const lakeR = Math.hypot(ldx, ldz);
  const lakeAmount = 1 - smooth((lakeR - 0.92) / 0.22);
  if (lakeAmount > 0) {
    features.push({ amount: lakeAmount, level: LAKE.level, bed: LAKE.level - LAKE.bedDrop * (1 - smooth(lakeR / 0.9)) });
  }

  const riverIn = polylineSample(RIVER_IN_LINE, x, z);
  const riverInHalfWidth = lerp(4, 9, riverIn.t);
  const riverInAmount = 1 - smooth((riverIn.distance - riverInHalfWidth) / 14);
  if (riverInAmount > 0) {
    const level = lerp(RIVER_IN_SOURCE_LEVEL, LAKE.level, riverIn.t);
    features.push({ amount: riverInAmount, level, bed: level - 3 });
  }

  const riverOut = polylineSample(RIVER_OUT_LINE, x, z);
  const riverOutHalfWidth = lerp(10, 18, riverOut.t);
  const riverOutAmount = 1 - smooth((riverOut.distance - riverOutHalfWidth) / 18);
  if (riverOutAmount > 0) {
    const level = lerp(LAKE.level, 0, riverOut.t);
    features.push({ amount: riverOutAmount, level, bed: level - 4 });
  }

  const shore = shoreX(z);
  const seaAmount = 1 - smooth((x - shore) / 45);
  if (seaAmount > 0) {
    features.push({ amount: seaAmount, level: 0, bed: -22 - 14 * smooth((shore - x) / 320) });
  }

  return features;
}

function strongestWaterFeature(features: WaterFeature[]): WaterFeature | null {
  if (!features.length) return null;
  let best = features[0];
  for (const feature of features) if (feature.amount > best.amount) best = feature;
  return best;
}

function applyWater(x: number, z: number, height: number): number {
  const best = strongestWaterFeature(waterFeatures(x, z));
  if (!best) return height;
  const amount = clamp(best.amount, 0, 1);
  return height * (1 - amount) + best.bed * amount;
}

/**
 * How far the nominal world's boundary walls reach inward before the ground starts climbing,
 * and how tall that climb ultimately gets. The rise is a broad, deterministic perimeter
 * cliff/rise around all four nominal edges (±NORTHERN_HALF) — including straight through the
 * open sea to the west, where nothing else in the terrain model would otherwise ever stop a
 * boat or vehicle from driving off the edge of the world. It is applied last, after water
 * carving, so it physically closes even carved-out water features (the sea, river mouths) once
 * they reach the boundary, while leaving everything well inside the margin — the authored
 * coast, rivers, and routes — completely untouched.
 */
const NORTHERN_EDGE_RISE_MARGIN = 70; // metres of ramp before the nominal edge
const NORTHERN_EDGE_RISE_HEIGHT = 240; // metres added at/beyond the edge — taller than any authored peak

/** 0 far from every nominal edge, ramping smoothly up to 1 at (and beyond) ±NORTHERN_HALF on
 *  whichever axis is closer to its edge — so corners rise exactly as readily as edge midpoints. */
function edgeRiseAmount(x: number, z: number): number {
  const distanceToNearestEdge = NORTHERN_HALF - Math.max(Math.abs(x), Math.abs(z));
  return 1 - smooth(distanceToNearestEdge / NORTHERN_EDGE_RISE_MARGIN);
}

function applyPerimeterRise(x: number, z: number, height: number): number {
  return height + edgeRiseAmount(x, z) * NORTHERN_EDGE_RISE_HEIGHT;
}

/** Continuous, analytic Northern Reach elevation at any real (x, z). Always finite. */
export function northernHeightAt(x: number, z: number): number {
  return applyPerimeterRise(x, z, applyWater(x, z, applyRoutes(x, z, naturalHeight(x, z))));
}

/** Local open-water surface elevation at (x, z), or null on dry land. */
export function waterHeightAt(x: number, z: number): number | null {
  const best = strongestWaterFeature(waterFeatures(x, z));
  if (!best || best.amount < 0.5) return null;
  const ground = northernHeightAt(x, z);
  return ground < best.level ? best.level : null;
}

export function northernSurfaceAt(x: number, z: number): SurfaceId {
  if (waterHeightAt(x, z) !== null) return 'water';

  const strongest = strongestWaterFeature(waterFeatures(x, z));
  if (strongest && strongest.amount > 0.02) return 'mud';

  const mountain = mountainHeight(x, z);
  const height = northernHeightAt(x, z);
  if (mountain > 55 || height > 95) return 'snow';

  if (uplandHeight(x, z) > 18) return 'rock';

  if (z < -520) {
    const n = hash01(x, z);
    return n < 0.35 ? 'snow' : n < 0.55 ? 'mud' : 'dirt';
  }

  const beachDistance = x - shoreX(z);
  if (beachDistance > 0 && beachDistance < 55) return 'sand';

  for (const route of ROUTES) {
    if (polylineSample(route.line, x, z).distance < route.width / 2 + 3) return 'dirt';
  }

  if (z > 300) return hash01(x * 0.3, z * 0.3) < 0.12 ? 'dirt' : 'grass';
  return 'grass';
}

const SURFACE_BASE_COLOR: Record<SurfaceId, [number, number, number]> = {
  grass: [0.42, 0.56, 0.32],
  dirt: [0.56, 0.44, 0.29],
  water: [0.24, 0.42, 0.55],
  snow: [0.93, 0.95, 0.97],
  mud: [0.34, 0.27, 0.19],
  rock: [0.47, 0.46, 0.45],
  sand: [0.76, 0.67, 0.48],
  ash: [0.2, 0.21, 0.22],
  lava: [0.35, 0.12, 0.08],
  moss: [0.35, 0.45, 0.28],
  ice: [0.75, 0.87, 0.9],
};

function surfaceColor(surface: SurfaceId, x: number, z: number): [number, number, number] {
  const base = SURFACE_BASE_COLOR[surface];
  const speckle = 0.9 + hash01(x * 0.7, z * 0.7) * 0.2;
  return [clamp(base[0] * speckle, 0, 1), clamp(base[1] * speckle, 0, 1), clamp(base[2] * speckle, 0, 1)];
}

// ---------------------------------------------------------------------------
// The shared global lattice — the single source of truth for both the
// per-chunk meshes and sampledHeightAt, guaranteeing bit-identical values.
// ---------------------------------------------------------------------------

function latticeX(gi: number): number {
  return Math.fround(NORTHERN_MIN_CHUNK * NORTHERN_CHUNK_SIZE + gi * NORTHERN_CELL_SIZE);
}

function latticeHeight(gi: number, gj: number): number {
  return Math.fround(northernHeightAt(latticeX(gi), latticeX(gj)));
}

/** Barycentric interpolation of the exact Float32 lattice, using the same diagonal as the mesh. */
export function sampledHeightAt(x: number, z: number): number {
  const clampedX = clamp(x, -NORTHERN_APRON_HALF, NORTHERN_APRON_HALF);
  const clampedZ = clamp(z, -NORTHERN_APRON_HALF, NORTHERN_APRON_HALF);
  const gx = clamp((clampedX - NORTHERN_MIN_CHUNK * NORTHERN_CHUNK_SIZE) / NORTHERN_CELL_SIZE, 0, NORTHERN_LATTICE_CELLS);
  const gz = clamp((clampedZ - NORTHERN_MIN_CHUNK * NORTHERN_CHUNK_SIZE) / NORTHERN_CELL_SIZE, 0, NORTHERN_LATTICE_CELLS);
  let gi = Math.min(NORTHERN_LATTICE_CELLS - 1, Math.floor(gx));
  let gj = Math.min(NORTHERN_LATTICE_CELLS - 1, Math.floor(gz));
  if (gi > 0 && clampedX < latticeX(gi)) gi--;
  if (gi < NORTHERN_LATTICE_CELLS - 1 && clampedX > latticeX(gi + 1)) gi++;
  if (gj > 0 && clampedZ < latticeX(gj)) gj--;
  if (gj < NORTHERN_LATTICE_CELLS - 1 && clampedZ > latticeX(gj + 1)) gj++;
  const x0 = latticeX(gi);
  const x1 = latticeX(gi + 1);
  const z0 = latticeX(gj);
  const z1 = latticeX(gj + 1);
  const u = (clampedX - x0) / (x1 - x0);
  const v = (clampedZ - z0) / (z1 - z0);
  const a = latticeHeight(gi, gj);
  const b = latticeHeight(gi + 1, gj);
  const c = latticeHeight(gi, gj + 1);
  const d = latticeHeight(gi + 1, gj + 1);
  // Same a-c-b / b-c-d split used to build every chunk's index buffer.
  return u + v <= 1 ? a + u * (b - a) + v * (c - a)
    : d + (1 - u) * (c - d) + (1 - v) * (b - d);
}

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

// x=0 sits exactly on a chunk boundary (chunks span [cx*96, (cx+1)*96)); a settle-frame's worth
// of drift to x<0 on some engines (observed on WebKit) immediately crosses into the neighbouring
// chunk column, so x is nudged to 24 — still on the safe dry apron near (0, 560), but solidly
// interior to chunk (0, 5) with headroom before the next boundary.
export const NORTHERN_SPAWN = { x: 24, y: sampledHeightAt(24, 560) + 1.25, z: 560 };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Compact numeric prop kinds, indexed by NorthernProps.type. */
export const NORTHERN_PROP_TYPES = [
  'tree', 'roadsideRock', 'snowRock', 'reed', 'driftwood', 'shrub', 'volcanicSpike',
] as const;

function propDensityAt(surface: SurfaceId, z: number): number {
  switch (surface) {
    case 'grass': return z > 300 ? 0.55 : 0.16;
    case 'dirt': return 0.04;
    case 'snow': return 0.12;
    case 'rock': return 0.22;
    case 'mud': return 0.25;
    case 'sand': return 0.1;
    default: return 0;
  }
}

function propTypeFor(surface: SurfaceId, rand: () => number): number {
  switch (surface) {
    case 'grass': return rand() < 0.7 ? 0 : 5;
    case 'dirt': return 1;
    case 'snow': return 2;
    case 'rock': return 6;
    case 'mud': return 3;
    case 'sand': return 4;
    default: return 5;
  }
}

const PROPS_PER_CHUNK_AXIS = NORTHERN_CHUNK_CELLS / 2; // 20 prop cells per chunk axis
const PROP_CELL_SIZE = NORTHERN_CHUNK_SIZE / PROPS_PER_CHUNK_AXIS; // 4.8m

export type NorthernProps = {
  count: number;
  type: Uint8Array;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  rotationY: Float32Array;
  scale: Float32Array;
};

function generateNorthernProps(cx: number, cz: number): NorthernProps {
  const chunkMinX = cx * NORTHERN_CHUNK_SIZE;
  const chunkMinZ = cz * NORTHERN_CHUNK_SIZE;
  const type: number[] = [];
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  const rotationY: number[] = [];
  const scale: number[] = [];

  for (let lj = 0; lj < PROPS_PER_CHUNK_AXIS; lj++) {
    for (let li = 0; li < PROPS_PER_CHUNK_AXIS; li++) {
      // Ownership of every prop cell is fixed by its global grid index, never by the
      // jittered position, so no candidate can ever be emitted by two neighbouring chunks.
      const globalCellX = cx * PROPS_PER_CHUNK_AXIS + li;
      const globalCellZ = cz * PROPS_PER_CHUNK_AXIS + lj;
      const rand = mulberry32(hashInt(globalCellX, globalCellZ));
      const centerX = chunkMinX + (li + 0.5) * PROP_CELL_SIZE;
      const centerZ = chunkMinZ + (lj + 0.5) * PROP_CELL_SIZE;
      const surface = northernSurfaceAt(centerX, centerZ);
      const density = propDensityAt(surface, centerZ);
      if (density <= 0 || rand() >= density) continue;

      const jitterX = (rand() - 0.5) * PROP_CELL_SIZE * 0.8;
      const jitterZ = (rand() - 0.5) * PROP_CELL_SIZE * 0.8;
      const px = clamp(centerX + jitterX, chunkMinX, chunkMinX + NORTHERN_CHUNK_SIZE - 1e-4);
      const pz = clamp(centerZ + jitterZ, chunkMinZ, chunkMinZ + NORTHERN_CHUNK_SIZE - 1e-4);

      if (waterHeightAt(px, pz) !== null) continue;
      if (Math.hypot(px - NORTHERN_SPAWN.x, pz - NORTHERN_SPAWN.z) < 14) continue;
      if (ROUTES.some(route => polylineSample(route.line, px, pz).distance < route.width / 2 + 2)) continue;

      type.push(propTypeFor(surface, rand));
      x.push(px);
      z.push(pz);
      y.push(sampledHeightAt(px, pz));
      rotationY.push(rand() * Math.PI * 2);
      scale.push(0.7 + rand() * 0.8);
    }
  }

  return {
    count: type.length,
    type: Uint8Array.from(type),
    x: Float32Array.from(x),
    y: Float32Array.from(y),
    z: Float32Array.from(z),
    rotationY: Float32Array.from(rotationY),
    scale: Float32Array.from(scale),
  };
}

// ---------------------------------------------------------------------------
// Chunk generation
// ---------------------------------------------------------------------------

export type NorthernChunk = {
  cx: number;
  cz: number;
  nominal: boolean;
  vertexCount: number;
  /** Interleaved x, y, z render/collision mesh vertices (Float32, transferable). */
  vertices: Float32Array;
  /** Triangle indices into `vertices` (Uint32, transferable). */
  indices: Uint32Array;
  /** Interleaved r, g, b per-vertex colour, 0..1 (Float32, transferable). */
  colors: Float32Array;
  /** Optional flat water surface mesh sharing the same lattice positions; null when the chunk is dry. */
  waterVertices: Float32Array | null;
  waterIndices: Uint32Array | null;
  waterColors: Float32Array | null;
  props: NorthernProps;
};

type WaterVertex = {
  x: number;
  y: number;
  z: number;
  depth: number;
  wet: boolean;
};

function waterVertexAt(x: number, z: number): WaterVertex {
  const best = strongestWaterFeature(waterFeatures(x, z));
  const ground = northernHeightAt(x, z);
  if (!best) return { x, y: ground, z, depth: 0, wet: false };
  const depth = best.level - ground;
  return {
    x,
    y: best.level + 0.015,
    z,
    depth: Math.max(0, depth),
    wet: best.amount >= 0.5 && depth > 0,
  };
}

function waterMidpoint(a: WaterVertex, b: WaterVertex): WaterVertex {
  return waterVertexAt((a.x + b.x) / 2, (a.z + b.z) / 2);
}

function waterBoundary(a: WaterVertex, b: WaterVertex): WaterVertex {
  let wet = a.wet ? a : b;
  let dry = a.wet ? b : a;
  // Leave a small wet-side margin so Float32 transfer cannot move the
  // rendered edge outside the authoritative analytic shoreline.
  for (let i = 0; i < 8; i++) {
    const midpoint = waterMidpoint(wet, dry);
    if (midpoint.wet) wet = midpoint;
    else dry = midpoint;
  }
  return wet;
}

function clipWaterTriangle(triangle: WaterVertex[]): WaterVertex[] {
  const clipped: WaterVertex[] = [];
  for (let i = 0; i < triangle.length; i++) {
    const current = triangle[i];
    const previous = triangle[(i + triangle.length - 1) % triangle.length];
    if (current.wet !== previous.wet) clipped.push(waterBoundary(previous, current));
    if (current.wet) clipped.push(current);
  }
  return clipped;
}

export function generateNorthernChunk(cx: number, cz: number): NorthernChunk {
  if (!Number.isInteger(cx) || !Number.isInteger(cz) || !isChunkInBounds(cx, cz)) {
    throw new RangeError(`Northern Reach chunk (${cx}, ${cz}) is outside the apron.`);
  }
  const n = NORTHERN_CHUNK_CELLS;
  const originX = (cx - NORTHERN_MIN_CHUNK) * n;
  const originZ = (cz - NORTHERN_MIN_CHUNK) * n;
  const vertexCount = (n + 1) * (n + 1);

  const vertices = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const waterLattice: WaterVertex[] = new Array(vertexCount);
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const gi = originX + i;
      const gj = originZ + j;
      const vertexIndex = j * (n + 1) + i;
      const base = vertexIndex * 3;
      const x = latticeX(gi);
      const z = latticeX(gj);
      const y = latticeHeight(gi, gj);
      vertices[base] = x;
      vertices[base + 1] = y;
      vertices[base + 2] = z;

      const surface = northernSurfaceAt(x, z);
      const color = surfaceColor(surface, x, z);
      colors[base] = color[0];
      colors[base + 1] = color[1];
      colors[base + 2] = color[2];
      waterLattice[vertexIndex] = waterVertexAt(x, z);

    }
  }

  const indices = new Uint32Array(n * n * 6);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + n + 1;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], (j * n + i) * 6);
    }
  }

  let waterVerticesOut: Float32Array | null = null;
  let waterIndicesOut: Uint32Array | null = null;
  let waterColorsOut: Float32Array | null = null;
  const waterPositions: number[] = [];
  const waterColors: number[] = [];
  const shallow: [number, number, number] = [0.55, 0.88, 0.86];
  const deep: [number, number, number] = [0.15, 0.55, 0.64];
  const emitWaterPolygon = (polygon: WaterVertex[]) => {
    for (let k = 1; k + 1 < polygon.length; k++) {
      const triangle = [polygon[0], polygon[k], polygon[k + 1]];
      const twiceArea = Math.abs(
        (triangle[1].x - triangle[0].x) * (triangle[2].z - triangle[0].z)
        - (triangle[2].x - triangle[0].x) * (triangle[1].z - triangle[0].z),
      );
      if (twiceArea < 1e-5) continue;
      const centerX = (triangle[0].x + triangle[1].x + triangle[2].x) / 3;
      const centerZ = (triangle[0].z + triangle[1].z + triangle[2].z) / 3;
      const centerHeight = waterHeightAt(centerX, centerZ);
      const renderedCenterHeight = (
        triangle[0].y + triangle[1].y + triangle[2].y
      ) / 3 - 0.015;
      if (centerHeight === null || Math.abs(renderedCenterHeight - centerHeight) > 0.075) continue;
      for (const point of triangle) {
        waterPositions.push(point.x, point.y, point.z);
        const depth = smooth(point.depth / 3);
        waterColors.push(
          lerp(shallow[0], deep[0], depth),
          lerp(shallow[1], deep[1], depth),
          lerp(shallow[2], deep[2], depth),
        );
      }
    }
  };
  const emitWaterTriangle = (triangle: WaterVertex[], depth = 0): void => {
    const wetCount = triangle.reduce((count, point) => count + Number(point.wet), 0);
    const center = waterVertexAt(
      (triangle[0].x + triangle[1].x + triangle[2].x) / 3,
      (triangle[0].z + triangle[1].z + triangle[2].z) / 3,
    );
    const interpolatedCenterY = triangle.reduce((sum, point) => sum + point.y, 0) / 3;
    const levelError = center.wet ? Math.abs(center.y - interpolatedCenterY) : 0;
    const refinementLimit = levelError > 0.075 ? 6 : 2;
    const needsRefinement = depth < refinementLimit
      && (
        wetCount > 0 && wetCount < 3
        || center.wet !== triangle[0].wet
        || levelError > 0.075
      );
    if (needsRefinement) {
      const ab = waterMidpoint(triangle[0], triangle[1]);
      const bc = waterMidpoint(triangle[1], triangle[2]);
      const ca = waterMidpoint(triangle[2], triangle[0]);
      emitWaterTriangle([triangle[0], ab, ca], depth + 1);
      emitWaterTriangle([ab, triangle[1], bc], depth + 1);
      emitWaterTriangle([ca, bc, triangle[2]], depth + 1);
      emitWaterTriangle([ab, bc, ca], depth + 1);
      return;
    }
    if (wetCount === 0 && !center.wet) return;
    emitWaterPolygon(clipWaterTriangle(triangle));
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + n + 1;
      const d = c + 1;
      for (const triangle of [[a, c, b], [b, c, d]]) {
        emitWaterTriangle(triangle.map(index => waterLattice[index]));
      }
    }
  }
  if (waterPositions.length > 0) {
    waterVerticesOut = Float32Array.from(waterPositions);
    waterIndicesOut = Uint32Array.from({ length: waterPositions.length / 3 }, (_, index) => index);
    waterColorsOut = Float32Array.from(waterColors);
  }

  return {
    cx, cz, nominal: isNominalChunk(cx, cz), vertexCount,
    vertices, indices, colors,
    waterVertices: waterVerticesOut, waterIndices: waterIndicesOut, waterColors: waterColorsOut,
    props: generateNorthernProps(cx, cz),
  };
}
