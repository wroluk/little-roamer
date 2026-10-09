import { IRON_ROUTES, IRON_START, IRON_LOOKOUT, IRON_EXIT, ironHeight, ironWeight } from './mars-iron-layout';
import { GLASSFALL_ROUTES, GLASSFALL_START, GLASSFALL_LOOKOUT, GLASSFALL_SOUTH, glassfallHeight, glassfallWeight, glassfallRibbonMargin } from './mars-glassfall-layout';
import type { SurfaceId } from './surfaces';
import { DISH_ROUTES, DISH_START, DISH_LOOKOUT, DISH_SOUTH_EXIT, dishRidgeHeight, dishRegionWeight } from './mars-dish-layout';

export const MARS_HALF = 384;
export const MARS_CHUNK_SIZE = 96;
export const MARS_CELLS = 40;
export const MARS_CELL = MARS_CHUNK_SIZE / MARS_CELLS;
export type MarsPoint = { x: number; z: number; y: number };
export type MarsRoute = { name: string; points: MarsPoint[]; halfWidth?: number; surface?: SurfaceId };
export const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
const hill = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, h: number) =>
  h * Math.exp(-(((x - cx) / rx) ** 2) - ((z - cz) / rz) ** 2);
/** Independent deterministic channels avoid correlated scatter and repeating wave patterns. */
export function marsRandom(x: number, z: number, channel = 0): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(channel + 1, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const landscapeNoise = (x: number, z: number, scale: number, channel: number) => {
  const u = x / scale, v = z / scale, ix = Math.floor(u), iz = Math.floor(v);
  const a = smooth(u - ix), b = smooth(v - iz);
  const low = marsRandom(ix, iz, channel) * (1 - a) + marsRandom(ix + 1, iz, channel) * a;
  const high = marsRandom(ix, iz + 1, channel) * (1 - a) + marsRandom(ix + 1, iz + 1, channel) * a;
  return low * (1 - b) + high * b;
};
export const HABITAT_START = { x: 0, z: 8, y: 6 };
export const CROWN_START = { x: 0, z: -120, y: 26 };
export const CROWN_LOOKOUT = { x: 0, z: -296, y: 31 };
export const CROWN_FLOOR = { x: 0, z: -205, y: 5 };
const rim = Array.from({ length: 33 }, (_, i) => {
  const a = Math.PI / 2 + i * Math.PI / 16;
  return { x: 75 * Math.cos(a), z: -195 + 75 * Math.sin(a), y: 26 };
});
export const MARS_ROUTES: MarsRoute[] = [
  { name: 'Habitat to Crown', points: [HABITAT_START, { x: -8, z: -30, y: 6.5 }, { x: -12, z: -65, y: 10 }, { x: -6, z: -93, y: 21 }, { x: 0, z: -110, y: 26 }, CROWN_START] },
  { name: 'Crown rim circuit', points: rim },
  { name: 'Crater descent', points: [{ x: 75, z: -195, y: 26 }, { x: 58, z: -172, y: 24 }, { x: 32, z: -152, y: 20 }, { x: 4, z: -153, y: 16 }, { x: -20, z: -169, y: 11 }, { x: -24, z: -193, y: 7 }, CROWN_FLOOR] },
  { name: 'Crown north lookout', points: [{ x: 0, z: -270, y: 26 }, { x: 0, z: -274, y: 26 }, { x: 0, z: -291, y: 31 }, CROWN_LOOKOUT] },
  { name: 'Eastern return', points: [CROWN_START, { x: 33, z: -97, y: 20 }, { x: 48, z: -64, y: 12 }, { x: 44, z: -23, y: 7 }, { x: 26, z: 4, y: 6 }, HABITAT_START] },
  { name: 'Habitat courtyard', points: [HABITAT_START, { x: -14, z: 23, y: 6 }, { x: -12, z: 60, y: 6 }, { x: 16, z: 64, y: 6 }, { x: 40, z: 64, y: 6 }, { x: 42, z: 20, y: 6 }, { x: 26, z: 4, y: 6 }, HABITAT_START] },
  ...DISH_ROUTES,
  ...GLASSFALL_ROUTES,
  ...IRON_ROUTES,
];
export const MARS_STARTS = [
  { id: 'habitat-seven', name: 'Habitat Seven', position: HABITAT_START },
  { id: 'crown-crater', name: 'Crown Crater', position: CROWN_START },
  { id: 'dish-ridge', name: 'Dish Ridge', position: DISH_START },
  { id: 'glassfall-plain', name: 'Glassfall Plain', position: GLASSFALL_START },
  { id: 'iron-maze', name: 'Iron Maze', position: IRON_START },
];
export const nearestMarsStart = (x: number, z: number) => MARS_STARTS.reduce((a, b) =>
  Math.hypot(x - a.position.x, z - a.position.z) <= Math.hypot(x - b.position.x, z - b.position.z) ? a : b);
export const marsSpawn = (p: { x: number; z: number }) => ({ ...p, y: marsSurfaceHeight(p.x, p.z) + 1.25 });

export function marsTrailSample(x: number, z: number) {
  let distance = Infinity, elevation = 6, weight = 0, sum = 0, halfWidth = 5.5, surface: SurfaceId = 'regolith';
  for (const route of MARS_ROUTES) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
    if (d < distance) { distance = d; elevation = a.y + (b.y - a.y) * t; halfWidth = route.halfWidth ?? 5.5; surface = route.surface ?? 'regolith'; }
    if (d < 24) { const w = Math.exp(-d * d / 32); weight += w; sum += (a.y + (b.y - a.y) * t) * w; }
  }
  return { distance, elevation: weight > 0 ? sum / weight : elevation, halfWidth, surface };
}

