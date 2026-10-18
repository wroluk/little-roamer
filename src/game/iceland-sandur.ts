/** The next south-coast slice: a black outwash plain and optional wreck visit. */
export const SOLHEIMASANDUR_WRECK = { x: -365, z: 635, y: 3.9, turn: 0.32 };
export const SOLHEIMASANDUR_APPROACH = [
  { x: -398, z: 557 }, { x: -398, z: 580 }, { x: -388, z: 603 },
  { x: -378, z: 622 }, { x: -377, z: 637 },
];

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Broad irregular sandur, fading into the green Skógá and eastern coast. */
export function solheimasandurWeight(x: number, z: number) {
  const west = smooth((x + 465) / 45);
  const east = 1 - smooth((x + 280) / 38);
  const inland = smooth((z - 520) / 42);
  const shore = 1 - smooth((z - 675) / 42);
  return west * east * inland * shore;
}

export function solheimasandurApproachDistance(x: number, z: number) {
  let distance = Infinity;
  for (let i = 1; i < SOLHEIMASANDUR_APPROACH.length; i++) {
    const a = SOLHEIMASANDUR_APPROACH[i - 1], b = SOLHEIMASANDUR_APPROACH[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return distance;
}

export function solheimasandurWreckClearance(x: number, z: number) {
  return Math.hypot(x - SOLHEIMASANDUR_WRECK.x, z - SOLHEIMASANDUR_WRECK.z) < 23;
}
