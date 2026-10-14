import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { marsSurfaceHeight } from './mars-terrain';

import { WRECK_SITE } from './mars-wreck-layout';

type Emit = (geometry: THREE.BufferGeometry, material: THREE.Material, solid?: boolean) => void;
type Skin = 'outer' | 'inner' | 'edge' | 'armor';
type Part = (geometry: THREE.BufferGeometry, skin: Skin) => void;
type Ring = { outer: THREE.Vector3[]; inner: THREE.Vector3[] };
/** A closed wall volume: continuous outer/inner skins and caps around every tear. */
function shell(rows: Ring[], present: (row: number, column: number) => boolean, add: Part, smooth = true) {
  const n = rows[0].outer.length;
  const outer = rows.flatMap(row => row.outer), inner = rows.flatMap(row => row.inner);
  const outside: number[] = [], inside: number[] = [], edges: number[] = [];
  const exists = (i: number, j: number) => i >= 0 && i < rows.length - 1 && present(i, (j + n) % n);
  const cap = (a: number, b: number) => {
    for (const p of [outer[b], outer[a], inner[a], outer[b], inner[a], inner[b]]) edges.push(...p.toArray());
  };
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < n; j++) {
    if (!exists(i, j)) continue;
    const a = i * n + j, b = i * n + (j + 1) % n, c = b + n, d = a + n;
    outside.push(a, b, c, a, c, d); inside.push(a, d, c, a, c, b);
    if (!exists(i - 1, j)) cap(a, b);
    if (!exists(i, j + 1)) cap(b, c);
    if (!exists(i + 1, j)) cap(c, d);
    if (!exists(i, j - 1)) cap(d, a);
  }
  for (const [vertices, indices, skin] of [[outer, outside, 'outer'], [inner, inside, 'inner']] as const) {
    if (!indices.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flatMap(p => p.toArray()), 3));
    geometry.setIndex(indices);
    if (smooth) geometry.computeVertexNormals();
    const flat = geometry.toNonIndexed(); geometry.dispose();
    if (!smooth) flat.computeVertexNormals();
    add(flat, skin);
  }
  if (edges.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
    geometry.computeVertexNormals(); add(geometry, 'edge');
  }
}