/** Authored bowl and road profiles are evaluated globally, independent of chunk ownership. */
export function marsHeightAt(x: number, z: number): number {
  let h = 6 + 1.4 * Math.sin(x * 0.021) * Math.sin(z * 0.018)
    + hill(x, z, -105, -45, 45, 85, 12) + hill(x, z, 130, -110, 50, 75, 10);
  const r = Math.hypot(x, z + 195);
  const crater = 5 + 22 * Math.exp(-(((r - 72) / 20) ** 2))
    + 3 * Math.sin(Math.atan2(z + 195, x) * 7) * Math.exp(-(((r - 86) / 16) ** 2));
  h += (crater - h) * (1 - smooth((r - 95) / 35));
  h = dishRidgeHeight(x, z, h);
  h = glassfallHeight(x, z, h);
  h = ironHeight(x, z, h);
  // Broken mesa shoulders and unequal buttresses replace the periodic scalloped wall.
  const edge = Math.pow(Math.abs(x) ** 8 + Math.abs(z) ** 8, 1 / 8);
  const broad = landscapeNoise(x, z, 135, 4), breaks = landscapeNoise(x, z, 43, 8);
  const shoulder = 314 + broad * 14 + breaks * 6;
  const step = broad * 4, terrace = Math.floor(step) + smooth(((step % 1) - 0.6) / 0.4);
  const crest = 78 + terrace * 6 + breaks * 15;
  h += smooth((edge - shoulder) / 25) * (10 + breaks * 7)
    + smooth((edge - shoulder - 25) / (31 + broad * 6)) * crest;
  h += (6 - h) * (1 - smooth((Math.hypot(x / 1.2, z - 44) - 57) / 20));
  const trail = marsTrailSample(x, z);
  h += (trail.elevation - h) * (1 - smooth((trail.distance - trail.halfWidth) / 10));
  for (const p of [HABITAT_START, CROWN_START, CROWN_LOOKOUT, CROWN_FLOOR, DISH_START, DISH_LOOKOUT, DISH_SOUTH_EXIT, GLASSFALL_START, GLASSFALL_LOOKOUT, GLASSFALL_SOUTH, IRON_START, IRON_LOOKOUT, IRON_EXIT])
    h += (p.y - h) * (1 - smooth((Math.hypot(x - p.x, z - p.z) - 5) / 5));
  return h;
}

