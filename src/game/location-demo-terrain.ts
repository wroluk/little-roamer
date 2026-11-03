import * as THREE from 'three';
import type { SurfaceId } from './surfaces';
import { icelandHash, icelandNoise } from './iceland-noise';
import { demoStrata } from './location-demo-geometry';
import { extraDemoRoutes, QUARRY_CHAMBER, QUARRY_COVER, WOODLAND_RIDGE } from './location-demo-adventures';

export const DEMO_IDS = ['red-canyon', 'old-quarry', 'dune-sea', 'autumn-woods', 'island-tracks'] as const;
export type DemoId = typeof DEMO_IDS[number];
export type DemoPoint = { x: number; y: number; z: number };
type Demo = {
  name: string; subtitle: string; description: string; hint: string;
  sky: string; ground: string; sun: string;
  loop: readonly DemoPoint[]; option: readonly DemoPoint[];
};
const p = (x: number, z: number, y: number): DemoPoint => ({ x, y, z });
export const DEMOS: Record<DemoId, Demo> = {
  'red-canyon': {
    name: 'Red Canyon', subtitle: 'Sandstone wash & rim',
    description: 'Two sandstone spires, a real natural arch and striped canyon walls. Follow the broad wash out and the mesa trail home.',
    hint: 'Follow the pale wash between Split Spire and beneath Echo Arch. The eastern rim returns home; the rock-shelf cut is optional.',
    sky: '#b8dbe0', ground: '#9b7660', sun: '#ffe1b3',
    loop: [p(-65, 75, 6), p(-60, 25, 6), p(-60, -25, 7), p(-40, -65, 8),
      p(20, -65, 8), p(65, -40, 12), p(85, 10, 19), p(65, 60, 18), p(10, 85, 10), p(-65, 75, 6)],
    option: [p(65, -40, 12), p(42, -5, 20), p(44, 32, 23), p(65, 60, 18)],
  },
  'old-quarry': {
    name: 'Old Quarry', subtitle: 'Terraces & retired machinery',
    description: 'Pale quarry benches above a deep excavation tunnel. Crawl over broken stone, descend into a broad underground chamber, then climb back to daylight.',
    hint: 'Keep to the haul road for an easy loop. At the eastern pit floor, pale posts mark Deep Cut: a rocky descent into the tunnel and a second exit back uphill.',
    sky: '#c8dce1', ground: '#8c9388', sun: '#fff0d4',
    loop: [p(-70, 80, 30), p(-95, 25, 30), p(-75, -35, 25), p(-20, -65, 18),
      p(45, -45, 12), p(65, 0, 6), p(25, 28, 3), p(-20, 20, 3),
      p(-55, 47, 13), p(-45, 100, 26), p(-70, 80, 30)],
    option: [p(-20, 20, 3), p(-30, 40, 9), p(-32, 61, 18), p(-45, 100, 26)],
  },
  'dune-sea': {
    name: 'Dune Sea', subtitle: 'Soft dunes & a firm salt pan',
    description: 'Orange crescent dunes rise above a bright salt pan. Try a sandy climb, or keep to the firm gravel circuit through Stone Window.',
    hint: 'White Pan and the dark gravel form a firm way home. Crescent Crown is an optional soft-sand climb, not the only road.',
    sky: '#badce7', ground: '#a48c68', sun: '#fff0d0',
    loop: [p(-70, 70, 2), p(-90, 20, 2), p(-60, -35, 3), p(-10, -55, 4),
      p(35, -40, 4), p(80, -5, 3), p(70, 40, 2), p(10, 70, 2), p(-70, 70, 2)],
    option: [p(-10, -55, 4), p(3, -85, 10), p(30, -104, 18), p(59, -94, 16), p(69, -65, 9), p(35, -40, 4)],
  },
  'autumn-woods': {
    name: 'Autumn Woods', subtitle: 'Golden grove & covered bridge',
    description: 'A gentle golden woodland circuit with a wet ford and covered bridge, plus a high ridge trail across fallen trunks, exposed roots and mossy boulders.',
    hint: 'The valley loop stays gentle. At Cathedral Grove, follow the timber posts uphill for fallen logs, roots and the high ridge; the trail rejoins before the ford.',
    sky: '#d5e2d6', ground: '#747953', sun: '#ffe0aa',
    loop: [p(-65, 65, 6), p(-78, 12, 8), p(-50, -45, 10), p(5, -35, 4),
      p(30, -25, 1), p(45, -25, -0.25), p(60, -25, 1), p(78, 0, 4),
      p(65, 45, 4), p(25, 45, 4), p(-20, 65, 6), p(-65, 65, 6)],
    option: WOODLAND_RIDGE,
  },
  'island-tracks': {
    name: 'Island Tracks', subtitle: 'Windy headlands & two islets',
    description: 'A lighthouse above grassy basalt headlands, a smooth rock ridge and a permanently raised stone causeway to a second islet.',
    hint: "The headland loop reaches Tide Gate. Cross its fixed raised causeway, circle Saltgrass Islet, and return by the cove. Whale's Back is optional.",
    sky: '#b9d7de', ground: '#607e62', sun: '#fff0d5',
    loop: [p(-90, 65, 5), p(-120, 15, 6), p(-95, -40, 9), p(-55, -45, 8),
      p(-25, -5, 4), p(0, 15, 3), p(55, 15, 3), p(80, -15, 5),
      p(110, 10, 6), p(95, 45, 4), p(55, 15, 3), p(0, 15, 3),
      p(-35, 60, 5), p(-90, 65, 5)],
    option: [p(-55, -45, 8), p(-64, -20, 13), p(-58, 3, 16), p(-44, 21, 10), p(-25, -5, 4)],
  },
};
export const DEMO_HALF = 200, DEMO_CELL = 2;
export const WOODLAND_BRIDGE = { x: 45, z: 45, halfLength: 14, halfWidth: 4, deck: 4 };
export const isDemoId = (id: string): id is DemoId => DEMO_IDS.some(value => value === id);
export const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const demoHash = icelandHash;
export function demoPathSample(route: readonly DemoPoint[], x: number, z: number) {
  const samples = [];
  let nearest = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    samples.push({ distance: Math.hypot(x - a.x - t * dx, z - a.z - t * dz), elevation: a.y + (b.y - a.y) * t });
    if (samples[i - 1].distance < samples[nearest].distance) nearest = i - 1;
  }
  const distance = samples[nearest].distance, closed = route[0].x === route.at(-1)!.x && route[0].z === route.at(-1)!.z;
  let elevation = 0, total = 0;
  // Blend adjacent grades at bends, not neighbouring quarry benches at other levels.
  for (let offset = -1; offset <= 1; offset++) {
    const index = closed ? (nearest + offset + samples.length) % samples.length : nearest + offset;
    const sample = samples[index]; if (!sample) continue;
    const weight = Math.exp(-(sample.distance ** 2 - distance ** 2) / 24);
    elevation += sample.elevation * weight; total += weight;
  }
  return { distance, elevation: elevation / total };
}
export function demoRouteSample(id: DemoId, x: number, z: number, includeOption = true) {
  const main = demoPathSample(DEMOS[id].loop, x, z);
  if (includeOption) {
    let nearest = main;
    for (const route of [DEMOS[id].option, ...extraDemoRoutes(id)]) {
      const option = demoPathSample(route, x, z);
      if (option.distance < nearest.distance) nearest = option;
    }
    if (nearest !== main) return { ...nearest, optional: true };
  }
  return { ...main, optional: false };
}
const bump = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) =>
  Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
