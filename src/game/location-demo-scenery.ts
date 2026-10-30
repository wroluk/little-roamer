import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DEMOS, demoGroundHeight, demoHash, demoRouteSample, type DemoId } from './location-demo-terrain';
import { demoStrata } from './location-demo-geometry';
import {
  demoObstacles, QUARRY_CHAMBER, QUARRY_COVER, QUARRY_DESCENT, WOODLAND_RIDGE, type DemoObstacle,
} from './location-demo-adventures';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function demoObstacleGeometry(id: DemoId, obstacle: DemoObstacle) {
  const { kind, radius, halfWidth, height, heading } = obstacle;
  const geometry = kind === 'boulder'
    ? new THREE.DodecahedronGeometry(1, 0).scale(radius, height, radius * 0.8).rotateY(heading + 0.37)
    : new THREE.CylinderGeometry(radius * 0.88, radius, halfWidth * 2, 10, 12);
  if (kind !== 'boulder') {
    const normals = geometry.getAttribute('normal'), colors = new Float32Array(normals.count * 3);
    for (let i = 0; i < normals.count; i++)
      new THREE.Color(Math.abs(normals.getY(i)) > 0.9 ? '#c1a06c' : kind === 'log' ? '#69503a' : '#796046').toArray(colors, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.rotateZ(Math.PI / 2).rotateY(heading + (kind === 'log' ? 0.28 : -0.22));
  }
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = obstacle.x + positions.getX(i), z = obstacle.z + positions.getZ(i);
    const buried = kind === 'boulder' ? height * 0.28 : -radius * (kind === 'log' ? 0.35 : 0.1);
    positions.setXYZ(i, x, demoGroundHeight(id, x, z) + positions.getY(i) - buried, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function quarryTunnelGeometry() {
  const curve = new THREE.CatmullRomCurve3(QUARRY_COVER.map(p => v(p.x, 0, p.z)), false, 'centripetal');
  const rows = curve.getSpacedPoints(Math.ceil(curve.getLength() / 3));
  const vertices: number[] = [], colors: number[] = [], columns = 12;
  const point = (row: number, column: number, bottom: boolean) => {
    const centre = rows[row], before = rows[Math.max(0, row - 1)], after = rows[Math.min(rows.length - 1, row + 1)];
    const tangent = after.clone().sub(before).normalize(), u = column / columns * 2 - 1;
    const x = centre.x + tangent.z * u * 20, z = centre.z - tangent.x * u * 20;
    const left = demoGroundHeight('old-quarry', centre.x - tangent.z * 20, centre.z + tangent.x * 20);
    const right = demoGroundHeight('old-quarry', centre.x + tangent.z * 20, centre.z - tangent.x * 20);
    const floor = demoGroundHeight('old-quarry', centre.x, centre.z);
    const chamber = Math.exp(-((Math.hypot(centre.x - QUARRY_CHAMBER.x, centre.z - QUARRY_CHAMBER.z) / 18) ** 2));
    const opening = 12 + chamber * 4;
    const ceiling = Math.abs(u) === 1 ? demoGroundHeight('old-quarry', x, z) - 1.6
      : floor + (7.5 + chamber * 3) * Math.sqrt(Math.max(0, 1 - (u * 20 / opening) ** 2));
    const top = Math.abs(u) === 1 ? demoGroundHeight('old-quarry', x, z)
      : Math.max(ceiling + 1.8, left + (right - left) * (u + 1) / 2 + (1 - u * u) * 1.5);
    return v(x, bottom ? ceiling : top, z);
  };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, underside = false) => {
    for (const p of underside ? [a, d, b, b, d, c] : [a, b, d, b, c, d]) {
      vertices.push(p.x, p.y, p.z);
      const shade = 0.9 + 0.1 * Math.sin(p.x * 0.23 + p.z * 0.17);
      new THREE.Color(underside ? '#8b927e' : '#a9afa0').multiplyScalar(shade).toArray(colors, colors.length);
    }
  };
  for (let row = 1; row < rows.length; row++) {
    for (let column = 0; column < columns; column++) {
      for (const bottom of [false, true]) quad(point(row - 1, column, bottom), point(row, column, bottom),
        point(row, column + 1, bottom), point(row - 1, column + 1, bottom), bottom);
      if (row === 1) quad(point(0, column, false), point(0, column + 1, false),
        point(0, column + 1, true), point(0, column, true), true);
      if (row === rows.length - 1) quad(point(row, column + 1, false), point(row, column, false),
        point(row, column, true), point(row, column + 1, true), true);
    }
    for (const column of [0, columns]) quad(point(row - 1, column, false), point(row, column, false),
      point(row, column, true), point(row - 1, column, true));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  return geometry;
}

export function demoArchGeometry(x: number, y: number, z: number, scale = 1, angle = Math.PI / 2) {
  const outline = new THREE.Shape();
  for (const [i, [px, py]] of [
    [-19, -5], [-22, 9], [-18, 23], [-8, 29], [4, 31], [17, 24], [21, 10], [18, -5],
    [11, -5], [10, 8], [6, 15], [-2, 17], [-9, 12], [-11, -5],
  ].entries()) { if (i === 0) outline.moveTo(px, py); else outline.lineTo(px, py); }
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: 9, bevelEnabled: false }).translate(0, 0, -4.5);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i), py = position.getY(i), pz = position.getZ(i);
    position.setZ(i, pz * (0.93 + 0.13 * Math.sin(px * 0.12 + py * 0.11)));
  }
  geometry.scale(scale, scale, scale).rotateY(angle).translate(x, y, z); geometry.computeVertexNormals();
  return demoStrata(geometry, ['#c58b60', '#dbad7c', '#ad7254', '#e6be91']);
}

