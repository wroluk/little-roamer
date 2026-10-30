import * as THREE from 'three';
import type { SurfaceId } from './surfaces';
import { icelandNoise } from './iceland-noise';

export const ISLAND_HALF = 240;
export const ISLAND_CELL = 2;
export const ISLAND_SEA = 0;
export const ISLAND_BRIDGE = { halfLength: 38, halfWidth: 4.2, deck: 26 };
export type IslandPoint = { x: number; y: number; z: number };
type Route = { name: string; points: readonly IslandPoint[]; elevated?: boolean; rough?: boolean };
export const ISLAND_COVE = { x: -70, y: 2.8, z: 132 };
export const ISLAND_UNDERPASS = { x: 0, y: 5, z: 0 };
export const ISLAND_JUNGLE = { x: -108, y: 20, z: -36 };
export const ISLAND_OVERLOOK = { x: 64, y: 26, z: 0 };
export const ISLAND_ROUTES: readonly Route[] = [
  { name: 'Cove to the arches', points: [
    ISLAND_COVE, { x: -35, y: 3, z: 115 }, { x: -8, y: 4, z: 80 },
    { x: 0, y: 5, z: 42 }, ISLAND_UNDERPASS, { x: 0, y: 6, z: -35 },
  ] },
  { name: 'Rootwood climb', points: [
    { x: 0, y: 6, z: -35 }, { x: -30, y: 9, z: -70 },
    { x: -73, y: 14, z: -70 }, ISLAND_JUNGLE,
    { x: -108, y: 24, z: -5 }, { x: -85, y: 26, z: 12 },
    { x: -58, y: 26, z: 0 }, { x: -38, y: 26, z: 0 },
  ] },
  { name: 'Old Aqueduct', elevated: true, points: [
    { x: -38, y: 26, z: 0 }, { x: 0, y: 26, z: 0 }, { x: 38, y: 26, z: 0 },
  ] },
  { name: 'Ocean return', points: [
    { x: 38, y: 26, z: 0 }, ISLAND_OVERLOOK, { x: 98, y: 21, z: 25 },
    { x: 110, y: 14, z: 62 }, { x: 90, y: 7, z: 100 },
    { x: 50, y: 3, z: 132 }, { x: -5, y: 2.8, z: 144 }, ISLAND_COVE,
  ] },
  { name: 'Rootwood shortcut', rough: true, points: [
    { x: -30, y: 9, z: -70 }, { x: -61, y: 17, z: -45 },
    { x: -78, y: 23, z: -20 }, { x: -85, y: 26, z: 12 },
  ] },
];
export const ISLAND_STARTS = [
  { id: 'castaway-cove', name: 'Castaway Cove', position: ISLAND_COVE, heading: -1.1 },
  { id: 'rootwood-trail', name: 'Rootwood Trail', position: ISLAND_JUNGLE, heading: Math.PI },
  { id: 'aqueduct', name: 'Old Aqueduct', position: ISLAND_OVERLOOK, heading: Math.PI / 2 },
] as const;
export const nearestIslandStart = (x: number, z: number) => ISLAND_STARTS.reduce((a, b) =>
  Math.hypot(x - a.position.x, z - a.position.z) <= Math.hypot(x - b.position.x, z - b.position.z) ? a : b);
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };

export function islandRouteSample(x: number, z: number, includeBridge = false) {
  let distance = Infinity, elevation = 0, rough = false, upper = false;
  for (const route of ISLAND_ROUTES) {
    if (route.elevated && !includeBridge) continue;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      if (d >= distance) continue;
      distance = d; elevation = a.y + t * (b.y - a.y); rough = !!route.rough;
      upper = elevation > 24 && Math.abs(z) < 24;
    }
  }
  return { distance, elevation, rough, upper };
}

export function islandHeightAt(x: number, z: number) {
  const n = icelandNoise(x / 48 + 19, z / 48 - 7);
  const radius = Math.hypot(x / 190, (z + 10) / 205) + (n - 0.5) * 0.09;
  let h = -12 + 16 * (1 - smooth((radius - 0.81) / 0.25));
  const coast = h;
  const inland = 1 - smooth((radius - 0.55) / 0.36);
  h += inland * (17 + 18 * icelandNoise(x / 90, z / 80));
  h += 25 * Math.exp(-(((x - 28) / 65) ** 2 + ((z + 128) / 56) ** 2));
  h += inland * (n - 0.5) * 4;
  const beach = smooth((z - 65) / 65);
  h += (coast + Math.max(0, 130 - z) * 0.05 - h) * beach;
  const oceanShoulder = smooth((x - 43) / 22) * smooth((z + 15) / 22)
    * (1 - smooth((x - 145) / 25)) * (1 - smooth((z - 130) / 30));
  h += (Math.min(h, Math.max(coast, 26 - Math.max(0, z) * 0.16)) - h) * oceanShoulder;
  const ravine = (1 - smooth((Math.abs(x) - 15) / 24))
    * smooth((z + 85) / 40) * (1 - smooth((z - 90) / 40));
  h += (5 + Math.max(0, -z) * 0.025 - h) * ravine;
  const route = islandRouteSample(x, z);
  let weight = 1 - smooth((route.distance - (route.rough ? 3 : 6)) / (route.rough ? 7 : 12));
  // The upper approach must end in the abutment, not fill the open arch below.
  if (route.upper) weight *= smooth((Math.abs(x) - 30) / 8);
  const bump = route.rough ? Math.sin(x * 0.55 + z * 0.27) * Math.sin(z * 0.49) * 0.22 : 0;
  h += (route.elevation + bump - h) * weight;
  for (const start of ISLAND_STARTS) {
    const w = 1 - smooth((Math.hypot(x - start.position.x, z - start.position.z) - 6) / 5);
    h += (start.position.y - h) * w;
  }
  return h;
}

