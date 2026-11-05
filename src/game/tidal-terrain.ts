import * as THREE from 'three';
import type { SurfaceId } from './surfaces';
import { icelandNoise } from './iceland-noise';
import { demoPathSample, demoWaterGeometry, smooth, type DemoPoint } from './location-demo-terrain';

export const TIDAL_BOUNDS = [-660, -200, 200, 200] as const;
export const TIDAL_HALF = 660, TIDAL_CELL = 2;
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
export const PEBBLE_DESCENT = [
  TIDAL_ROUTE[24], p(158, -64, 30), p(165, -63, 30), p(174, -56, 27),
  p(180, -38, 24), p(172, -20, 21), p(168, -8, 18), p(168, 1, 18),
  p(176, 16, 14), p(176, 30, 11), p(164, 42, 8), p(152, 54, 5),
  p(140, 66, 4), p(126, 66, 4),
] as const;
export const PEBBLE_CAVE = {
  entry: p(173, 33, 10.25), exit: p(155, 51, 5.75), halfWidth: 12, opening: 8.5, clearance: 9.5,
} as const;
export const HOME_LOOP = [
  TIDAL_ROUTE[0], p(-160, 84, 7), p(-198, 91, 9), p(-240, 82, 12),
  p(-281, 61, 13), p(-303, 25, 11), p(-301, -18, 12),
  p(-284, -58, 15), p(-276, -70, 16), p(-226, -85, 17),
  p(-192, -63, 17), p(-177, -25, 16), p(-181, 15, 13),
  p(-159, 22, 10), p(-136, 31, 7), p(-119, 43, 6), TIDAL_ROUTE[0],
] as const;
export const WHALES_BACK = [
  HOME_LOOP[4], p(-262, 45, 17), p(-252, 22, 26), p(-252, 5, 28),
  p(-250, -18, 25), p(-257, -44, 18), HOME_LOOP[7],
] as const;
export const NEEDLE_LIGHTHOUSE = { x: -280, z: -90, y: 16 } as const;
export const HARBOR_MEADOW = { x: -220, z: 45, radius: 26 } as const;
export const MAINLAND_LOOP = [
  HOME_LOOP[5], p(-346, 62, 12), p(-386, 106, 10), p(-443, 123, 8),
  p(-498, 99, 10), p(-550, 59, 12), p(-574, 6, 14), p(-557, -48, 16),
  p(-520, -93, 15), p(-466, -111, 12), p(-411, -105, 13), p(-361, -79, 14),
  HOME_LOOP[7], HOME_LOOP[6], HOME_LOOP[5],
] as const;
export const HEATHER_CUT = [
  MAINLAND_LOOP[6], p(-555, -5, 14), p(-540, -13, 17), p(-528, -21, 23),
  p(-518, -29, 26), p(-507, -39, 26), p(-497, -49, 22), p(-494, -63, 19),
  p(-504, -78, 16), MAINLAND_LOOP[8],
] as const;
export const MAINLAND_MEADOW = { x: -427, z: 15, radius: 52 } as const;
export const MAINLAND_FARM = { x: -470, z: 65, y: 13 } as const;
export const WEST_BEACON = { x: -610, z: -15, y: 22 } as const;
export const WEST_BEACON_APPROACH = [
  MAINLAND_LOOP[6], p(-590, -6, 18), p(-599, -22, 22), p(-609, -31, 22),
] as const;
export const WEST_BEACH_APPROACH = [
  MAINLAND_LOOP[7], p(-572, -60, 12), p(-579, -76, 7), p(-586, -91, 2.6), p(-592, -93, 2.6),
] as const;
export const WEST_BEACH = WEST_BEACH_APPROACH[4];
export const WEST_WADE = { x: -592, z: -126, radius: 14, depth: 0.3 } as const;
export const CLIFF_WADE = [
  WEST_BEACH, p(-610, -88, 0.6), p(-628, -75, -0.28), p(-637, -61, -0.32),
  p(-630, -44, -0.3), p(-633, -28, 0.6), p(-639, -12, -0.32),
  p(-635, 9, -0.3), p(-637, 27, 0.8), p(-630, 44, -0.32),
  p(-626, 60, -0.25), p(-610, 67, 2.8),
] as const;
const cliffBed = new THREE.CatmullRomCurve3(CLIFF_WADE.map(point =>
  new THREE.Vector3(point.x, point.y, point.z))).getPoints(88)
  .map(point => p(point.x, point.z, Math.max(-0.34, point.y)));
