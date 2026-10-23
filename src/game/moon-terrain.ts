import type { SurfaceId } from './surfaces';

export const MOON_HALF = 384;
export const MOON_CHUNK = 96;
export const MOON_CELL = 4;
export const MOON_CELLS = MOON_CHUNK / MOON_CELL;
export type MoonPoint = { x: number; y: number; z: number };
export const MOON_BASE = { x: -140, y: 8, z: 80 };
export const MOON_OVERLOOK = { x: -45, y: 29, z: -200 };
export const MOON_FLOOR = { x: 40, y: 2, z: -105 };
export const MOON_BASALT = { x: 80, y: 5, z: 235 };
export const MOON_RILLE = { x: 250, y: 4, z: 140 };
export const MOON_HIGHLANDS = { x: -264, y: 24, z: -65 };
export const MOON_RILLE_PATH = [
  { x: 220, y: 5, z: 215 }, { x: 242, y: 4, z: 185 }, MOON_RILLE,
  { x: 238, y: 5, z: 85 }, { x: 266, y: 7, z: 25 },
  { x: 258, y: 9, z: -45 }, { x: 248, y: 12, z: -110 },
  { x: 220, y: 18, z: -150 }, { x: 170, y: 23, z: -170 }, { x: 95, y: 25, z: -175 },
] as const;
export const MOON_ROUTES = [
  { name: 'Earthview circuit', points: [
    MOON_BASE, { x: -170, y: 9, z: 30 }, { x: -172, y: 14, z: -35 },
    { x: -145, y: 20, z: -100 }, { x: -102, y: 26, z: -160 }, MOON_OVERLOOK,
    { x: 25, y: 27, z: -205 }, { x: 95, y: 25, z: -175 }, { x: 125, y: 22, z: -100 },
    { x: 165, y: 15, z: -25 }, { x: 145, y: 8, z: 55 }, { x: 75, y: 5, z: 105 },
    { x: -10, y: 6, z: 120 }, { x: -85, y: 8, z: 110 }, MOON_BASE,
  ] },
  { name: 'Crater descent', points: [
    { x: 125, y: 22, z: -100 }, { x: 98, y: 19, z: -65 }, { x: 55, y: 14, z: -48 },
    { x: 12, y: 9, z: -63 }, { x: 0, y: 4, z: -99 }, MOON_FLOOR,
  ] },
  { name: 'Basalt approach', blend: 30, points: [
    { x: -85, y: 8, z: 110 }, { x: -105, y: 7, z: 155 }, { x: -95, y: 6, z: 195 },
    { x: -50, y: 5, z: 235 }, MOON_BASALT, { x: 160, y: 5, z: 235 }, MOON_RILLE_PATH[0],
  ] },
  { name: 'Silver Rille', blend: 30, points: MOON_RILLE_PATH },
  { name: 'Rille bank return', blend: 30, points: [
    MOON_RILLE_PATH[0], { x: 204, y: 9, z: 180 }, { x: 206, y: 14, z: 135 },
    { x: 198, y: 13, z: 85 }, { x: 220, y: 21, z: 25 }, { x: 214, y: 24, z: -45 },
    { x: 208, y: 24, z: -95 }, MOON_RILLE_PATH[7],
  ] },
  { name: 'Rille crossing breach', blend: 30, points: [
    { x: 145, y: 8, z: 55 }, { x: 180, y: 10, z: 100 }, { x: 198, y: 13, z: 85 },
    { x: 220, y: 10, z: 120 }, MOON_RILLE_PATH[3], { x: 260, y: 8, z: 68 },
    { x: 288, y: 14, z: 70 },
  ] },
  { name: 'Broken Highlands traverse', blend: 30, points: [
    { x: -172, y: 14, z: -35 }, { x: -220, y: 18, z: -35 }, MOON_HIGHLANDS,
    { x: -270, y: 24, z: -90 }, { x: -272, y: 32, z: -135 }, { x: -250, y: 36, z: -180 },
    { x: -205, y: 34, z: -225 }, { x: -145, y: 32, z: -240 },
    { x: -95, y: 30, z: -225 }, MOON_OVERLOOK,
  ] },
  { name: 'Broken Highlands ridge', blend: 30, points: [
    MOON_HIGHLANDS, { x: -270, y: 24, z: -90 }, { x: -295, y: 33.5, z: -120 },
    { x: -298, y: 37, z: -135 }, { x: -300, y: 43, z: -160 },
    { x: -270, y: 43, z: -208 }, { x: -205, y: 34, z: -225 },
  ] },
] as const;
export const MOON_STARTS = [
  { id: 'earthview-base', name: 'Earthview Base', position: MOON_BASE, heading: 0 },
  { id: 'earthrise-overlook', name: 'Earthrise Overlook', position: MOON_OVERLOOK, heading: 0 },
  { id: 'crater-floor', name: 'Quiet Crater', position: MOON_FLOOR, heading: Math.PI / 2 },
  { id: 'basalt-reach', name: 'Basalt Reach', position: MOON_BASALT, heading: -Math.PI / 2 },
  { id: 'silver-rille', name: 'Silver Rille', position: MOON_RILLE, heading: 0 },
  { id: 'broken-highlands', name: 'Broken Highlands', position: MOON_HIGHLANDS, heading: 0 },
];
export const nearestMoonStart = (x: number, z: number) => MOON_STARTS.reduce((a, b) =>
  Math.hypot(x - a.position.x, z - a.position.z) <= Math.hypot(x - b.position.x, z - b.position.z) ? a : b);
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export function moonRandom(x: number, z: number, seed = 0) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed + 1, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, z: number, scale: number, seed: number) {
  const u = x / scale, v = z / scale, ix = Math.floor(u), iz = Math.floor(v);
  const a = smooth(u - ix), b = smooth(v - iz);
  return (moonRandom(ix, iz, seed) * (1 - a) + moonRandom(ix + 1, iz, seed) * a) * (1 - b)
    + (moonRandom(ix, iz + 1, seed) * (1 - a) + moonRandom(ix + 1, iz + 1, seed) * a) * b;
}
function sampleRoutes(x: number, z: number, routes: readonly { points: readonly MoonPoint[]; blend?: number }[]) {
  let distance = Infinity, elevation = 8, weight = 0, sum = 0;
  for (const route of routes) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < distance) { distance = d; elevation = a.y + (b.y - a.y) * t; }
    if (d < 30) {
      const w = Math.exp(-d * d / (route.blend ?? 60));
      weight += w; sum += (a.y + (b.y - a.y) * t) * w;
    }
  }
  return { distance, elevation: weight > 0 ? sum / weight : elevation };
}
export const moonTrailSample = (x: number, z: number) => sampleRoutes(x, z, MOON_ROUTES);
const rilleShape = [{ points: MOON_RILLE_PATH.slice(1, -2) }];
export const moonRilleSample = (x: number, z: number) => sampleRoutes(x, z, rilleShape);
const basaltWeight = (x: number, z: number) => smooth((z - 135) / 40)
  * (1 - smooth((z - 275) / 35)) * (1 - smooth((Math.abs(x - 65) - 145) / 45));
