import * as THREE from 'three';
import type { SurfaceId } from './surfaces';
import { icelandNoise } from './iceland-noise';
import { DEMO_HALF, demoPathSample, demoWaterGeometry, smooth, type DemoPoint } from './location-demo-terrain';

export const TIDAL_HALF = DEMO_HALF, TIDAL_CELL = 2;
const p = (x: number, z: number, y: number): DemoPoint => ({ x, y, z });
export const TIDAL_ROUTE = [
  p(-125, 60, 6), p(-103, 44, 4), p(-82, 30, 2.4), p(-62, 30, 1.4),
  p(-48, 24, 1.8), p(-42, 14, 0.5), p(-36, 4, -0.28), p(-28, 4, -0.28),
  p(-10, 6, 2.8), p(0, -12, 4.2), p(16, -18, 1.2),
  p(24, -9, -0.3), p(30, -1, -0.3), p(39, 12, 2.8), p(54, 14, 4.8),
  p(66, 2, 2.4), p(74, -5, -0.28), p(79, -5, -0.28),
  p(95, -1, 3.8), p(110, 8, 5.5), p(126, 18, 8), p(146, 4, 16), p(143, -23, 25),
  p(144, -38, 30), p(144, -53, 30),
] as const;
export const SEABIRD_CLIMB = [
  TIDAL_ROUTE[24], p(136, -69, 32), p(113, -80, 38), p(113, -86, 38), p(111, -102, 43),
  p(123, -108, 47), p(133, -112, 47), p(143, -109, 47),
  p(156, -104, 52), p(167, -124, 59),
  p(155, -145, 67), p(137, -151, 67),
] as const;
export const TIDAL_CHANNELS = [TIDAL_ROUTE.slice(6, 8), TIDAL_ROUTE.slice(11, 13), TIDAL_ROUTE.slice(16, 18)];
const headingAt = (index: number, route: readonly DemoPoint[] = TIDAL_ROUTE) => {
  const a = route[index], b = route[index + 1];
  return Math.atan2(-(b.x - a.x), -(b.z - a.z));
};
export const TIDAL_STARTS = [
  { id: 'harbor-cove', name: 'Harbor Cove', position: TIDAL_ROUTE[0], heading: headingAt(0) },
  { id: 'gull-rock', name: 'Gull Rock', position: TIDAL_ROUTE[8], heading: headingAt(8) },
  { id: 'split-saddle', name: 'Split Saddle', position: TIDAL_ROUTE[14], heading: headingAt(14) },
  { id: 'saltgrass-landing', name: 'Saltgrass Landing', position: TIDAL_ROUTE[19], heading: headingAt(19) },
  { id: 'windward-lookout', name: 'Windward Lookout', position: SEABIRD_CLIMB[0],
    heading: headingAt(0, SEABIRD_CLIMB) },
  { id: 'wind-notch', name: 'Wind Notch', position: SEABIRD_CLIMB[6],
    heading: headingAt(6, SEABIRD_CLIMB) },
  { id: 'seabird-summit', name: 'Seabird Summit', position: SEABIRD_CLIMB[11],
    heading: headingAt(10, SEABIRD_CLIMB) + Math.PI },
] as const;
export type TidalStart = typeof TIDAL_STARTS[number];
export const tidalRouteSample = (x: number, z: number) => {
  const crossing = demoPathSample(TIDAL_ROUTE, x, z), climb = demoPathSample(SEABIRD_CLIMB, x, z);
  return climb.distance < crossing.distance ? climb : crossing;
};
const bump = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) =>
  Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));

