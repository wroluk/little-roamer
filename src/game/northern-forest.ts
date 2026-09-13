/** Pine Hollow: authored terrain and paths, independent of the streaming grid. */
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const FOREST_LOOKOUT = { x: -98, z: 375 };
export const FOREST_TRAILS = [
  { name: 'Pine Hollow loop', points: [
    { x: 30, z: 536 }, { x: -30, z: 520 }, { x: -72, z: 500 },
    { x: -72, z: 468 }, { x: -72, z: 438 }, { x: -115, z: 420 },
    FOREST_LOOKOUT, { x: -140, z: 400 }, { x: -167, z: 445 },
    { x: -150, z: 492 }, { x: -110, z: 525 }, { x: -30, z: 520 },
  ] },
  { name: 'Rock saddle', points: [
    { x: -72, z: 468 }, { x: -104, z: 462 }, { x: -134, z: 464 }, { x: -159, z: 467 },
  ] },
  { name: 'Coast Road connection', points: [
    FOREST_LOOKOUT, { x: -150, z: 367 }, { x: -173, z: 349 }, { x: -175, z: 332.5 },
  ] },
];
export const FOREST_SIGNS = [
  { x: 20, z: 527 }, { x: -61, z: 493 }, { x: -99, z: 383 }, { x: -183, z: 342 },
];
export const FOREST_CAIRNS = [{ x: -91, z: 372 }, { x: -134, z: 455 }, { x: -168, z: 472 }];
export const FOREST_OUTCROPS = [
  { x: -92, z: 484 }, { x: -53, z: 456 }, { x: -122, z: 390 }, { x: -141, z: 477 },
];
export const FOREST_GROVES = [
  { x: -18, z: 550 }, { x: -46, z: 490 }, { x: -103, z: 502 },
  { x: -41, z: 431 }, { x: -143, z: 430 }, { x: -178, z: 505 },
];

export function forestWeight(x: number, z: number): number {
  if (x <= -215 || x >= 65 || z <= 330 || z >= 595) return 0;
  return smooth((x + 215) / 35) * (1 - smooth((x - 30) / 35))
    * smooth((z - 330) / 30) * (1 - smooth((z - 565) / 30));
}

export function forestRelief(x: number, z: number): number {
  const weight = forestWeight(x, z);
  if (!weight) return 0;
  const hill = (cx: number, cz: number, rx: number, rz: number, h: number) =>
    h * Math.exp(-(((x - cx) / rx) ** 2) - ((z - cz) / rz) ** 2);
  const ravine = -4.3 * (1 - smooth((Math.abs(x + 72) - 5) / 15))
    * smooth((z - 416) / 26) * (1 - smooth((z - 496) / 28));
  return weight * (hill(-98, 373, 43, 42, 22) + hill(-143, 462, 26, 40, 8)
    + hill(-30, 453, 22, 35, 5) + ravine
    + 0.22 * Math.sin(x * 0.21) * Math.sin(z * 0.17));
}

export function forestTrailSample(x: number, z: number) {
  let distance = Infinity, trail = 0, segment = 0, fraction = 0;
  if (x < -190 || x > 45 || z < 327 || z > 552) return { distance, trail, segment, fraction };
  for (let r = 0; r < FOREST_TRAILS.length; r++) {
    const points = FOREST_TRAILS[r].points;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      if (d < distance) { distance = d; trail = r; segment = i; fraction = t; }
    }
  }
  return { distance, trail, segment, fraction };
}

/** Blend adjacent grades through bends rather than switching at a segment bisector. */
export function forestTrailElevation(x: number, z: number, profiles: number[][]): number {
  let sum = 0, weights = 0;
  for (let r = 0; r < FOREST_TRAILS.length; r++) {
    const points = FOREST_TRAILS[r].points;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      const d2 = (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2;
      if (d2 > 225) continue;
      const weight = Math.exp(-d2 / 32);
      sum += (profiles[r][i] + (profiles[r][i + 1] - profiles[r][i]) * t) * weight;
      weights += weight;
    }
  }
  return sum / weights;
}
