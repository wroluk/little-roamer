/** Reynisfjara is east of Sólheimasandur, between Route 1 and the south sea. */
export const REYNIS_BEACH_PATH = [
  { x: -251, z: 575 }, { x: -263, z: 595 }, { x: -274, z: 620 },
  { x: -267, z: 644 }, { x: -255, z: 657 },
];
export const REYNIS_START = REYNIS_BEACH_PATH[1];
export const REYNIS_COLUMN_FACE = { x: -222, z: 641 };
export const REYNIS_STACKS = [
  { x: -177, z: 721, height: 31, radius: 7.2 },
  { x: -144, z: 732, height: 38, radius: 6.5 },
  { x: -111, z: 716, height: 26, radius: 5.7 },
];

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Compact headland behind the columns, with no height added to Route 1. */
export function reynisfjallRise(x: number, z: number) {
  const width = smooth((x + 253) / 30) * (1 - smooth((x + 112) / 35));
  const inland = smooth((z - 600) / 27);
  const cliffEdge = 654 + 2.5 * Math.sin(x * 0.047) + 1.3 * Math.sin(x * 0.11);
  const seaward = 1 - smooth((z - cliffEdge) / 19);
  const uneven = 0.88 + 0.12 * Math.sin(x * 0.072) * Math.cos(z * 0.065);
  return 23 * width * inland * seaward * uneven;
}

export function reynisBeachWeight(x: number, z: number) {
  return smooth((x + 314) / 38) * (1 - smooth((x + 100) / 36))
    * smooth((z - 571) / 35) * (1 - smooth((z - 687) / 34));
}

export function reynisBeachPathDistance(x: number, z: number) {
  let distance = Infinity;
  for (let i = 1; i < REYNIS_BEACH_PATH.length; i++) {
    const a = REYNIS_BEACH_PATH[i - 1], b = REYNIS_BEACH_PATH[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return distance;
}
