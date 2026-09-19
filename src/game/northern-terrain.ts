import { VALLEY_TRAIL, VALLEY_MARKERS, VALLEY_CAIRNS, valleyWeight, valleyRiverWeight, valleyFordAmount, valleyHills, valleyTrailSample, valleyRiverBed, valleyRiverCenter } from './northern-valley';
import { FOREST_TRAILS, FOREST_SIGNS, FOREST_CAIRNS, FOREST_OUTCROPS, FOREST_GROVES, FOREST_LOOKOUT, forestWeight, forestRelief, forestTrailSample, forestTrailElevation } from './northern-forest';
// The Northern Reach: a fixed, finite, chunk-streamed world model.
//
// Every export here is a pure function of (x, z) or (cx, cz) — there is no
// hidden mutable state and no wall-clock or global RNG. The same inputs
// always produce the same outputs, byte-for-byte, which is what lets
// independently generated chunks share bit-identical edges and keeps prop
// placement seam-free.
import type { SurfaceId } from './surfaces';
import { applyWestCoast } from './northern-west';
import { LAKE_LEVEL, watershedFeatures } from './northern-watershed';
import { applyAdventures, adventureSurface, adventureTrailDistance, ADVENTURE_PROPS } from './northern-adventures';
import { applyMarsh, marshWeight, marshTrailSample, marshPoolRadius, MARSH_POOLS, MARSH_START, MARSH_LOOKOUT, MARSH_SIGNS, MARSH_WILLOWS } from './northern-marsh';
import { applyEmber, emberWeight, emberRadius, emberTrailSample, EMBER_START, EMBER_LOOKOUT, EMBER_FLOOR, EMBER_SIGNS, EMBER_COLUMNS } from './northern-ember';
import { applyPass, passWeight, passTrailSample, passBowlRadius, PASS_TRAILS, PASS_SIGNS, PASS_TORS, PASS_START, PASS_LOOKOUT } from './northern-pass';
import { applyCoast, coastShoreX, coastWeight, coastTrailSample, COAST_STACKS, COAST_SIGNS } from './northern-coast';

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

/** Lake outlet: south-west down to the fjord mouth. */
const RIVER_OUT_LINE: Polyline = [
  { x: -95, z: 195 }, { x: -220, z: 178 }, { x: -350, z: 208 }, { x: -455, z: 188 },
];

