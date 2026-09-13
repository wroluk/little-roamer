/** High Pass: a mountain circuit, twin peaks and a sheltered frozen bowl. */
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const PASS_START = { x: 545, z: -425, y: 112 };
export const PASS_LOOKOUT = { x: 600, z: -607, y: 140 };
export const PASS_BOWL = { x: 599, z: -481, y: 106 };
export const PASS_TRAILS = [
  { name: 'Mountain Road approach', points: [{ x: 500, z: -430, y: 103.984 }, PASS_START] },
  { name: 'Twin Peaks circuit', points: [
    PASS_START, { x: 545, z: -435, y: 112 }, { x: 545, z: -470, y: 126 }, { x: 560, z: -520, y: 132 },
    { x: 575, z: -550, y: 130 }, { x: 600, z: -565, y: 128 },
    { x: 623, z: -552, y: 125 }, { x: 639, z: -535, y: 122 }, { x: 645, z: -515, y: 120 },
    { x: 635, z: -465, y: 112 }, { x: 600, z: -425, y: 104 }, PASS_START,
  ] },
  { name: 'North lookout', points: [{ x: 600, z: -565, y: 128 }, { x: 600, z: -597, y: 140 }, PASS_LOOKOUT] },
  { name: 'Blue Hollow', points: [
    { x: 635, z: -465, y: 112 }, { x: 615, z: -475, y: 108 }, PASS_BOWL,
  ] },
];
export const PASS_SIGNS = [{ x: 518, z: -441 }, { x: 553, z: -417 }, { x: 647, z: -465 }, { x: 611, z: -602 }];
export const PASS_TORS = [
  { x: 532, z: -530, scale: 1.4 }, { x: 527, z: -542, scale: 1.1 },
  { x: 610, z: -531, scale: 1.6 }, { x: 653, z: -557, scale: 0.9 },
  { x: 570, z: -598, scale: 1.2 },
];

export function passWeight(x: number, z: number): number {
  if (x <= 475 || x >= 695 || z <= -660 || z >= -350) return 0;
  return smooth((x - 475) / 35) * (1 - smooth((x - 655) / 40))
    * smooth((z + 660) / 35) * (1 - smooth((z + 385) / 35));
}

export function passBowlRadius(x: number, z: number): number {
  return Math.hypot((x - PASS_BOWL.x) / 22, (z - PASS_BOWL.z) / 27);
}

/** Adjacent grades blend through corners on the same global terrain lattice. */
export function passTrailSample(x: number, z: number) {
  let distance = Infinity, sum = 0, weights = 0;
  if (x < 475 || x > 675 || z < -635 || z > -395) return { distance, elevation: 0 };
  for (const trail of PASS_TRAILS) for (let i = 0; i < trail.points.length - 1; i++) {
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

export function applyPass(x: number, z: number, ground: number): number {
  const weight = passWeight(x, z);
  if (!weight) return ground;
  const hill = (cx: number, cz: number, rx: number, rz: number, h: number) =>
    h * Math.exp(-(((x - cx) / rx) ** 2) - ((z - cz) / rz) ** 2);
  let shaped = ground + hill(531, -565, 28, 42, 36) + hill(630, -545, 27, 35, 43)
    + hill(600, -607, 50, 40, 68)
    - hill(577, -545, 22, 30, 12) + 0.5 * Math.sin(x * 0.13) * Math.sin(z * 0.11);
  const bowl = 1 - smooth((passBowlRadius(x, z) - 0.7) / 0.9);
  shaped += (PASS_BOWL.y - shaped) * bowl;
  const trail = passTrailSample(x, z);
  if (trail.distance < 22) shaped += (trail.elevation - shaped) * (1 - smooth((trail.distance - 7) / 15));
  for (const clearing of [PASS_START, PASS_LOOKOUT]) {
    const level = 1 - smooth((Math.hypot(x - clearing.x, z - clearing.z) - 6) / 5);
    shaped += (clearing.y - shaped) * level;
  }
  // The old road ends at (500, -430). Blend over its eastern shoulder only.
  const preserveRoad = smooth((x - 500) / 8);
  return ground + (shaped - ground) * weight * preserveRoad;
}