export const SMUGGLERS_NOOK = { x: -611, z: 27, y: 2.2 } as const;
export const SMUGGLERS_APPROACH = [
  p(-635, 12, -0.1), p(-627, 16, 0.6), p(-620, 22, 1.8), p(-614, 25, 2.2),
] as const;
export const NORTH_COVE_APPROACH = [
  MAINLAND_LOOP[5], p(-574, 73, 9), p(-596, 76, 5), CLIFF_WADE[11],
] as const;
export const COAST_BEACONS = [
  { x: -434, z: -118.5, color: '#a65b48' },
  { x: -442, z: 134, color: '#718a80' },
  { x: 146, z: -158, color: '#a65b48' },
] as const;
export const homeRouteSample = (x: number, z: number) => {
  const loop = demoPathSample(HOME_LOOP, x, z), ridge = demoPathSample(WHALES_BACK, x, z);
  const mainland = demoPathSample(MAINLAND_LOOP, x, z), cut = demoPathSample(HEATHER_CUT, x, z);
  const coastal = [WEST_BEACON_APPROACH, WEST_BEACH_APPROACH, NORTH_COVE_APPROACH, CLIFF_WADE, SMUGGLERS_APPROACH]
    .map(route => demoPathSample(route, x, z));
  return [ridge, mainland, cut, ...coastal].reduce((nearest, sample) => sample.distance < nearest.distance ? sample : nearest, loop);
};
export const TIDAL_CHANNELS = [TIDAL_ROUTE.slice(6, 8), TIDAL_ROUTE.slice(11, 13), TIDAL_ROUTE.slice(16, 18)];
const headingAt = (index: number, route: readonly DemoPoint[] = TIDAL_ROUTE) => {
  const a = route[index], b = route[index + 1];
  return Math.atan2(-(b.x - a.x), -(b.z - a.z));
};
export const TIDAL_STARTS = [
  { id: 'harbor-cove', name: 'Harbor Cove', position: TIDAL_ROUTE[0], heading: headingAt(0, HOME_LOOP) },
  { id: 'gull-rock', name: 'Gull Rock', position: TIDAL_ROUTE[8], heading: headingAt(8) },
  { id: 'split-saddle', name: 'Split Saddle', position: TIDAL_ROUTE[14], heading: headingAt(14) },
  { id: 'saltgrass-landing', name: 'Saltgrass Landing', position: TIDAL_ROUTE[19], heading: headingAt(19) },
  { id: 'windward-lookout', name: 'Windward Lookout', position: SEABIRD_CLIMB[0],
    heading: headingAt(0, SEABIRD_CLIMB) },
  { id: 'wind-notch', name: 'Wind Notch', position: SEABIRD_CLIMB[6],
    heading: headingAt(6, SEABIRD_CLIMB) },
  { id: 'seabird-summit', name: 'Seabird Summit', position: SEABIRD_CLIMB[11],
    heading: headingAt(10, SEABIRD_CLIMB) + Math.PI },
  { id: 'pebble-cove', name: 'Pebble Cove', position: PEBBLE_DESCENT[13],
    heading: headingAt(12, PEBBLE_DESCENT) + Math.PI },
  { id: 'whales-back', name: "Whale's Back", position: WHALES_BACK[3], heading: headingAt(3, WHALES_BACK) },
  { id: 'needle-lighthouse', name: 'Needle Lighthouse', position: HOME_LOOP[8], heading: headingAt(8, HOME_LOOP) },
  { id: 'heather-cut', name: 'Heather Cut', position: HEATHER_CUT[0], heading: headingAt(0, HEATHER_CUT) },
  { id: 'west-overlook', name: 'West Overlook', position: MAINLAND_LOOP[8], heading: headingAt(8, MAINLAND_LOOP) },
  { id: 'west-beach', name: 'West Beach', position: WEST_BEACH, heading: headingAt(0, CLIFF_WADE) },
  { id: 'north-cove', name: 'North Cove', position: CLIFF_WADE[11], heading: headingAt(10, CLIFF_WADE) + Math.PI },
  { id: 'west-beacon', name: 'Western Beacon', position: WEST_BEACON_APPROACH[3],
    heading: Math.atan2(-(WEST_BEACON.x - WEST_BEACON_APPROACH[3].x), -(WEST_BEACON.z - WEST_BEACON_APPROACH[3].z)) },
] as const;
export type TidalStart = typeof TIDAL_STARTS[number];
export const tidalRouteSample = (x: number, z: number) => {
  if (x < -110) {
    const crossing = demoPathSample(TIDAL_ROUTE, x, z), home = homeRouteSample(x, z);
    return home.distance < crossing.distance ? home : crossing;
  }
  const crossing = demoPathSample(TIDAL_ROUTE, x, z), climb = demoPathSample(SEABIRD_CLIMB, x, z);
  const cove = demoPathSample(PEBBLE_DESCENT, x, z);
  const nearest = climb.distance < crossing.distance ? climb : crossing;
  return cove.distance < nearest.distance ? cove : nearest;
};
const bump = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) =>
  Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
