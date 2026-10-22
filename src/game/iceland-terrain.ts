import { southernGlacier, GLACIER_MARGIN_WEIGHT, ICELAND_GLACIER_BOUNDS, calvingBay, lagoonCarve, lagoonRouteDistance, onJokulsaBridge, JOKULSA_BRIDGE } from './iceland-lagoon';
import { lomagnupurRise, lomagnupurTalus, lomagnupurRouteDistance, skeidararsandurWeight, sandurChannel } from './iceland-skeidararsandur';
import { icelandNoise } from './iceland-noise';
import { grimsvotnRockHeight, vatnajokullRouteAt } from './iceland-vatnajokull';
import { iceCaveRouteAt, iceCaveOpenApproach, iceCaveInBounds, iceCaveVaultRise, insideIceCave, onIceCaveFloor } from './iceland-ice-cave';
import type { SurfaceId } from './surfaces';
import { FALL, SKOGA_BRIDGE, onSkogaBridge } from './iceland-layout';
import { ringRoadAt, ringRoadCoastAt, RING_HALF_WIDTH } from './iceland-road';
import { SOLHEIMASANDUR_WRECK, solheimasandurApproachDistance, solheimasandurWeight } from './iceland-sandur';
import { REYNIS_CAVE, reynisBeachPathDistance, reynisBeachWeight, reynisCaveCut,
  reynisCoastHeight, reynisCoastWeight, reynisWaterlineZ, reynisfjallRise } from './iceland-reynisfjara';

export const ICELAND_HALF = 768;
export const ICELAND_CHUNK = 96;
export const ICELAND_CELLS = 40;
export const ICELAND_CELL = 2.4;
export const ICELAND_MIN_CHUNK = -9;
export const ICELAND_MAX_CHUNK = 8;
export const SKOGAFOSS = { x: -535, z: 475 };
export const SKOGA_FORD = { x: -535, z: 585 };
export const ICELAND_START = { x: -489, z: 518 };
export type IcelandPoint = { x: number; z: number };
export const FORD_PATH = [{ x: -500, z: 585 }, { x: -520, z: 585 }, { x: -540, z: 585 }, { x: -565, z: 585 }];
export const BRIDGE_PATH = [{ x: -575, z: 530 }, { x: -550, z: 530 }, { x: -520, z: 530 }, { x: -490, z: 530 }];
export const ICELAND_LOOP = [ICELAND_START, { x: -490, z: 555 }, ...FORD_PATH,
  { x: -578, z: 560 }, ...BRIDGE_PATH, ICELAND_START];
const paths = [ICELAND_LOOP, [ICELAND_START, { x: -490, z: 495 }, { x: -510, z: 492 }],
  [{ x: -490, z: 555 }, { x: -465, z: 610 }, { x: -443, z: 640 }]];
export const COASTAL_TURNOUT = { x: -443, z: 640, radius: 12 };
export const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const SKOGA_SOURCE_Z = 100;
export const SKOGA_WATER_START = 50;
export function riverX(z: number) {
  if (z < FALL.terrainLipZ) return FALL.x + 8 * Math.sin((z - FALL.terrainLipZ) * 0.045) * smooth((FALL.terrainLipZ - z) / 36);
  return FALL.x + 4 * Math.sin((z - 475) * 0.025) * smooth(Math.abs(z - FALL.terrainLipZ) / 25);
}
/** Rounded spring-pool end, then a gently winding plateau channel. */
export function upperRiverDistance(x: number, z: number) {
  return Math.hypot(x - riverX(Math.max(SKOGA_SOURCE_Z, z)), Math.min(0, z - SKOGA_SOURCE_Z));
}
export function riverLevel(z: number) {
  if (z <= FALL.terrainLipZ) return FALL.top;
  const descent = Math.max(0, 5.6 - (z - 490) * 0.0295);
  return descent * (1 - smooth((z - 605) / 30));
}
export function shoreZ(x: number) {
  // Open a curved tidal inlet around the Skógá outlet. A nearly straight
  // south beach appeared as a hard rectangular edge when viewed alongshore.
  return 682 + 7 * Math.sin(x * 0.013) - 20 * Math.exp(-(((x + 539) / 54) ** 2));
}
export function trailRouteDistance(x: number, z: number) {
  let distance = Infinity;
  for (const path of paths) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return distance;
}
export function trailDistance(x: number, z: number) {
  return Math.min(trailRouteDistance(x, z),
    Math.max(0, Math.hypot(x - COASTAL_TURNOUT.x, z - COASTAL_TURNOUT.z) - COASTAL_TURNOUT.radius));
}

