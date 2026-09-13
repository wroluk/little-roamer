import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { seededRandom } from './terrain';
import type { SurfaceId } from './surfaces';

export const SAMURAI_HALF = 120;
export const SAMURAI_START = { x: 0, y: 2.25, z: 62 };
const CELL = 2;
const GRID = 120;
const WATER = 0.8;
const lakeRadius = (x: number, z: number) => Math.hypot((x - 65) / 28, (z - 18) / 34);
function height(x: number, z: number) {
  const r = lakeRadius(x, z);
  const t = Math.max(0, Math.min(1, (r - 0.65) / 0.35));
  return 0.45 + 0.55 * t * t * (3 - 2 * t);
}
export function samuraiSurfaceHeight(x: number, z: number): number {
  const gx = Math.max(0, Math.min(GRID - 0.00001, (x + SAMURAI_HALF) / CELL));
  const gz = Math.max(0, Math.min(GRID - 0.00001, (z + SAMURAI_HALF) / CELL));
  const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, v = gz - iz;
  const px = ix * CELL - SAMURAI_HALF, pz = iz * CELL - SAMURAI_HALF;
  const a = height(px, pz), b = height(px + CELL, pz), c = height(px, pz + CELL), d = height(px + CELL, pz + CELL);
  return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
}
export const samuraiWaterHeight = (x: number, z: number) => samuraiSurfaceHeight(x, z) < WATER ? WATER : null;
export function samuraiSurfaceAt(x: number, z: number): SurfaceId {
  if (x >= 33 && x <= 97 && Math.abs(z - 38) <= 3.5) return 'dirt';
  if (samuraiWaterHeight(x, z) !== null) return 'water';
  if (Math.abs(x) < 5 || (z > -35 && z < 65 && Math.abs(x + 32) < 4)
    || (x > -60 && x < 65 && [48, 16, -16].some(lane => Math.abs(z - lane) < 4))
    || (Math.abs(x) < 24 && z < -75)) return 'dirt';
  return z < -35 ? 'moss' : 'grass';
}