export const moonHighlandWeight = (x: number, z: number) => smooth((x + 340) / 30)
  * (1 - smooth((x + 210) / 45)) * smooth((-z - 10) / 35) * smooth((z + 305) / 35);
export const MOON_BASALT_FLOWS = [
  { x: -28, z: 203, length: 43, width: 17, angle: -0.16, height: 3.2 },
  { x: 35, z: 191, length: 46, width: 19, angle: 0.14, height: 3.8 },
  { x: 135, z: 199, length: 38, width: 16, angle: -0.28, height: 3.4 },
  { x: 0, z: 270, length: 55, width: 20, angle: 0.08, height: 3.5 },
  { x: 133, z: 272, length: 48, width: 21, angle: -0.12, height: 4 },
].map(flow => ({ ...flow, cos: Math.cos(flow.angle), sin: Math.sin(flow.angle) }));
export function moonBasaltRelief(x: number, z: number) {
  let relief = 0;
  for (const flow of MOON_BASALT_FLOWS) {
    const dx = x - flow.x, dz = z - flow.z;
    const u = (dx * flow.cos + dz * flow.sin) / flow.length;
    const v = (-dx * flow.sin + dz * flow.cos) / flow.width - 0.12 * Math.sin(u * 3);
    const radius = Math.hypot(u, v);
    if (radius >= 1) continue;
    const shelf = flow.height * (1 - smooth((radius - 0.58) / 0.42));
    const pressure = 1.1 * Math.exp(-(((v + 0.15 - u * 0.18) / 0.2) ** 2))
      * (1 - smooth((Math.abs(u) - 0.45) / 0.4));
    relief = Math.max(relief, shelf + pressure);
  }
  return relief;
}
const smallCraters = [
  [-220, -70, 24, 4], [-90, 15, 18, 2.5], [78, 44, 29, 4.5],
  [210, -135, 22, 3], [-15, 185, 36, 5], [-225, 160, 20, 3],
] as const;
export function moonHeightAt(x: number, z: number) {
  let h = 7 + (noise(x, z, 105, 1) - 0.5) * 15 + (noise(x, z, 36, 2) - 0.5) * 3;
  const r = Math.hypot(x - 40, z + 105);
  const crater = 2 + 21 * Math.exp(-(((r - 91) / 22) ** 2));
  h += (crater - h) * (1 - smooth((r - 105) / 35));
  for (const [cx, cz, radius, depth] of smallCraters) {
    const d = Math.hypot(x - cx, z - cz) / radius;
    h += depth * (0.5 * Math.exp(-(((d - 1) / 0.22) ** 2)) - (1 - smooth(d)));
  }
  const basalt = basaltWeight(x, z);
  if (basalt > 0) {
    const plain = 5 + (noise(x, z, 70, 18) - 0.5) * 2.2 + moonBasaltRelief(x, z);
    h += (plain - h) * basalt;
  }
  if (x > 178 && x < 330 && z > -210 && z < 245) {
    const rille = moonRilleSample(x, z);
    const weight = (1 - smooth((rille.distance - 26) / 28)) * smooth((x - 178) / 22);
    const channel = rille.elevation + 14 * smooth((rille.distance - 10) / 18);
    h += (channel - h) * weight;
  }
  const highland = moonHighlandWeight(x, z);
  if (highland > 0) {
    const radius = Math.hypot((x + 265) / 60, (z + 140) / 105);
    const shelf = 14 + 13 * (1 - smooth((radius - 0.75) / 0.35))
      + 13 * (1 - smooth((radius - 0.3) / 0.4));
    const westernSpine = 13 * Math.exp(-(((x + 300) / 30) ** 2 + ((z + 155) / 65) ** 2));
    const northernShelf = 34 * (1 - smooth((Math.hypot((x + 210) / 85, (z + 238) / 38) - 0.6) / 0.6));
    const easternSpur = 34 * (1 - smooth((Math.hypot((x + 223) / 27, (z + 123) / 70) - 0.55) / 0.55));
    const cleft = 8 * Math.exp(-(((x + 235 + (z + 140) * 0.25) / 7) ** 2))
      * smooth((-z - 55) / 25) * smooth((z + 200) / 30);
    const fracture = 6 * Math.exp(-(((z + 224 - (x + 240) * 0.2) / 6) ** 2))
      * smooth((x + 300) / 25) * (1 - smooth((x + 185) / 25));
    const upland = Math.max(shelf + westernSpine, northernShelf, easternSpur) - cleft - fracture
      + (noise(x, z, 22, 70) - 0.5) * 1.8;
    h += (upland - h) * highland;
  }
  // A broken highland perimeter stays solid; its far continuation is visual only.
  const edge = Math.pow(Math.abs(x) ** 8 + Math.abs(z) ** 8, 1 / 8);
  const variation = noise(x, z, 130, 5);
  h += smooth((edge - 315 - variation * 20) / 35) * (25 + variation * 35);
  h += smooth((edge - 410) / 200) * (noise(x, z, 190, 6) * 60 - 25);
  const trail = moonTrailSample(x, z);
  h += (trail.elevation - h) * (1 - smooth((trail.distance - 7) / 15));
  for (const start of MOON_STARTS) {
    const weight = 1 - smooth((Math.hypot(x - start.position.x, z - start.position.z) - 7) / 8);
    h += (start.position.y - h) * weight;
  }
  return h;
}
export function moonSurfaceHeight(x: number, z: number) {
  const ix = Math.floor(x / MOON_CELL), iz = Math.floor(z / MOON_CELL);
  const u = x / MOON_CELL - ix, v = z / MOON_CELL - iz;
  const h = (dx: number, dz: number) => Math.fround(moonHeightAt((ix + dx) * MOON_CELL, (iz + dz) * MOON_CELL));
  const a = h(1, 0), b = h(0, 1);
  if (u + v <= 1) { const c = h(0, 0); return c + u * (a - c) + v * (b - c); }
  const c = h(1, 1);
  return c + (1 - u) * (b - c) + (1 - v) * (a - c);
}
export const moonSpawn = (p: { x: number; z: number } = MOON_BASE) =>
  ({ ...p, y: moonSurfaceHeight(p.x, p.z) + 1.2 });