export const whitePan = (x: number, z: number) => Math.hypot((x + 40) / 67, (z - 25) / 65);

export function demoHeightAt(id: DemoId, x: number, z: number) {
  const n = icelandNoise(x / 47 + 9, z / 43 - 2);
  let h: number;
  switch (id) {
    case 'red-canyon': {
      const wall = smooth((Math.hypot(x / 135, z / 135) - 0.7 + (n - 0.5) * 0.23) / 0.3);
      h = 6 + wall * (30 + 14 * n) + 20 * bump(x, z, 70, 20, 45, 65) + (n - 0.5) * 2;
      break;
    }
    case 'old-quarry': {
      const r = Math.hypot(x / 1.12, z) + (n - 0.5) * 5;
      h = 2 + 8 * smooth((r - 24) / 7) + 9 * smooth((r - 48) / 7)
        + 11 * smooth((r - 74) / 9) + 5 * smooth((r - 111) / 25);
      const platform = 1 - smooth((Math.hypot(x + 30, z + 35) - 12) / 6);
      h += (16 - h) * platform;
      break;
    }
    case 'dune-sea': {
      const u = (x - 37) / 42, v = (z + 68) / 45, r = Math.hypot(u, v);
      const crescent = Math.exp(-(((r - 0.9) / (r < 0.9 ? 0.22 : 0.45)) ** 2))
        * (1 - smooth((v - 0.05) / 0.65));
      h = 3 + crescent * 18 + 16 * bump(x, z, 120, -100, 50, 40)
        + 13 * bump(x, z, -145, -67, 45, 75) + 12 * bump(x, z, 130, 100, 48, 60);
      h += (n - 0.5) * 1.1;
      h += (2 - h) * (1 - smooth((whitePan(x, z) - 0.75) / 0.3));
      break;
    }
    case 'autumn-woods': {
      h = 5 + 8 * bump(x, z, -30, -10, 68, 70) + (n - 0.5) * 2;
      h += 39 * bump(x, z, -105, -75, 43, 48);
      const creek = 1 - smooth((Math.abs(x - 45) - 3) / 11);
      h += (-0.32 - h) * creek;
      const branch = (1 - smooth((Math.abs(z + 55) - 2) / 3)) * smooth((x - 45) / 5)
        * (1 - smooth((x - 88) / 6));
      h += (-0.25 + 3.65 * smooth((x - 51) / 4) - h) * branch;
      break;
    }
    case 'island-tracks': {
      const r = Math.min(Math.hypot((x + 77) / 83, (z - 8) / 90), Math.hypot((x - 92) / 48, (z - 15) / 59));
      h = -10 + 15 * (1 - smooth((r - 0.78 + (n - 0.5) * 0.05) / 0.28));
      h += 11 * bump(x, z, -65, -7, 24, 55) * (1 - smooth((r - 0.6) / 0.4));
      const causeway = (1 - smooth((Math.abs(z - 15) - 5) / 5))
        * smooth((x + 28) / 17) * (1 - smooth((x - 58) / 16));
      h += (3 - h) * causeway;
      const lighthousePad = 1 - smooth((Math.hypot(x + 120, z + 27) - 6) / 7);
      h += (7 - h) * lighthousePad;
      break;
    }
  }
  if (id !== 'island-tracks') h += (28 + 20 * n) * smooth((Math.hypot(x, z) - 143) / 44);
  const option = demoRouteSample(id, x, z);
  if (option.optional) h += (option.elevation - h) * (1 - smooth((option.distance - 4) / 7));
  const route = demoRouteSample(id, x, z, false);
  let weight = 1 - smooth((route.distance - 7) / 13);
  if (id === 'autumn-woods' && Math.abs(z - 45) < 10 && Math.abs(x - 45) < 14)
    weight *= smooth((Math.abs(x - 45) - 6) / 8);
  h += (route.elevation - h) * weight;
  if (id === 'old-quarry') {
    const chamber = 1 - smooth((Math.hypot(x - QUARRY_CHAMBER.x, z - QUARRY_CHAMBER.z) - 9) / 10);
    h += (QUARRY_CHAMBER.y - h) * chamber;
  }
  if (id === 'autumn-woods' && Math.abs(z - 45) <= 5 && Math.abs(x - 45) < 14) h = Math.min(h, 3.65);
  const start = DEMOS[id].loop[0], clearing = 1 - smooth((Math.hypot(x - start.x, z - start.z) - 7) / 6);
  return h + (start.y - h) * clearing;
}