/** First authored slice is the southwest coast; other sectors are reserved terrain. */
export function icelandHeight(x: number, z: number) {
  const shelf = 6.3 - 0.018 * (z - 500);
  const shore = shoreZ(x);
  const sea = smooth((z - shore + 15) / 50);
  const westernSea = smooth((-x - 652) / 52);
  const outerSea = smooth((Math.max(Math.abs(x), Math.abs(z)) - 675) / 55);
  const southernCorners = smooth((Math.hypot(Math.max(0, Math.abs(x) - (x < 0 ? 500 : 520)),
    Math.max(0, z - 510)) - 155) / 55) * smooth((z - 420) / 60);
  const northernCorners = smooth((Math.hypot(Math.max(0, Math.abs(x) - 440),
    Math.max(0, -z - 400)) - 205) / 55) * smooth((-z - 300) / 80);
  let h = shelf + 1.1 * Math.sin(x * 0.031) * Math.sin(z * 0.021);
  // Preserve the authored waterfall brink; away from it, unequal shoulders
  // and recesses replace the old periodic scallops (Mars rim lesson).
  const irregular = smooth((Math.abs(x + 535) - 30) / 65);
  const cliffZ = 471 + (1 - irregular) * 2.4 * Math.sin((x + 535) * 0.046)
    + irregular * (26 * (icelandNoise(x / 83 + 17, 9) - 0.5)
      + 9 * (icelandNoise(x / 29 - 3, 27) - 0.5));
  const cliff = 1 - smooth((z - cliffZ) / (9 + irregular * 12 * icelandNoise(x / 43, 51)));
  // The western coastal shelf provides a way around the Skógafoss escarpment.
  const cliffFootprint = smooth((x + 640) / 35);
  h += cliff * cliffFootprint * (42 + (1 - irregular) * 4 * Math.sin(x * 0.018) ** 2
    + irregular * (14 * (icelandNoise(x / 117, 23) - 0.35)
      + 4 * (icelandNoise(x / 37, 62) - 0.5)));
  // The generic escarpment belongs inland. Authored landmarks are added below.
  const coast = ringRoadCoastAt(x, z);
  if (coast.seaward) {
    const lowland = 3.5 + 0.6 * (icelandNoise(x / 41, z / 37) - 0.5);
    const coastalHeight = lowland + (coast.height - lowland) * (1 - smooth((coast.distance - 12) / 95));
    h = coastalHeight;
  }
  const sandur = solheimasandurWeight(x, z);
  h += sandur * (0.55 * (icelandNoise(x / 28 + 19, z / 24 - 7) - 0.5)
    + 0.24 * (icelandNoise(x / 8 - 11, z / 9 + 31) - 0.5));
  h += reynisfjallRise(x, z);
  const outwash = skeidararsandurWeight(x, z);
  const rill = sandurChannel(x, z);
  const plain = shelf + 1.1 * (icelandNoise(x / 37 + 31, z / 28) - 0.5)
    + 0.28 * (icelandNoise(x / 9, z / 13 + 8) - 0.5) - rill * 0.85;
  h += (plain - h) * outwash;
  h += lomagnupurRise(x, z);
  const cliffTrack = 1 - smooth((lomagnupurRouteDistance(x, z) - 4.5) / 10);
  h += (shelf - h) * cliffTrack;

  const glacier = southernGlacier(x, z);
  // Excavate only beneath the ice, preserving the higher rock valley sides.
  h += (Math.min(h, glacier.height - 8) - h) * smooth(glacier.weight / GLACIER_MARGIN_WEIGHT);
  h = Math.max(h, grimsvotnRockHeight(x, z));
  const iceRoute = vatnajokullRouteAt(x, z);
  const iceTaper = iceCaveOpenApproach(x, z) ? 0 : smooth((glacier.weight - 0.4) / 0.5);
  // Meet the graded ice roof before lowering its bed; contour walls stay buried.
  const routeBed = iceRoute.height - 4 * smooth((iceTaper - 0.2) / 0.8);
  h += (routeBed - h) * iceRoute.blend;
  const caveRoute = iceCaveRouteAt(x, z);
  h += (caveRoute.height - h) * caveRoute.blend
    * (onIceCaveFloor(x, z) ? 1 : smooth((iceRoute.distance - 8) / 13));
  const lagoonTrack = 1 - smooth((lagoonRouteDistance(x, z) - 4.5) / 10);
  h += (shelf - h) * lagoonTrack;
  const wreckApproach = 1 - smooth((solheimasandurApproachDistance(x, z) - 3.5) / 10);
  h += (shelf - h) * wreckApproach * sandur * 0.7;
  const beachApproach = 1 - smooth((reynisBeachPathDistance(x, z) - 4.5) / 10);
  h += (shelf - h) * beachApproach * 0.82;
  // Smooth shoulders along the driving loop, with the river carved afterwards.
  h += (shelf - h) * (1 - smooth((trailDistance(x, z) - 5.5) / 9));
  const road = ringRoadAt(x, z);
  if (road.distance < 32) h += (road.height - h) * (1 - smooth((road.distance - 9) / 23));
  // A settled gravel verge gives the shared terrain/collider a physical road lip.
  h -= 0.34 * smooth((road.distance - 3.7) / 2.2) * (1 - smooth((road.distance - 8) / 5));
  const bridgeApproach = (1 - smooth((Math.abs(z - SKOGA_BRIDGE.z) - 7) / 8))
    * (1 - smooth((Math.abs(x - SKOGA_BRIDGE.x) - 34) / 17));
  h += (SKOGA_BRIDGE.y - h) * bridgeApproach;
  // Settled approaches meet the solid, level decks at a small raised threshold.
  for (const bridge of [SKOGA_BRIDGE, JOKULSA_BRIDGE]) {
    const endDistance = Math.abs(Math.abs(x - bridge.x) - bridge.length / 2);
    const across = 1 - smooth((Math.abs(z - bridge.z) - 5) / 3);
    h -= 0.21 * (1 - smooth(endDistance / 4.8)) * across;
  }
  const dx = Math.abs(x - riverX(z));
  const fallWidth = 3 * (1 - smooth(Math.abs(z - 470) / 25));
  const ford = 1 - smooth((Math.abs(z - 585) - 9) / 12);
  const depth = 2.1 * (1 - ford) + 0.23 * ford;
  if (z > SKOGA_WATER_START && z < 700) {
    const upper = z <= FALL.terrainLipZ;
    const level = upper ? riverLevel(z) : riverLevel(Math.max(482, z));
    if (upper) {
      const distance = upperRiverDistance(x, z);
      const brink = 1 - smooth((FALL.terrainLipZ - z) / 24);
      const bedDepth = 0.6 * (1 - brink) + 0.24 * brink;
      // Converge to the falling sheet's width. The old 22 m bank taper left
      // almost 29 m of wet river spanning an 18 m waterfall at the lip.
      const core = (6.5 + 1.2 * Math.sin(z * 0.055)) * (1 - brink) + 8 * brink;
      const bankWidth = 22 * (1 - brink) + 6 * brink;
      // Broad eased valley shoulders, as in Highlands, are part of the same
      // terrain/collision surface. A rounded cap closes the source pool.
      const shoulder = 1 - smooth((distance - 18) / 30);
      h += (Math.min(h, level + 1.1 + distance * distance * 0.012) - h) * shoulder;
      const bed = level - bedDepth;
      h = bed + (h - bed) * smooth((distance - core) / bankWidth);
    } else {
      // The pool opens below the fall, then narrows into a river with eased
      // gravel banks. Keep the authored ford and bridge approaches intact.
      const crossing = Math.max(ford, 1 - smooth((Math.abs(z - SKOGA_BRIDGE.z) - 10) / 14));
      const pool = 3.2 * (1 - smooth(Math.abs(z - 492) / 24));
      const core = 6 + fallWidth + (pool + 1.2 * Math.sin(z * 0.055)) * (1 - crossing);
      const width = 13 + 9 * (1 - crossing);
      const lowerChannel = 1 - smooth((dx - core) / width);
      h += (level - depth - h) * lowerChannel;
    }
  }
  const wreckRadius = Math.hypot(x - SOLHEIMASANDUR_WRECK.x, z - SOLHEIMASANDUR_WRECK.z);
  h += (SOLHEIMASANDUR_WRECK.y - h) * (1 - smooth((wreckRadius - 12) / 12));
  h += (-17 - h) * Math.max(sea, westernSea, outerSea, southernCorners, northernCorners);
  const reynisCoast = reynisCoastWeight(x) * smooth((z - reynisWaterlineZ(x) + 40) / 12);
  h += (reynisCoastHeight(x, z) - h) * reynisCoast;
  h += (REYNIS_CAVE.floorY - h) * reynisCaveCut(x, z);
  h = lagoonCarve(x, z, h);
  // The outer apron stays submerged; deep water stalls the car before its edge.
  h += 15 * smooth((Math.max(Math.abs(x), Math.abs(z)) - 785) / 43);
  return h;
}