function column(id: DemoId, x: number, z: number, height: number, radius: number, seed: number) {
  let base = demoGroundHeight(id, x, z);
  for (let i = 0; i < 8; i++) base = Math.min(base, demoGroundHeight(id, x + Math.cos(i * Math.PI / 4) * radius * 1.4,
    z + Math.sin(i * Math.PI / 4) * radius * 1.4));
  const positions: number[] = [], levels = [-0.16, 0, 0.3, 0.7, 1], widths = [1.3, 1.1, 0.9, 0.6, 0.19];
  const at = (ring: number, side: number) => {
    const a = side % 8 * Math.PI / 4 + seed;
    const r = radius * widths[ring] * (0.88 + demoHash(side % 8 + seed, ring) * 0.24);
    return [x + Math.cos(a) * r + ring * seed * 0.15, base + levels[ring] * height, z + Math.sin(a) * r];
  };
  for (let ring = 0; ring < 4; ring++) for (let side = 0; side < 8; side++)
    for (const p of [at(ring, side), at(ring + 1, side), at(ring, side + 1),
      at(ring, side + 1), at(ring + 1, side), at(ring + 1, side + 1)]) positions.push(...p);
  for (let side = 1; side < 7; side++) positions.push(...at(4, 0), ...at(4, side + 1), ...at(4, side));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
  return demoStrata(geometry, ['#c58b60', '#dbad7c', '#ad7254', '#e6be91']);
}

export type DemoTree = { x: number; y: number; z: number; height: number; radius: number; seed: number };
export function demoTrees(id: DemoId) {
  const trees: DemoTree[] = [];
  if (id !== 'autumn-woods' && id !== 'red-canyon') return trees;
  const step = id === 'autumn-woods' ? 12 : 24;
  const accept = (x: number, z: number, seed: number, giant = false) => {
    const y = demoGroundHeight(id, x, z), radius = giant ? 1.1 : id === 'autumn-woods' ? 0.4 + seed * 0.3 : 0.38;
    if (demoRouteSample(id, x, z).distance < 10 || Math.hypot(x - DEMOS[id].loop[0].x, z - DEMOS[id].loop[0].z) < 14
      || id === 'autumn-woods' && (Math.abs(x - 45) < 17 || x > 20 && x < 100 && z > -78 && z < -33)
      || id === 'red-canyon' && (Math.hypot(x, z + 65) < 32 || Math.hypot(x + 60, z) < 28)
      || Math.max(...[-radius, radius].flatMap(dx => [-radius, radius].map(dz => Math.abs(demoGroundHeight(id, x + dx, z + dz) - y)))) > 0.65) return;
    trees.push({ x, y, z, radius, seed, height: giant ? 26 + seed * 6 : id === 'autumn-woods' ? 12 + seed * 9 : 4 + seed * 3 });
  };
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) {
    const seed = demoHash(i + 80, j - 31);
    if (seed < (id === 'autumn-woods' ? 0.16 : 0.76)) continue;
    const x = i * step + (seed - 0.5) * step * 0.7, z = j * step + (demoHash(j, i + 19) - 0.5) * step * 0.7;
    if (Math.abs(x) < 170 && Math.abs(z) < 170) accept(x, z, seed);
  }
  if (id === 'autumn-woods') for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6; accept(-68 + Math.cos(a) * 21, -8 + Math.sin(a) * 21, demoHash(i, 733), true);
  }
  return trees;
}