const grids = new Map<DemoId, Float32Array>();
const cells = DEMO_HALF * 2 / DEMO_CELL, size = cells + 1;
function heightGrid(id: DemoId) {
  let grid = grids.get(id);
  if (!grid) {
    grid = new Float32Array(size * size);
    for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++)
      grid[j * size + i] = demoHeightAt(id, -DEMO_HALF + i * DEMO_CELL, -DEMO_HALF + j * DEMO_CELL);
    grids.set(id, grid);
  }
  return grid;
}
export function demoGroundHeight(id: DemoId, x: number, z: number) {
  if (Math.abs(x) > DEMO_HALF || Math.abs(z) > DEMO_HALF) return demoHeightAt(id, x, z);
  const grid = heightGrid(id), gx = (x + DEMO_HALF) / DEMO_CELL, gz = (z + DEMO_HALF) / DEMO_CELL;
  const ix = Math.min(cells - 1, Math.floor(gx)), iz = Math.min(cells - 1, Math.floor(gz));
  const u = gx - ix, v = gz - iz, a = grid[iz * size + ix + 1], b = grid[(iz + 1) * size + ix];
  if (u + v <= 1) { const c = grid[iz * size + ix]; return c + u * (a - c) + v * (b - c); }
  const c = grid[(iz + 1) * size + ix + 1]; return c + (1 - u) * (b - c) + (1 - v) * (a - c);
}
export const onWoodlandBridge = (x: number, z: number) =>
  Math.abs(x - 45) <= WOODLAND_BRIDGE.halfLength && Math.abs(z - 45) <= WOODLAND_BRIDGE.halfWidth;
