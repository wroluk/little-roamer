/** Willow Marsh: dry hummocks, two reed pools and a shallow, marked crossing. */
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const MARSH_START = { x: -235, z: 25, y: 16 };
export const MARSH_LOOKOUT = { x: -355, z: -185, y: 26 };
export const MARSH_POOLS = [
  { x: -267, z: -45, rx: 32, rz: 28, level: 12 },
  { x: -365, z: -140, rx: 25, rz: 18, level: 12.6 },
];
export const MARSH_TRAILS = [
  { name: 'River Valley connection', points: [
    { x: -270, z: 115, y: 15.9 }, { x: -255, z: 80, y: 16 },
    { x: -235, z: 45, y: 16 }, MARSH_START,
  ] },
  { name: 'Willow hummocks loop', points: [
    MARSH_START, { x: -200, z: -10, y: 16 }, { x: -190, z: -55, y: 18 },
    { x: -215, z: -95, y: 19 }, { x: -265, z: -105, y: 16 },
    { x: -310, z: -95, y: 14 }, { x: -345, z: -55, y: 15 },
    { x: -340, z: 0, y: 18 }, { x: -295, z: 30, y: 20 }, MARSH_START,
  ] },
  { name: 'Reed Ford', points: [
    { x: -265, z: -105, y: 16 }, { x: -267, z: -81, y: 14 },
    { x: -267, z: -67, y: 11.72 }, { x: -267, z: -23, y: 11.72 },
    { x: -267, z: -9, y: 14 }, { x: -265, z: 27.5, y: 18 },
  ] },
  { name: 'Heron lookout', points: [
    { x: -310, z: -95, y: 14 }, { x: -326, z: -127, y: 18 },
    { x: -319, z: -163, y: 23 }, { x: -345, z: -184, y: 26 }, MARSH_LOOKOUT,
  ] },
];
export const MARSH_SIGNS = [{ x: -257, z: 105 }, { x: -222, z: 30 }, { x: -255, z: -86 }, { x: -344, z: -194 }];
export const MARSH_WILLOWS = [
  { x: -237, z: -40 }, { x: -291, z: -18 }, { x: -291, z: -70 },
  { x: -367, z: -107 }, { x: -396, z: -145 }, { x: -321, z: 22 },
];
export function marshWeight(x: number, z: number): number {
  if (x <= -430 || x >= -145 || z <= -235 || z >= 135) return 0;
  return smooth((x + 430) / 35) * (1 - smooth((x + 180) / 35))
    * smooth((z + 235) / 30) * (1 - smooth((z - 90) / 45));
}
export function marshPoolRadius(x: number, z: number, pool: typeof MARSH_POOLS[number]): number {
  return Math.hypot((x - pool.x) / pool.rx, (z - pool.z) / pool.rz);
}
export function marshTrailSample(x: number, z: number) {
  let distance = Infinity, sum = 0, weights = 0;
  if (x < -380 || x > -165 || z < -210 || z > 135) return { distance, elevation: 0 };
  for (const trail of MARSH_TRAILS) for (let i = 0; i < trail.points.length - 1; i++) {
    const a = trail.points[i], b = trail.points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d2 = (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2;
    distance = Math.min(distance, Math.sqrt(d2));
    if (d2 > 400) continue;
    const w = Math.exp(-d2 / 32);
    weights += w; sum += (a.y + (b.y - a.y) * t) * w;
  }
  return { distance, elevation: weights ? sum / weights : 0 };
}
export function applyMarsh(x: number, z: number, ground: number): number {
  const weight = marshWeight(x, z);
  if (!weight) return ground;
  const hill = (cx: number, cz: number, rx: number, rz: number, h: number) =>
    h * Math.exp(-(((x - cx) / rx) ** 2) - ((z - cz) / rz) ** 2);
  let shaped = 15 + hill(-338, -7, 38, 30, 9) + hill(-205, -90, 28, 32, 8)
    + hill(-355, -185, 40, 34, 11) + hill(-292, 32, 27, 22, 5)
    + 0.45 * Math.sin(x * 0.09) * Math.sin(z * 0.11);
  for (const pool of MARSH_POOLS) {
    const r = marshPoolRadius(x, z, pool);
    const bowl = pool.level - 1.3 + 4.5 * smooth((r - 0.4) / 0.95);
    shaped += (bowl - shaped) * (1 - smooth((r - 1.15) / 0.4));
  }
  shaped = ground + (shaped - ground) * weight;
  const trail = marshTrailSample(x, z);
  // Grading continues through the regional blend to join the existing valley ridge.
  if (trail.distance < 18) shaped += (trail.elevation - shaped)
    * (1 - smooth((trail.distance - 6) / 12)) * smooth((135 - z) / 10);
  for (const p of [MARSH_START, MARSH_LOOKOUT]) {
    const clearing = 1 - smooth((Math.hypot(x - p.x, z - p.z) - 6) / 5);
    shaped += (p.y - shaped) * clearing;
  }
  return shaped;
}