function shoreX(z: number): number {
  return coastShoreX(z);
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
  return base + Math.max(mountainHeight(x, z), uplandHeight(x, z)) + valleyHills(x, z);
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

const FOREST_PROFILES = FOREST_TRAILS.map(trail => trail.points.map(p => naturalHeight(p.x, p.z) + forestRelief(p.x, p.z)));

function applyForest(x: number, z: number, ground: number): number {
  const weight = forestWeight(x, z);
  if (!weight) return ground;
  let shaped = ground + forestRelief(x, z);
  const trail = forestTrailSample(x, z);
  if (trail.distance < 10) {
    const grade = forestTrailElevation(x, z, FOREST_PROFILES);
    shaped = lerp(shaped, grade, 1 - smooth((trail.distance - 3.8) / 6));
  }
  // A level resting place faces the lake; its perimeter is gently graded.
  const clearing = 1 - smooth((Math.hypot(x - FOREST_LOOKOUT.x, z - FOREST_LOOKOUT.z) - 5) / 20);
  shaped = lerp(shaped, FOREST_PROFILES[0][6] - 2.1, clearing);
  // Preserve the established roads and the original safe spawn clearing.
  const roadDistance = Math.min(...ROUTES.map(route => polylineSample(route.line, x, z).distance));
  const preserve = smooth((roadDistance - 6) / 15) * smooth((Math.hypot(x - 24, z - 560) - 16) / 16);
  return lerp(ground, shaped, weight * preserve);
}

function applyRoutes(x: number, z: number, height: number): number {
  let result = height;
  for (const route of ROUTES) {
    const { distance, t } = polylineSample(route.line, x, z);
    const amount = 1 - smooth((distance - route.width / 2) / route.band);
    if (amount <= 0) continue;
    const graded = profileElevation(route.profile, t);
    result += (graded - result) * amount;
  }
  if (valleyWeight(x, z) > 0 || (x > -220 && x < -170 && z > 270 && z < 340)) {
    const trail = valleyTrailSample(x, z);
    const a = VALLEY_TRAIL[trail.segment], b = VALLEY_TRAIL[trail.segment + 1];
    const grade = lerp(naturalHeight(a.x, a.z), naturalHeight(b.x, b.z), trail.fraction);
    result = lerp(result, grade, 1 - smooth((trail.distance - 3.5) / 6));
  }
  return result;
}

type WaterFeature = { amount: number; level: number; bed: number; containsWater?: boolean };

function waterFeatures(x: number, z: number): WaterFeature[] {
  const features: WaterFeature[] = [];
  if (marshWeight(x, z) > 0) for (const pool of MARSH_POOLS) {
    const r = marshPoolRadius(x, z, pool);
    if (r < 1.35) features.push({ amount: 1 - smooth((r - 0.9) / 0.45), level: pool.level, bed: pool.level - 1.3 });
  }

  features.push(...watershedFeatures(x, z));

  const rawOutlet = polylineSample(RIVER_OUT_LINE, x, z);
  const pilot = valleyRiverWeight(x);
  // One continuous longitudinal profile avoids nearest-segment jumps at the old river bend.
  const riverOut = {
    distance: lerp(rawOutlet.distance, Math.abs(z - valleyRiverCenter(x)) / Math.hypot(1, 30 / 130), pilot),
    t: lerp(rawOutlet.t, clamp((-95 - x) / 360, 0, 1), pilot),
  };
  const riverOutHalfWidth = lerp(10, 18, riverOut.t);
  const riverOutAmount = 1 - smooth((riverOut.distance - riverOutHalfWidth) / 18);
  if (riverOutAmount > 0 || riverOut.distance < 96) {
    const level = LAKE_LEVEL * (1 - smooth((-x - 165) / 290));
    const wideBanks = 1 - smooth((riverOut.distance - 26) / 70);
    features.push({
      amount: wideBanks, level,
      containsWater: riverOut.distance < riverOutHalfWidth + 12,
      bed: level + valleyRiverBed(riverOut.distance, riverOutHalfWidth, x),
    });
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
  for (const feature of features) if (feature.amount > best.amount
    || (feature.amount === best.amount && feature.bed < best.bed)) best = feature;
  return best;
}

function applyWater(x: number, z: number, height: number): number {
  const best = strongestWaterFeature(waterFeatures(x, z));
  if (!best) return height;
  const amount = clamp(best.amount, 0, 1);
  const carved = height * (1 - amount) + best.bed * amount;
  const roadDistance = Math.min(...ROUTES.map(route => polylineSample(route.line, x, z).distance));
  const dryRoad = Math.max(height, lerp(height, best.level + 0.9, smooth((amount - 0.15) / 0.3)));
  return lerp(carved, dryRoad, 1 - smooth((roadDistance - 6) / 12));
}

// Regrade the dry ridge links to the lowered outlet, retaining the shallow ford beds.
const VALLEY_BANK_PROFILE = VALLEY_TRAIL.map(p => p.x === -270 && p.z === 115 ? 15.9
  : applyWater(p.x, p.z, naturalHeight(p.x, p.z)));
function applyValleyBankLinks(x: number, z: number, height: number): number {
  const trail = valleyTrailSample(x, z);
  if (trail.distance >= 10 || trail.segment === 3 || trail.segment === 8) return height;
  const grade = lerp(VALLEY_BANK_PROFILE[trail.segment], VALLEY_BANK_PROFILE[trail.segment + 1], trail.fraction);
  return lerp(height, grade, 1 - smooth((trail.distance - 4) / 6));
}

/**
 * How far the nominal world's boundary walls reach inward before the ground starts climbing,
 * and how tall that climb ultimately gets. The rise is a broad, deterministic perimeter
 * cliff/rise around the land edges (±NORTHERN_HALF). The western sea remains open
 * between the northern and southern corner transitions. It is applied last, after water
 * carving, so it physically closes even carved-out water features (the sea, river mouths) once
 * they reach the boundary, while leaving everything well inside the margin — the authored
 * coast, rivers, and routes — completely untouched.
 */
const NORTHERN_EDGE_RISE_MARGIN = 70; // metres of ramp before the nominal edge
const NORTHERN_EDGE_RISE_HEIGHT = 240; // metres added at/beyond the edge — taller than any authored peak

/** 0 far from every nominal edge, ramping smoothly up to 1 at (and beyond) ±NORTHERN_HALF on
 *  whichever axis is closer to its edge — so corners rise exactly as readily as edge midpoints. */
function edgeRiseAmount(x: number, z: number): number {
  const landEdges = 1 - smooth((NORTHERN_HALF - Math.max(x, Math.abs(z))) / NORTHERN_EDGE_RISE_MARGIN);
  const westernRise = (1 - smooth((NORTHERN_HALF + x) / NORTHERN_EDGE_RISE_MARGIN))
    * smooth((Math.abs(z) - 655) / 60);
  return Math.max(landEdges, westernRise);
}

function applyPerimeterRise(x: number, z: number, height: number): number {
  return height + edgeRiseAmount(x, z) * NORTHERN_EDGE_RISE_HEIGHT;
}

/** Continuous, analytic Northern Reach elevation at any real (x, z). Always finite. */
function authoredGround(x: number, z: number): number {
  const roads = applyRoutes(x, z, naturalHeight(x, z));
  const forest = applyForest(x, z, roads);
  const coast = applyCoast(x, z, applyValleyBankLinks(x, z, applyWestCoast(x,z,applyWater(x, z, forest))));
  const uplands = applyEmber(x, z, applyPass(x, z, coast));
  return applyAdventures(x, z, applyMarsh(x, z, uplands));
}

export function northernHeightAt(x: number, z: number): number {
  let ground = authoredGround(x, z);
  // A small level turnout keeps the optional valley spawn and reset from rolling downhill.
  const clearing = 1 - smooth((Math.hypot(x + 240, z - 232) - 5) / 16);
  if (clearing > 0) ground = lerp(ground, authoredGround(-240, 232), clearing);
  return applyPerimeterRise(x, z, ground);
}

/** Local open-water surface elevation at (x, z), or null on dry land. */
export function waterHeightAt(x: number, z: number): number | null {
  const best = strongestWaterFeature(waterFeatures(x, z));
  if (!best || best.amount < 0.5 || best.containsWater === false) return null;
  const ground = sampledHeightAt(x, z);
  return ground < best.level ? best.level : null;
}

export function northernSurfaceAt(x: number, z: number): SurfaceId {
  if (waterHeightAt(x, z) !== null) return 'water';
  const adventure = adventureSurface(x, z);
  if (adventure) return adventure;

  if (marshWeight(x, z) > 0.2) {
    if (marshTrailSample(x, z).distance < 5) return 'dirt';
    if (MARSH_POOLS.some(p => marshPoolRadius(x, z, p) < 1.15)) return 'mud';
    return 'moss';
  }

  if (emberWeight(x, z) > 0.2) {
    if (emberRadius(x, z) < 0.68) return 'ash';
    if (emberTrailSample(x, z).distance < 5.5) return 'dirt';
    // Cooled basalt tongues alternate with ochre scree and low moss patches.
    if (Math.abs(x - 650 - 9 * Math.sin(z * 0.06)) < 10 && z > 395 && z < 510) return 'rock';
    return z > 515 && x < 615 ? 'moss' : emberRadius(x, z) < 1.12 ? 'ash' : 'rock';
  }

  if (passWeight(x, z) > 0.2) {
    if (passBowlRadius(x, z) < 0.65) return 'ice';
    if (passTrailSample(x, z).distance < 5.5) return 'rock';
    return 'snow';
  }

  if (coastWeight(x, z) > 0.2) {
    const d = x - shoreX(z);
    if (coastTrailSample(x, z).distance < 4.5) return d < 50 ? 'sand' : 'dirt';
    return d < 44 ? 'sand' : d < 86 ? 'rock' : 'grass';
  }

  if (valleyTrailSample(x, z).distance < 4.5) return 'dirt';
  if (forestWeight(x, z) > 0.1) {
    if (forestTrailSample(x, z).distance < 4.5 || Math.hypot(x - FOREST_LOOKOUT.x, z - FOREST_LOOKOUT.z) < 7) return 'dirt';
    if (!ROUTES.some(route => polylineSample(route.line, x, z).distance < route.width / 2 + 3)) {
      if (x < -120 && x > -175 && z > 440 && z < 486) return 'rock';
      return Math.abs(x + 72) < 20 && z > 428 && z < 512 ? 'moss' : 'grass';
    }
  }
  if (valleyWeight(x, z) > 0.2) {
    const bankDistance = Math.abs(z - valleyRiverCenter(x));
    if (bankDistance < 25) return valleyFordAmount(x) > 0.5 ? 'sand' : 'mud';
    if (valleyHills(x, z) > 5.5) return 'rock';
    return bankDistance < 45 ? 'moss' : 'grass';
  }
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
  let base = SURFACE_BASE_COLOR[surface];
  if (marshWeight(x, z) > 0.2) {
    if (surface === 'moss') base = [0.32, 0.49, 0.3];
    if (surface === 'dirt') base = [0.56, 0.48, 0.32];
    if (surface === 'mud') base = [0.32, 0.3, 0.21];
  }
  if (emberWeight(x, z) > 0.2) {
    if (surface === 'rock') base = [0.24, 0.23, 0.22];
    if (surface === 'dirt') base = [0.58, 0.32, 0.17];
    if (surface === 'ash') base = [0.38, 0.32, 0.29];
  }
  if (passWeight(x, z) > 0.2) {
    if (surface === 'ice') base = [0.3, 0.65, 0.78];
    if (surface === 'rock') base = [0.3, 0.34, 0.37];
  }
  const coastal = coastWeight(x, z);
  if (coastal > 0 && (surface === 'rock' || surface === 'sand' || surface === 'dirt')) {
    const palette = surface === 'rock' ? [0.29, 0.34, 0.32] : surface === 'sand' ? [0.59, 0.56, 0.47] : [0.4, 0.3, 0.19];
    base = [lerp(base[0], palette[0], coastal), lerp(base[1], palette[1], coastal), lerp(base[2], palette[2], coastal)];
  }
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
  'tree', 'roadsideRock', 'snowRock', 'reed', 'driftwood', 'shrub', 'volcanicSpike', 'fordPost', 'valleySign', 'willow', 'riverRipple', 'forestPine', 'forestSign', 'coastStack', 'coastLog', 'coastSign', 'passSign', 'graniteTor', 'emberSign', 'basaltColumn', 'marshSign', 'timberSign', 'shoalSign', 'basinSign', 'trailLog', 'shoalBoulder',
  'windSign', 'terraceSign', 'weatheredArch', 'layeredRock', 'rockRamp', 'lakeSign', 'riverSign',
  'westSign',
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
      if (adventureTrailDistance(px, pz) < 10) continue;
      if (marshTrailSample(px, pz).distance < 9) continue;
      if (Math.hypot(px - MARSH_START.x, pz - MARSH_START.z) < 13 || Math.hypot(px - MARSH_LOOKOUT.x, pz - MARSH_LOOKOUT.z) < 13) continue;
      if (emberTrailSample(px, pz).distance < 10) continue;
      if ([EMBER_START, EMBER_LOOKOUT, EMBER_FLOOR].some(p => Math.hypot(px - p.x, pz - p.z) < 13)) continue;
      if (passTrailSample(px, pz).distance < 10 || (passWeight(px, pz) > 0 && passBowlRadius(px, pz) < 1.2)) continue;
      if (Math.hypot(px - PASS_START.x, pz - PASS_START.z) < 13 || Math.hypot(px - PASS_LOOKOUT.x, pz - PASS_LOOKOUT.z) < 13) continue;
      if (coastTrailSample(px, pz).distance < 8) continue;
      if (forestTrailSample(px, pz).distance < 7) continue;
      if (Math.hypot(px - FOREST_LOOKOUT.x, pz - FOREST_LOOKOUT.z) < 13) continue;
      if (valleyTrailSample(px, pz).distance < 6) continue;
      if (valleyFordAmount(px) > 0.2 && valleyWeight(px, pz) > 0 && polylineSample(RIVER_OUT_LINE, px, pz).distance < 43) continue;
      if (Math.hypot(px - NORTHERN_SPAWN.x, pz - NORTHERN_SPAWN.z) < 14) continue;
      if (ROUTES.some(route => polylineSample(route.line, px, pz).distance < route.width / 2 + 2)) continue;

      let kind = propTypeFor(surface, rand);
      if (adventureSurface(px, pz) && kind === 6) kind = 1;
      if (emberWeight(px, pz) > 0.2 && kind === 6) kind = 1;
      if (passWeight(px, pz) > 0.2 && kind === 6) kind = 2;
      if (coastWeight(px, pz) > 0.2 && (kind === 6 || kind === 4)) kind = 1;
      type.push(kind === 0 && valleyWeight(px, pz) > 0.5 ? 9 : kind);
      x.push(px);
      z.push(pz);
      y.push(sampledHeightAt(px, pz));
      rotationY.push(rand() * Math.PI * 2);
      scale.push(0.7 + rand() * 0.8);
    }
  }

  const authoredProp = (px: number, pz: number, kind: number, size: number, lift = 0, angle = 0) => {
    if (px < chunkMinX || px >= chunkMinX + NORTHERN_CHUNK_SIZE || pz < chunkMinZ || pz >= chunkMinZ + NORTHERN_CHUNK_SIZE) return;
    type.push(kind); x.push(px); z.push(pz); y.push(sampledHeightAt(px, pz) + lift);
    rotationY.push(angle); scale.push(size);
  };
  for (const marker of VALLEY_MARKERS) authoredProp(marker.x, marker.z, 7, 1);
  for (const [px, pz] of [[-207, 322], [-231, 233], [-354, 255]]) {
    authoredProp(px, pz, 8, 1);
    authoredProp(px, pz, 7, 1);
  }
  // Hand-placed groves frame the crossings and leave their approaches unobstructed.
  for (const [gx, gz] of [[-215, 219], [-264, 152], [-365, 235], [-321, 166]]) {
    for (let i = 0; i < 7; i++) {
      const px = gx + Math.sin(i * 2.4) * (4 + i), pz = gz + Math.cos(i * 2.4) * (4 + i);
      if (valleyTrailSample(px, pz).distance < 7 || waterHeightAt(px, pz) !== null) continue;
      const size = 1.2 + (i % 3) * 0.2;
      authoredProp(px, pz, 9, size);
    }
  }
  // Low rock outcrops break up the ridges rather than blocking the trail.
  for (const [gx, gz] of [[-292, 106], [-323, 284], [-372, 152]]) {
    for (let i = 0; i < 5; i++) authoredProp(gx + i * 2.1, gz + Math.sin(i * 1.8) * 2, 1, 1.2 + (i % 3) * 0.6);
  }
  for (let px = -378; px <= -192; px += 6) {
    for (const dz of [-7, -2, 4, 8]) {
      const pz = valleyRiverCenter(px) + dz + Math.sin(px * 0.2);
      // Test chunk ownership before evaluating the local water model.
      if (px < chunkMinX || px >= chunkMinX + NORTHERN_CHUNK_SIZE || pz < chunkMinZ || pz >= chunkMinZ + NORTHERN_CHUNK_SIZE) continue;
      const level = waterHeightAt(px, pz);
      if (level !== null) authoredProp(px, pz, 10, 0.6 + hash01(px, pz) * 0.7, level - sampledHeightAt(px, pz) + 0.04);
    }
  }
  for (const cairn of VALLEY_CAIRNS) {
    authoredProp(cairn.x, cairn.z, 1, 1.25);
    authoredProp(cairn.x, cairn.z, 1, 0.8, 1.0);
    authoredProp(cairn.x, cairn.z, 1, 0.45, 1.65);
  }
  for (const sign of FOREST_SIGNS) {
    authoredProp(sign.x, sign.z, 12, 1);
    authoredProp(sign.x, sign.z, 7, 1);
  }
  for (const grove of FOREST_GROVES) for (let i = 0; i < 7; i++) {
    const px = grove.x + Math.sin(i * 2.4) * (3 + i * 1.4);
    const pz = grove.z + Math.cos(i * 2.4) * (3 + i * 1.4);
    if (forestTrailSample(px, pz).distance < 8 || ROUTES.some(route => polylineSample(route.line, px, pz).distance < 10)) continue;
    authoredProp(px, pz, 11, 0.85 + (i % 4) * 0.15);
  }
  for (const ridge of FOREST_OUTCROPS) for (let i = 0; i < 4; i++) {
    const px = ridge.x + i * 2.2, pz = ridge.z + Math.sin(i * 1.7) * 1.4;
    if (forestTrailSample(px, pz).distance < 7) continue;
    authoredProp(px, pz, 1, 1.1 + i * 0.35);
  }
  for (const cairn of FOREST_CAIRNS) {
    authoredProp(cairn.x, cairn.z, 1, 1);
    authoredProp(cairn.x, cairn.z, 1, 0.6, 0.9);
  }
  for (const prop of ADVENTURE_PROPS) {
    if (prop.kind === 'willow' && waterHeightAt(prop.x, prop.z) !== null) continue;
    authoredProp(prop.x, prop.z, NORTHERN_PROP_TYPES.indexOf(prop.kind), prop.size, 0, prop.angle ?? 0);
    if (prop.kind.endsWith('Sign')) authoredProp(prop.x, prop.z, 7, 1);
  }
  for (const sign of MARSH_SIGNS) {
    authoredProp(sign.x, sign.z, 20, 1);
    authoredProp(sign.x, sign.z, 7, 1);
  }
  for (const tree of MARSH_WILLOWS) {
    for (const [dx, dz, size] of [[0, 0, 1.3], [-5, 4, 0.85], [6, -3, 1]]) {
      const px = tree.x + dx, pz = tree.z + dz;
      if (px < chunkMinX || px >= chunkMinX + NORTHERN_CHUNK_SIZE || pz < chunkMinZ || pz >= chunkMinZ + NORTHERN_CHUNK_SIZE) continue;
      if (marshTrailSample(px, pz).distance >= 9 && waterHeightAt(px, pz) === null) authoredProp(px, pz, 9, size);
    }
  }
  for (const pool of MARSH_POOLS) for (let i = 0; i < 30; i++) {
    const angle = i * Math.PI * 2 / 30;
    const px = pool.x + Math.cos(angle) * pool.rx * 0.84, pz = pool.z + Math.sin(angle) * pool.rz * 0.84;
    if (marshTrailSample(px, pz).distance < 9) continue;
    authoredProp(px, pz, 3, 0.8 + 0.4 * Math.sin(i * 1.3) ** 2);
    authoredProp(px + 0.45, pz + 0.4, 3, 0.8);
  }
  for (const pz of [-70, -45, -20]) for (const dx of [-7, 7]) authoredProp(-267 + dx, pz, 7, 1);
  for (const sign of EMBER_SIGNS) {
    authoredProp(sign.x, sign.z, 18, 1);
    authoredProp(sign.x, sign.z, 7, 1);
  }
  for (const group of EMBER_COLUMNS) for (let i = 0; i < 5; i++) {
    const px = group.x + (i - 2) * 3.1, pz = group.z + 3 * Math.sin(i * 1.7);
    if (emberTrailSample(px, pz).distance < 10) continue;
    authoredProp(px, pz, 19, 0.6 + 0.13 * ((i * 3) % 5), 0, i * 0.4);
  }
  for (const sign of PASS_SIGNS) {
    authoredProp(sign.x, sign.z, 16, 1);
    authoredProp(sign.x, sign.z, 7, 1);
  }
  for (const tor of PASS_TORS) authoredProp(tor.x, tor.z, 17, tor.scale, 0, tor.x * 0.17);
  // Small cairns mark the outside of bends without obstructing the driving line.
  for (const p of PASS_TRAILS[1].points.slice(0, -1)) {
    const px = p.x + (p.x < 580 ? -11 : 11), pz = p.z;
    if (passTrailSample(px, pz).distance < 9) continue;
    authoredProp(px, pz, 2, 1.2);
    authoredProp(px, pz, 1, 0.65, 1.1);
  }
  for (const stack of COAST_STACKS) authoredProp(stack.x, stack.z, 13, stack.scale);
  for (const sign of COAST_SIGNS) {
    authoredProp(sign.x, sign.z, 15, 1);
    authoredProp(sign.x, sign.z, 7, 1);
  }
  for (let step = 325; step <= 500; step += 13) {
    const pz = step + 4 * Math.sin(step * 1.71);
    const shore = shoreX(pz);
    for (const d of [18, 55, 106]) {
      const px = shore + d + 6 * Math.sin(pz * 0.13 + d);
      if (coastTrailSample(px, pz).distance < 9) continue;
      authoredProp(px, pz, d === 18 ? 14 : 1, d === 18 ? 0.9 + 0.3 * Math.sin(pz) : 1.5 + 0.7 * Math.sin(pz), 0, pz * 2.39);
    }
    for (const d of [-3, 2]) {
      const px = shore + d;
      if (px < chunkMinX || px >= chunkMinX + NORTHERN_CHUNK_SIZE || pz < chunkMinZ || pz >= chunkMinZ + NORTHERN_CHUNK_SIZE) continue;
      const level = waterHeightAt(px, pz);
      if (level !== null) authoredProp(px, pz, 10, 1.2, level - sampledHeightAt(px, pz) + 0.04);
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
  const ground = sampledHeightAt(x, z);
  if (!best) return { x, y: ground, z, depth: 0, wet: false };
  const depth = best.level - ground;
  return {
    x,
    y: best.level + 0.015,
    z,
    depth: Math.max(0, depth),
    wet: best.amount >= 0.5 && best.containsWater !== false && depth > 0,
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
          lerp(shallow[0], deep[0], depth) * (valleyWeight(point.x, point.z) > 0.5 ? 0.65 : 1),
          lerp(shallow[1], deep[1], depth) * (valleyWeight(point.x, point.z) > 0.5 ? 0.84 : 1),
          lerp(shallow[2], deep[2], depth) * (valleyWeight(point.x, point.z) > 0.5 ? 0.84 : 1),
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