const PEBBLE_HEADLANDS = [
  [p(92, 35, 29), p(109, 40, 35), p(128, 38, 39),
    p(146, 41, 34), p(166, 43, 37), p(187, 40, 28)],
  [p(146, 41, 34), p(155, 24, 37), p(158, 6, 40),
    p(158, -12, 42), p(164, -30, 37), p(156, -54, 35)],
] as const;
export function pebbleHeadlandHeight(x: number, z: number) {
  const width = 5.2 + Math.sin(x * 0.19) * 1.1 + Math.cos(x * 0.31 + z * 0.1) * 0.7;
  let height = -8;
  for (const ridge of PEBBLE_HEADLANDS) {
    const spine = demoPathSample(ridge, x, z);
    const land = 1 - smooth((spine.distance - width) / 3.2);
    const crown = spine.elevation + Math.sin(x * 0.23 + z * 0.17) * 2.1
      + (icelandNoise(x / 8 + 34, z / 9 - 18) - 0.5) * 4;
    height = Math.max(height, -8 + (crown + 8) * land);
  }
  for (const [cx, cz, rx, rz, top] of [
    [109, 39, 19, 12, 34], [130, 39, 24, 13, 39],
    [157, 41, 22, 16, 37], [176, 40, 17, 15, 33],
  ]) {
    const radius = Math.hypot((x - cx) / rx, (z - cz) / rz)
      + (icelandNoise(x / 6 + 17, z / 7) - 0.5) * 0.09;
    const land = 1 - smooth((radius - 0.62) / 0.38);
    height = Math.max(height, -8 + (top + 8 + Math.sin(x * 0.27 + z * 0.19) * 1.8) * land);
  }
  return height;
}