export const demoDrivingHeight = (id: DemoId, x: number, z: number) =>
  id === 'autumn-woods' && onWoodlandBridge(x, z) ? Math.max(4, demoGroundHeight(id, x, z)) : demoGroundHeight(id, x, z);
export const demoHeading = (id: DemoId) => {
  const [a, b] = DEMOS[id].loop; return Math.atan2(-(b.x - a.x), -(b.z - a.z));
};
export const demoSpawn = (id: DemoId) => { const a = DEMOS[id].loop[0]; return { ...a, y: a.y + 1.2 }; };
export function demoWaterHeight(id: DemoId, x: number, z: number): number | null {
  if (id !== 'autumn-woods' && id !== 'island-tracks') return null;
  const h = demoGroundHeight(id, x, z);
  if (id === 'autumn-woods' && x >= 55 && x <= 96 && z >= -60 && z <= -50 && h < 3.8) return 3.8;
  return h < 0 ? 0 : null;
}
export function demoSurfaceAt(id: DemoId, x: number, z: number): SurfaceId {
  if (demoWaterHeight(id, x, z) !== null && !(id === 'autumn-woods' && onWoodlandBridge(x, z))) return 'water';
  const route = demoRouteSample(id, x, z);
  if (id === 'dune-sea') return !route.optional && route.distance < 6 || whitePan(x, z) < 1 ? 'dirt' : 'sand';
  if (id === 'old-quarry') return route.optional && demoPathSample(extraDemoRoutes(id)[0], x, z).distance < 7
    ? 'rock' : route.distance < 6 ? 'dirt' : 'rock';
  if (id === 'autumn-woods' && route.optional && route.distance < 5) return 'rock';
  if (id === 'red-canyon') return route.optional && route.distance < 6 ? 'rock' : 'dirt';
  if (id === 'island-tracks' && route.optional && route.distance < 7) return 'rock';
  if (route.distance < 5) return 'dirt';
  return id === 'island-tracks' && demoGroundHeight(id, x, z) < 2 ? 'sand' : 'grass';
}
export function demoSurfaceLabel(id: DemoId, surface: SurfaceId, x: number, z: number) {
  if (surface === 'water') return id === 'autumn-woods' ? 'Woodland creek' : 'Coastal water';
  if (id === 'dune-sea' && surface === 'dirt') return whitePan(x, z) < 1 ? 'Firm salt pan' : 'Desert gravel';
  if (id === 'old-quarry') return surface === 'rock' ? 'Limestone' : 'Quarry gravel';
  if (id === 'red-canyon') return surface === 'rock' ? 'Sandstone shelf' : 'Firm wash sand';
  if (id === 'autumn-woods' && surface === 'grass') return 'Moss & fallen leaves';
  return null;
}
const palette = {
  'red-canyon': ['#bb7851', '#d9a574', '#e9c39a', '#a9674e'],
  'old-quarry': ['#acb5ae', '#d2d1bc', '#bac2bb', '#8c9c96'],
  'dune-sea': ['#da9a58', '#e9b66f', '#eac897', '#c78349'],
  'autumn-woods': ['#727444', '#8a854b', '#625f39', '#818052'],
  'island-tracks': ['#6e8e56', '#809d62', '#647f50', '#74905c'],
};
function groundColor(id: DemoId, x: number, z: number, h: number) {
  const n = icelandNoise(x / 15, z / 17), route = demoRouteSample(id, x, z);
  const colors = palette[id], c = new THREE.Color(colors[((Math.floor(h / 4) % 4) + 4) % 4]);
  if (id === 'old-quarry' && h >= 16 && h < 20
    && Math.max(Math.abs(demoGroundHeight(id, x + 1, z) - demoGroundHeight(id, x - 1, z)),
      Math.abs(demoGroundHeight(id, x, z + 1) - demoGroundHeight(id, x, z - 1))) > 0.8) c.set('#65969d');
  if (id === 'dune-sea') {
    c.set('#dea15c').lerp(new THREE.Color('#eee8cd'), 1 - smooth((whitePan(x, z) - 0.8) / 0.3));
    if (whitePan(x, z) < 0.9) c.multiplyScalar(0.96 + icelandHash(Math.floor(x / 4), Math.floor(z / 4)) * 0.06);
  }
  if (id === 'island-tracks') c.lerp(new THREE.Color('#626d6b'), 1 - smooth((h + 0.5) / 3.5));
  const trail = id === 'autumn-woods' ? '#ab7d47' : id === 'island-tracks' ? '#a3a080'
    : id === 'old-quarry' ? '#c5bfa9' : id === 'dune-sea' ? '#8a8070' : '#d8b18a';
  const amount = 1 - smooth((route.distance - 2.4) / 2.8);
  if (!(id === 'dune-sea' && (whitePan(x, z) < 1 || route.optional))) c.lerp(new THREE.Color(trail), amount * 0.8);
  if (id === 'island-tracks' && route.optional) c.lerp(new THREE.Color('#62696a'), amount);
  if (id === 'old-quarry') c.multiplyScalar(0.5 + smooth((demoPathSample(QUARRY_COVER, x, z).distance - 4) / 8) * 0.5);
  return c.multiplyScalar(0.9 + n * 0.18);
}
export const demoColor = (id: DemoId, x: number, z: number) => groundColor(id, x, z, demoGroundHeight(id, x, z));
export function demoTerrainGeometry(id: DemoId) {
  const heights = heightGrid(id), vertices = new Float32Array(size * size * 3), colors = new Float32Array(vertices.length);
  const indices = new Uint32Array(cells * cells * 6);
  for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
    const x = -DEMO_HALF + i * DEMO_CELL, z = -DEMO_HALF + j * DEMO_CELL, k = (j * size + i) * 3, h = heights[j * size + i];
    vertices.set([x, h, z], k); groundColor(id, x, z, h).toArray(colors, k);
  }
  let k = 0;
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = j * size + i, b = a + 1, c = a + size;
    indices.set([a, c, b, b, c, c + 1], k); k += 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1)); geometry.computeVertexNormals();
  if (id !== 'red-canyon' && id !== 'old-quarry') return geometry;
  const layered = demoStrata(geometry, palette[id], (x, _y, z, band) => groundColor(id, x, z, (band + 0.5) * 4));
  const positions = layered.getAttribute('position');
  // Stratum cuts round X/Z to Float32; project the resulting vertices onto the same sampled bed.
  for (let i = 0; i < positions.count; i++)
    positions.setY(i, demoGroundHeight(id, positions.getX(i), positions.getZ(i)));
  layered.computeVertexNormals();
  return layered;
}

