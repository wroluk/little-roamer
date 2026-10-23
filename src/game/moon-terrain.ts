import type { SurfaceId } from './surfaces';

export const MOON_HALF = 384;
export const MOON_CHUNK = 96;
export const MOON_CELL = 4;
export const MOON_CELLS = MOON_CHUNK / MOON_CELL;
export type MoonPoint = { x: number; y: number; z: number };
export const MOON_BASE = { x: -140, y: 8, z: 80 };
export const MOON_OVERLOOK = { x: -45, y: 29, z: -200 };
export const MOON_FLOOR = { x: 40, y: 2, z: -105 };
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
] as const;
export const MOON_STARTS = [
  { id: 'earthview-base', name: 'Earthview Base', position: MOON_BASE, heading: 0 },
  { id: 'earthrise-overlook', name: 'Earthrise Overlook', position: MOON_OVERLOOK, heading: 0 },
  { id: 'crater-floor', name: 'Quiet Crater', position: MOON_FLOOR, heading: Math.PI / 2 },
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
export function moonTrailSample(x: number, z: number) {
  let distance = Infinity, elevation = 8, weight = 0, sum = 0;
  for (const route of MOON_ROUTES) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < distance) { distance = d; elevation = a.y + (b.y - a.y) * t; }
    if (d < 30) {
      const w = Math.exp(-d * d / 60);
      weight += w; sum += (a.y + (b.y - a.y) * t) * w;
    }
  }
  return { distance, elevation: weight > 0 ? sum / weight : elevation };
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
  const mare = Math.exp(-(((x - 85) / 145) ** 2 + ((z - 95) / 90) ** 2));
  const grain = noise(x, z, 12, 9) * 0.035 + noise(x, z, 75, 10) * 0.05;
  const trail = (1 - smooth(moonTrailSample(x, z).distance / 8)) * 0.025;
  const value = 0.31 - mare * 0.14 + grain + trail;
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
  const vertex = (i: number, j: number) => {
    const key = j * (n + 1) + i, found = lookup.get(key);
    if (found !== undefined) return found;
    const x = cx * MOON_CHUNK + i * MOON_CELL, z = cz * MOON_CHUNK + j * MOON_CELL;
    const index = vertices.length / 3, y = moonHeightAt(x, z);
    const nx = moonHeightAt(x - MOON_CELL, z) - moonHeightAt(x + MOON_CELL, z);
    const nz = moonHeightAt(x, z - MOON_CELL) - moonHeightAt(x, z + MOON_CELL);
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