export function tidalHeightAt(x: number, z: number) {
  const noise = icelandNoise(x / 28 + 71, z / 29 - 42);
  const west = Math.hypot((x + 128) / 58, (z - 12) / 105) + (noise - 0.5) * 0.12;
  const east = Math.hypot((x - 130) / 49, (z + 10) / 83) + (noise - 0.5) * 0.12;
  const westLand = 1 - smooth((west - 0.7) / 0.36), eastLand = 1 - smooth((east - 0.69) / 0.37);
  let height = -8 + 14 * Math.max(westLand, eastLand);
  height += westLand * 17 * bump(x, z, -143, -35, 29, 48);
  height += eastLand * 26 * bump(x, z, 143, -33, 25, 38);
  height += Math.max(westLand, eastLand) * (noise - 0.5) * 1.3;
  if (x < -110) {
    const radius = Math.hypot((x + 223) / 112, (z - 4) / 115) + (noise - 0.5) * 0.08;
    const land = 1 - smooth((radius - 0.72) / 0.34);
    const hills = 6 + 9 * bump(x, z, -235, 26, 74, 73) + 10 * bump(x, z, -209, -51, 54, 57)
      + (noise - 0.5) * 1.4;
    const extension = -8 + (hills + 8) * land;
    height = Math.max(height, extension * (1 - smooth((x + 140) / 30)) - 8 * smooth((x + 140) / 30));
    if (x < -280) {
      const radius = Math.hypot((x + 430) / 215, (z - 12) / 155) + (noise - 0.5) * 0.045;
      const land = 1 - smooth((radius - 0.72) / 0.34);
      const hills = 7 + 11 * bump(x, z, -445, 4, 87, 72) + 10 * bump(x, z, -536, -43, 62, 56)
        + 7 * bump(x, z, -367, 50, 56, 61) + (noise - 0.5) * 1.5;
      const join = 1 - smooth((x + 340) / 60);
      height = Math.max(height, -8 + (hills + 8) * land * join);
      const cut = demoPathSample(HEATHER_CUT, x, z);
      const pocket = (1 - smooth((Math.hypot((x + 523) / 42, (z + 38) / 50) - 0.65) / 0.5));
      height += pocket * 7;
      height += (cut.elevation - height) * (1 - smooth((cut.distance - 2.8) / 4));
      const mainland = demoPathSample(MAINLAND_LOOP, x, z);
      height += (mainland.elevation - height) * (1 - smooth((mainland.distance - 9) / 13));
      for (const pad of [MAINLAND_FARM])
        height += (pad.y - height) * (1 - smooth((Math.hypot(x - pad.x, z - pad.z) - 10) / 10));
      if (x < -565) {
        const cliffEdge = -621 + Math.sin(z * 0.085) * 2.4 + Math.cos(z * 0.19) * 1.3;
        const headland = (1 - smooth((cliffEdge - x) / 10)) * (1 - smooth((x + 596) / 17))
          * (1 - smooth((Math.abs(z + 12) - 37) / 26));
        const crown = 22 + Math.sin(z * 0.13) * 0.55 + (noise - 0.5) * 0.9;
        height = Math.max(height, -8 + (crown + 8) * headland);
        const buttress = 1 - smooth((Math.hypot((x + 608) / 18, (z - 40) / 16) - 0.65) / 0.4);
        height = Math.max(height, -8 + 28 * buttress);
        const beach = 1 - smooth((Math.hypot((x - WEST_BEACH.x) / 34, (z + 107) / 38) - 0.72) / 0.34);
        const shore = 2.6 - 2.9 * smooth((-z - 99) / 14);
        height += (shore - height) * beach;
        const basin = (1 - smooth((Math.hypot((x - WEST_WADE.x) / 32, (z - WEST_WADE.z) / 28) - 0.9) / 0.25))
          * smooth((-z - 99) / 14);
        height += (-WEST_WADE.depth - height) * basin;
        const wet = demoPathSample(cliffBed, x, z);
        const width = 7.5 + Math.sin(z * 0.12) * 1.1 + Math.cos(z * 0.23) * 0.6;
        const shoulder = 4.5 + Math.sin(z * 0.17 + 1.4) * 1.4;
        height += (wet.elevation - height) * (1 - smooth((wet.distance - width) / shoulder));
        for (const [px, pz, radius] of [[-644, -44, 9], [-645, 8, 8], [-642, 48, 9]]) {
          const pocket = 1 - smooth((Math.hypot(x - px, z - pz) - radius * 0.45) / (radius * 0.65));
          height = Math.max(height, -8 + 7.68 * pocket);
        }
        const inlet = demoPathSample(SMUGGLERS_APPROACH, x, z);
        height += (inlet.elevation - height) * (1 - smooth((inlet.distance - 3.8) / 4.5));
        const nook = SMUGGLERS_NOOK;
        const recess = 1 - smooth((Math.hypot((x - nook.x) / 13.5, (z - nook.z) / 13.5) - 0.92) / 0.38);
        height += (nook.y - height) * recess;
      }
      for (const route of [WEST_BEACON_APPROACH, WEST_BEACH_APPROACH, NORTH_COVE_APPROACH]) {
        const approach = demoPathSample(route, x, z);
        height += (approach.elevation - height) * (1 - smooth((approach.distance - 6) / 9));
      }
      // The coast additions must not pinch the existing broad mainland bypass.
      height += (mainland.elevation - height) * (1 - smooth((mainland.distance - 9) / 13));
      const beacon = WEST_BEACON;
      height += (beacon.y - height) * (1 - smooth((Math.hypot(x - beacon.x, z - beacon.z) - 6.5) / 4.5));
    }
    const back = bump(x, z, -252, 4, 17, 47);
    height += back * 13 * land;
    const loop = demoPathSample(HOME_LOOP, x, z);
    height += (loop.elevation - height) * (1 - smooth((loop.distance - 8) / 12));
    const ridge = demoPathSample(WHALES_BACK, x, z);
    height += (ridge.elevation - height) * (1 - smooth((ridge.distance - 3.5) / 5));
    height += (loop.elevation - height) * (1 - smooth((loop.distance - 8) / 8));
    const light = NEEDLE_LIGHTHOUSE;
    const pad = 1 - smooth((Math.hypot(x - light.x, z - light.z) - 12) / 10);
    height += (light.y - height) * pad;
  }
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
  const coveLand = 1 - smooth((Math.hypot((x - 138) / 35, (z - 58) / 29) - 0.7) / 0.35);
  const headlands = 6 + 9 * bump(x, z, 109, 65, 12, 19) + 10 * bump(x, z, 162, 58, 15, 23);
  height = Math.max(height, -8 + (headlands + 8) * coveLand, pebbleHeadlandHeight(x, z));
  const ravineWall = 1 - smooth((Math.hypot((x - 164) / 9, (z + 30) / 24) - 0.5) / 0.5);
  height = Math.max(height, -8 + 42 * ravineWall);
  const beach = 1 - smooth((Math.hypot((x - 126) / 20, (z - 76) / 19) - 0.6) / 0.45);
  height += (4 - 4.8 * smooth((z - 70) / 18) - height) * beach;
  const shallows = (1 - smooth((Math.hypot((x - 126) / 24, (z - 91) / 24) - 0.8) / 0.2))
    * smooth((z - 78) / 6);
  height += (4 - 4.32 * smooth((z - 78) / 12) - height) * shallows;
  const cove = demoPathSample(PEBBLE_DESCENT, x, z);
  const coveBend = Math.min(...PEBBLE_DESCENT.map(point => Math.hypot(x - point.x, z - point.z)));
  const coveCore = 3.3 + 1.3 * (1 - smooth((coveBend - 4) / 7));
  height += (cove.elevation - height) * (1 - smooth((cove.distance - coveCore) / 4));
  for (const start of TIDAL_STARTS) {
    const core = start.position.x < -360 ? 8 : 6;
    const weight = 1 - smooth((Math.hypot(x - start.position.x, z - start.position.z) - core) / 3);
    height += (start.position.y - height) * weight;
  }
  const lookout = TIDAL_ROUTE.at(-1)!;
  height += (lookout.y - height) * (1 - smooth((Math.hypot(x - lookout.x, z - lookout.z) - 10) / 3));
  const summit = SEABIRD_CLIMB.at(-1)!;
  height += (summit.y - height) * (1 - smooth((Math.hypot(x - summit.x, z - summit.z) - 10) / 3));
  const shore = PEBBLE_DESCENT.at(-1)!;
  height += (shore.y - height) * (1 - smooth((Math.hypot(x - shore.x, z - shore.z) - 12) / 4));
  for (const beacon of COAST_BEACONS) {
    if (beacon.x > 0) {
      const pad = 1 - smooth((Math.hypot(x - beacon.x, z - beacon.z) - 4.5) / 2);
      height += (SEABIRD_CLIMB.at(-1)!.y - height) * pad;
    }
  }
  return height;
}

