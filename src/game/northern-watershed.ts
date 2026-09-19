/** The lake and its inlet share a lowland basin, shallow margins and continuous levels. */
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const LAKE_LEVEL = 8;
const lakeRadius = (angle: number) => 1 + 0.12 * Math.sin(angle * 3 + 0.5)
  + 0.065 * Math.cos(angle * 5 - 0.8) - 0.045 * Math.sin(angle * 7);
export function lakeShorePoint(angle: number, offset = 0) {
  const r = lakeRadius(angle);
  return { x: Math.cos(angle) * (112 * r + offset), z: 180 + Math.sin(angle) * (130 * r + offset) };
}
export function lakeShoreDistance(x: number, z: number): number {
  const angle = Math.atan2((z - 180) / 130, x / 112);
  return (Math.hypot(x / 112, (z - 180) / 130) - lakeRadius(angle)) * 112;
}
export const LAKE_ISLAND = { x: -38, z: 238, rx: 18, rz: 25 };
export function inletCenterX(z: number): number {
  const t = Math.max(0, Math.min(1, (70 - z) / 650));
  return 62 + (45 - z) * 0.59 + Math.sin(t * Math.PI) * (24 * Math.sin(t * Math.PI * 5) + 9 * Math.sin(t * Math.PI * 9));
}
export function inletLevel(z: number): number {
  return LAKE_LEVEL + 52 * smooth((-z - 350) / 230);
}
export function inletWidth(z: number): number { return 7 + 2 * Math.sin(z * 0.027) + 3 * smooth((z + 220) / 280); }
export const INLET_FORDS = [-80, -205].map(z => ({ x: inletCenterX(z), z, halfLength: 34 }));
export function inletDistance(x: number, z: number): number {
  const derivative = (inletCenterX(z + 0.1) - inletCenterX(z - 0.1)) / 0.2;
  return Math.abs(x - inletCenterX(z)) / Math.hypot(1, derivative);
}
export function watershedFeatures(x: number, z: number) {
  const features: { amount: number; level: number; bed: number; containsWater?: boolean }[] = [];
  const d = lakeShoreDistance(x, z);
  if (d < 65) {
    // A wide wading shelf precedes the deep central basin. The bank is already
    // above water before its influence fades into the surrounding terrain.
    let bed = LAKE_LEVEL + (d >= 0 ? d * 0.13 : -0.3 * smooth(-d / 9) - 7.7 * smooth((-d - 18) / 48));
    const island = Math.hypot((x - LAKE_ISLAND.x) / LAKE_ISLAND.rx, (z - LAKE_ISLAND.z) / LAKE_ISLAND.rz);
    bed = Math.max(bed, LAKE_LEVEL + 3.8 - island * 3.4);
    features.push({ amount: 1 - smooth((d - 25) / 40), level: LAKE_LEVEL, bed });
  }
  if (z > -670 && z < 110) {
    const distance = Math.hypot(inletDistance(x, Math.max(-580, z)), Math.max(0, -580 - z)), width = inletWidth(z);
    if (distance < width + 65) {
      const ford = Math.max(...INLET_FORDS.map(f => 1 - smooth((Math.abs(z - f.z) - 7) / 15)));
      const depth = 0.28 + (1 - ford) * 2 * (1 - smooth(distance / (width * 0.8)));
      const bank = 0.14 * Math.max(0, distance - width * 0.65);
      const cap = 1 - smooth((z - 75) / 35);
      features.push({ amount: (1 - smooth((distance - width - 24) / 41)) * cap,
        level: inletLevel(z), bed: inletLevel(z) - depth + bank,
        containsWater: distance < width + 12 });
    }
  }
  return features;
}