/** Collapse one terrain row at the brink into a 5 cm vertical rock face.
 * Both rendering and collision use this coordinate; no decorative cliff shell.
 */
export function icelandGridZ(row: number): number {
  if (Number.isInteger(row)) return Math.fround(row === 196 ? 468.05 : row * ICELAND_CELL);
  const whole = Math.floor(row);
  return Math.fround(icelandGridZ(whole) + (icelandGridZ(whole + 1) - icelandGridZ(whole)) * (row - whole));
}
/** Barycentric interpolation of the actual terrain triangle, including the brink row. */
export function sampleIcelandTriangle(x: number, z: number, valueAt: (x: number, z: number) => number) {
  const gx = x / ICELAND_CELL, ix = Math.floor(gx), u = gx - ix;
  let iz = Math.floor(z / ICELAND_CELL);
  if (z >= icelandGridZ(196) && z < 470.4) iz = 196;
  const z0 = icelandGridZ(iz), z1 = icelandGridZ(iz + 1), v = (z - z0) / (z1 - z0);
  const h = (dx: number, dz: number) => valueAt((ix + dx) * ICELAND_CELL, dz ? z1 : z0);
  const a = h(1, 0), b = h(0, 1);
  return u + v <= 1 ? h(0, 0) + u * (a - h(0, 0)) + v * (b - h(0, 0))
    : h(1, 1) + (1 - u) * (b - h(1, 1)) + (1 - v) * (a - h(1, 1));
}
export const icelandBedHeight = (x: number, z: number) =>
  sampleIcelandTriangle(x, z, (x, z) => Math.fround(icelandHeight(x, z)));