function roundRow(z: number, rx: number, ry: number, cy: number, thickness: number, segments = 48, tear = 0): Ring {
  const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
  for (let j = 0; j < segments; j++) {
    const angle = j / segments * Math.PI * 2;
    const tornZ = z + tear * (0.7 * Math.sin(j * 1.91) + 0.3 * Math.sin(j * 0.73));
    outer.push(new THREE.Vector3(rx * Math.cos(angle), cy + ry * Math.sin(angle), tornZ));
    inner.push(new THREE.Vector3((rx - thickness) * Math.cos(angle), cy + (ry - thickness) * Math.sin(angle), tornZ));
  }
  return { outer, inner };
}
const OCTAGON = [[1, 0.28], [0.68, 1], [-0.68, 1], [-1, 0.28], [-1, -0.55], [-0.64, -0.85], [0.64, -0.85], [1, -0.55]];
function angularRow(z: number, width: number, height: number, cy: number, thickness: number, tear = 0): Ring {
  return {
    outer: OCTAGON.map(([x, y], i) => new THREE.Vector3(x * width, cy + y * height, z + tear * Math.sin(i * 2.2))),
    inner: OCTAGON.map(([x, y], i) => new THREE.Vector3(x * (width - thickness), cy + y * (height - thickness), z + tear * Math.sin(i * 2.2))),
  };
}
function plate(points: number[][], add: Part, skin: Skin = 'armor') {
  add(new ConvexGeometry(points.map(p => new THREE.Vector3(...p as [number, number, number]))), skin);
}
/** Nose-down shuttle: the buried fuselage leaves only its stern and high fin. */
function shuttle(add: Part) {
  const pitched: Part = (g, skin) => add(g.rotateX(-0.42).rotateZ(-0.12).translate(0, -13, 0), skin);
  shell([angularRow(-38, 7, 7, 0, 1.8), angularRow(-14, 12, 9, 0, 1.8),
    angularRow(12, 14, 11, 0, 1.8), angularRow(25, 13, 10, 0, 1.8),
    angularRow(29, 12, 9, 0, 1.8, 0.6)], () => true, pitched, false);
  // Engine bulkhead is thick and inset; the nozzles emerge from it.
  pitched(new THREE.BoxGeometry(21, 14, 2).translate(0, 0, 27), 'armor');
  for (const [x, y, r] of [[-6, 0, 5], [6, 0, 5], [0, 7, 3.4]]) {
    shell([roundRow(27, r * 0.65, r * 0.65, y, 0.8),
      roundRow(31, r * 0.78, r * 0.78, y, 0.8),
      roundRow(37, r, r, y, 0.9), roundRow(38, r * 1.07, r * 1.07, y, 0.9)],
      () => true, (g, skin) => pitched(g.translate(x, 0, 0), skin === 'outer' ? 'armor' : 'inner'));
  }
  // Huge swept tail: tapered thickness, clipped tip, distinct rudder trailing edge.
  plate([[-2, 7, -9], [2, 7, -9], [-1.6, 10, 26], [1.6, 10, 26],
    [-0.7, 39, 21], [0.7, 39, 21], [-0.6, 38, 14], [0.6, 38, 14]], pitched, 'outer');
  plate([[-0.8, 12, 26], [0.8, 12, 26], [-0.4, 37, 22], [0.4, 37, 22],
    [-0.5, 34, 26], [0.5, 34, 26], [-1, 12, 30], [1, 12, 30]], pitched, 'armor');
  // Swept stabilizers; one is shortened by the impact.
  for (const [side, span] of [[-1, 30], [1, 23]]) {
    plate([[side * 10, 0, -8], [side * span, 0, 24], [side * 12, 0, 27],
      [side * 10, 1.8, -8], [side * span, 0.8, 24], [side * 12, 1.8, 27]], pitched, 'outer');
  }
}

/** Buried shuttle stern, owned by one terrain chunk, with matching solid geometry. */
export function addWreckDecor(cx: number, cz: number, emit: Emit) {
  if (cx !== Math.floor(WRECK_SITE.x / 96) || cz !== Math.floor(WRECK_SITE.z / 96)) return;
  const base = marsSurfaceHeight(WRECK_SITE.x, WRECK_SITE.z);
  const materials: Record<Skin, THREE.MeshStandardMaterial> = {
    outer: new THREE.MeshStandardMaterial({ color: '#838b89', roughness: 1, metalness: 0.12, vertexColors: true }),
    inner: new THREE.MeshStandardMaterial({ color: '#434e50', roughness: 1, vertexColors: true }),
    edge: new THREE.MeshStandardMaterial({ color: '#6a6860', roughness: 1, vertexColors: true }),
    armor: new THREE.MeshStandardMaterial({ color: '#535e61', roughness: 0.95, metalness: 0.15, vertexColors: true }),
  };
  const parts = new Map<Skin, THREE.BufferGeometry[]>();
  const add: Part = (geometry, skin) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); geometry.dispose();
    g.deleteAttribute('uv');
    if (!g.hasAttribute('normal')) g.computeVertexNormals();
    g.rotateY(WRECK_SITE.turn).translate(WRECK_SITE.x, base, WRECK_SITE.z);
    const positions = g.getAttribute('position'), colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const dust = 1 - THREE.MathUtils.smoothstep(positions.getY(i) - marsSurfaceHeight(positions.getX(i), positions.getZ(i)), 0, 3);
      const shade = 0.94 + 0.035 * Math.sin(positions.getX(i) * 0.09 + positions.getZ(i) * 0.07);
      colors.set([Math.min(1, shade + dust * 0.03), shade - dust * 0.035, shade - dust * 0.075], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const batch = parts.get(skin) ?? []; batch.push(g); parts.set(skin, batch);
  };
  shuttle(add);
  for (const [skin, geometries] of parts) {
    const merged = mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    if (!merged) throw new Error('Could not build shuttle wreck.');
    emit(merged, materials[skin], true);
  }
}
