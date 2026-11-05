import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { icelandHash } from './iceland-noise';
import {
  TIDAL_ROUTE, TIDAL_STARTS, SEABIRD_CLIMB, PEBBLE_DESCENT, PEBBLE_CAVE, NEEDLE_LIGHTHOUSE, HARBOR_MEADOW,
  HEATHER_CUT, MAINLAND_MEADOW, MAINLAND_FARM, WEST_BEACON, COAST_BEACONS, CLIFF_WADE, WEST_WADE,
  SMUGGLERS_NOOK, SMUGGLERS_APPROACH,
  tidalGroundHeight, tidalRouteSample, tidalSurfaceAt, tidalColor, pebbleHeadlandHeight,
} from './tidal-terrain';

function step(name: string, route: readonly { x: number; z: number }[], segment: number, t: number,
  radius: number, height: number, offset = 0, run = 0.72) {
  const a = route[segment], b = route[segment + 1], heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
  return { name, segment, t, radius, height, heading, run,
    x: a.x + (b.x - a.x) * t + Math.cos(heading) * offset,
    z: a.z + (b.z - a.z) * t - Math.sin(heading) * offset };
}
export const TIDAL_STEPS = [
  step('Crooked Rib', TIDAL_ROUTE, 3, 0.6, 2.2, 0.59),
  step('Gull Rock step', TIDAL_ROUTE, 8, 0.64, 2, 0.6),
  step('Split Saddle slab', TIDAL_ROUTE, 13, 0.42, 2.3, 0.58),
  step('Landing rib', TIDAL_ROUTE, 17, 0.7, 2.1, 0.58),
];
export const SEABIRD_STEPS = [
  step('Cliff toe slab', SEABIRD_CLIMB, 3, 0.45, 2.05, 0.5, -0.2, 1.15),
  step('Notch shelf stone', SEABIRD_CLIMB, 6, 0.6, 1.8, 0.56, 0.25, 1.15),
  step('Upper switchback rib', SEABIRD_CLIMB, 8, 0.55, 2.2, 0.5, -0.3, 1.15),
  step('Summit shoulder slab', SEABIRD_CLIMB, 9, 0.55, 2.1, 0.48, 0.3, 1.15),
];
export const PEBBLE_STEPS = [
  step('Ravine shoulder slab', PEBBLE_DESCENT, 3, 0.5, 1.8, 0.5, -0.65, 1.2),
  step('Offset basalt pair', PEBBLE_DESCENT, 5, 0.45, 1.55, 0.5, 0.65, 1.2),
  step('Resting shelf exit rib', PEBBLE_DESCENT, 7, 0.55, 1.9, 0.48, -0.5, 1.2),
  step('Cave floor stone', PEBBLE_DESCENT, 9, 0.6, 1.7, 0.46, 0.65, 1.2),
  step('Cove threshold slab', PEBBLE_DESCENT, 11, 0.55, 1.9, 0.5, -0.45, 1.2),
];
export const HEATHER_STEPS = [
  step('Heather toe ledge', HEATHER_CUT, 1, 0.55, 1.8, 0.64, -0.5, 1.3),
  step('Heather offset rib', HEATHER_CUT, 2, 0.5, 1.85, 0.67, 0.55, 1.3),
  step('Heather crown step', HEATHER_CUT, 4, 0.5, 1.8, 0.64, -0.5, 1.25),
  step('Heather descent slab', HEATHER_CUT, 6, 0.5, 1.9, 0.62, 0.6, 1.35),
];
export const CLIFF_WADE_STEPS = [
  step('Beach-side submerged rib', CLIFF_WADE, 2, 0.6, 1.8, 0.52, -0.5, 1.25),
  step('Watchtower foot slab', CLIFF_WADE, 5, 0.55, 1.9, 0.57, 0.55, 1.2),
  step('Northern water gate', CLIFF_WADE, 8, 0.55, 1.8, 0.54, -0.45, 1.25),
];
export const CLIFF_BOULDERS = [
  { ...step('Southern leaning gate', CLIFF_WADE, 2, 0.6, 2.2, 2.8, -4.8), seed: 0.21 },
  { ...step('Split-water outcrop', CLIFF_WADE, 3, 0.6, 2.3, 3, 4.9), seed: 0.68 },
  { ...step('Beacon foot boulder', CLIFF_WADE, 5, 0.6, 2.1, 2.6, -4.8), seed: 0.36 },
  { ...step('Northern leaning gate', CLIFF_WADE, 8, 0.5, 2.3, 3.2, 4.9), seed: 0.76 },
  { x: -644, z: -44, radius: 2.8, height: 3.6, seed: 0.43 },
  { x: -645, z: 8, radius: 3.2, height: 3.3, seed: 0.7 },
  { x: -642, z: 48, radius: 2.6, height: 3.4, seed: 0.29 },
];

