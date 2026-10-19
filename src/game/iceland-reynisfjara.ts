/** Reynisfjara is east of Sólheimasandur, between Route 1 and the south sea. */
export const REYNIS_BEACH_PATH = [
  { x: -251, z: 575 }, { x: -263, z: 595 }, { x: -274, z: 620 },
  { x: -267, z: 644 }, { x: -255, z: 657 },
];
export const REYNIS_START = REYNIS_BEACH_PATH[1];
export const REYNIS_SHORE_ROUTE = [REYNIS_BEACH_PATH[4], { x: -260, z: 675 },
  { x: -248, z: 688 }, { x: -219, z: 693 }, { x: -187, z: 692 }];
export const REYNIS_COLUMN_FACE = { x: -222, z: 641 };
export const REYNIS_CAVE = { x: -174, backZ: 644, frontZ: 668, floorY: 2.45 };
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

/** Local dry shelf and tidal shallows beneath the Reynisfjara columns. */
export function reynisCoastWeight(x: number) {
  return smooth((x + 312) / 45) * (1 - smooth((x + 84) / 45));
}

export function reynisWaterlineZ(x: number) {
  return 707 + 2.2 * Math.sin(x * 0.035) + 1.1 * Math.sin(x * 0.081);
}

export function reynisCoastHeight(x: number, z: number) {
  const fromWaterline = z - reynisWaterlineZ(x);
  if (fromWaterline < 0) return 2.35 * (1 - smooth((fromWaterline + 9) / 9));
  return -0.65 * smooth(fromWaterline / 23) - 16.35 * smooth((fromWaterline - 23) / 47);
}

export function reynisShallowWaterAt(x: number, z: number, depth: number) {
  return reynisCoastWeight(x) > 0.5 && z >= reynisWaterlineZ(x) && depth > 0 && depth < 0.85;
}

/** Car-sized hollow under the east end of the basalt face. */
export function reynisCaveCut(x: number, z: number) {
  const side = 1 - smooth((Math.abs(x - REYNIS_CAVE.x) - 8) / 4);
  const back = smooth((z - REYNIS_CAVE.backZ + 2) / 8);
  const front = 1 - smooth((z - REYNIS_CAVE.frontZ + 2) / 8);
  return side * back * front;
}

function routeDistance(x: number, z: number, path: readonly { x: number; z: number }[]) {
  let distance = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return distance;
}
export const reynisBeachPathDistance = (x: number, z: number) => routeDistance(x, z, REYNIS_BEACH_PATH);
export const reynisShoreRouteDistance = (x: number, z: number) => routeDistance(x, z, REYNIS_SHORE_ROUTE);