export const icelandIceAt = (x: number, z: number) =>
  (!iceCaveInBounds(x, z) || iceCaveVaultRise(x, z) <= 0 || sampleIcelandIceTriangle(x, z, (ix, iz) =>
    icelandIceGridHeight(ix, iz) - icelandIceGridBedHeight(ix, iz)
      - icelandIceGridSample(ix, iz, iceCaveVaultRise)) >= 0)
    && sampleIcelandIceTriangle(x, z, (ix, iz) =>
      icelandIceGridSample(ix, iz, (x, z) => southernGlacier(x, z).weight)) >= GLACIER_MARGIN_WEIGHT
    && icelandGlacierHeight(x, z) >= icelandBedHeight(x, z);
export function icelandIceVertexHeight(x: number, z: number) {
  return iceRoofHeight(x, z, icelandHeight(x, z));
}
function iceRoofHeight(x: number, z: number, bed: number) {
  const ice = southernGlacier(x, z);
  const thickness = Math.max(0, ice.height - bed + 1);
  const taper = smooth((ice.weight - 0.4) / 0.5);
  // Bury the closure contour before the roof rises, avoiding an exposed vertical
  // basal band. The calving face stays full-height.
  let height = ice.height - thickness * (1 - taper) * (1 - calvingBay(x, z));
  const route = vatnajokullRouteAt(x, z);
  const exposed = smooth(taper / 0.2);
  const routeRoof = (bed - 1) * (1 - exposed) + route.height * exposed;
  height += (routeRoof - height) * route.blend;
  const gap = height - bed;
  if (gap > 0 && gap < 4)
    height += gap * (smooth(gap / 4) - 1) * (1 - calvingBay(x, z)) * (1 - route.blend);
  return Math.fround(height);
}
const iceGridBounds = {
  x0: Math.floor(ICELAND_GLACIER_BOUNDS.x0 / ICELAND_CELL), x1: Math.ceil(ICELAND_GLACIER_BOUNDS.x1 / ICELAND_CELL),
  z0: Math.floor(ICELAND_GLACIER_BOUNDS.z0 / ICELAND_CELL), z1: Math.ceil(ICELAND_GLACIER_BOUNDS.z1 / ICELAND_CELL),
};
const iceGridWidth = iceGridBounds.x1 - iceGridBounds.x0 + 1;
const iceGridSize = iceGridWidth * (iceGridBounds.z1 - iceGridBounds.z0 + 1);
// Bounded immutable samples keep the denser mesh and per-wheel queries on the same inexpensive field.
const iceGridCache = { ready: new Uint8Array(iceGridSize), detail: new Uint8Array(iceGridSize),
  roof: new Float32Array(iceGridSize), bed: new Float32Array(iceGridSize), weight: new Float32Array(iceGridSize),
  graded: new Uint8Array(iceGridSize) };
