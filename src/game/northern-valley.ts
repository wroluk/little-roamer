/** Authored landscape region. Its roads, banks and landmarks cross streaming chunk edges. */
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const VALLEY_FORDS = [
  { name: 'Willow Ford', x: -240, z: 182.6153846154, halfLength: 43 },
  { name: 'Cairn Ford', x: -345, z: 206.8461538462, halfLength: 43 },
] as const;
export const VALLEY_TRAIL = [
  { x: -200, z: 330 }, { x: -190, z: 285 }, { x: -210, z: 245 },
  { x: -240, z: 226 }, { x: -240, z: 140 }, { x: -270, z: 115 },
  { x: -302, z: 122 }, { x: -325, z: 146 }, { x: -345, z: 163 },
  { x: -345, z: 250 }, { x: -310, z: 275 }, { x: -272, z: 258 },
  { x: -240, z: 248 }, { x: -210, z: 245 },
] as const;
export function valleyWeight(x: number, z: number): number {
  return smooth((x + 425) / 45) * (1 - smooth((x + 190) / 45))
    * smooth((z - 65) / 40) * (1 - smooth((z - 285) / 45));
}
export function valleyRiverWeight(x: number): number {
  return smooth((x + 425) / 45) * (1 - smooth((x + 190) / 45));
}
export function valleyFordAmount(x: number): number {
  return Math.max(...VALLEY_FORDS.map(f => 1 - smooth((Math.abs(x - f.x) - 9) / 13)));
}
export function valleyHills(x: number, z: number): number {
  const weight = valleyWeight(x, z);
  if (weight === 0) return 0;
  const hill = (cx: number, cz: number, rx: number, rz: number, h: number) =>
    h * Math.exp(-(((x - cx) / rx) ** 2) - ((z - cz) / rz) ** 2);
  return weight * (hill(-278, 110, 28, 19, 10) + hill(-310, 135, 24, 16, 6)
    + hill(-295, 274, 30, 22, 7) + hill(-370, 150, 18, 28, 11)
    - hill(-269, 245, 18, 13, 2) + 0.3 * Math.sin(x * 0.19) * Math.sin(z * 0.16));
}
export function valleyTrailSample(x: number, z: number) {
  if (x < -365 || x > -170 || z < 95 || z > 345) return { distance: Infinity, segment: 0, fraction: 0 };
  let distance = Infinity, segment = 0, fraction = 0;
  for (let i = 0; i < VALLEY_TRAIL.length - 1; i++) {
    const a = VALLEY_TRAIL[i], b = VALLEY_TRAIL[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
    if (d < distance) { distance = d; segment = i; fraction = t; }
  }
  return { distance, segment, fraction };
}
/** Wide shelves lead into deeper pools, while the marked crossings stay wheel-deep. */
export function valleyRiverBed(distance: number, halfWidth: number, x: number): number {
  const deep = (1 - valleyFordAmount(x)) * 1.65;
  const channel = 1 - smooth(distance / (halfWidth * 0.7));
  const bank = 3.2 * smooth((distance - halfWidth * 0.65) / 19);
  return -0.28 - deep * channel + bank;
}
export const VALLEY_MARKERS = VALLEY_FORDS.flatMap(ford =>
  [-32, -19, 19, 32].flatMap(dz => [-1, 1].map(side => ({ x: ford.x + side * 7, z: ford.z + dz }))),
);
export const VALLEY_CAIRNS = [
  { x: -273, z: 107 }, { x: -316, z: 280 }, { x: -351, z: 254 },
];

export function valleyRiverCenter(x: number): number {
  return 178 + (-x - 220) * 30 / 130 + 3 * Math.sin((x + 240) * Math.PI / 105);
}
