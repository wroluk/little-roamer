/** Ember Basin: an extinct caldera, an ash descent and an exposed northern spur. */
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const EMBER_START = { x: 540, z: 420, y: 93 };
export const EMBER_FLOOR = { x: 590, z: 435, y: 74 };
export const EMBER_LOOKOUT = { x: 660, z: 333, y: 102 };
export const EMBER_TRAILS = [
  { name: 'Upland Road approach', points: [
    { x: 505, z: 445, y: 83.941 }, { x: 511, z: 441, y: 84 },
    { x: 529, z: 428, y: 93 }, EMBER_START,
  ] },
  { name: 'Caldera circuit', points: [
    EMBER_START, { x: 540, z: 410, y: 93 }, { x: 540, z: 390, y: 100 },
    { x: 570, z: 368, y: 108 }, { x: 610, z: 368, y: 110 },
    { x: 635, z: 380, y: 109 }, { x: 645, z: 397, y: 108 },
    { x: 650, z: 440, y: 104 }, { x: 640, z: 480, y: 100 },
    { x: 612, z: 509, y: 100 }, { x: 575, z: 505, y: 98 },
    { x: 548, z: 480, y: 96 }, { x: 540, z: 450, y: 96 }, EMBER_START,
  ] },
  { name: 'Ash descent', points: [
    { x: 612, z: 509, y: 100 }, { x: 580, z: 491, y: 92 },
    { x: 565, z: 467, y: 84 }, { x: 568, z: 443, y: 78 }, EMBER_FLOOR,
  ] },
  { name: 'Ashen overlook', points: [
    { x: 610, z: 368, y: 110 }, { x: 633, z: 345, y: 106 },
    { x: 650, z: 333, y: 102 }, EMBER_LOOKOUT,
  ] },
];
export const EMBER_SIGNS = [{ x: 529, z: 442 }, { x: 552, z: 416 }, { x: 625, z: 513 }, { x: 654, z: 321 }];
export const EMBER_COLUMNS = [{ x: 669, z: 380 }, { x: 683, z: 438 }, { x: 566, z: 444 }, { x: 611, z: 460 }];

export function emberWeight(x: number, z: number): number {
  if (x <= 480 || x >= 710 || z <= 285 || z >= 580) return 0;
  return smooth((x - 480) / 35) * (1 - smooth((x - 675) / 35))
    * smooth((z - 285) / 35) * (1 - smooth((z - 545) / 35));
}

export function emberRadius(x: number, z: number): number {
  return Math.hypot((x - 592) / 68, (z - 438) / 74);
}

export function emberTrailSample(x: number, z: number) {
  let distance = Infinity, sum = 0, weights = 0;
  if (x < 480 || x > 686 || z < 307 || z > 535) return { distance, elevation: 0 };
  for (const trail of EMBER_TRAILS) for (let i = 0; i < trail.points.length - 1; i++) {
    const a = trail.points[i], b = trail.points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d2 = (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2;
    distance = Math.min(distance, Math.sqrt(d2));
    if (d2 > 576) continue;
    const w = Math.exp(-d2 / 32);
    weights += w; sum += (a.y + (b.y - a.y) * t) * w;
  }
  return { distance, elevation: weights ? sum / weights : 0 };
}

export function applyEmber(x: number, z: number, ground: number): number {
  const weight = emberWeight(x, z);
  if (!weight) return ground;
  const r = emberRadius(x, z);
  const hill = (cx: number, cz: number, rx: number, rz: number, h: number) =>
    h * Math.exp(-(((x - cx) / rx) ** 2) - ((z - cz) / rz) ** 2);
  const caldera = r < 1 ? 74 + 30 * smooth((r - 0.35) / 0.65) : 104 - 22 * smooth((r - 1) / 0.5);
  let shaped = ground + (caldera - ground) * (1 - smooth((r - 1.15) / 0.65));
  shaped += hill(560, 375, 22, 27, 12) + hill(631, 407, 18, 23, 10)
    + hill(660, 333, 45, 36, 44)
    + 0.6 * Math.sin(x * 0.17) * Math.sin(z * 0.12) * smooth((r - 0.35) / 0.25);
  const trail = emberTrailSample(x, z);
  if (trail.distance < 22) shaped += (trail.elevation - shaped) * (1 - smooth((trail.distance - 7) / 15));
  for (const clearing of [EMBER_START, EMBER_LOOKOUT, EMBER_FLOOR]) {
    const level = 1 - smooth((Math.hypot(x - clearing.x, z - clearing.z) - 6) / 5);
    shaped += (clearing.y - shaped) * level;
  }
  // Upland Road ends at x=505: keep its existing approach and feather eastwards.
  return ground + (shaped - ground) * weight * smooth((x - 505) / 4);
}