export function buildDemoScenery(id: DemoId) {
  const group = new THREE.Group(), solids: THREE.Mesh[] = [];
  const batches = new Map<string, { geometries: THREE.BufferGeometry[]; solid: boolean; shadow: boolean }>();
  const add = (name: string, color: string, source: THREE.BufferGeometry, solid = false, shadow = false) => {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    if (!geometry.hasAttribute('color')) {
      const colors = new Float32Array(geometry.getAttribute('position').count * 3), c = new THREE.Color(color);
      for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    let batch = batches.get(name);
    if (!batch) { batch = { geometries: [], solid, shadow }; batches.set(name, batch); }
    batch.geometries.push(geometry);
  };
  const box = (name: string, color: string, x: number, y: number, z: number, w: number, h: number, d: number, solid = true) =>
    add(name, color, new THREE.BoxGeometry(w, h, d).translate(x, y, z), solid, solid);
  const beam = (name: string, color: string, a: THREE.Vector3, b: THREE.Vector3, width: number, depth = width, solid = true) => {
    const direction = b.clone().sub(a), q = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), direction.clone().normalize());
    add(name, color, new THREE.BoxGeometry(width, direction.length(), depth).applyQuaternion(q)
      .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), solid, solid);
  };
  const rock = (x: number, z: number, radius: number, seed: number, color: string) => {
    if (demoRouteSample(id, x, z).distance < 9 + radius || Math.hypot(x - DEMOS[id].loop[0].x, z - DEMOS[id].loop[0].z) < 13 + radius) return;
    let base = demoGroundHeight(id, x, z);
    for (const dx of [-radius, radius]) for (const dz of [-radius, radius])
      base = Math.min(base, demoGroundHeight(id, x + dx, z + dz));
    add('Grounded rocks', color, new THREE.IcosahedronGeometry(1, 0).scale(radius, radius * (0.6 + seed), radius * 0.8)
      .rotateY(seed * 6).translate(x, base - radius * 0.25, z), true, true);
  };
  for (const obstacle of demoObstacles(id))
    add('Crossable trail obstacles', id === 'old-quarry' ? '#9a9c8c' : '#737e67', demoObstacleGeometry(id, obstacle), true, true);
  if (id === 'old-quarry') add('Deep Cut roof', '#ffffff', quarryTunnelGeometry(), true, true);
  const markedRoute = id === 'old-quarry' ? QUARRY_DESCENT : id === 'autumn-woods' ? WOODLAND_RIDGE : null;
  if (markedRoute) for (let i = 0; i < markedRoute.length - 1; i++) {
    const a = markedRoute[i], b = markedRoute[i + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let step = 0; step < length; step += 15) {
      const shoulder = id === 'old-quarry' ? 3.8 : 5.2;
      const x = a.x + (b.x - a.x) * step / length + (b.z - a.z) / length * shoulder;
      const z = a.z + (b.z - a.z) * step / length - (b.x - a.x) / length * shoulder, y = demoGroundHeight(id, x, z);
      box('Adventure trail posts', id === 'old-quarry' ? '#aca994' : '#765537', x, y + 0.6, z, 0.22, 1.4, 0.22, false);
      box('Adventure trail posts', id === 'old-quarry' ? '#eadabb' : '#d8a34b', x, y + 1.08, z, 0.24, 0.18, 0.24, false);
    }
  }
  if (id === 'red-canyon') {
    add('Echo Arch', '#ffffff', demoArchGeometry(0, 8, -65), true, true);
    add('Split Spire', '#ffffff', column(id, -78, 0, 44, 6, 0.7), true, true);
    add('Split Spire', '#ffffff', column(id, -43, -3, 34, 5, 0.2), true, true);
  }
  if (id === 'dune-sea') add('Stone Window', '#ffffff', demoArchGeometry(-35, 3.5, -45, 0.7, 1.95), true, true);
  if (id === 'old-quarry') {
    const y = 16, color = '#c79742';
    for (const side of [-1, 1]) {
      box('Iron Giant', '#3f4949', -30 + side * 2.7, y + 0.8, -35, 1.5, 1.7, 10);
      for (let i = -3; i <= 3; i++) box('Iron Giant', '#71756c', -30 + side * 3.48, y + 0.7, -35 + i * 1.3, 0.15, 0.8, 0.95);
    }
    box('Iron Giant', color, -30, y + 2.3, -35, 6.5, 2.1, 6);
    box('Iron Giant', color, -31.5, y + 4.6, -35, 3.2, 3, 4);
    box('Iron Giant', '#6e949a', -29.86, y + 5, -35, 0.06, 1.8, 3.2, false);
    box('Iron Giant', '#6e949a', -31.5, y + 5, -32.96, 2.4, 1.8, 0.06, false);
    beam('Iron Giant', color, v(-28, y + 3.3, -35), v(-18, y + 16, -35), 1.7, 2.1);
    beam('Iron Giant', color, v(-18, y + 16, -35), v(-8, y + 8.5, -35), 1.3, 1.6);
    beam('Iron Giant', '#5a6463', v(-27, y + 4, -33.8), v(-19, y + 12, -33.8), 0.4);
    box('Iron Giant', '#58605c', -6, y + 7.7, -35, 5, 2.5, 4);
    for (let i = 0; i < 4; i++) box('Iron Giant', '#c4bda0', -4, y + 6.2, -36.5 + i, 1.1, 0.6, 0.4);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const x = -65 + i * 7, z = -5 + j * 7;
      if (demoRouteSample(id, x, z).distance < 12) continue;
      const heights = [-2, 2].flatMap(dx => [-2, 2].map(dz => demoGroundHeight(id, x + dx, z + dz)));
      const low = Math.min(...heights), high = Math.max(...heights);
      if (high - low < 1.5) box('Cut limestone', '#c7cbb8', x, (low + high + 3) / 2, z, 4, high - low + 3.6, 4);
    }
  }
  if (id === 'autumn-woods') {
    box('Foxglove Bridge', '#89734d', 45, 3.7, 45, 28, 0.6, 8);
    for (const x of [32, 38.5, 45, 51.5, 58]) for (const side of [-1, 1]) {
      box('Foxglove Bridge', '#5c4b37', x, 7.2, 45 + side * 4.15, 0.38, 6.4, 0.38);
      box('Foxglove Bridge', '#806344', x, 4.8, 45 + side * 4.15, 5.8, 1.1, 0.2);
      beam('Foxglove Bridge', '#68513b', v(x - 2.9, 5.5, 45 + side * 4.15), v(x + 2.9, 8.5, 45 + side * 4.15), 0.2);
    }
    for (const side of [-1, 1]) {
      const roof = new THREE.BoxGeometry(30, 0.3, 5.2).rotateX(side * 0.37).translate(45, 11, 45 + side * 2.3);
      add('Foxglove Bridge', '#514f42', roof, true, true);
    }
    const positions: number[] = [];
    const profile = [[55, 3.82], [54, 3.72], [52, 1], [50, 0.02]];
    for (let i = 1; i < profile.length; i++) {
      const [x0, y0] = profile[i - 1], [x1, y1] = profile[i];
      positions.push(x0, y0, -57, x1, y1, -57, x0, y0, -53, x0, y0, -53, x1, y1, -57, x1, y1, -53);
    }
    const cascade = new THREE.BufferGeometry();
    cascade.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); cascade.computeVertexNormals();
    const water = new THREE.Mesh(cascade, new THREE.MeshStandardMaterial({ color: '#e1eee2', side: THREE.DoubleSide, roughness: 0.28, transparent: true, opacity: 0.84 }));
    water.name = 'Copper Falls'; group.add(water);
  }
  if (id === 'island-tracks') {
    const x = -120, z = -27, base = 7;
    add('Needle Lighthouse', '#a8a78d', new THREE.CylinderGeometry(3.4, 4.5, 1.4, 10).translate(x, base, z), true, true);
    for (let i = 0; i < 7; i++) add('Needle Lighthouse', i === 2 || i === 5 ? '#657b7e' : '#e7e3cd',
      new THREE.CylinderGeometry(2.2 - (i + 1) * 0.11, 2.2 - i * 0.11, 4, 12).translate(x, base + 2.7 + i * 4, z), true, true);
    add('Needle Lighthouse', '#a8c6c0', new THREE.CylinderGeometry(1.65, 1.65, 2.5, 8).translate(x, base + 30.3, z), true, true);
    add('Needle Lighthouse', '#9c5f4a', new THREE.ConeGeometry(2.6, 2.5, 8).translate(x, base + 32.5, z), true, true);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      box('Needle Lighthouse', '#505f5e', x + Math.cos(angle) * 1.65, base + 30.3, z + Math.sin(angle) * 1.65, 0.12, 2.6, 0.12);
    }
    for (const centre of [12, 43]) {
      const arch = new THREE.Shape();
      arch.moveTo(-9, 1); arch.lineTo(-6, 1); arch.lineTo(-6, 7);
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI * (1 - i / 16); arch.lineTo(Math.cos(a) * 6, 7 + Math.sin(a) * 4);
      }
      arch.lineTo(6, 1); arch.lineTo(9, 1); arch.lineTo(9, 13); arch.lineTo(-9, 13); arch.closePath();
      add('Tide Gate', '#8a9290', new THREE.ExtrudeGeometry(arch, { depth: 2.2, bevelEnabled: false })
        .translate(0, 0, -1.1).rotateY(Math.PI / 2).translate(centre, 0, 15), true, true);
    }
    for (const side of [-1, 1]) box('Tide Gate', '#7f8b86', 27.5, 3.55, 15 + side * 5.4, 37, 1.1, 0.55);
  }
  for (const tree of demoTrees(id)) {
    let base = tree.y;
    for (const dx of [-tree.radius, tree.radius]) for (const dz of [-tree.radius, tree.radius])
      base = Math.min(base, demoGroundHeight(id, tree.x + dx, tree.z + dz));
    add('Tree trunks', id === 'autumn-woods' && tree.seed > 0.65 ? '#b7b4a0' : '#67563f',
      new THREE.CylinderGeometry(tree.radius * 0.5, tree.radius, tree.y + tree.height - base + 0.3, 6)
        .translate(tree.x, (base - 0.3 + tree.y + tree.height) / 2, tree.z), true, true);
    for (let lobe = 0; lobe < 3; lobe++) {
      const a = tree.seed * 6 + lobe * 2.4, r = id === 'autumn-woods' ? 3.8 + tree.seed * 2.5 : 2.8;
      const colors = id === 'autumn-woods' ? ['#c99532', '#b56c35', '#e2b54b', '#9e5731'] : ['#657448', '#738252'];
      add('Canopy', colors[Math.floor(tree.seed * colors.length) % colors.length],
        new THREE.IcosahedronGeometry(1, lobe === 0 ? 1 : 0).scale(r, r * 0.8, r * 0.92)
          .rotateY(a).translate(tree.x + Math.cos(a) * r * 0.45, tree.y + tree.height - lobe * 0.9, tree.z + Math.sin(a) * r * 0.45), false, true);
    }
  }
  for (let j = -10; j <= 10; j++) for (let i = -10; i <= 10; i++) {
    const seed = demoHash(i + 119, j - 54), x = i * 16 + (seed - 0.5) * 10;
    const z = j * 16 + (demoHash(j + 88, i - 5) - 0.5) * 10, y = demoGroundHeight(id, x, z);
    if (seed > 0.68 && y > 0.8 && (id !== 'dune-sea' || x > 90 || z < -110)) {
      const color = id === 'red-canyon' ? '#bb8e6d' : id === 'dune-sea' ? '#69645c' : id === 'old-quarry' ? '#aeb9ac' : '#68766a';
      rock(x, z, 1.2 + seed * 2.1, seed, color);
    }
    if (id !== 'island-tracks' && id !== 'autumn-woods' || y < 1 || demoRouteSample(id, x, z).distance < 8) continue;
    for (let k = 0; k < 3; k++) {
      const dx = Math.cos(k * 2.4 + seed) * 1.6, dz = Math.sin(k * 2.4 + seed) * 1.6;
      const ground = demoGroundHeight(id, x + dx, z + dz);
      add('Low plants', id === 'autumn-woods' ? '#8e844b' : '#a1a56a',
        new THREE.ConeGeometry(0.5, 0.7 + seed, 4).translate(x + dx, ground + 0.15, z + dz));
    }
  }
  for (const [name, batch] of batches) {
    const geometry = mergeGeometries(batch.geometries);
    for (const source of batch.geometries) source.dispose();
    if (!geometry) throw new Error(`${id}: could not merge ${name}`);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9,
      side: name === 'Deep Cut roof' ? THREE.DoubleSide : THREE.FrontSide }));
    mesh.name = name; mesh.receiveShadow = true; mesh.castShadow = batch.shadow; group.add(mesh);
    if (batch.solid) solids.push(mesh);
  }
  return { group, solids };
}