export const moonSurfaceAt = (_x: number, _z: number): SurfaceId => 'lunar-regolith';
export function moonColor(x: number, z: number): [number, number, number] {
  const basalt = basaltWeight(x, z);
  const mare = Math.max(basalt, Math.exp(-(((x - 85) / 145) ** 2 + ((z - 95) / 90) ** 2)));
  const grain = noise(x, z, 12, 9) * 0.035 + noise(x, z, 75, 10) * 0.05;
  const trail = (1 - smooth(moonTrailSample(x, z).distance / 8)) * 0.025;
  const crust = basalt > 0 ? Math.min(1, moonBasaltRelief(x, z) / 3) * basalt * 0.035 : 0;
  const value = 0.31 - mare * 0.14 + grain + trail - crust + moonHighlandWeight(x, z) * 0.035;
  return [value * 1.01, value, value * 0.97];
}
export type MoonChunk = { vertices: Float32Array; colors: Float32Array; normals: Float32Array; indices: Uint32Array };

/** Coarse outer tiles retain the fine boundary only where they meet the pilot. */
export function generateMoonChunk(cx: number, cz: number, coarse = false): MoonChunk {
  if (!Number.isInteger(cx) || !Number.isInteger(cz) || cx < -12 || cx > 11 || cz < -12 || cz > 11)
    throw new Error('Moon chunk outside the landscape');
  const stride = coarse ? 6 : 1, n = MOON_CELLS;
  const vertices: number[] = [], colors: number[] = [], normals: number[] = [], indices: number[] = [];
  const lookup = new Map<number, number>();
  // Neighbouring normals reuse lattice heights; keep this cache local and disposable.
  const heights = new Map<string, number>();
  const height = (x: number, z: number) => {
    const key = `${x},${z}`, cached = heights.get(key);
    if (cached !== undefined) return cached;
    const value = moonHeightAt(x, z); heights.set(key, value); return value;
  };
  const vertex = (i: number, j: number) => {
    const key = j * (n + 1) + i, found = lookup.get(key);
    if (found !== undefined) return found;
    const x = cx * MOON_CHUNK + i * MOON_CELL, z = cz * MOON_CHUNK + j * MOON_CELL;
    const index = vertices.length / 3, y = height(x, z);
    const nx = height(x - MOON_CELL, z) - height(x + MOON_CELL, z);
    const nz = height(x, z - MOON_CELL) - height(x, z + MOON_CELL);
    const length = Math.hypot(nx, MOON_CELL * 2, nz);
    vertices.push(x, y, z); colors.push(...moonColor(x, z)); normals.push(nx / length, MOON_CELL * 2 / length, nz / length);
    lookup.set(key, index); return index;
  };
  const west = coarse && cx === 4 && cz >= -4 && cz < 4;
  const east = coarse && cx === -5 && cz >= -4 && cz < 4;
  const north = coarse && cz === 4 && cx >= -4 && cx < 4;
  const south = coarse && cz === -5 && cx >= -4 && cx < 4;
  for (let j = 0; j < n; j += stride) for (let i = 0; i < n; i += stride) {
    const a = vertex(i, j), b = vertex(i, j + stride), c = vertex(i + stride, j + stride), d = vertex(i + stride, j);
    if (!(west && i === 0 || east && i + stride === n || north && j === 0 || south && j + stride === n)) {
      indices.push(a, b, d, d, b, c); continue;
    }
    const perimeter = [a];
    if (west && i === 0) for (let k = 1; k < stride; k++) perimeter.push(vertex(i, j + k));
    perimeter.push(b);
    if (south && j + stride === n) for (let k = 1; k < stride; k++) perimeter.push(vertex(i + k, j + stride));
    perimeter.push(c);
    if (east && i + stride === n) for (let k = 1; k < stride; k++) perimeter.push(vertex(i + stride, j + stride - k));
    perimeter.push(d);
    if (north && j === 0) for (let k = 1; k < stride; k++) perimeter.push(vertex(i + stride - k, j));
    const centre = vertex(i + stride / 2, j + stride / 2);
    for (let k = 0; k < perimeter.length; k++) indices.push(centre, perimeter[k], perimeter[(k + 1) % perimeter.length]);
  }
  return { vertices: new Float32Array(vertices), colors: new Float32Array(colors),
    normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}
