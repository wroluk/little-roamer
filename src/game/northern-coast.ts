/** Fjord Coast: continuous shoreline, sheltered coves and two connected driving routes. */
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export function coastShoreX(z: number): number {
  const oldShore = -690 + 22 * Math.sin(z * 0.006) + 9 * Math.sin(z * 0.021 + 1.4)
    + 235 * Math.exp(-(((z - 190) / 85) ** 2));
  const reach = smooth((z - 255) / 35) * (1 - smooth((z - 515) / 35));
  const shoals = smooth((z + 230) / 45) * (1 - smooth((z - 35) / 45));
  return oldShore + reach * (12 * Math.exp(-(((z - 340) / 30) ** 2))
    + 16 * Math.exp(-(((z - 455) / 36) ** 2)))
    + shoals * 65 * Math.exp(-(((z + 80) / 120) ** 2));
}
const point = (z: number, inland: number, y: number) => ({ x: coastShoreX(z) + inland, z, y });
export const COAST_TRAILS = [
  { name: 'Clifftop trail', points: [
    { x: -480, z: 280, y: 10.74 }, point(310, 86, 21), point(350, 90, 21),
    point(400, 85, 21), point(455, 90, 21), point(495, 85, 21),
  ] },
  { name: 'Sheltered beach loop', points: [
    point(350, 90, 21), point(370, 67, 12), point(395, 42, 1.2),
    point(430, 30, 0.8), point(470, 30, 0.8), point(493, 45, 1.5),
    point(480, 66, 11), point(455, 90, 21),
  ] },
  { name: 'Pebble cove', points: [point(395, 42, 1.2), point(365, 30, 0.8), point(337, 30, 0.8)] },
];
export const COAST_START = point(400, 85, 21);
export const COAST_STACKS = [point(347, 1, 1.1), point(430, -2, 1.6), point(444, 5, 1.25), point(459, -5, 1.8)]
  .map(({ x, z, y }) => ({ x, z, scale: y }));
export const COAST_SIGNS = [
  { x: -486, z: 272 }, point(353, 102, 0), point(404, 53, 0), point(474, 43, 0),
];
export function coastWeight(x: number, z: number): number {
  if (x <= -725 || x >= -435 || z <= 255 || z >= 550) return 0;
  return smooth((x + 725) / 30) * (1 - smooth((x + 470) / 35))
    * smooth((z - 255) / 35) * (1 - smooth((z - 515) / 35));
}

export function coastTrailSample(x: number, z: number) {
  let distance = Infinity, sum = 0, weights = 0;
  if (x < -710 || x > -460 || z < 265 || z > 510) return { distance, elevation: 0 };
  for (const trail of COAST_TRAILS) for (let i = 0; i < trail.points.length - 1; i++) {
    const a = trail.points[i], b = trail.points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d2 = (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2;
    distance = Math.min(distance, Math.sqrt(d2));
    if (d2 > 225) continue;
    const w = Math.exp(-d2 / 32);
    weights += w; sum += (a.y + (b.y - a.y) * t) * w;
  }
  return { distance, elevation: weights > 0 ? sum / weights : 0 };
}

export function applyCoast(x: number, z: number, ground: number): number {
  const weight = coastWeight(x, z);
  if (!weight) return ground;
  const d = x - coastShoreX(z);
  // Broad, gently sloping shallows meet a dry shelf before the cliffs begin.
  let shaped = d < -10 ? -0.35 + (d + 10) * 0.18
    : d < 14 ? -0.35 + smooth((d + 10) / 24) * 0.5
    : d < 42 ? 0.15 + 0.9 * smooth((d - 14) / 28)
    : 1.05 + 20 * smooth((d - 42) / 58);
  if (d > 100) shaped += 1.5 * Math.sin(z * 0.036) * smooth((d - 100) / 22);
  // Leave the approach to the established Coast Road untouched.
  const roadDx = x + 480, roadDz = z - 280;
  const along = Math.max(0, Math.min(1, (roadDx * 100 + roadDz * 20) / 10400));
  const roadDistance = Math.hypot(roadDx - along * 100, roadDz - along * 20);
  const trail = coastTrailSample(x, z);
  if (trail.distance < 11) shaped += (trail.elevation - shaped) * (1 - smooth((trail.distance - 4) / 7));
  const amount = weight * smooth((roadDistance - 6) / 14);
  return ground + (shaped - ground) * amount;
}