export function buildSamurai(scene: THREE.Scene, world: RAPIER.World) {
  const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
  const wood = mat('#50392e'), plaster = mat('#e7d6ae'), roof = mat('#35484a');
  const red = mat('#b93627'), stone = mat('#838b79'), green = mat('#597f45');
  const leaf = mat('#719951'), pink = mat('#eab6af'), paper = mat('#fff0c7');
  const lantern = new THREE.MeshStandardMaterial({ color: '#e64b32', emissive: '#e13c19', emissiveIntensity: 0.65, roughness: 0.7 });
  // Batch repeated architecture and plants to keep the tablet draw-call count low.
  const batches = new Map<THREE.Material, Map<THREE.BufferGeometry, THREE.Matrix4[]>>();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const poleGeo = new THREE.CylinderGeometry(1, 1, 1, 7);
  const ballGeo = new THREE.SphereGeometry(1, 10, 7);
  const crownGeo = new THREE.IcosahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  function part(geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, solid = false, angle = 0) {
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, 0, angle); dummy.updateMatrix();
    let shapes = batches.get(material);
    if (!shapes) { shapes = new Map(); batches.set(material, shapes); }
    let matrices = shapes.get(geo);
    if (!matrices) { matrices = []; shapes.set(geo, matrices); }
    matrices.push(dummy.matrix.clone());
    if (solid) {
      const desc = geo === poleGeo ? RAPIER.ColliderDesc.cylinder(sy / 2, sx)
        : RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2);
      world.createCollider(desc.setTranslation(x, y, z).setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }).setFriction(0.85));
    }
  }
  const box = (m: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, solid = false) => part(boxGeo, m, x, y, z, w, h, d, solid);
  const vertices = new Float32Array((GRID + 1) ** 2 * 3), colors = new Float32Array(vertices.length);
  const indices = new Uint32Array(GRID * GRID * 6), color = new THREE.Color();
  for (let iz = 0; iz <= GRID; iz++) for (let ix = 0; ix <= GRID; ix++) {
    const i = (iz * (GRID + 1) + ix) * 3, x = ix * CELL - SAMURAI_HALF, z = iz * CELL - SAMURAI_HALF;
    vertices.set([x, height(x, z), z], i);
    color.set(samuraiSurfaceAt(x, z) === 'dirt' ? '#c6af87' : lakeRadius(x, z) < 1 ? '#a6b699' : z < -35 ? '#6e8650' : '#91a667');
    color.multiplyScalar(0.97 + 0.035 * Math.sin(x * 1.7 + z * 0.7)).toArray(colors, i);
    if (ix < GRID && iz < GRID) { const a = iz * (GRID + 1) + ix; indices.set([a, a + GRID + 1, a + 1, a + 1, a + GRID + 1, a + GRID + 2], (iz * GRID + ix) * 6); }
  }
  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrain.setIndex(new THREE.BufferAttribute(indices, 1)); terrain.computeVertexNormals();
  const ground = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; ground.name = 'Samurai village terrain'; scene.add(ground);
  world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.9));
  // A translucent lake intersects the sloping bank below ground, revealing the shallow bed.
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: '#73b8b0', transparent: true, opacity: 0.58, roughness: 0.25, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.scale.set(28, 34, 1); water.position.set(65, WATER, 18); water.name = 'Shallow torii lake'; scene.add(water);
  // East–west crossing on the southern lake, 20 m from the torii centre.
  // Continuous collision surfaces and flush, shallow ramps keep wheels on the deck.
  const bridgeZ = 38, deckTop = 2.2, deckThickness = 0.24;
  box(wood, 65, deckTop - deckThickness / 2, bridgeZ, 44, deckThickness, 7, true);
  for (const side of [-1, 1]) {
    const angle = -side * Math.atan2(1.25, 10);
    part(boxGeo, wood, 65 + side * 27 + Math.sin(angle) * deckThickness / 2,
      1.575 - Math.cos(angle) * deckThickness / 2, bridgeZ,
      Math.hypot(10, 1.25), deckThickness, 7, true, angle);
  }
  // Painted plank seams sit on the deck; the underlying collider has no gaps.
  for (let x = 43.5; x < 87; x += 0.85) box(plaster, x, deckTop + 0.008, bridgeZ, 0.035, 0.012, 6.8);
  for (const side of [-1, 1]) {
    const z = bridgeZ + side * 3.35;
    for (let x = 43; x <= 87; x += 5.5) {
      box(red, x, deckTop + 0.75, z, 0.24, 1.5, 0.24, true);
      box(roof, x, deckTop + 1.53, z, 0.36, 0.12, 0.36);
      box(wood, x, 1.25, z, 0.36, 1.9, 0.36, true);
    }
    for (const y of [deckTop + 0.55, deckTop + 1.3]) box(red, 65, y, z, 44.3, 0.16, 0.2, true);
  }
  function tiledRoof(x: number, y: number, z: number, w: number, d: number) {
    // Broad curved eaves, raised corners and a capped ridge.
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const offset = (i + 0.5) * w / 8;
      const profile = [2.2, 1.3, 0.65, 0.45, 0.8];
      const rise = (profile[i] + profile[i + 1]) / 2;
      const delta = profile[i + 1] - profile[i];
      part(boxGeo, roof, x + side * offset, y + rise, z,
        Math.hypot(w / 8, delta) + 0.05, 0.25, d, true, side * Math.atan2(delta, w / 8));
    }
    box(roof, x, y + 2.25, z, 0.45, 0.45, d + 0.6);
  }
  function house(x: number, z: number, variant: number) {
    const w = variant ? 12 : 10, d = 12, y = 1;
    box(stone, x, y + 0.3, z, w + 0.8, 0.6, d + 0.8, true);
    box(plaster, x, y + 2.8, z, w, 5, d, true);
    for (const dx of [-w / 2, 0, w / 2]) box(wood, x + dx, y + 2.9, z + d / 2 + 0.06, 0.25, 5.3, 0.22);
    for (const dz of [-d / 2, d / 2]) {
      box(wood, x, y + 0.8, z + dz, w + 0.4, 0.3, 0.3);
      box(wood, x, y + 5.1, z + dz, w + 0.4, 0.35, 0.3);
      for (const dx of [-2.8, 2.8]) {
        box(paper, x + dx, y + 2.8, z + dz * 1.012, 2.2, 2.6, 0.1);
        for (let k = -1; k <= 1; k++) box(wood, x + dx + k * 0.65, y + 2.8, z + dz * 1.025, 0.07, 2.7, 0.08);
        box(wood, x + dx, y + 2.8, z + dz * 1.03, 2.2, 0.09, 0.08);
      }
    }
    tiledRoof(x, y + 5.4, z, w + 3.5, d + 3);
  }
  for (const [row, z] of [0, 32, -32].entries()) for (const x of [-49, -17, 17]) house(x, z, row % 2);
  function hangingLantern(x: number, y: number, z: number) {
    box(wood, x, y + 0.9, z, 0.045, 1, 0.045);
    part(ballGeo, lantern, x, y, z, 0.53, 0.72, 0.53);
    for (const dy of [-0.65, 0.65]) box(wood, x, y + dy, z, 0.45, 0.12, 0.45);
    box(red, x, y - 0.95, z, 0.06, 0.5, 0.06);
  }
  for (const z of [48, 16, -16]) for (const x of [-32, 0]) {
    for (const side of [-1, 1]) part(poleGeo, wood, x + side * 6, 4.6, z, 0.16, 7.2, 0.16, true);
    box(wood, x, 8.1, z, 12.4, 0.08, 0.08);
    for (let i = -2; i <= 2; i++) hangingLantern(x + i * 2, 6.6, z);
  }
  // The clear central path continues through the forest to the temple courtyard.
  const random = seededRandom(1603);
  for (let i = 0; i < 310; i++) {
    const x = (random() - 0.5) * 152, z = -42 - random() * 32;
    if (Math.abs(x) < 7) continue;
    const h = 7 + random() * 5, r = 0.14 + random() * 0.08;
    part(poleGeo, green, x, 1 + h / 2, z, r, h, r, true);
    for (let j = 1; j < h; j += 1.5) part(poleGeo, leaf, x, 1 + j, z, r + 0.025, 0.09, r + 0.025);
    for (const side of [-1, 1]) part(crownGeo, leaf, x + side * 0.8, h - 0.4, z, 1.5, 0.4, 0.65, false, side * 0.3);
  }
  box(stone, 0, 1.18, -91, 36, 0.36, 27, true);
  // Low approach ramp allows the toy car to enter the courtyard.
  for (let i = 0; i < 4; i++) box(stone, 0, 1 + i * 0.045, -76 - i * 0.6, 12, i * 0.09 + 0.03, 0.65, true);
  box(wood, 0, 5, -96, 19, 7.4, 12, true);
  box(plaster, 0, 5, -89.94, 15, 5.3, 0.12);
  for (const x of [-10, -6, 6, 10]) part(poleGeo, red, x, 5, -87, 0.35, 7.5, 0.35, true);
  box(wood, 0, 4.4, -89.8, 4, 5.5, 0.2);
  tiledRoof(0, 8.4, -95, 27, 20);
  box(plaster, 0, 11.6, -95, 11, 2.8, 9, true);
  tiledRoof(0, 12.8, -95, 17, 13);
  for (const x of [-8, 8]) hangingLantern(x, 6.3, -86.5);
  function torii(x: number, z: number, base: number) {
    for (const side of [-1, 1]) {
      part(poleGeo, red, x + side * 4.5, base + 4.6, z, 0.42, 9.2, 0.42, true);
      part(poleGeo, stone, x + side * 4.5, base + 0.5, z, 0.58, 1, 0.58, true);
      part(boxGeo, roof, x + side * 5.9, base + 9.8, z, 3.8, 0.45, 1.1, true, side * 0.14);
    }
    box(red, x, base + 7.1, z, 12, 0.5, 0.55, true);
    box(red, x, base + 9.1, z, 14, 0.6, 0.8, true);
    box(roof, x, base + 9.55, z, 9, 0.45, 1.1, true);
    box(red, x, base + 8.1, z, 0.4, 1.8, 0.5);
    box(wood, x, base + 8.1, z + 0.31, 0.9, 1.3, 0.16);
  }
  torii(65, 18, samuraiSurfaceHeight(65, 18));
  torii(0, -76, 1);
  for (const [x, z] of [[-63, 58], [28, 55], [37, -15], [-28, -83], [28, -86], [89, 52]]) {
    part(poleGeo, wood, x, 3, z, 0.4, 4, 0.4, true);
    for (let i = 0; i < 5; i++) part(crownGeo, pink, x + Math.sin(i * 2.4) * 2.5, 6 + i % 2, z + Math.cos(i * 2.4) * 2, 3, 2.1, 2.8);
  }
  // Visible mossy walls enclose the playable garden.
  for (const side of [-1, 1]) {
    box(stone, side * 119, 4, 0, 2, 8, 240, true);
    box(stone, 0, 4, side * 119, 236, 8, 2, true);
    box(green, side * 119, 8.1, 0, 2.2, 0.25, 240);
    box(green, 0, 8.1, side * 119, 236, 0.25, 2.2);
  }
  for (const [material, shapes] of batches) for (const [geometry, matrices] of shapes) {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  }
}