function coarseIceGridIndex(ix: number, iz: number) {
  if (ix < iceGridBounds.x0 || ix > iceGridBounds.x1 || iz < iceGridBounds.z0 || iz > iceGridBounds.z1) return -1;
  const index = ix - iceGridBounds.x0 + (iz - iceGridBounds.z0) * iceGridWidth;
  if (!iceGridCache.ready[index]) {
    const x = ix * ICELAND_CELL, z = icelandGridZ(iz), bed = icelandHeight(x, z);
    iceGridCache.bed[index] = bed; iceGridCache.roof[index] = iceRoofHeight(x, z, bed);
    iceGridCache.graded[index] = vatnajokullRouteAt(x, z).blend === 1 ? 1 : 0;
    iceGridCache.weight[index] = southernGlacier(x, z).weight; iceGridCache.ready[index] = 1;
  }
  return index;
}
export function icelandIceCellDivisions(ix: number, iz: number) {
  if (ix < iceGridBounds.x0 || ix >= iceGridBounds.x1 || iz < iceGridBounds.z0 || iz >= iceGridBounds.z1) return 1;
  const index = coarseIceGridIndex(ix, iz), cached = iceGridCache.detail[index];
  if (cached !== 0) return cached;
  let low = Infinity, high = -Infinity, weight = 0, graded = false;
  for (const dx of [0, 1]) for (const dz of [0, 1]) {
    const vertex = coarseIceGridIndex(ix + dx, iz + dz), gap = iceGridCache.roof[vertex] - iceGridCache.bed[vertex];
    low = Math.min(low, gap); high = Math.max(high, gap);
    weight = Math.max(weight, iceGridCache.weight[vertex]);
    graded ||= iceGridCache.graded[vertex] === 1;
  }
  // Keep the proven roof/bed traction handoff on its original triangles.
  const divisions = !graded && weight >= GLACIER_MARGIN_WEIGHT && low < 2.5 && high > 0.1 ? 4 : 1;
  iceGridCache.detail[index] = divisions;
  return divisions;
}
type IceGridPoint = readonly [number, number];
export function forEachIcelandIceTriangle(bounds: { x0: number; x1: number; z0: number; z1: number },
  visit: (a: IceGridPoint, b: IceGridPoint, c: IceGridPoint) => void) {
  // Split the coarse face too, so a refined edge never leaves a T-junction in the cave skin.
  const transition = (points: [IceGridPoint, IceGridPoint, IceGridPoint], edges: number[]) => {
    if (edges.every(n => n === 1)) { visit(...points); return; }
    const boundary: IceGridPoint[] = [];
    for (let i = 0; i < 3; i++) {
      const a = points[i], b = points[(i + 1) % 3];
      for (let j = 0; j < edges[i]; j++)
        boundary.push([a[0] + (b[0] - a[0]) * j / edges[i], a[1] + (b[1] - a[1]) * j / edges[i]]);
    }
    const center: IceGridPoint = [(points[0][0] + points[1][0] + points[2][0]) / 3,
      (points[0][1] + points[1][1] + points[2][1]) / 3];
    for (let i = 0; i < boundary.length; i++) visit(center, boundary[i], boundary[(i + 1) % boundary.length]);
  };
  for (let iz = Math.floor(bounds.z0 / ICELAND_CELL + 1e-8); iz < Math.ceil(bounds.z1 / ICELAND_CELL - 1e-8); iz++)
    for (let ix = Math.floor(bounds.x0 / ICELAND_CELL + 1e-8); ix < Math.ceil(bounds.x1 / ICELAND_CELL - 1e-8); ix++) {
      const divisions = icelandIceCellDivisions(ix, iz), step = 1 / divisions;
      for (let dz = 0; dz < divisions; dz++) for (let dx = 0; dx < divisions; dx++) {
        const x = ix + dx * step, z = iz + dz * step;
        const a: IceGridPoint = [x, z], b: IceGridPoint = [x, z + step];
        const c: IceGridPoint = [x + step, z + step], d: IceGridPoint = [x + step, z];
        if (divisions > 1) { visit(a, b, d); visit(d, b, c); }
        else {
          transition([a, b, d], [icelandIceCellDivisions(ix - 1, iz), 1, icelandIceCellDivisions(ix, iz - 1)]);
          transition([d, b, c], [1, icelandIceCellDivisions(ix, iz + 1), icelandIceCellDivisions(ix + 1, iz)]);
        }
      }
    }
}
/** Match the coarse neighbour along a refined edge, avoiding cracks and different cavity lips. */
export function icelandIceGridSample(ix: number, iz: number, valueAt: (x: number, z: number) => number) {
  const col = Math.floor(ix), row = Math.floor(iz), u = ix - col, v = iz - row;
  if ((u !== 0 || v !== 0) && icelandIceCellDivisions(col, row) === 1)
    return sampleIcelandTriangle(ix * ICELAND_CELL, icelandGridZ(iz), valueAt);
  if (u !== 0 && v === 0 && (icelandIceCellDivisions(col, row - 1) === 1 || icelandIceCellDivisions(col, row) === 1))
    return valueAt(col * ICELAND_CELL, icelandGridZ(row)) * (1 - u)
      + valueAt((col + 1) * ICELAND_CELL, icelandGridZ(row)) * u;
  if (v !== 0 && u === 0 && (icelandIceCellDivisions(col - 1, row) === 1 || icelandIceCellDivisions(col, row) === 1))
    return valueAt(col * ICELAND_CELL, icelandGridZ(row)) * (1 - v)
      + valueAt(col * ICELAND_CELL, icelandGridZ(row + 1)) * v;
  return valueAt(ix * ICELAND_CELL, icelandGridZ(iz));
}
export function icelandIceGridBedHeight(ix: number, iz: number) {
  if (Number.isInteger(ix) && Number.isInteger(iz)) {
    const index = coarseIceGridIndex(ix, iz);
    if (index >= 0) return iceGridCache.bed[index];
  }
  return icelandBedHeight(ix * ICELAND_CELL, icelandGridZ(iz));
}
const iceContactHeights = new Map<string, number>();
export function icelandIceGridHeight(ix: number, iz: number) {
  if (Number.isInteger(ix) && Number.isInteger(iz)) {
    const index = coarseIceGridIndex(ix, iz);
    return index >= 0 ? iceGridCache.roof[index] : icelandIceVertexHeight(ix * ICELAND_CELL, icelandGridZ(iz));
  }
  const key = `${ix},${iz}`, cached = iceContactHeights.get(key);
  if (cached !== undefined) return cached;
  const height = Math.fround(icelandIceGridSample(ix, iz, (x, z) => iceRoofHeight(x, z, icelandBedHeight(x, z))));
  iceContactHeights.set(key, height);
  return height;
}
function sampleIcelandIceTriangle(x: number, z: number, valueAt: (ix: number, iz: number) => number) {
  const col = Math.floor(x / ICELAND_CELL);
  let row = Math.floor(z / ICELAND_CELL);
  if (z >= icelandGridZ(196) && z < 470.4) row = 196;
  const divisions = icelandIceCellDivisions(col, row);
  const gx = x / ICELAND_CELL, gz = row + (z - icelandGridZ(row)) / (icelandGridZ(row + 1) - icelandGridZ(row));
  const ix = col + Math.floor((gx - col) * divisions) / divisions;
  const iz = row + Math.floor((gz - row) * divisions) / divisions;
  const step = 1 / divisions, u = (gx - ix) * divisions, v = (gz - iz) * divisions;
  const a = valueAt(ix + step, iz), b = valueAt(ix, iz + step);
  return u + v <= 1 ? valueAt(ix, iz) + u * (a - valueAt(ix, iz)) + v * (b - valueAt(ix, iz))
    : valueAt(ix + step, iz + step) + (1 - u) * (b - valueAt(ix + step, iz + step))
      + (1 - v) * (a - valueAt(ix + step, iz + step));
}
export const icelandGlacierHeight = (x: number, z: number) =>
  sampleIcelandIceTriangle(x, z, icelandIceGridHeight);
