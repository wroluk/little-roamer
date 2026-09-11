export const HIGHLANDS_HALF = 240;
export const HIGHLANDS_GRID = 200;
export const HIGHLANDS_CELL = HIGHLANDS_HALF * 2 / HIGHLANDS_GRID;

export const VOLCANOES = [
  { name: 'ELDFELL', x: -123, z: -84, radius: 90, height: 26 },
  { name: 'RAUÐAFELL', x: 127, z: -85, radius: 77, height: 22 },
];
export const GLACIER = { name: 'BLÁJÖKULL', x: -8, z: -172, radiusX: 114, radiusZ: 106, height: 46 };
export const HIGHLANDS_WATER_Y = 0.35;
// Unlike ford centers, these coordinates are the dry starting points.
// Advance along (-sin(heading), -cos(heading)) for the complete ascent.
export const GLACIER_ASCENT = { x: GLACIER.x, z: -62, heading: 0, length: 110 };
export const VOLCANO_ASCENT = { x: VOLCANOES[0].x, z: 8, heading: 0, length: 68 };

export const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function riverCenter(x: number) {
  return 43 + 13 * Math.sin(x * 0.025) + 5 * Math.sin(x * 0.053);
}

export function tributaryCenter(z: number) {
  return 29 + 8 * Math.sin((z + 15) * 0.042);
}

export const FORDS = [
  { name: 'MOSS FORD', x: -140, z: riverCenter(-140), heading: 0, length: 76, waterY: HIGHLANDS_WATER_Y },
  { name: 'SKY FORD', x: -15, z: riverCenter(-15), heading: 0, length: 76, waterY: HIGHLANDS_WATER_Y },
  { name: 'EMBER FORD', x: 128, z: riverCenter(128), heading: 0, length: 76, waterY: HIGHLANDS_WATER_Y },
];

/** Signed distance from the wet channel edge; banks occupy the next 19 metres. */
export function riverDistance(x: number, z: number) {
  const derivative = 0.325 * Math.cos(x * 0.025) + 0.265 * Math.cos(x * 0.053);
  const main = Math.abs(z - riverCenter(x)) / Math.hypot(1, derivative) - (8 + 1.4 * Math.sin(x * 0.032));
  const sourceZ = Math.max(-66, Math.min(riverCenter(29), z));
  const branch = Math.hypot(x - tributaryCenter(sourceZ), z - sourceZ) - 5.3;
  return Math.min(main, branch);
}

export function riverDeepening(x: number, z: number, distance = riverDistance(x, z)) {
  const channel = 1 - smooth((distance + 7) / 7);
  const wave = 0.5 + 0.5 * Math.sin(x * 0.037 + 1.8 * Math.sin(x * 0.013));
  const pools = smooth((wave - 0.48) / 0.38);
  let fordProtection = 0;
  for (const ford of FORDS) {
    const across = 1 - smooth((Math.abs(x - ford.x) - 11) / 18);
    const along = 1 - smooth((Math.abs(z - ford.z) - 18) / 25);
    fordProtection = Math.max(fordProtection, across * along);
  }
  return 1.05 * channel * pools * (1 - fordProtection);
}

export function glacierAmount(x: number, z: number) {
  return Math.hypot((x - GLACIER.x) / GLACIER.radiusX, (z - GLACIER.z) / GLACIER.radiusZ);
}

function volcanoHeight(x: number, z: number, volcano: typeof VOLCANOES[number]) {
  const r = Math.hypot(x - volcano.x, z - volcano.z) / volcano.radius;
  if (r >= 1) return 0;
  // A broad, rounded rim surrounds a shallow, flat-bottomed, non-hazardous bowl.
  if (r < 0.27) return volcano.height * (0.76 + 0.24 * smooth((r - 0.065) / 0.205));
  return volcano.height * (1 - smooth((r - 0.27) / 0.73));
}

export function lavaAmount(x: number, z: number) {
  let amount = 0;
  for (const volcano of VOLCANOES) {
    const t = (z - volcano.z - 10) / 91;
    if (t < 0 || t > 1) continue;
    const center = volcano.x + 10 * Math.sin(t * 5 + volcano.x * 0.02);
    const width = (10 + 16 * t) * (1 - smooth((t - 0.72) / 0.28));
    amount = Math.max(amount, (1 - smooth((Math.abs(x - center) - width * 0.55) / 9)) * smooth(t / 0.12));
  }
  return amount;
}

export function highlandsHeight(x: number, z: number): number {
  const plains = 1.9 + 0.38 * Math.sin(x * 0.028) * Math.cos(z * 0.035)
    + 0.14 * Math.sin(x * 0.061 + z * 0.033);
  const glacier = GLACIER.height * (1 - smooth(glacierAmount(x, z)));
  const westMountain = 43 * (1 - smooth(Math.hypot((x + 177) / 84, (z + 194) / 87)));
  const eastMountain = 45 * (1 - smooth(Math.hypot((x - 161) / 90, (z + 197) / 89)));
  let height = plains + Math.max(glacier, westMountain, eastMountain,
    ...VOLCANOES.map(volcano => volcanoHeight(x, z, volcano)));

  // An unobstructed level apron on either side of each marked crossing.
  for (const ford of FORDS) {
    const lane = (1 - smooth((Math.abs(x - ford.x) - 9) / 11))
      * (1 - smooth((Math.abs(z - ford.z) - 39) / 18));
    height += (1.9 - height) * lane;
  }
  const clearing = 1 - smooth((Math.hypot(x, z - 124) - 19) / 18);
  height += (1.9 - height) * clearing;
  const distance = riverDistance(x, z);
  // All water is shallow. Broad eased banks are part of this same heightfield,
  // never separate ramps or colliders. The glacier meltwater source has a wide valley.
  const riverBed = -0.08 - riverDeepening(x, z, distance);
  height = riverBed + (height - riverBed) * smooth((distance + 3) / 22);
  return height;
}