export function tidalHeightAt(x: number, z: number) {
  const noise = icelandNoise(x / 28 + 71, z / 29 - 42);
  const west = Math.hypot((x + 128) / 58, (z - 12) / 105) + (noise - 0.5) * 0.12;
  const east = Math.hypot((x - 130) / 49, (z + 10) / 83) + (noise - 0.5) * 0.12;
  const westLand = 1 - smooth((west - 0.7) / 0.36), eastLand = 1 - smooth((east - 0.69) / 0.37);
  let height = -8 + 14 * Math.max(westLand, eastLand);
  height += westLand * 17 * bump(x, z, -143, -35, 29, 48);
  height += eastLand * 26 * bump(x, z, 143, -33, 25, 38);
  height += Math.max(westLand, eastLand) * (noise - 0.5) * 1.3;
  const north = Math.hypot((x - 139) / 43, (z + 115) / 64) + (noise - 0.5) * 0.025;
  const northLand = 1 - smooth((north - 0.69) / 0.16);
  const northTop = 20 + 46 * smooth((-z - 60) / 85) + 12 * bump(x, z, 161, -104, 17, 17);
  const shoulder = 1 - smooth((Math.hypot((x - 126) / 30, (z + 80) / 24) - 0.6) / 0.3);
  height = Math.max(height, -8 + (northTop + 8) * northLand, -8 + 46 * shoulder);
  // Separate outcrops, rather than a continuous raised causeway.
  for (const [cx, cz, top, rx, rz] of [
    [-61, 31, 2.4, 13, 12], [-48, 22, 2.9, 10, 13], [-10, 6, 3, 10, 9],
    [0, -12, 5.1, 10, 11], [15, -18, 2, 10, 8], [39, 12, 3.2, 9, 12],
    [54, 14, 5.2, 12, 10], [65, 2, 2.8, 9, 9],
    [-16, 33, 4.4, 7, 9], [35, -43, 6.5, 9, 7], [67, 45, 3.1, 9, 8],
  ]) height = Math.max(height, -8 + (top + 8) * bump(x, z, cx, cz, rx, rz));
  const route = demoPathSample(TIDAL_ROUTE, x, z), crossing = x > -77 && x < 97;
  const core = crossing ? 2.9 : 4;
  const weight = 1 - smooth((route.distance - core) / (crossing ? 3.4 : 7));
  const uneven = crossing ? Math.sin(x * 0.61 + z * 0.21) * Math.sin(z * 0.43) * 0.18 : 0;
  height += (route.elevation + uneven - height) * weight;
  for (const channel of TIDAL_CHANNELS) {
    const [a, b] = channel, dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const along = ((x - a.x) * dx + (z - a.z) * dz) / length;
    const across = Math.abs((x - a.x) * dz - (z - a.z) * dx) / length;
    const outside = Math.max(0, -along, along - length);
    const weight = (1 - smooth((across - 2.8) / 3)) * (1 - smooth(outside / 7));
    height += (channel[0].y - height) * weight;
  }
  const climb = demoPathSample(SEABIRD_CLIMB, x, z);
  const bendDistance = Math.min(...SEABIRD_CLIMB.map(point => Math.hypot(x - point.x, z - point.z)));
  const ledgeCore = 2.7 + 1.2 * (1 - smooth((bendDistance - 5) / 8));
  height += (climb.elevation - height) * (1 - smooth((climb.distance - ledgeCore) / 2.8));
  for (const start of TIDAL_STARTS) {
    const weight = 1 - smooth((Math.hypot(x - start.position.x, z - start.position.z) - 6) / 3);
    height += (start.position.y - height) * weight;
  }
  const lookout = TIDAL_ROUTE.at(-1)!;
  height += (lookout.y - height) * (1 - smooth((Math.hypot(x - lookout.x, z - lookout.z) - 10) / 3));
  const summit = SEABIRD_CLIMB.at(-1)!;
  height += (summit.y - height) * (1 - smooth((Math.hypot(x - summit.x, z - summit.z) - 10) / 3));
  return height;
}