export function islandGroundHeight(x: number, z: number) {
  const ix = Math.floor(x / ISLAND_CELL), iz = Math.floor(z / ISLAND_CELL);
  const u = x / ISLAND_CELL - ix, v = z / ISLAND_CELL - iz;
  const h = (dx: number, dz: number) => Math.fround(islandHeightAt((ix + dx) * ISLAND_CELL, (iz + dz) * ISLAND_CELL));
  const a = h(1, 0), b = h(0, 1);
  if (u + v <= 1) { const c = h(0, 0); return c + u * (a - c) + v * (b - c); }
  const c = h(1, 1); return c + (1 - u) * (b - c) + (1 - v) * (a - c);
}
export const islandOnBridge = (x: number, z: number) =>
  Math.abs(x) <= ISLAND_BRIDGE.halfLength && Math.abs(z) <= ISLAND_BRIDGE.halfWidth;
export const islandDrivingHeight = (x: number, z: number) =>
  islandOnBridge(x, z) ? Math.max(ISLAND_BRIDGE.deck, islandGroundHeight(x, z)) : islandGroundHeight(x, z);
export const islandSpawn = (p: { x: number; z: number } = ISLAND_COVE) =>
  ({ x: p.x, y: islandDrivingHeight(p.x, p.z) + 1.2, z: p.z });
export const islandWaterHeight = (x: number, z: number) => islandGroundHeight(x, z) < ISLAND_SEA ? ISLAND_SEA : null;
export function islandSurfaceAt(x: number, z: number): SurfaceId {
  // Height alone cannot distinguish the deck from the trail underneath it.
  // Both are firm, so this coordinate-only wheel contract keeps the lower path correct.
  if (islandOnBridge(x, z)) return 'dirt';
  if (islandGroundHeight(x, z) < 4.7) return 'sand';
  if (islandRouteSample(x, z).distance < 5) return 'dirt';
  return 'grass';
}
const sand = new THREE.Color('#ead6a0'), forest = new THREE.Color('#416b43');
const trail = new THREE.Color('#a28a59'), rock = new THREE.Color('#6e7965');
export function islandColor(x: number, z: number, h: number) {
  const c = sand.clone().lerp(forest, smooth((h - 3.2) / 5.5));
  c.lerp(rock, smooth((h - 34) / 16) * 0.6);
  const route = islandRouteSample(x, z);
  c.lerp(trail, (1 - smooth((route.distance - 2.6) / 2.8)) * smooth((h - 3) / 3));
  return c.multiplyScalar(0.91 + icelandNoise(x / 12 + 11, z / 12) * 0.16);
}

export function islandTerrainGeometry() {
  const cells = ISLAND_HALF * 2 / ISLAND_CELL, size = cells + 1;
  const vertices = new Float32Array(size * size * 3), colors = new Float32Array(vertices.length);
  const indices = new Uint32Array(cells * cells * 6);
  for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
    const x = -ISLAND_HALF + i * ISLAND_CELL, z = -ISLAND_HALF + j * ISLAND_CELL, k = (j * size + i) * 3;
    const h = Math.fround(islandHeightAt(x, z));
    vertices.set([x, h, z], k); islandColor(x, z, h).toArray(colors, k);
  }
  let k = 0;
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = j * size + i, b = a + 1, c = a + size, d = c + 1;
    indices.set([a, c, b, b, c, d], k); k += 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1)); geometry.computeVertexNormals();
  return geometry;
}

/** Clip against the actual Float32 terrain triangles, including the shallow seabed. */
export function islandWaterGeometry(terrain: THREE.BufferGeometry) {
  const points = terrain.getAttribute('position'), index = terrain.getIndex()!;
  const positions: number[] = [], colors: number[] = [];
  const shallow = new THREE.Color('#9de5cd'), deep = new THREE.Color('#147d91');
  type P = { x: number; y: number; z: number };
  for (let i = 0; i < index.count; i += 3) {
    const triangle: P[] = [0, 1, 2].map(k => {
      const n = index.getX(i + k); return { x: points.getX(n), y: points.getY(n), z: points.getZ(n) };
    });
    const clipped: P[] = [];
    for (let k = 0; k < 3; k++) {
      const a = triangle[k], b = triangle[(k + 1) % 3];
      if (a.y < 0) clipped.push(a);
      if ((a.y < 0) !== (b.y < 0)) {
        const t = -a.y / (b.y - a.y);
        clipped.push({ x: a.x + (b.x - a.x) * t, y: 0, z: a.z + (b.z - a.z) * t });
      }
    }
    for (let k = 1; k + 1 < clipped.length; k++) for (const p of [clipped[0], clipped[k], clipped[k + 1]]) {
      positions.push(p.x, 0.018, p.z);
      shallow.clone().lerp(deep, smooth(-p.y / 9)).toArray(colors, colors.length);
    }
  }
  // A non-overlapping apron continues the same deep colour out to the horizon.
  for (const [x0, z0, x1, z1] of [
    [-1600, -1600, 1600, -ISLAND_HALF], [-1600, ISLAND_HALF, 1600, 1600],
    [-1600, -ISLAND_HALF, -ISLAND_HALF, ISLAND_HALF], [ISLAND_HALF, -ISLAND_HALF, 1600, ISLAND_HALF],
  ]) for (const [x, z] of [[x0, z0], [x0, z1], [x1, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    positions.push(x, 0.018, z); deep.toArray(colors, colors.length);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  return geometry;
}

export { icelandHash as islandHash } from './iceland-noise';