let cachedSamples: { vertices: Float32Array; indices: Uint32Array } | undefined;

export function highlandsSamples() {
  if (cachedSamples) return cachedSamples;
  const vertices = new Float32Array((HIGHLANDS_GRID + 1) ** 2 * 3);
  const indices = new Uint32Array(HIGHLANDS_GRID ** 2 * 6);
  for (let z = 0; z <= HIGHLANDS_GRID; z++) {
    for (let x = 0; x <= HIGHLANDS_GRID; x++) {
      const i = (z * (HIGHLANDS_GRID + 1) + x) * 3;
      vertices[i] = x * HIGHLANDS_CELL - HIGHLANDS_HALF;
      vertices[i + 2] = z * HIGHLANDS_CELL - HIGHLANDS_HALF;
      vertices[i + 1] = highlandsHeight(vertices[i], vertices[i + 2]);
    }
  }
  for (let z = 0; z < HIGHLANDS_GRID; z++) {
    for (let x = 0; x < HIGHLANDS_GRID; x++) {
      const a = z * (HIGHLANDS_GRID + 1) + x;
      const b = a + 1;
      const c = a + HIGHLANDS_GRID + 1;
      indices.set([a, c, b, b, c, c + 1], (z * HIGHLANDS_GRID + x) * 6);
    }
  }
  cachedSamples = { vertices, indices };
  return cachedSamples;
}

/** Interpolates the actual Float32 vertices and the exact render/physics diagonal. */
export function highlandsSurfaceHeight(x: number, z: number): number {
  const gx = Math.max(0, Math.min(HIGHLANDS_GRID, (x + HIGHLANDS_HALF) / HIGHLANDS_CELL));
  const gz = Math.max(0, Math.min(HIGHLANDS_GRID, (z + HIGHLANDS_HALF) / HIGHLANDS_CELL));
  let ix = Math.min(HIGHLANDS_GRID - 1, Math.floor(gx));
  let iz = Math.min(HIGHLANDS_GRID - 1, Math.floor(gz));
  const vertices = highlandsSamples().vertices;
  const clampedX = Math.max(-HIGHLANDS_HALF, Math.min(HIGHLANDS_HALF, x));
  const clampedZ = Math.max(-HIGHLANDS_HALF, Math.min(HIGHLANDS_HALF, z));
  if (ix > 0 && clampedX < vertices[ix * 3]) ix--;
  if (ix < HIGHLANDS_GRID - 1 && clampedX > vertices[(ix + 1) * 3]) ix++;
  if (iz > 0 && clampedZ < vertices[iz * (HIGHLANDS_GRID + 1) * 3 + 2]) iz--;
  if (iz < HIGHLANDS_GRID - 1 && clampedZ > vertices[(iz + 1) * (HIGHLANDS_GRID + 1) * 3 + 2]) iz++;
  const aIndex = (iz * (HIGHLANDS_GRID + 1) + ix) * 3;
  const cIndex = aIndex + (HIGHLANDS_GRID + 1) * 3;
  // Float32 grid coordinates, not theoretical cell boundaries, are authoritative.
  const u = (clampedX - vertices[aIndex])
    / (vertices[aIndex + 3] - vertices[aIndex]);
  const v = (clampedZ - vertices[aIndex + 2])
    / (vertices[cIndex + 2] - vertices[aIndex + 2]);
  const a = vertices[aIndex + 1];
  const b = vertices[aIndex + 4];
  const c = vertices[cIndex + 1];
  const d = vertices[cIndex + 4];
  return u + v <= 1 ? a + u * (b - a) + v * (c - a)
    : d + (1 - u) * (c - d) + (1 - v) * (b - d);
}

export const HIGHLANDS_START = { x: 0, y: highlandsSurfaceHeight(0, 124) + 1.25, z: 124 };

/** No collider or buoyancy: useful for cosmetic ripples/splashes only. */
export function highlandsWaterAt(x: number, z: number): { y: number; depth: number } | null {
  if (Math.abs(x) > HIGHLANDS_HALF || Math.abs(z) > HIGHLANDS_HALF) return null;
  const depth = HIGHLANDS_WATER_Y - highlandsSurfaceHeight(x, z);
  return depth > 0 ? { y: HIGHLANDS_WATER_Y, depth } : null;
}

export function highlandsWaterHeight(x: number, z: number): number | null {
  return highlandsWaterAt(x, z)?.y ?? null;
}

export function highlandsSurfaceAt(x: number, z: number) {
  if (highlandsWaterAt(x, z)) return 'water' as const;
  if (glacierAmount(x, z) < 0.92) return 'ice' as const;
  const flow = lavaAmount(x, z);
  if (flow > 0.56) return 'lava' as const;
  const patch = 0.5 + 0.5 * Math.sin(x * 0.081 + Math.sin(z * 0.09) * 2) * Math.cos(z * 0.079);
  if (flow > 0.2 && patch > 0.42) return 'moss' as const;
  return 'ash' as const;
}