const cells = TIDAL_HALF * 2 / TIDAL_CELL, size = cells + 1;
let heights: Float32Array | undefined;
function grid() {
  if (!heights) {
    heights = new Float32Array(size * size);
    for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++)
      heights[j * size + i] = tidalHeightAt(-TIDAL_HALF + i * TIDAL_CELL, -TIDAL_HALF + j * TIDAL_CELL);
  }
  return heights;
}
export function tidalGroundHeight(x: number, z: number) {
  if (Math.abs(x) > TIDAL_HALF || Math.abs(z) > TIDAL_HALF) return tidalHeightAt(x, z);
  const heights = grid(), gx = (x + TIDAL_HALF) / TIDAL_CELL, gz = (z + TIDAL_HALF) / TIDAL_CELL;
  const ix = Math.min(cells - 1, Math.floor(gx)), iz = Math.min(cells - 1, Math.floor(gz));
  const u = gx - ix, v = gz - iz, a = heights[iz * size + ix + 1], b = heights[(iz + 1) * size + ix];
  if (u + v <= 1) { const c = heights[iz * size + ix]; return c + u * (a - c) + v * (b - c); }
  const c = heights[(iz + 1) * size + ix + 1]; return c + (1 - u) * (b - c) + (1 - v) * (a - c);
}
export const tidalSpawn = (point: { x: number; z: number } = TIDAL_ROUTE[0]) =>
  ({ ...point, y: tidalGroundHeight(point.x, point.z) + 1.2 });
export const tidalWaterHeight = (x: number, z: number) => tidalGroundHeight(x, z) < 0 ? 0 : null;
export function tidalSurfaceAt(x: number, z: number): SurfaceId {
  const height = tidalGroundHeight(x, z);
  if (height < 0) return 'water';
  if (z < -65 && demoPathSample(SEABIRD_CLIMB, x, z).distance < 3.5) return 'rock';
  if (x > -79 && x < 97) return 'rock';
  if (height < 2) return 'sand';
  return tidalRouteSample(x, z).distance < 3.5 ? 'dirt' : 'grass';
}
export function tidalColor(x: number, z: number, height = tidalGroundHeight(x, z)) {
  const crossing = x > -79 && x < 97;
  const color = new THREE.Color('#718b50');
  color.lerp(new THREE.Color('#53665c'), smooth((height - 13) / 15) * 0.7);
  color.lerp(new THREE.Color('#b6b396'), 1 - smooth((height - 0.6) / 2.4));
  if (crossing) color.set('#66736f').lerp(new THREE.Color('#8c9487'), smooth((height - 0.3) / 3.5));
  else if (z < -65 && x > 94) {
    color.lerp(new THREE.Color('#596c64'), smooth((height - 24) / 24) * 0.85);
    color.lerp(new THREE.Color('#a6b0a2'), (1 - smooth((tidalRouteSample(x, z).distance - 1.5) / 2.5)) * 0.65);
  }
  else color.lerp(new THREE.Color('#b4ab86'), (1 - smooth((tidalRouteSample(x, z).distance - 1.8) / 2.5)) * 0.65);
  return color.multiplyScalar(0.86 + icelandNoise(x / 9 + 12, z / 10 - 6) * 0.25);
}
export function tidalTerrainGeometry() {
  const heights = grid(), positions = new Float32Array(size * size * 3), colors = new Float32Array(positions.length);
  const indices = new Uint32Array(cells * cells * 6);
  for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
    const x = -TIDAL_HALF + i * TIDAL_CELL, z = -TIDAL_HALF + j * TIDAL_CELL, index = j * size + i, y = heights[index];
    positions.set([x, y, z], index * 3); tidalColor(x, z, y).toArray(colors, index * 3);
  }
  let index = 0;
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = j * size + i, b = a + 1, c = a + size;
    indices.set([a, c, b, b, c, c + 1], index); index += 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1)); geometry.computeVertexNormals();
  return geometry;
}
export function tidalWaterGeometry(terrain: THREE.BufferGeometry) {
  // Clip 1 mm inside the wet bed; keep the sea level unchanged after Float32 shoreline rounding.
  const geometry = demoWaterGeometry(terrain, -0.001, undefined, true).translate(0, 0.001, 0);
  const positions = geometry.getAttribute('position'), colors = new Float32Array(positions.count * 4);
  const shallow = new THREE.Color('#65b4ae'), deep = new THREE.Color('#28667d'), color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const depth = Math.abs(x) > TIDAL_HALF || Math.abs(z) > TIDAL_HALF ? 8 : -tidalGroundHeight(x, z);
    color.copy(shallow).lerp(deep, smooth((depth - 0.1) / 6)).toArray(colors, i * 4);
    colors[i * 4 + 3] = 0.58 + smooth((depth - 0.4) / 2.5) * 0.42;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  return geometry;
}