type TerrainPatch = { minX: number; maxX: number; cell: number; heights?: Float32Array };
const westernPatch: TerrainPatch = { minX: TIDAL_BOUNDS[0], maxX: -360, cell: 4 };
const originalPatch: TerrainPatch = { minX: -360, maxX: TIDAL_BOUNDS[2], cell: TIDAL_CELL };
const patches = [westernPatch, originalPatch];
const inBounds = (x: number, z: number) =>
  x >= TIDAL_BOUNDS[0] && x <= TIDAL_BOUNDS[2] && z >= TIDAL_BOUNDS[1] && z <= TIDAL_BOUNDS[3];
function grid(patch: TerrainPatch) {
  const cellsX = (patch.maxX - patch.minX) / patch.cell;
  const cellsZ = (TIDAL_BOUNDS[3] - TIDAL_BOUNDS[1]) / patch.cell, size = cellsX + 1;
  if (!patch.heights) {
    patch.heights = new Float32Array(size * (cellsZ + 1));
    for (let j = 0; j <= cellsZ; j++) for (let i = 0; i <= cellsX; i++)
      patch.heights[j * size + i] = tidalHeightAt(patch.minX + i * patch.cell, TIDAL_BOUNDS[1] + j * patch.cell);
  }
  return { heights: patch.heights, cellsX, cellsZ, size };
}
export function tidalGroundHeight(x: number, z: number) {
  if (!inBounds(x, z)) return tidalHeightAt(x, z);
  const patch = x < originalPatch.minX ? westernPatch : originalPatch;
  const { heights, cellsX, cellsZ, size } = grid(patch);
  const gx = (x - patch.minX) / patch.cell, gz = (z - TIDAL_BOUNDS[1]) / patch.cell;
  const ix = Math.min(cellsX - 1, Math.floor(gx)), iz = Math.min(cellsZ - 1, Math.floor(gz));
  const u = gx - ix, v = gz - iz, a = heights[iz * size + ix + 1], b = heights[(iz + 1) * size + ix];
  if (u + v <= 1) { const c = heights[iz * size + ix]; return c + u * (a - c) + v * (b - c); }
  const c = heights[(iz + 1) * size + ix + 1];
  if (patch === westernPatch && ix === cellsX - 1) {
    const fine = grid(originalPatch), middle = fine.heights[(iz * 2 + 1) * fine.size];
    // Split the coarse edge at every fine-grid vertex; physics and rendering use these same triangles.
    if (v <= 1 - u / 2) return a * (2 - u - 2 * v) + b * (1 - u) + middle * 2 * (u + v - 1);
    return middle * 2 * (1 - v) + b * (1 - u) + c * (u + 2 * v - 2);
  }
  return c + (1 - u) * (b - c) + (1 - v) * (a - c);
}
export const tidalSpawn = (point: { x: number; z: number } = TIDAL_ROUTE[0]) =>
  ({ ...point, y: tidalGroundHeight(point.x, point.z) + 1.2 });
