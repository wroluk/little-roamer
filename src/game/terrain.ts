export const WORLD_HALF = 75;
export const GRID = 100;
export const CELL = (WORLD_HALF * 2) / GRID;
export const START = { x: 0, y: 1.25, z: 22 };
export const RAMPS = [
  { x: -18, z: 8, angle: -0.35, width: 9, length: 13, height: 3.2 },
  { x: 23, z: -36, angle: 1.2, width: 10, length: 15, height: 3.8 },
  { x: -42, z: -39, angle: -2.3, width: 8, length: 12, height: 2.6 },
];

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

export function trailDistance(x: number, z: number): number {
  const ring = Math.abs(Math.hypot(x / 1.12, z) - 37);
  const crossing = Math.abs(x - 8 * Math.sin(z * 0.065));
  return Math.min(ring, crossing);
}

export function valleySurfaceAt(x: number, z: number) {
  return trailDistance(x, z) < 4.5 || Math.hypot(x, z - START.z) < 10 ? 'dirt' as const : 'grass' as const;
}

function naturalHeight(x: number, z: number): number {
  const hill = (cx: number, cz: number, spread: number, height: number) =>
    height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / spread ** 2);
  const hills = hill(-30, -28, 19, 9) + hill(37, -15, 22, 7)
    + hill(27, 40, 17, 5) + hill(-44, 34, 15, 4);
  const ripples = 0.65 * Math.sin(x * 0.09) * Math.cos(z * 0.08);
  const clearing = smooth((Math.hypot(x, z - START.z) - 10) / 13);
  return (hills + ripples) * clearing;
}

export function terrainHeight(x: number, z: number): number {
  let height = naturalHeight(x, z);
  // Grade a smooth, flat pad under every ramp so its low edge has no hidden lip.
  for (const ramp of RAMPS) {
    const edge = rampEdgeDistance(x, z, ramp, 2, 8);
    const amount = 1 - smooth(edge / 10);
    height += (naturalHeight(ramp.x, ramp.z) - height) * amount;
  }
  return height;
}

export function rampEdgeDistance(x: number, z: number, ramp: typeof RAMPS[number], side: number, end: number) {
  const dx = x - ramp.x;
  const dz = z - ramp.z;
  const localX = Math.cos(ramp.angle) * dx - Math.sin(ramp.angle) * dz;
  const localZ = Math.sin(ramp.angle) * dx + Math.cos(ramp.angle) * dz;
  return Math.max(Math.abs(localX) - ramp.width / 2 - side, Math.abs(localZ) - ramp.length / 2 - end);
}

export function terrainSamples() {
  const vertices = new Float32Array((GRID + 1) ** 2 * 3);
  const indices = new Uint32Array(GRID * GRID * 6);
  for (let z = 0; z <= GRID; z++) {
    for (let x = 0; x <= GRID; x++) {
      const i = (z * (GRID + 1) + x) * 3;
      vertices[i] = x * CELL - WORLD_HALF;
      vertices[i + 1] = terrainHeight(vertices[i], z * CELL - WORLD_HALF);
      vertices[i + 2] = z * CELL - WORLD_HALF;
    }
  }
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const a = z * (GRID + 1) + x;
      const b = a + 1;
      const c = a + GRID + 1;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], (z * GRID + x) * 6);
    }
  }
  return { vertices, indices };
}

// Barycentric interpolation of the actual two rendered/collision triangles.
export function surfaceHeight(x: number, z: number): number {
  const gx = Math.max(0, Math.min(GRID - 0.00001, (x + WORLD_HALF) / CELL));
  const gz = Math.max(0, Math.min(GRID - 0.00001, (z + WORLD_HALF) / CELL));
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const u = gx - ix;
  const v = gz - iz;
  const x0 = ix * CELL - WORLD_HALF;
  const z0 = iz * CELL - WORLD_HALF;
  const a = terrainHeight(x0, z0);
  const b = terrainHeight(x0 + CELL, z0);
  const c = terrainHeight(x0, z0 + CELL);
  const d = terrainHeight(x0 + CELL, z0 + CELL);
  return u + v <= 1 ? a + u * (b - a) + v * (c - a)
    : d + (1 - u) * (c - d) + (1 - v) * (b - d);
}

export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