export function tidalStepGeometry(step: typeof TIDAL_STEPS[number]) {
  const geometry = new THREE.DodecahedronGeometry(1, 0).scale(step.radius, step.height, step.radius * step.run)
    .rotateY(step.heading + 0.38);
  const vertices = geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = step.x + vertices.getX(i), z = step.z + vertices.getZ(i);
    vertices.setXYZ(i, x, tidalGroundHeight(x, z) + vertices.getY(i) - step.height * 0.28, z);
  }
  geometry.computeVertexNormals(); return geometry;
}

export function pebbleCaveGeometry() {
  const { entry, exit, halfWidth, opening, clearance } = PEBBLE_CAVE;
  const length = Math.hypot(exit.x - entry.x, exit.z - entry.z);
  const dx = (exit.x - entry.x) / length, dz = (exit.z - entry.z) / length;
  const rows = Math.ceil(length), columns = 64, vertices: number[] = [], colors: number[] = [];
  const topVertices: number[] = [];
  const point = (row: number, column: number, bottom: boolean) => {
    const t = row / rows, u = column / columns * 2 - 1;
    const entryLip = -0.4 + Math.sin(u * 2.7 + 0.3) * 1.6 + u * 1.2;
    const exitLip = 0.6 + Math.sin(u * 4.1 + 1.1) * 1.9 - u;
    const along = t * length + (1 - t) * entryLip + t * exitLip;
    const cx = entry.x + dx * along, cz = entry.z + dz * along;
    const width = halfWidth + 2.5 + Math.sin(t * 6.3 + (u < 0 ? 1.2 : 3.8)) * 2;
    const across = u * width + Math.sin(t * Math.PI) * Math.sin(t * 5) * 0.8;
    const x = cx + dz * across, z = cz - dx * across;
    const floor = tidalGroundHeight(cx, cz), edge = Math.abs(u) === 1;
    const ground = tidalGroundHeight(x, z);
    const arch = floor + clearance * Math.max(0, 1 - Math.abs(across / opening) ** 2.4)
      + Math.sin(t * 8 + u * 4) * 0.4 + u * 0.45;
    // Outside the passage the underside must enter the hillside, not hang over it as a shelf.
    const buried = THREE.MathUtils.smoothstep(Math.abs(across), opening - 2, opening);
    const buriedFloor = ground - 4;
    const ceiling = THREE.MathUtils.lerp(Math.max(arch, buriedFloor), buriedFloor, buried);
    const crown = pebbleHeadlandHeight(x, z) + Math.sin(x * 0.4 + z * 0.25) * 0.7;
    const top = edge ? ground - 1 : Math.max(ceiling + 2.2, crown);
    return new THREE.Vector3(x, bottom ? ceiling : top, z);
  };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3,
    underside = false, crown = false) => {
    for (const p of underside ? [a, d, b, b, d, c] : [a, b, d, b, c, d]) {
      if (crown) topVertices.push(vertices.length / 3);
      vertices.push(p.x, p.y, p.z);
      (crown ? tidalColor(p.x, p.z, p.y) : new THREE.Color('#7c887c')
        .multiplyScalar(0.9 + Math.sin(p.x * 0.4 + p.y * 1.1 + p.z * 0.3) * 0.1)).toArray(colors, colors.length);
    }
  };
  for (let row = 1; row <= rows; row++) {
    for (let column = 0; column < columns; column++) {
      for (const bottom of [false, true])
        quad(point(row - 1, column, bottom), point(row, column, bottom),
          point(row, column + 1, bottom), point(row - 1, column + 1, bottom), bottom, !bottom);
      if (row === 1)
        quad(point(0, column, false), point(0, column + 1, false), point(0, column + 1, true), point(0, column, true), true);
      if (row === rows)
        quad(point(row, column + 1, false), point(row, column, false), point(row, column, true), point(row, column + 1, true), true);
    }
    for (const column of [0, columns])
      quad(point(row - 1, column, false), point(row, column, false), point(row, column, true), point(row - 1, column, true));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal'), normal = new THREE.Vector3();
  for (const index of topVertices) {
    const x = vertices[index * 3], z = vertices[index * 3 + 2];
    normal.set(pebbleHeadlandHeight(x - 1, z) - pebbleHeadlandHeight(x + 1, z), 2,
      pebbleHeadlandHeight(x, z - 1) - pebbleHeadlandHeight(x, z + 1)).normalize();
    normals.setXYZ(index, normal.x, normal.y, normal.z);
  }
  return geometry;
}