/** Interpolates the exact Float32 vertices and diagonal used by Rapier's triangle mesh. */
export function marsSurfaceHeight(x: number, z: number): number {
  const gx = Math.max(-200, Math.min(199.99999, x / MARS_CELL));
  const gz = Math.max(-200, Math.min(199.99999, z / MARS_CELL));
  const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, v = gz - iz;
  const h = (dx: number, dz: number) => Math.fround(marsHeightAt((ix + dx) * MARS_CELL, (iz + dz) * MARS_CELL));
  return u + v <= 1 ? h(0, 0) + u * (h(1, 0) - h(0, 0)) + v * (h(0, 1) - h(0, 0))
    : h(1, 1) + (1 - u) * (h(0, 1) - h(1, 1)) + (1 - v) * (h(1, 0) - h(1, 1));
}
/** Shared continuous boundary for the glass skin and wheel grip. */
export function marsGlassMargin(x: number, z: number): number {
  const ribbon = glassfallRibbonMargin(x, z);
  if (ribbon < -MARS_CELL) return ribbon;
  const trail = marsTrailSample(x, z);
  return trail.surface === 'mars-glass' ? ribbon : Math.min(ribbon, trail.distance - trail.halfWidth - 1.2);
}
export function marsGlassAt(x: number, z: number): boolean {
  return marsGlassMargin(x, z) > 0;
}
export function marsSurfaceAt(x: number, z: number): SurfaceId {
  const trail = marsTrailSample(x, z);
  if (marsGlassAt(x, z)) return 'mars-glass';
  if (trail.distance < trail.halfWidth) return trail.surface === 'mars-glass' ? 'regolith' : trail.surface;
  if (Math.hypot(x / 1.2, z - 44) < 57) return 'regolith';
  if (dishRegionWeight(x, z) > 0.65 && marsSurfaceHeight(x, z) > 35) return 'rock';
  const r = Math.hypot(x, z + 195);
  return r > 58 && r < 98 || Math.max(Math.abs(x), Math.abs(z)) > 330 ? 'rock' : 'mars-dust';
}
const linear = (n: number) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
export function marsColor(x: number, z: number, height: number): number[] {
  const trail = marsTrailSample(x, z).distance;
  const r = Math.hypot(x, z + 195);
  const bands = Math.sin(height * 0.35 + landscapeNoise(x, z, 65, 11) * 2);
  const pale = (1 - smooth((Math.abs(r - 74) - 14) / 24)) * 0.7;
  const path = 1 - smooth((trail - 3.5) / 3);
  // Broad variation survives coarse sampling without shimmering stripe patterns.
  const grain = 0.018 * (landscapeNoise(x, z, 9, 14) - 0.5);
  const base = [0.64 + pale * 0.12, 0.32 + pale * 0.2, 0.23 + pale * 0.15];
  const iron = ironWeight(x, z);
  for (let i = 0; i < 3; i++) base[i] += ([0.61, 0.35, 0.22][i] - base[i]) * iron;
  const glassfall = glassfallWeight(x, z);
  for (let i = 0; i < 3; i++) base[i] += ([0.77, 0.65, 0.48][i] - base[i]) * glassfall;
  const dish = dishRegionWeight(x, z);
  return base.map((v, i) => linear(Math.max(0, Math.min(1, v + dish * [-0.025, -0.028, -0.028][i] + bands * (0.025 + dish * 0.014) + grain + path * [0.1, 0.115, 0.085][i]))));
}

export type MarsChunk = { cx: number; cz: number; vertices: Float32Array; colors: Float32Array; indices: Uint32Array };
export function generateMarsChunk(cx: number, cz: number, stride: 1 | 4 = 1): MarsChunk {
  if (!Number.isInteger(cx) || !Number.isInteger(cz) || cx < -5 || cx > 4 || cz < -5 || cz > 4) throw new Error('Mars chunk outside apron');
  if (stride === 4) return generateMarsHorizonChunk(cx, cz);
  const n = MARS_CELLS / stride, vertices = new Float32Array((n + 1) ** 2 * 3), colors = new Float32Array(vertices.length), indices = new Uint32Array(n * n * 6);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const x = (cx * MARS_CELLS + i * stride) * MARS_CELL, z = (cz * MARS_CELLS + j * stride) * MARS_CELL;
    const h = marsHeightAt(x, z), v = (j * (n + 1) + i) * 3;
    vertices.set([x, h, z], v); colors.set(marsColor(x, z, h), v);
    if (i < n && j < n) { const a = j * (n + 1) + i; indices.set([a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2], (j * n + i) * 6); }
  }
  return { cx, cz, vertices, colors, indices };
}

/** Coarse interiors with a full-resolution perimeter: no T-junction gaps at a LOD change. */
function generateMarsHorizonChunk(cx: number, cz: number): MarsChunk {
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  const lookup = new Map<string, number>();
  const vertex = (i: number, j: number) => {
    const key = `${i},${j}`, found = lookup.get(key); if (found !== undefined) return found;
    const x = (cx * MARS_CELLS + i) * MARS_CELL, z = (cz * MARS_CELLS + j) * MARS_CELL;
    const h = marsHeightAt(x, z), index = vertices.length / 3;
    vertices.push(x, h, z); colors.push(...marsColor(x, z, h)); lookup.set(key, index); return index;
  };
  for (let j = 0; j < MARS_CELLS; j += 4) for (let i = 0; i < MARS_CELLS; i += 4) {
    const a = vertex(i, j), b = vertex(i, j + 4), c = vertex(i + 4, j + 4), d = vertex(i + 4, j);
    if (i > 0 && j > 0 && i < 36 && j < 36) { indices.push(a, b, d, d, b, c); continue; }
    const perimeter = [a];
    if (i === 0) for (let k = 1; k < 4; k++) perimeter.push(vertex(i, j + k));
    perimeter.push(b);
    if (j === 36) for (let k = 1; k < 4; k++) perimeter.push(vertex(i + k, j + 4));
    perimeter.push(c);
    if (i === 36) for (let k = 1; k < 4; k++) perimeter.push(vertex(i + 4, j + 4 - k));
    perimeter.push(d);
    if (j === 0) for (let k = 1; k < 4; k++) perimeter.push(vertex(i + 4 - k, j));
    const centre = vertex(i + 2, j + 2);
    for (let k = 0; k < perimeter.length; k++) indices.push(centre, perimeter[k], perimeter[(k + 1) % perimeter.length]);
  }
  return { cx, cz, vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint32Array(indices) };
}
