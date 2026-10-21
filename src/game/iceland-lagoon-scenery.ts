import { icelandSeaTint } from './iceland-river';
import * as THREE from 'three';
import { ICELAND_CELL, icelandGridZ, icelandBedHeight, icelandSurfaceHeight } from './iceland-terrain';
import { icelandHash } from './iceland-noise';
import { JOKULSA_BRIDGE, LAGOON_WATER_BOUNDS, lagoonRadius } from './iceland-lagoon';

type AddMesh = (g: THREE.BufferGeometry, m: THREE.Material, name: string, solid?: boolean) => THREE.Mesh;
/** One owner for lagoon, outlet and adjoining sea, clipped against actual terrain triangles. */
export function buildLagoonWater() {
  const { x0, x1, z0, z1 } = LAGOON_WATER_BOUNDS;
  const vertices: number[] = [], colors: number[] = [];
  const shallow = new THREE.Color('#75a9ab'), deep = new THREE.Color('#367887');
  type Vertex = { x: number; z: number; depth: number };
  const emit = (triangle: Vertex[]) => {
    const polygon: Vertex[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      if (a.depth >= 0) polygon.push(a);
      if ((a.depth >= 0) !== (b.depth >= 0)) {
        const t = a.depth / (a.depth - b.depth);
        polygon.push({ x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z), depth: 0 });
      }
    }
    for (let i = 1; i + 1 < polygon.length; i++) for (const p of [polygon[0], polygon[i], polygon[i + 1]]) {
      const transition = THREE.MathUtils.smoothstep(p.z, 673, 700);
      const boundary = 1 - THREE.MathUtils.smoothstep(Math.min(p.x - x0, x1 - p.x, p.z - z0), 0, 14);
      const seaBlend = Math.max(transition, boundary);
      const sea = icelandSeaTint(p.x, p.z);
      const tint = shallow.clone().lerp(deep, Math.min(1, p.depth / 6)).lerp(sea.color, seaBlend);
      const alpha = (0.48 + 0.52 * THREE.MathUtils.smoothstep(p.depth, 0, 2.4)) * (1 - seaBlend) + sea.alpha * seaBlend;
      vertices.push(p.x, -0.015, p.z); colors.push(tint.r, tint.g, tint.b, alpha);
    }
  };
  // Ice walls occupy the bay independently; water meets them, not a fictitious
  // heightfield ramp between the glacier roof and the submerged bed.
  const vertex = (x: number, z: number): Vertex => ({ x, z, depth: -icelandBedHeight(x, z) });
  for (let j = Math.round(z0 / ICELAND_CELL); j < Math.round(z1 / ICELAND_CELL); j++)
    for (let i = Math.round(x0 / ICELAND_CELL); i < Math.round(x1 / ICELAND_CELL); i++) {
      const x = i * ICELAND_CELL, z = icelandGridZ(j), nextZ = icelandGridZ(j + 1);
      const a = vertex(x, z), b = vertex(x, nextZ), c = vertex(x + ICELAND_CELL, nextZ), d = vertex(x + ICELAND_CELL, z);
      emit([a, b, d]); emit([d, b, c]);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4)); geometry.computeVertexNormals();
  return geometry;
}
/** Unequal fracture planes: low tabular slabs and broad broken ridges. */
function fracturedIce(seed: number, width: number, height: number, depth: number) {
  const count = 6 + Math.floor(icelandHash(seed, 201) * 4), rings: THREE.Vector3[][] = [[], []];
  const variant = Math.floor(icelandHash(seed, 202) * 4);
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2 + 0.22 * (icelandHash(seed, i) - 0.5);
    const r = 0.66 + 0.34 * icelandHash(seed + 19, i);
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    rings[0].push(new THREE.Vector3(x * width, -height * 0.45, z * depth));
    const taper = (variant === 0 ? 0.9 : variant === 1 ? 0.7 : variant === 2 ? 0.83 : 0.62)
      + 0.08 * (icelandHash(seed, i + 81) - 0.5);
    const roof = variant === 0 ? 0.52 + 0.12 * icelandHash(seed, i + 40)
      : variant === 1 ? 0.28 + 0.36 * icelandHash(seed, i + 40)
      : variant === 2 ? 0.24 + 0.64 * (x + 1) / 2
      : 0.45 + 0.4 * icelandHash(seed, i + 40);
    const shear = (icelandHash(seed, 203) - 0.5) * 0.3;
    rings[1].push(new THREE.Vector3((x * taper + shear) * width, roof * height, (z * taper - shear * 0.4) * depth));
  }
  const vertices: number[] = [], colors: number[] = [];
  const face = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, index: number) => {
    const tint = new THREE.Color('#a2cbd1').lerp(new THREE.Color('#e1efed'),
      0.25 + 0.75 * icelandHash(seed + 113, index + 37));
    for (const p of [a, b, c]) { vertices.push(...p.toArray()); colors.push(tint.r, tint.g, tint.b); }
  };
  const bottom = new THREE.Vector3(0, -height * 0.45, 0);
  for (let i = 0; i < count; i++) {
    const n = (i + 1) % count;
    face(rings[0][i], rings[1][i], rings[0][n], i * 2);
    face(rings[0][n], rings[1][i], rings[1][n], i * 2 + 1);
    face(rings[0][n], bottom, rings[0][i], i + 71);
  }
  if (variant === 0 || variant === 2) {
    const roof = THREE.ShapeUtils.triangulateShape(rings[1].map(p => new THREE.Vector2(p.x, p.z)), []);
    roof.forEach(([a, b, c], i) => face(rings[1][a], rings[1][c], rings[1][b], i + 31));
  } else {
    const split = Math.floor(count / 2);
    const a = new THREE.Vector3(width * (icelandHash(seed, 204) - 0.5) * 0.3, height * (variant === 1 ? 0.98 : 0.82), depth * 0.2);
    const b = new THREE.Vector3(width * (icelandHash(seed, 205) - 0.5) * 0.4, height * (variant === 1 ? 0.65 : 0.94), -depth * 0.18);
    for (let i = 0; i < count; i++) face(rings[1][i], i < split ? a : b, rings[1][(i + 1) % count], i + 31);
    face(rings[1][0], b, a, 61); face(rings[1][split], a, b, 62);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.userData.iceProfile = ['tabular', 'split-ridge', 'tilted-slab', 'fractured-block'][variant];
  g.computeVertexNormals();
  return g;
}
/** Fixed asymmetric icebergs, all in deep water, share visible and solid geometry. */
export function addLagoonScenery(add: AddMesh) {
  const iceMaterial = (clear: boolean, thickness: number, seed: number, shore = false) => clear
    ? new THREE.MeshPhysicalMaterial({ vertexColors: true,
      roughness: shore ? 0.25 + 0.15 * icelandHash(seed, 211) : 0.08 + 0.18 * icelandHash(seed, 211), flatShading: true,
      transmission: shore ? 0.35 + 0.2 * icelandHash(seed, 212) : 0.62 + 0.3 * icelandHash(seed, 212),
      thickness, ior: 1.31, transparent: true,
      opacity: shore ? 0.88 + 0.07 * icelandHash(seed, 213) : 0.48 + 0.27 * icelandHash(seed, 213), depthWrite: false })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true });
  add(buildLagoonWater(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35,
    metalness: 0.04, side: THREE.DoubleSide, transparent: true, depthWrite: false }), 'Jökulsárlón · lagoon and outlet').renderOrder = 1;
  for (let i = 0; i < 24; i++) {
    const x = 414 + icelandHash(i + 109, 31) * 137, z = 505 + icelandHash(i, 59) * 99;
    if (lagoonRadius(x, z) > 0.84 || icelandSurfaceHeight(x, z) > -5) continue;
    const large = i % 7 === 0;
    const sx = large ? (8 + icelandHash(i, 71) * 3) * (1.25 + 0.15 * icelandHash(i, 215)) : 2.4 + icelandHash(i, 71) * 3;
    const sy = (i % 4 === 0 ? 1.8 : i % 4 === 1 ? 3.2 : 2.5) * (large ? 1.55 + 0.2 * icelandHash(i, 216) : 1);
    const g = fracturedIce(i, sx, sy, sx * (0.5 + icelandHash(i, 93) * 0.45)).translate(x, 0, z);
    const clear = icelandHash(i, 210) > 0.6;
    add(g, iceMaterial(clear, sx * (0.25 + 0.2 * icelandHash(i, 214)), i), `Jökulsárlón · iceberg ${i + 1}`, true).renderOrder = clear ? 2 : 0;
  }
  // Stranded ice is partly buried in the black beach, clear of the outlet and road.
  const easternIce: { x: number; z: number }[] = [];
  for (let i = 0; i < 44; i++) {
    const east = i % 2 === 1;
    const x = east ? 532 + icelandHash(i, 101) * 38 : 441 + icelandHash(i, 101) * 34;
    // The eastern shore slopes seaward as it approaches the outlet. Follow that
    // narrow dry strip instead of scattering most candidates into deep water.
    const z = east ? 678 - (x - 540) * 0.25 + (icelandHash(i, 102) - 0.5) * 6
      : 675 + icelandHash(i, 102) * 24;
    const ground = icelandSurfaceHeight(x, z);
    if (ground < -0.3 || ground > 2.5) continue;
    if (east && easternIce.some(piece => Math.hypot(piece.x - x, piece.z - z) < 6)) continue;
    const size = (0.45 + icelandHash(i, 103) * 1.4) * (i % 3 === 1 ? 2.1 + 0.3 * icelandHash(i, 217) : 1)
      * (i === 38 ? 2.2 : 1);
    const iceSize = east ? Math.max(1.2, size * 1.2) : size;
    // Use a separate shape sequence: shoreline filtering leaves only a handful of pieces.
    const g = fracturedIce(i + 30, iceSize, iceSize * 0.8, iceSize * 0.7).translate(x, ground + iceSize * 0.12, z);
    const clear = icelandHash(i + 50, 210) > 0.6;
    add(g, iceMaterial(clear, iceSize * (0.25 + 0.2 * icelandHash(i + 50, 214)), i + 50, true), `Jökulsárlón · beach ice ${i + 1}`, true).renderOrder = clear ? 2 : 0;
    if (east) easternIce.push({ x, z });
  }
  const b = JOKULSA_BRIDGE;
  const concrete = new THREE.MeshStandardMaterial({ color: '#89928c', roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const steel = new THREE.MeshStandardMaterial({ color: '#bdc6bb', roughness: 0.7 });
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, name: string, material = steel) =>
    add(new THREE.BoxGeometry(w, h, d).translate(x, y, z), material, `Jökulsá · ${name}`, true);
  box(b.x, b.y - 0.4, b.z, b.length, 0.8, b.width, 'outlet bridge deck', concrete);
  const cable = (a: THREE.Vector3, b: THREE.Vector3, radius: number, name: string) => {
    const direction = b.clone().sub(a), g = new THREE.CylinderGeometry(radius, radius, direction.length(), 5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    add(g, steel, `Jökulsá · ${name}`);
  };
  for (const side of [-1, 1]) {
    const z = b.z + side * 5.7;
    box(b.x, b.y + 0.9, z, 88, 0.18, 0.18, 'guard rail');
    for (let i = -5; i <= 5; i++) box(b.x + i * 8, b.y + 0.4, z, 0.14, 0.8, 0.14, 'rail post');
    for (const x of [460, 540]) box(x, 10.5, z, 1.1, 15, 1.1, 'suspension tower');
    for (const end of [-1, 1]) {
      const anchorX = b.x + end * 61, anchorZ = b.z + side * 10;
      const anchorY = icelandSurfaceHeight(anchorX, anchorZ) + 0.6;
      box(anchorX, anchorY - 0.3, anchorZ, 2.4, 1.6, 2.1, 'cable anchorage', concrete);
      cable(new THREE.Vector3(b.x + end * 40, 17, z),
        new THREE.Vector3(anchorX, anchorY + 0.5, anchorZ), 0.10, 'outer stay cable');
    }
    for (let i = 0; i < 16; i++) {
      const t = i / 16, next = (i + 1) / 16;
      const y = (v: number) => 9 + 8 * (2 * v - 1) ** 2;
      cable(new THREE.Vector3(460 + 80 * t, y(t), z), new THREE.Vector3(460 + 80 * next, y(next), z), 0.10, 'main cable');
      cable(new THREE.Vector3(460 + 80 * t, b.y + 1, z), new THREE.Vector3(460 + 80 * t, y(t), z), 0.045, 'hanger');
    }
  }
}
