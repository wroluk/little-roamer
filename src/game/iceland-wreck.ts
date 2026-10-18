import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { SOLHEIMASANDUR_WRECK } from './iceland-sandur';

type Emit = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string) => void;
type Skin = 'outer' | 'inner' | 'edge' | 'wing';
type Ring = { outer: THREE.Vector3[]; inner: THREE.Vector3[] };
export const SOLHEIMASANDUR_BURIAL = 0.52;

/** A thin closed wall volume, including real openings and capped torn edges. */
function shell(rows: Ring[], present: (row: number, side: number) => boolean, add: (g: THREE.BufferGeometry, skin: Skin) => void) {
  const n = rows[0].outer.length;
  const outer = rows.flatMap(row => row.outer), inner = rows.flatMap(row => row.inner);
  const outside: number[] = [], inside: number[] = [], edge: number[] = [];
  const exists = (i: number, j: number) => i >= 0 && i < rows.length - 1 && present(i, (j + n) % n);
  const cap = (a: number, b: number) => {
    for (const p of [outer[a], outer[b], inner[b], outer[a], inner[b], inner[a]]) edge.push(...p.toArray());
  };
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < n; j++) {
    if (!exists(i, j)) continue;
    const a = i * n + j, b = i * n + (j + 1) % n, c = b + n, d = a + n;
    outside.push(a, b, c, a, c, d);
    inside.push(a, d, c, a, c, b);
    if (!exists(i - 1, j)) cap(a, b);
    if (!exists(i, j + 1)) cap(b, c);
    if (!exists(i + 1, j)) cap(c, d);
    if (!exists(i, j - 1)) cap(d, a);
  }
  for (const [vertices, indices, skin] of [[outer, outside, 'outer'], [inner, inside, 'inner']] as const) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flatMap(p => p.toArray()), 3));
    g.setIndex(indices); g.computeVertexNormals(); add(g, skin);
  }
  const rim = new THREE.BufferGeometry();
  rim.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
  rim.computeVertexNormals(); add(rim, 'edge');
}

function fuselageRing(z: number, rx: number, ry: number, torn = 0): Ring {
  const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [], sides = 20;
  for (let j = 0; j < sides; j++) {
    const a = j / sides * Math.PI * 2;
    const cut = z + torn * (0.6 * Math.sin(j * 1.7) + 0.4 * Math.sin(j * 2.9));
    outer.push(new THREE.Vector3(rx * Math.cos(a), 1.6 + ry * Math.sin(a), cut));
    inner.push(new THREE.Vector3((rx - 0.12) * Math.cos(a), 1.6 + (ry - 0.12) * Math.sin(a), cut));
  }
  return { outer, inner };
}

function plate(points: number[][]) {
  return new ConvexGeometry(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
}

/** Silver, hollow aircraft shell on open black sand; no painted texture or invisible hull box. */
export function addSolheimasandurWreck(emit: Emit) {
  const materials: Record<Skin, THREE.MeshStandardMaterial> = {
    outer: new THREE.MeshStandardMaterial({ color: '#949e9a', roughness: 0.82, metalness: 0.12, vertexColors: true, side: THREE.DoubleSide }),
    inner: new THREE.MeshStandardMaterial({ color: '#46504e', roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
    edge: new THREE.MeshStandardMaterial({ color: '#777d78', roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
    wing: new THREE.MeshStandardMaterial({ color: '#89918d', roughness: 0.9, metalness: 0.08, vertexColors: true }),
  };
  const add = (geometry: THREE.BufferGeometry, skin: Skin, name: string) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); geometry.dispose();
    g.deleteAttribute('uv');
    if (!g.hasAttribute('normal')) g.computeVertexNormals();
    g.rotateY(SOLHEIMASANDUR_WRECK.turn).translate(SOLHEIMASANDUR_WRECK.x,
      SOLHEIMASANDUR_WRECK.y - SOLHEIMASANDUR_BURIAL, SOLHEIMASANDUR_WRECK.z);
    const p = g.getAttribute('position'), colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const weather = 0.78 + 0.17 * Math.sin(p.getX(i) * 1.17 + p.getZ(i) * 0.83) ** 2;
      const sand = Math.max(0, Math.min(1, (SOLHEIMASANDUR_WRECK.y + 1.05 - p.getY(i)) / 1.2));
      colors.set([weather - 0.10 * sand, weather - 0.13 * sand, weather - 0.13 * sand], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    emit(g, materials[skin], `Sólheimasandur · plane wreck ${name}`);
  };
  const rows = [
    fuselageRing(-9.5, 1.05, 1.12, 0.45), fuselageRing(-7.5, 1.33, 1.30),
    fuselageRing(-5.5, 1.55, 1.42), fuselageRing(-3.5, 1.68, 1.5),
    fuselageRing(-1.5, 1.72, 1.52), fuselageRing(0.5, 1.72, 1.52),
    fuselageRing(2.5, 1.68, 1.5), fuselageRing(4.5, 1.57, 1.43),
    fuselageRing(6.5, 1.43, 1.32), fuselageRing(8.5, 1.08, 1.10, 0.55),
  ];
  const parts = new Map<Skin, THREE.BufferGeometry[]>();
  shell(rows, (row, side) => {
    // Missing cockpit glazing and a torn side doorway are genuine apertures.
    if (row >= 7 && row <= 8 && (side === 2 || side === 3 || side === 6 || side === 7)) return false;
    if (row === 3 && (side === 0 || side === 19)) return false;
    if (row === 1 && side >= 8 && side <= 11) return false;
    return true;
  }, (g, skin) => { const list = parts.get(skin) ?? []; list.push(g); parts.set(skin, list); });
  for (const [skin, geometries] of parts) for (const geometry of geometries) add(geometry, skin, `fuselage ${skin}`);
  // Uneven, truncated wing roots keep the wreck's silhouette visibly broken.
  for (const [side, span] of [[-1, 4.2], [1, 5.7]]) {
    const a = side * 1.5, b = side * span;
    add(plate([[a, 1.9, -2.5], [a, 2.16, -2.5], [a, 1.9, 2.4], [a, 2.16, 2.4],
      [b, 1.6, -1.25], [b, 1.88, -1.25], [b - side * 0.7, 1.62, 0.65], [b - side * 0.7, 1.9, 0.65]]), 'wing', `${side < 0 ? 'left' : 'right'} broken wing`);
  }
  // A low ragged tail stump and one surviving stabiliser make the profile legible.
  add(plate([[-0.16, 2.2, -7.6], [0.16, 2.2, -7.6], [-0.12, 2.5, -9.1], [0.12, 2.5, -9.1],
    [-0.1, 4.05, -9.2], [0.1, 4.05, -9.2], [-0.08, 3.55, -7.95], [0.08, 3.55, -7.95]]), 'wing', 'torn tail');
  // A short trapezoid joins the intact aft shell behind the lower side tear.
  // Both inboard corners sit within the fuselage, well clear of that opening.
  add(plate([[-0.55, 1.8, -7.6], [-0.55, 2.04, -7.6],
    [-0.55, 1.78, -9.2], [-0.55, 2.02, -9.2],
    [-3.8, 1.64, -7.98], [-3.8, 1.88, -7.98],
    [-3.8, 1.62, -8.82], [-3.8, 1.86, -8.82]]), 'wing', 'tailplane fragment');
}