const shore = (angle: number) => ({ ...lakeShorePoint(angle, 22), y: 10.7 });
export const LAKESHORE_START = shore(0.4);
export const ALDER_START = { x: INLET_FORDS[0].x - 42, z: -80, y: 11.5 };
export const WATERSIDE_REGIONS = [
  { id: 'great-lake', name: 'Great Lake', bounds: [-165, 190, -5, 345] as [number,number,number,number], start: LAKESHORE_START,
    description: 'Follow scalloped coves and willow-lined shallows around the lowland lake. The eastern shore trail meets the river at two shallow fords.',
    trails: [
      { name: 'Lake Road shore approach', points: [{ x: 160, z: 300, y: 9.747 }, shore(0.8), LAKESHORE_START] },
      { name: 'Scalloped shore trail', points: [shore(2.4), shore(2), shore(1.6), shore(1.2), shore(0.8), LAKESHORE_START, shore(0), shore(-0.4), shore(-0.8)] },
    ] },
  { id: 'alder-river', name: 'Alder River', bounds: [-10, 455, -610, 110] as [number,number,number,number], start: ALDER_START,
    description: 'A winding meltwater river runs through alder and willow groves. Cross the shallow gravel fords or follow the rolling bank trail upstream.',
    trails: [
      { name: 'Lake to Alder Ford', points: [shore(-0.8), { x: inletCenterX(-20) + 40, z: -20, y: 11.5 }, { x: INLET_FORDS[0].x + 42, z: -80, y: 11.5 }] },
      ...INLET_FORDS.map((f, i) => ({ name: `${i === 0 ? 'Alder' : 'Gravel'} Ford`, points: [
        { x: f.x - 42, z: f.z, y: 11.5 }, { x: f.x - 17, z: f.z, y: 7.72 },
        { x: f.x + 17, z: f.z, y: 7.72 }, { x: f.x + 42, z: f.z, y: 11.5 },
      ] })),
      { name: 'Alder bank trail', points: [-80,-115,-155,-205,-245,-285,-320].map(z => ({ x: inletCenterX(z) + 42, z, y: inletLevel(z) + 3.5 })) },
    ] },
];

export const WATERSIDE_PROPS: { kind: 'willow' | 'reed' | 'driftwood' | 'fordPost' | 'lakeSign' | 'riverSign'; x:number; z:number; size:number; angle?:number }[] = [
  { kind: 'lakeSign', x: LAKESHORE_START.x + 9, z: LAKESHORE_START.z, size: 1 },
  { kind: 'riverSign', x: ALDER_START.x - 9, z: ALDER_START.z + 8, size: 1 },
  { kind: 'willow', x: LAKE_ISLAND.x, z: LAKE_ISLAND.z, size: 1.1 },
];
for (let i = 0; i < 80; i++) {
  const a = i * Math.PI * 2 / 80;
  for (const offset of [-2, 3]) WATERSIDE_PROPS.push({ kind: 'reed', ...lakeShorePoint(a, offset), size: 0.7 + (i % 3) * 0.2 });
  if (i % 4 === 0) WATERSIDE_PROPS.push({ kind: 'willow', ...lakeShorePoint(a, 12), size: 0.8 + (i % 3) * 0.15 });
  if (i % 13 === 0) WATERSIDE_PROPS.push({ kind: 'driftwood', ...lakeShorePoint(a, 5), size: 1.2, angle: a });
}
for (let z = -520; z < 55; z += 13) for (const side of [-1, 1]) {
  if (INLET_FORDS.some(f => Math.abs(f.z - z) < 17)) continue;
  const width = inletWidth(z);
  WATERSIDE_PROPS.push({ kind: 'reed', x: inletCenterX(z) + side * (width + 2), z, size: 0.85 });
  if (z > -310 && z % 2 === 0) WATERSIDE_PROPS.push({ kind: 'willow', x: inletCenterX(z) + side * (width + 17), z, size: 1 });
}
for (const f of INLET_FORDS) for (const dx of [-28,-18,18,28]) for (const dz of [-6,6])
  WATERSIDE_PROPS.push({ kind: 'fordPost', x:f.x+dx,z:f.z+dz,size:0.8 });