export const icelandSurfaceHeight = (x: number, z: number) =>
  icelandIceAt(x, z) ? Math.max(icelandBedHeight(x, z), icelandGlacierHeight(x, z)) : icelandBedHeight(x, z);
export const icelandDrivingHeight = (x: number, z: number) => insideIceCave(x, z) ? icelandBedHeight(x, z)
  : onJokulsaBridge(x, z) ? Math.max(JOKULSA_BRIDGE.y, icelandSurfaceHeight(x, z)) : onSkogaBridge(x, z) ? Math.max(SKOGA_BRIDGE.y, icelandSurfaceHeight(x, z)) : icelandSurfaceHeight(x, z);
export const icelandSpawn = (p = ICELAND_START) => ({ ...p, y: icelandDrivingHeight(p.x, p.z) + 1.25 });
export function icelandWaterHeight(x: number, z: number): number | null {
  if (z >= SKOGA_WATER_START && z <= 700 && (z <= FALL.terrainLipZ ? upperRiverDistance(x, z) < 30 : Math.abs(x - riverX(z)) < 35)) {
    const level = z <= FALL.terrainLipZ ? riverLevel(z) : riverLevel(Math.max(482, z));
    if (level !== null && icelandSurfaceHeight(x, z) < level) return level;
  }
  return icelandSurfaceHeight(x, z) < 0 ? 0 : null;
}
export function icelandSurfaceAt(x: number, z: number): SurfaceId {
  if (onSkogaBridge(x, z) || onJokulsaBridge(x, z)) return 'asphalt';
  if (icelandWaterHeight(x, z) !== null) return 'water';
  const roadDistance = ringRoadAt(x, z).distance;
  if (roadDistance <= RING_HALF_WIDTH) return 'asphalt';
  if (roadDistance < 7) return 'dirt';
  if (trailDistance(x, z) < 5.5 || lomagnupurRouteDistance(x, z) < 4.5) return 'dirt';
  if (lagoonRouteDistance(x, z) < 4.5) return 'dirt';
  if (icelandIceAt(x, z)) return 'ice';
  if (iceCaveRouteAt(x, z).distance < 8) return 'dirt';
  if (grimsvotnRockHeight(x, z) > 109) return 'rock';
  if (vatnajokullRouteAt(x, z).distance < 8) return 'dirt';
  if (lomagnupurRise(x, z) > 8) return 'rock';
  if (skeidararsandurWeight(x, z) > 0.5) return sandurChannel(x, z) > 0.5 ? 'dirt' : 'sand';
  if (reynisfjallRise(x, z) > 5) return 'rock';
  if (reynisBeachWeight(x, z) > 0.65) return 'sand';
  if (solheimasandurWeight(x, z) > 0.65) return 'sand';
  if (z > 605) return 'ash';
  if (z > 465 && z < 484) return 'rock';
  return 'moss';
}
const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
export function icelandTerrainColor(x: number, z: number) {
  const rock = z > 465 && z < 483;
  const sandur = solheimasandurWeight(x, z);
  const reynisBeach = reynisBeachWeight(x, z);
  const sand = Math.max(smooth((z - 595) / 38), sandur * 0.98, reynisBeach);
  const bankDistance = z <= FALL.terrainLipZ ? upperRiverDistance(x, z) : Math.abs(x - riverX(z));
  const gravel = (1 - smooth((bankDistance - 7) / 15)) * smooth((z - SKOGA_WATER_START) / 24);
  const wet = gravel > 0.7;
  const patch = icelandNoise(x / 29, z / 29);
  const grain = (icelandNoise(x / 7 + 31, z / 7 - 12) - 0.5) * 0.035;
  const heath = smooth((patch - 0.35) / 0.5);
  let base = rock ? [0.27, 0.30, 0.28] : [0.38, 0.46, 0.29];
  if (!rock) base = base.map((v, i) => v * (1 - heath * 0.5) + [0.47, 0.45, 0.30][i] * heath * 0.5);
  base = base.map((v, i) => v * (1 - sand) + ([0.18, 0.20, 0.21][i] + (patch - 0.5) * 0.045) * sand);
  base = base.map((v, i) => v * (1 - gravel) + [0.35, 0.37, 0.33][i] * gravel);
  const road = (1 - smooth((trailRouteDistance(x, z) - 2.5) / 6)) * (wet ? 0 : 1);
  base = base.map((v, i) => v * (1 - road) + [0.47, 0.45, 0.39][i] * road + grain);
  const wreckTrack = (1 - smooth((solheimasandurApproachDistance(x, z) - 2.5) / 5)) * sandur;
  base = base.map((v, i) => v * (1 - wreckTrack * 0.28) + [0.30, 0.30, 0.28][i] * wreckTrack * 0.28
    + sandur * (icelandNoise(x / 14 + 47, z / 11 - 21) - 0.5) * 0.035);
  const basalt = smooth((reynisfjallRise(x, z) - 2) / 12);
  base = base.map((v, i) => v * (1 - basalt) + [0.16, 0.18, 0.18][i] * basalt);
  const beachTrack = (1 - smooth((reynisBeachPathDistance(x, z) - 2.2) / 5)) * reynisBeach;
  base = base.map((v, i) => v * (1 - beachTrack * 0.26) + [0.33, 0.33, 0.31][i] * beachTrack * 0.26);
  const moraineGround = smooth((x - 340) / 40) * (1 - smooth((x - 610) / 35))
    * smooth((z - 425) / 45) * (1 - smooth((z - 680) / 35));
  const outwash = Math.max(skeidararsandurWeight(x, z), moraineGround), channel = sandurChannel(x, z);
  base = base.map((v, i) => v * (1 - outwash) + ([0.19, 0.21, 0.21][i]
    + channel * 0.085 + (patch - 0.5) * 0.07) * outwash);
  const mountain = smooth(lomagnupurRise(x, z) / 18);
  if (mountain > 0) {
    const height = icelandHeight(x, z);
    const band = smooth((icelandNoise(height / 7, 18) - 0.3) / 0.5);
    const stone = [0.27, 0.29, 0.27].map(v => v + band * 0.075 + grain);
    base = base.map((v, i) => v * (1 - mountain) + stone[i] * mountain);
  }
  const talus = lomagnupurTalus(x, z) * (1 - smooth((lomagnupurRise(x, z) - 35) / 30));
  base = base.map((v, i) => v * (1 - talus) + [0.43, 0.42, 0.36][i] * talus);
  const caldera = smooth((grimsvotnRockHeight(x, z) - 80) / 16);
  base = base.map((v, i) => v * (1 - caldera) + ([0.34, 0.27, 0.20][i] + grain + patch * 0.06) * caldera);
  const iceTrack = (1 - smooth((vatnajokullRouteAt(x, z).distance - 5) / 6));
  base = base.map((v, i) => v * (1 - iceTrack * 0.65) + [0.37, 0.36, 0.32][i] * iceTrack * 0.65);
  const caveFloor = insideIceCave(x, z);
  const caveTrack = caveFloor ? 1 : 1 - smooth((iceCaveRouteAt(x, z).distance - 5) / 6);
  const caveIce = caveFloor && icelandIceAt(x, z);
  base = base.map((v, i) => v * (1 - caveTrack)
    + (caveIce ? [0.34 + patch * 0.04, 0.43 + patch * 0.04, 0.45 + patch * 0.04][i] : [0.37, 0.36, 0.32][i]) * caveTrack);
  const cliffTrack = (1 - smooth((Math.min(lomagnupurRouteDistance(x, z), lagoonRouteDistance(x, z)) - 2.8) / 4.5));
  base = base.map((v, i) => v * (1 - cliffTrack * 0.7) + [0.37, 0.36, 0.32][i] * cliffTrack * 0.7);
  // The continuous road mesh owns its asphalt colour. Painting sampled terrain
  // beneath it made dark triangular teeth protrude from curved verges.
  return base.map(linear);
}
export type IcelandChunk = { cx: number; cz: number; vertices: Float32Array; colors: Float32Array; normals: Float32Array; indices: Uint32Array };
export function generateIcelandChunk(cx: number, cz: number, coarse = false): IcelandChunk {
  // Preserve the brink in the distant layer too; a coarse triangle must not span the fall.
  if (cz >= 0 && cz <= 7 && (cx === -6 || cx === -5)) coarse = false;
  if (cx >= -2 && cx <= 0 && cz >= 2 && cz <= 5) coarse = false;
  if (cx >= 3 && cx <= 6 && cz >= 4 && cz <= 7) coarse = false;
  // Retain the buried bed and framing hills at the glacier's detailed resolution.
  if (cx >= 0 && cx <= 6 && cz >= -1 && cz <= 5) coarse = false;
  if (!Number.isInteger(cx) || !Number.isInteger(cz) || cx < -9 || cx > 8 || cz < -9 || cz > 8) throw new Error('Iceland chunk outside apron');
  const vertices: number[] = [], colors: number[] = [], normals: number[] = [], indices: number[] = [];
  const lookup = new Map<string, number>();
  const vertex = (i: number, j: number) => {
    const key = `${i},${j}`, found = lookup.get(key); if (found !== undefined) return found;
    const x = (cx * 40 + i) * 2.4, z = icelandGridZ(cz * 40 + j), h = icelandHeight(x, z);
    const index = vertices.length / 3;
    vertices.push(x, h, z); colors.push(...icelandTerrainColor(x, z));
    const nx = icelandHeight(x - 1.2, z) - icelandHeight(x + 1.2, z);
    const nz = icelandHeight(x, z - 1.2) - icelandHeight(x, z + 1.2), length = Math.hypot(nx, 2.4, nz);
    normals.push(nx / length, 2.4 / length, nz / length); lookup.set(key, index); return index;
  };
  const step = coarse ? 4 : 1;
  for (let j = 0; j < 40; j += step) for (let i = 0; i < 40; i += step) {
    const a = vertex(i, j), b = vertex(i, j + step), c = vertex(i + step, j + step), d = vertex(i + step, j);
    if (!coarse || i > 0 && j > 0 && i < 36 && j < 36) { indices.push(a, b, d, d, b, c); continue; }
    // Full-resolution tile edges stitch the distant terrain to detailed chunks.
    const ring = [a];
    if (i === 0) for (let k = 1; k < 4; k++) ring.push(vertex(i, j + k));
    ring.push(b); if (j === 36) for (let k = 1; k < 4; k++) ring.push(vertex(i + k, j + 4));
    ring.push(c); if (i === 36) for (let k = 1; k < 4; k++) ring.push(vertex(i + 4, j + 4 - k));
    ring.push(d); if (j === 0) for (let k = 1; k < 4; k++) ring.push(vertex(i + 4 - k, j));
    const centre = vertex(i + 2, j + 2);
    for (let k = 0; k < ring.length; k++) indices.push(centre, ring[k], ring[(k + 1) % ring.length]);
  }
  return { cx, cz, vertices: Float32Array.from(vertices), colors: Float32Array.from(colors), normals: Float32Array.from(normals), indices: Uint32Array.from(indices) };
}
