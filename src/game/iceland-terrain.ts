import { icelandNoise } from './iceland-noise';
import type { SurfaceId } from './surfaces';
import { FALL, SKOGA_BRIDGE, onSkogaBridge } from './iceland-layout';
import { ringRoadAt, RING_HALF_WIDTH } from './iceland-road';
import { SOLHEIMASANDUR_WRECK, solheimasandurApproachDistance, solheimasandurWeight } from './iceland-sandur';
import { reynisBeachPathDistance, reynisBeachWeight, reynisfjallRise } from './iceland-reynisfjara';

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
  let h = shelf + 1.1 * Math.sin(x * 0.031) * Math.sin(z * 0.021);
  const cliffZ = 471 + 2.4 * Math.sin((x + 535) * 0.046);
  const cliff = 1 - smooth((z - cliffZ) / 9);
  // The western coastal shelf provides a way around the Skógafoss escarpment.
  const cliffFootprint = smooth((x + 640) / 35);
  h += cliff * cliffFootprint * (42 + 4 * Math.sin(x * 0.018) ** 2);
  const sandur = solheimasandurWeight(x, z);
  h += sandur * (0.55 * (icelandNoise(x / 28 + 19, z / 24 - 7) - 0.5)
    + 0.24 * (icelandNoise(x / 8 - 11, z / 9 + 31) - 0.5));
  h += reynisfjallRise(x, z);
  const wreckApproach = 1 - smooth((solheimasandurApproachDistance(x, z) - 3.5) / 10);
  h += (shelf - h) * wreckApproach * sandur * 0.7;
  const beachApproach = 1 - smooth((reynisBeachPathDistance(x, z) - 4.5) / 10);
  h += (shelf - h) * beachApproach * 0.82;
  // Smooth shoulders along the driving loop, with the river carved afterwards.
  h += (shelf - h) * (1 - smooth((trailDistance(x, z) - 5.5) / 9));
  const road = ringRoadAt(x, z);
  if (road.distance < 32) h += (road.height - h) * (1 - smooth((road.distance - 9) / 23));
  const bridgeApproach = (1 - smooth((Math.abs(z - SKOGA_BRIDGE.z) - 7) / 8))
    * (1 - smooth((Math.abs(x - SKOGA_BRIDGE.x) - 34) / 17));
  h += (SKOGA_BRIDGE.y - h) * bridgeApproach;
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
  h += (-17 - h) * Math.max(sea, westernSea, outerSea);
  // The outer apron stays submerged; deep water stalls the car before its edge.
  h += 15 * smooth((Math.max(Math.abs(x), Math.abs(z)) - 785) / 43);
  return h;
}

/** Collapse one terrain row at the brink into a 5 cm vertical rock face.
 * Both rendering and collision use this coordinate; no decorative cliff shell.
 */
export const icelandGridZ = (row: number) => Math.fround(row === 196 ? 468.05 : row * ICELAND_CELL);
/** Barycentric interpolation of the actual terrain triangle, including the brink row. */
export function icelandSurfaceHeight(x: number, z: number) {
  const gx = x / ICELAND_CELL, ix = Math.floor(gx), u = gx - ix;
  let iz = Math.floor(z / ICELAND_CELL);
  if (z >= icelandGridZ(196) && z < 470.4) iz = 196;
  const z0 = icelandGridZ(iz), z1 = icelandGridZ(iz + 1), v = (z - z0) / (z1 - z0);
  const h = (dx: number, dz: number) => Math.fround(icelandHeight((ix + dx) * ICELAND_CELL, dz ? z1 : z0));
  const a = h(1, 0), b = h(0, 1);
  return u + v <= 1 ? h(0, 0) + u * (a - h(0, 0)) + v * (b - h(0, 0))
    : h(1, 1) + (1 - u) * (b - h(1, 1)) + (1 - v) * (a - h(1, 1));
}
export const icelandDrivingHeight = (x: number, z: number) => onSkogaBridge(x, z) ? Math.max(SKOGA_BRIDGE.y, icelandSurfaceHeight(x, z)) : icelandSurfaceHeight(x, z);
export const icelandSpawn = (p = ICELAND_START) => ({ ...p, y: icelandDrivingHeight(p.x, p.z) + 1.25 });
export function icelandWaterHeight(x: number, z: number): number | null {
  if (z >= SKOGA_WATER_START && z <= 700 && (z <= FALL.terrainLipZ ? upperRiverDistance(x, z) < 30 : Math.abs(x - riverX(z)) < 35)) {
    const level = z <= FALL.terrainLipZ ? riverLevel(z) : riverLevel(Math.max(482, z));
    if (level !== null && icelandSurfaceHeight(x, z) < level) return level;
  }
  return icelandSurfaceHeight(x, z) < 0 ? 0 : null;
}
export function icelandSurfaceAt(x: number, z: number): SurfaceId {
  if (onSkogaBridge(x, z)) return 'asphalt';
  if (icelandWaterHeight(x, z) !== null) return 'water';
  const roadDistance = ringRoadAt(x, z).distance;
  if (roadDistance <= RING_HALF_WIDTH) return 'asphalt';
  if (roadDistance < 7) return 'dirt';
  if (trailDistance(x, z) < 5.5) return 'dirt';
  if (reynisfjallRise(x, z) > 5) return 'rock';
  if (reynisBeachWeight(x, z) > 0.65) return 'sand';
  if (solheimasandurWeight(x, z) > 0.65) return 'sand';
  if (z > 605) return 'ash';
  if (z > 465 && z < 484) return 'rock';
  return 'moss';
}
const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
function terrainColor(x: number, z: number) {
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
  // The continuous road mesh owns its asphalt colour. Painting sampled terrain
  // beneath it made dark triangular teeth protrude from curved verges.
  return base.map(linear);
}
export type IcelandChunk = { cx: number; cz: number; vertices: Float32Array; colors: Float32Array; normals: Float32Array; indices: Uint32Array };
export function generateIcelandChunk(cx: number, cz: number, coarse = false): IcelandChunk {
  // Preserve the brink in the distant layer too; a coarse triangle must not span the fall.
  if (cz >= 0 && cz <= 7 && (cx === -6 || cx === -5)) coarse = false;
  if (!Number.isInteger(cx) || !Number.isInteger(cz) || cx < -9 || cx > 8 || cz < -9 || cz > 8) throw new Error('Iceland chunk outside apron');
  const vertices: number[] = [], colors: number[] = [], normals: number[] = [], indices: number[] = [];
  const lookup = new Map<string, number>();
  const vertex = (i: number, j: number) => {
    const key = `${i},${j}`, found = lookup.get(key); if (found !== undefined) return found;
    const x = (cx * 40 + i) * 2.4, z = icelandGridZ(cz * 40 + j), h = icelandHeight(x, z);
    const index = vertices.length / 3;
    vertices.push(x, h, z); colors.push(...terrainColor(x, z));
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