export function tidalSkiffGeometry(x: number, y: number, z: number, scale = 1, heading = 0) {
  const outline = [[-4.8, 0], [-3.1, -1.5], [2.8, -1.4], [4, -0.8], [4, 0.8], [2.8, 1.4], [-3.1, 1.5]];
  const hull: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const bottomA = [a[0] * 0.7, -0.2, a[1] * 0.55], bottomB = [b[0] * 0.7, -0.2, b[1] * 0.55];
    const topA = [a[0], 1.1, a[1]], topB = [b[0], 1.1, b[1]];
    const innerA = [a[0] * 0.9, 0.25, a[1] * 0.8], innerB = [b[0] * 0.9, 0.25, b[1] * 0.8];
    hull.push(...bottomA, ...topA, ...bottomB, ...bottomB, ...topA, ...topB);
    hull.push(...bottomA, ...bottomB, 0, -0.2, 0);
    hull.push(...topA, ...innerA, ...topB, ...topB, ...innerA, ...innerB);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(hull, 3));
  geometry.scale(scale, scale, scale).rotateY(heading).translate(x, y, z);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildTidalScenery() {
  const group = new THREE.Group(), solids: THREE.Mesh[] = [];
  const batches = new Map<string, { geometries: THREE.BufferGeometry[]; solid: boolean }>();
  const add = (name: string, color: string, source: THREE.BufferGeometry, solid = false) => {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute('uv');
    if (!geometry.hasAttribute('color')) {
      const colors = new Float32Array(geometry.getAttribute('position').count * 3), tint = new THREE.Color(color);
      for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    let batch = batches.get(name);
    if (!batch) { batch = { geometries: [], solid }; batches.set(name, batch); }
    batch.geometries.push(geometry);
  };
  const rock = (name: string, x: number, z: number, radius: number, height: number, seed: number,
    solid = true, conform = true) => {
    const geometry = new THREE.DodecahedronGeometry(1, 0).scale(radius, height, radius * 0.8).rotateY(seed * 6);
    const vertices = geometry.getAttribute('position');
    let base = tidalGroundHeight(x, z);
    if (!conform) for (let i = 0; i < vertices.count; i++)
      base = Math.min(base, tidalGroundHeight(x + vertices.getX(i), z + vertices.getZ(i)));
    for (let i = 0; i < vertices.count; i++) {
      const px = x + vertices.getX(i), pz = z + vertices.getZ(i);
      vertices.setXYZ(i, px, (conform ? tidalGroundHeight(px, pz) : base) + vertices.getY(i) + height * 0.4, pz);
    }
    geometry.computeVertexNormals(); add(name, seed > 0.5 ? '#566561' : '#879086', geometry, solid);
  };
  const box = (name: string, color: string, x: number, y: number, z: number, w: number, h: number, d: number, solid = true) =>
    add(name, color, new THREE.BoxGeometry(w, h, d).translate(x, y, z), solid);
  const branch = (a: THREE.Vector3, b: THREE.Vector3) => {
    const direction = b.clone().sub(a);
    return new THREE.CylinderGeometry(0.06, 0.14, direction.length(), 6)
      .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
      .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  const tree = (x: number, z: number, seed: number, scale = 1) => {
    const treeY = Math.min(...[-0.4, 0, 0.4].flatMap(dx =>
      [-0.4, 0, 0.4].map(dz => tidalGroundHeight(x + (0.8 + dx) * scale, z + dz * scale))));
    add('Wind-bent trunks', '#6d6c53', new THREE.CylinderGeometry(0.17, 0.3, 4.2, 6)
      .scale(scale, scale, scale).rotateZ(-0.2).translate(x + 0.4 * scale, treeY + 1.8 * scale, z), true);
    for (const [dx, dy, dz] of [[-0.8, 3.5, -0.5], [2.4, 3.7, 0.7]])
      add('Wind-bent trunks', '#6d6c53', branch(new THREE.Vector3(x + 0.5 * scale, treeY + 2.1 * scale, z),
        new THREE.Vector3(x + dx * scale, treeY + dy * scale, z + dz * scale)), true);
    const greens = ['#4f793d', '#638e47', '#7da557'];
    for (const [lobe, [dx, dy, dz, rx, ry, rz]] of [
      [-0.3, 3.8, -0.4, 1.9, 1.3, 1.7], [1.5, 4.6, -0.15, 2, 1.5, 1.8],
      [3.1, 4, 0.2, 1.9, 1.15, 1.6], [1.3, 3.8, 1.3, 1.6, 1.15, 1.6],
    ].entries()) {
      const size = (0.94 + seed * 0.35) * scale;
      add('Wind-bent crowns', greens[(lobe + Number(seed > 0.13)) % greens.length],
        new THREE.IcosahedronGeometry(1, 1).scale(rx * size, ry * size, rz * size)
          .rotateY(seed * 9 + lobe * 0.8).translate(x + dx * scale, treeY + dy * scale, z + dz * scale));
    }
  };
  for (const step of TIDAL_STEPS) {
    add('Crossing stone steps', '#7b8880', tidalStepGeometry(step), true);
    for (const side of [-1, 1]) rock('Split basalt gates', step.x + Math.cos(step.heading) * side * 5.5,
      step.z - Math.sin(step.heading) * side * 5.5, 1.8, 2.1 + side * 0.35, 0.45 + side * 0.13);
  }
  for (const step of SEABIRD_STEPS) add('Cliff stone steps', '#9ca798', tidalStepGeometry(step), true);
  for (const step of PEBBLE_STEPS) add('Ravine stone steps', '#9da495', tidalStepGeometry(step), true);
  for (const step of HEATHER_STEPS) add('Heather Cut steps', '#929788', tidalStepGeometry(step), true);
  for (const step of CLIFF_WADE_STEPS) add('Cliff-foot stone steps', '#8e9788', tidalStepGeometry(step), true);
  for (const boulder of CLIFF_BOULDERS)
    rock('Cliff-foot stone steps', boulder.x, boulder.z, boulder.radius, boulder.height, boulder.seed, true, false);
  for (const [x, z, radius, height, seed] of [
    [-542, -5, 3.2, 2.1, 0.2], [-534, -24, 2.5, 2.8, 0.65],
    [-523, -36, 2.6, 2.2, 0.35], [-503, -30, 3.1, 2.3, 0.8], [-486, -57, 3, 2.1, 0.5],
  ]) rock('Heather Cut steps', x, z, radius, height, seed, true, false);
  add('Pebble Cove basalt cave', '#ffffff', pebbleCaveGeometry(), true);
  for (const [x, z, radius, height, seed] of [
    [183, -51, 2.1, 2.5, 0.21], [163, -16, 1.5, 1.8, 0.71], [184, 13, 2.1, 2.4, 0.38],
    [177, 42, 2.2, 2.6, 0.61], [143, 45, 1.9, 2.1, 0.44], [112, 62, 2.5, 3.6, 0.76],
  ]) rock('Ravine boulders', x, z, radius, height, seed, true, false);
  for (let i = 0; i < 75; i++) {
    const seed = icelandHash(i, 917), angle = i * 2.39996;
    const x = 126 + Math.cos(angle) * (11.5 + seed * 6), z = 69 + Math.sin(angle) * (11.5 + seed * 6);
    if (tidalGroundHeight(x, z) < 0.2 || tidalRouteSample(x, z).distance < 5
      || Math.hypot(x - 126, z - 66) < 10.5) continue;
    rock('Cove pebbles', x, z, 0.25 + seed * 0.45, 0.18 + seed * 0.22, seed, true, false);
  }
  for (let j = -10; j <= 10; j++) for (let i = -38; i <= 10; i++) {
    const seed = icelandHash(i + 417, j - 83), x = i * 17 + (seed - 0.5) * 8;
    const z = j * 17 + (icelandHash(j + 22, i) - 0.5) * 8, y = tidalGroundHeight(x, z);
    if (tidalRouteSample(x, z).distance < 10 || TIDAL_STARTS.some(start => Math.hypot(x - start.position.x, z - start.position.z) < 13)) continue;
    if (Math.hypot(x - NEEDLE_LIGHTHOUSE.x, z - NEEDLE_LIGHTHOUSE.z) < 15
      || Math.hypot(x - HARBOR_MEADOW.x, z - HARBOR_MEADOW.z) < HARBOR_MEADOW.radius) continue;
    if (Math.hypot(x - MAINLAND_MEADOW.x, z - MAINLAND_MEADOW.z) < MAINLAND_MEADOW.radius
      || Math.hypot(x - MAINLAND_FARM.x, z - MAINLAND_FARM.z) < 21
      || Math.hypot(x - WEST_BEACON.x, z - WEST_BEACON.z) < 16
      || Math.hypot(x - SMUGGLERS_NOOK.x, z - SMUGGLERS_NOOK.z) < 18
      || COAST_BEACONS.some(beacon => Math.hypot(x - beacon.x, z - beacon.z) < 5)
      || Math.hypot(x - WEST_WADE.x, z - WEST_WADE.z) < 20) continue;
    if (y > 10 && pebbleHeadlandHeight(x, z) > y - 1) continue;
    const support = [-4, 0, 4].flatMap(dx => [-3, 0, 3].map(dz => tidalGroundHeight(x + dx, z + dz)));
    if (Math.max(...support) - Math.min(...support) > 3.2) continue;
    if (y > -0.6 && y < 28 && seed > (x < -330 ? 0.88 : 0.57))
      rock('Coastal basalt', x, z, 1 + seed * 1.3, 0.8 + seed * 1.5, seed, true, false);
    if (y < 3 || tidalSurfaceAt(x, z) !== 'grass') continue;
    if (seed < (x < -330 ? 0.15 : 0.26)) tree(x, z, seed, x < -330 ? 0.8 + seed * 3 : 1);
    for (let tuft = 0; tuft < 3; tuft++) {
      const px = x + tuft * 1.3, pz = z + seed * 3;
      const support = [-0.4, 0.4].flatMap(dx => [-0.4, 0.4].map(dz => tidalGroundHeight(px + dx, pz + dz)));
      if (Math.max(...support) - Math.min(...support) > 0.6) continue;
      add('Saltgrass', '#9caa70', new THREE.ConeGeometry(0.18 + seed * 0.17, 0.55 + seed * 0.5, 4)
        .translate(px, tidalGroundHeight(px, pz) + 0.2, pz));
    }
  }
  for (let i = 0; i < 16; i++) {
    const seed = icelandHash(i, 1409), angle = i * 2.39996, radius = 7 + seed * 13;
    const x = -373 + Math.cos(angle) * radius, z = 35 + Math.sin(angle) * radius;
    if (tidalRouteSample(x, z).distance < 14 || tidalSurfaceAt(x, z) !== 'grass') continue;
    const support = [-3, 3].flatMap(dx => [-3, 3].map(dz => tidalGroundHeight(x + dx, z + dz)));
    if (Math.max(...support) - Math.min(...support) < 2) tree(x, z, seed, 0.75 + seed * 0.6);
  }
  for (let i = 0; i < 65; i++) {
    const seed = icelandHash(i, 1571), x = -550 + seed * 200, z = -95 + icelandHash(i, 1572) * 195;
    if (tidalSurfaceAt(x, z) !== 'grass' || tidalRouteSample(x, z).distance < 10
      || Math.hypot(x - MAINLAND_FARM.x, z - MAINLAND_FARM.z) < 12) continue;
    for (let flower = 0; flower < 3; flower++) {
      const px = x + flower * 0.65, pz = z + Math.sin(flower + seed) * 0.9;
      const y = tidalGroundHeight(px, pz);
      add('Meadow flowers', '#7b9761', new THREE.CylinderGeometry(0.025, 0.035, 0.55, 4).translate(px, y + 0.25, pz));
      add('Meadow flowers', seed > 0.45 ? '#dcc4db' : '#eadcb0',
        new THREE.ConeGeometry(0.21, 0.13, 6).rotateX(Math.PI).translate(px, y + 0.55, pz));
    }
  }
  // Sparse cairns identify mouths/resting rocks, not a road painted across the sea.
  const cairns = (route: readonly { x: number; z: number }[], indices: readonly number[]) => {
    for (const index of indices) {
      const a = route[index], b = route[index + 1], heading = Math.atan2(b.x - a.x, b.z - a.z);
      const side = route === SEABIRD_CLIMB && (139 - a.x) * Math.cos(heading) - (-115 - a.z) * Math.sin(heading) < 0 ? -1 : 1;
      const t = route === SEABIRD_CLIMB ? 0.5 : 0;
      const x = a.x + (b.x - a.x) * t + Math.cos(heading) * side * 3.7;
      const z = a.z + (b.z - a.z) * t - Math.sin(heading) * side * 3.7;
      const base = route === SEABIRD_CLIMB
        ? Math.min(...[-0.4, 0, 0.4].flatMap(dx => [-0.35, 0, 0.35].map(dz => tidalGroundHeight(x + dx, z + dz))))
        : tidalGroundHeight(x, z);
      if (tidalGroundHeight(x, z) > 0.3) for (let layer = 0; layer < 3; layer++)
        add('Route cairns', '#dad2ab', new THREE.DodecahedronGeometry(1, 0).scale(0.48 - layer * 0.1, 0.22, 0.4 - layer * 0.08)
          .translate(x, base + 0.15 + layer * 0.35, z), true);
    }
  };
  cairns(TIDAL_ROUTE, [2, 5, 8, 10, 13, 14, 15, 18, 19]);
  cairns(SEABIRD_CLIMB, [1, 3, 8, 9, 10]);
  // Keep markers on straight shoulders, away from the lookout junction and cave mouths.
  cairns(PEBBLE_DESCENT, [4, 7, 12]);
  rock('Summit sentinel', 137, -161, 0.9, 2.6, 0.41);
  const cabinX = -140, cabinZ = 57;
  const cabinBase = Math.min(...[-4, 4].flatMap(dx => [-3, 3].map(dz => tidalGroundHeight(cabinX + dx, cabinZ + dz))));
  box('Harbor boathouse', '#8a8068', cabinX, cabinBase + 1.8, cabinZ, 8, 4.8, 6);
  add('Harbor roof and trim', '#475d5a', new THREE.ConeGeometry(6.6, 2, 4).rotateY(Math.PI / 4).scale(1, 1, 0.8)
    .translate(cabinX, cabinBase + 5.2, cabinZ));
  box('Harbor roof and trim', '#303c3b', cabinX + 4.02, cabinBase + 1.7, cabinZ, 0.05, 2.8, 1.8, false);
  box('Harbor roof and trim', '#c4b998', cabinX + 4.06, cabinBase + 3.4, cabinZ, 0.08, 0.35, 2.2, false);
  const boatX = -156, boatZ = 63;
  const boatY = Math.min(...[-4, 0, 4].flatMap(dx => [-1.4, 0, 1.4].map(dz => tidalGroundHeight(boatX + dx, boatZ + dz))));
  add('Harbor skiff', '#758b8b', tidalSkiffGeometry(boatX, boatY, boatZ), true);
  for (const dx of [-1.8, 1.4]) box('Harbor skiff', '#b6a177', boatX + dx, boatY + 0.8, boatZ, 0.55, 0.18, 2.5);
  const light = NEEDLE_LIGHTHOUSE;
  add('Needle Lighthouse', '#d9d4b8', new THREE.CylinderGeometry(2.2, 3.3, 16, 12)
    .translate(light.x, light.y + 8, light.z), true);
  for (const y of [5, 11]) {
    const bottom = 3.3 - (y - 1) / 16 * 1.1, top = 3.3 - (y + 1) / 16 * 1.1;
    add('Needle Lighthouse', '#a65344', new THREE.CylinderGeometry(top + 0.025, bottom + 0.025, 2, 12)
      .translate(light.x, light.y + y, light.z), true);
  }
  add('Needle Lighthouse', '#455b59', new THREE.CylinderGeometry(3.1, 3.1, 0.5, 12)
    .translate(light.x, light.y + 16, light.z), true);
  add('Needle Lighthouse', '#788f88', new THREE.CylinderGeometry(1.9, 1.9, 2.4, 12)
    .translate(light.x, light.y + 17.4, light.z), true);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    box('Needle Lighthouse', '#374c4c', light.x + Math.cos(angle) * 1.85, light.y + 17.4,
      light.z + Math.sin(angle) * 1.85, 0.13, 2.5, 0.13);
  }
  add('Needle Lighthouse', '#455b59', new THREE.ConeGeometry(2.8, 1.7, 12)
    .translate(light.x, light.y + 19.5, light.z), true);
  box('Needle Lighthouse', '#374c4c', light.x, light.y + 1.3, light.z + 3.22, 1.3, 2.6, 0.3);
  const farm = MAINLAND_FARM;
  box('Mainland farmstead', '#dad2b5', farm.x, farm.y + 2, farm.z, 8, 4.6, 6);
  add('Mainland farmstead', '#697575', new THREE.ConeGeometry(6.6, 2.4, 4).rotateY(Math.PI / 4).scale(1, 1, 0.8)
    .translate(farm.x, farm.y + 5.2, farm.z), true);
  box('Mainland farmstead', '#9b8e79', farm.x - 2, farm.y + 5.5, farm.z, 0.9, 3, 0.9);
  box('Mainland farmstead', '#60706b', farm.x, farm.y + 1.4, farm.z + 3.04, 1.5, 2.8, 0.15);
  for (const dx of [-2.7, 2.7]) {
    box('Mainland farmstead', '#697b7a', farm.x + dx, farm.y + 2.1, farm.z + 3.04, 1.3, 1.4, 0.15);
    box('Mainland farmstead', '#eee2bc', farm.x + dx, farm.y + 2.1, farm.z + 3.14, 0.1, 1.5, 0.08);
  }
  for (const dx of [-6, -3, 0, 3, 6]) {
    const x = farm.x + dx, z = farm.z - 7, y = tidalGroundHeight(x, z);
    box('Mainland farmstead', '#8e8165', x, y + 0.65, z, 0.22, 1.6, 0.22);
    if (dx < 6) for (const h of [0.45, 1.05])
      box('Mainland farmstead', '#9c9072', x + 1.5, Math.min(y, tidalGroundHeight(x + 3, z)) + h, z, 3.1, 0.16, 0.14);
  }
  const beaconGeometry = (name: string, x: number, z: number, base: number, scale: number, color: string) => {
    const part = (tint: string, geometry: THREE.BufferGeometry, lantern = false) =>
      add(lantern ? 'Beacon lanterns' : name, tint, geometry.scale(scale, scale, scale).translate(x, base, z), true);
    part('#c8c3a9', new THREE.CylinderGeometry(1.65, 1.9, 0.6, 16).translate(0, 0.12, 0));
    part('#e2d9ba', new THREE.CylinderGeometry(0.92, 1.5, 5.8, 16).translate(0, 3, 0));
    part(color, new THREE.CylinderGeometry(1.12, 1.26, 1.25, 16).translate(0, 3.45, 0));
    part('#465b5b', new THREE.CylinderGeometry(1.25, 1.25, 0.25, 16).translate(0, 6, 0));
    part('#f3d9a0', new THREE.CylinderGeometry(0.73, 0.73, 1.25, 12).translate(0, 6.75, 0), true);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      part('#405454', new THREE.CylinderGeometry(0.045, 0.045, 1.35, 5)
        .translate(Math.cos(angle) * 0.75, 6.75, Math.sin(angle) * 0.75));
    }
    part('#405454', new THREE.ConeGeometry(1.2, 0.8, 16).translate(0, 7.75, 0));
  };
  beaconGeometry('Western Beacon', WEST_BEACON.x, WEST_BEACON.z, WEST_BEACON.y, 1.22, '#a35f48');
  for (const beacon of COAST_BEACONS) {
    const base = Math.min(...[-1.25, 0, 1.25].flatMap(dx =>
      [-1.25, 0, 1.25].map(dz => tidalGroundHeight(beacon.x + dx, beacon.z + dz))));
    beaconGeometry('Coastal beacons', beacon.x, beacon.z, base, 0.68, beacon.color);
  }
  const nook = SMUGGLERS_NOOK;
  for (const [x, z, radius, height, seed] of [
    [-627, 8, 3.8, 4.1, 0.31], [-630, 29, 3.4, 3.8, 0.71],
  ]) rock('Cliff-foot stone steps', x, z, radius, height, seed, true, false);
  const skiffX = nook.x + 1, skiffZ = nook.z + 10;
  const skiffBase = Math.min(...[-3, 0, 3].flatMap(dx =>
    [-1, 0, 1].map(dz => tidalGroundHeight(skiffX + dx, skiffZ + dz))));
  add("Smuggler's skiff", '#859085', tidalSkiffGeometry(skiffX, skiffBase, skiffZ, 0.62, 0.45), true);
  for (const dx of [-1, 0.9])
    add("Smuggler's skiff", '#a99572', new THREE.BoxGeometry(0.32, 0.12, 1.45).translate(dx, 0.5, 0)
      .rotateY(0.45).translate(skiffX, skiffBase, skiffZ), true);
  for (const [x, z, size] of [[-600, 29, 1.1], [-601, 32, 1.3], [-602, 30, 0.9]]) {
    const base = Math.min(...[-0.7, 0.7].flatMap(dx => [-0.7, 0.7].map(dz => tidalGroundHeight(x + dx, z + dz))));
    box('Cliff-foot stone steps', '#8e8063', x, base + size / 2 - 0.1, z, size, size, size);
    for (const side of [-1, 1])
      box('Cliff-foot stone steps', '#bdac83', x + side * size * 0.31, base + size - 0.08, z, 0.1, 0.08, size + 0.04);
  }
  const post = SMUGGLERS_APPROACH[1];
  const postX = post.x - 1.6, postZ = post.z - 3.4, postBase = tidalGroundHeight(postX, postZ);
  add('Cliff-foot stone steps', '#8f856b', new THREE.CylinderGeometry(0.16, 0.24, 1.5, 7)
    .rotateZ(0.12).translate(postX, postBase + 0.55, postZ), true);
  const lookoutX = 149, lookoutZ = -49;
  const lookoutY = Math.min(...[-0.3, 0, 0.3].flatMap(dx =>
    [-0.3, 0, 0.3].map(dz => tidalGroundHeight(lookoutX + dx, lookoutZ + dz))));
  add('Lookout mast', '#675f4b', new THREE.CylinderGeometry(0.14, 0.22, 7, 7)
    .translate(lookoutX, lookoutY + 3.2, lookoutZ), true);
  box('Lookout vane', '#d2bb7b', lookoutX, lookoutY + 6, lookoutZ, 3.3, 0.2, 0.28, false);
  rock('Lookout stones', 151, -49, 1.9, 1.3, 0.67, true, false);
  for (const [name, batch] of batches) {
    const geometry = mergeGeometries(batch.geometries);
    for (const part of batch.geometries) part.dispose();
    if (!geometry) throw new Error(`Could not merge Island Tracks scenery: ${name}`);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96,
      emissive: name === 'Beacon lanterns' ? '#e5b969' : '#000000',
      emissiveIntensity: name === 'Beacon lanterns' ? 0.75 : 0,
      side: ['Pebble Cove basalt cave', 'Harbor skiff', "Smuggler's skiff"].includes(name) ? THREE.DoubleSide : THREE.FrontSide }));
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    if (batch.solid) solids.push(mesh);
  }
  return { group, solids };
}