export function demoWaterGeometry(terrain: THREE.BufferGeometry, level = 0, bounds?: readonly [number, number, number, number], ocean = false) {
  const vertices = terrain.getAttribute('position'), index = terrain.getIndex()!;
  const positions: number[] = [], colors: number[] = [];
  const shallow = new THREE.Color('#9ebfba'), deep = new THREE.Color('#3a778c');
  const planes = [(a: DemoPoint) => level - a.y];
  if (bounds) planes.push(a => a.x - bounds[0], a => bounds[2] - a.x, a => a.z - bounds[1], a => bounds[3] - a.z);
  for (let i = 0; i < index.count; i += 3) {
    let polygon: DemoPoint[] = [0, 1, 2].map(k => {
      const n = index.getX(i + k); return p(vertices.getX(n), vertices.getZ(n), vertices.getY(n));
    });
    for (const plane of planes) {
      const clipped: DemoPoint[] = [];
      for (let k = 0; k < polygon.length; k++) {
        const a = polygon[k], b = polygon[(k + 1) % polygon.length], da = plane(a), db = plane(b);
        if (da >= 0) clipped.push(a);
        if ((da >= 0) !== (db >= 0)) {
          const t = da / (da - db); clipped.push(p(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, a.y + (b.y - a.y) * t));
        }
      }
      polygon = clipped;
    }
    for (let k = 1; k + 1 < polygon.length; k++) for (const a of [polygon[0], polygon[k], polygon[k + 1]]) {
      positions.push(a.x, level + 0.018, a.z);
      shallow.clone().lerp(deep, smooth((level - a.y) / 8)).toArray(colors, colors.length);
    }
  }
  if (ocean) for (const [x0, z0, x1, z1] of [
    [-1400, -1400, 1400, -DEMO_HALF], [-1400, DEMO_HALF, 1400, 1400],
    [-1400, -DEMO_HALF, -DEMO_HALF, DEMO_HALF], [DEMO_HALF, -DEMO_HALF, 1400, DEMO_HALF],
  ]) for (const [x, z] of [[x0, z0], [x0, z1], [x1, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    positions.push(x, level + 0.018, z); deep.toArray(colors, colors.length);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  return geometry;
}