export const tidalWaterHeight = (x: number, z: number) => tidalGroundHeight(x, z) < 0 ? 0 : null;
export function tidalSurfaceAt(x: number, z: number): SurfaceId {
  const height = tidalGroundHeight(x, z);
  if (height < 0) return 'water';
  if (x < -565 && Math.hypot((x - WEST_BEACH.x) / 35, (z + 107) / 39) < 1 && height < 4) return 'sand';
  if (x < -595 && (demoPathSample(cliffBed, x, z).distance < 11
    || Math.hypot(x - SMUGGLERS_NOOK.x, z - SMUGGLERS_NOOK.z) < 15)) return 'rock';
  if (x < -340 && demoPathSample(HEATHER_CUT, x, z).distance < 6) return 'rock';
  if (x < -190 && demoPathSample(WHALES_BACK, x, z).distance < 7) return 'rock';
  if (height > 10 && pebbleHeadlandHeight(x, z) > height - 1) return 'rock';
  if (demoPathSample(PEBBLE_DESCENT, x, z).distance < 4.5) return 'rock';
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
  if (x < -565) {
    const beach = 1 - smooth((Math.hypot((x - WEST_BEACH.x) / 35, (z + 107) / 39) - 0.7) / 0.35);
    color.lerp(new THREE.Color('#c4b998'), beach * (1 - smooth((height - 3) / 3)));
    if (x < -607 && Math.abs(z + 12) < 69)
      color.lerp(new THREE.Color('#788174'), (1 - smooth((x + 607) / 12)) * 0.8);
  }
  const beach = 1 - smooth((Math.hypot((x - 126) / 23, (z - 73) / 22) - 0.7) / 0.3);
  if (height < 6 && beach > 0) color.lerp(new THREE.Color('#aba99a'), beach);
  else if (height > 10 && pebbleHeadlandHeight(x, z) > height - 2)
    color.set('#737e70').lerp(new THREE.Color('#94a085'), icelandNoise(x / 7, z / 8) * 0.4);
  else if (demoPathSample(PEBBLE_DESCENT, x, z).distance < 9 && x > 150) {
    color.lerp(new THREE.Color('#8b958a'), (1 - smooth((demoPathSample(PEBBLE_DESCENT, x, z).distance - 3) / 6)) * 0.9);
  }
  else if (crossing) color.set('#66736f').lerp(new THREE.Color('#8c9487'), smooth((height - 0.3) / 3.5));
  else if (z < -65 && x > 94) {
    color.lerp(new THREE.Color('#596c64'), smooth((height - 24) / 24) * 0.85);
    color.lerp(new THREE.Color('#a6b0a2'), (1 - smooth((tidalRouteSample(x, z).distance - 1.5) / 2.5)) * 0.65);
  }
  else if (x < -340 && demoPathSample(HEATHER_CUT, x, z).distance < 10)
    color.lerp(new THREE.Color('#7f897d'), (1 - smooth((demoPathSample(HEATHER_CUT, x, z).distance - 3) / 7)) * 0.85);
  else if (x < -190 && height > 15 && demoPathSample(WHALES_BACK, x, z).distance < 12)
    color.lerp(new THREE.Color('#8a9487'), (1 - smooth((demoPathSample(WHALES_BACK, x, z).distance - 4) / 8)) * smooth((height - 15) / 6));
  else color.lerp(new THREE.Color('#b4ab86'), (1 - smooth((tidalRouteSample(x, z).distance - 1.8) / 2.5)) * 0.65);
  return color.multiplyScalar(0.86 + icelandNoise(x / 9 + 12, z / 10 - 6) * 0.25);
}
export function tidalTerrainGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  for (const patch of patches) {
    const { heights, cellsX, cellsZ, size } = grid(patch), offset = positions.length / 3;
    for (let j = 0; j <= cellsZ; j++) for (let i = 0; i <= cellsX; i++) {
      const x = patch.minX + i * patch.cell, z = TIDAL_BOUNDS[1] + j * patch.cell, y = heights[j * size + i];
      positions.push(x, y, z); tidalColor(x, z, y).toArray(colors, colors.length);
    }
    for (let j = 0; j < cellsZ; j++) for (let i = 0; i < cellsX; i++) {
      const a = offset + j * size + i, b = a + 1, c = a + size;
      indices.push(a, c, b);
      if (patch === westernPatch && i === cellsX - 1) {
        const z = TIDAL_BOUNDS[1] + (j + 0.5) * patch.cell, x = patch.maxX;
        const fine = grid(originalPatch), y = fine.heights[(j * 2 + 1) * fine.size], middle = positions.length / 3;
        positions.push(x, y, z); tidalColor(x, z, y).toArray(colors, colors.length);
        indices.push(b, c, middle, middle, c, c + 1);
      } else indices.push(b, c, c + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
export function tidalWaterGeometry(terrain: THREE.BufferGeometry) {
  // Clip 1 mm inside the wet bed; keep the sea level unchanged after Float32 shoreline rounding.
  const geometry = demoWaterGeometry(terrain, -0.001, undefined, true, TIDAL_BOUNDS).translate(0, 0.001, 0);
  const positions = geometry.getAttribute('position'), colors = new Float32Array(positions.count * 4);
  const shallow = new THREE.Color('#65b4ae'), deep = new THREE.Color('#28667d'), color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const depth = inBounds(x, z) ? -tidalGroundHeight(x, z) : 8;
    color.copy(shallow).lerp(deep, smooth((depth - 0.1) / 6)).toArray(colors, i * 4);
    colors[i * 4 + 3] = 0.58 + smooth((depth - 0.4) / 2.5) * 0.42;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  return geometry;
}
